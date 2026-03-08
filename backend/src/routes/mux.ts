import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import * as crypto from 'crypto';

export function registerMuxRoutes(app: App) {
  const requireAuth = app.requireAuth();

  // Environment variables
  const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
  const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
  const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;

  // DEBUG: Verificar si las variables llegan correctamente
  app.logger.info({
    hasTokenId: !!MUX_TOKEN_ID,
    hasTokenSecret: !!MUX_TOKEN_SECRET,
    hasWebhookSecret: !!MUX_WEBHOOK_SECRET,
    tokenIdLength: MUX_TOKEN_ID?.length || 0,
    tokenSecretLength: MUX_TOKEN_SECRET?.length || 0,
    webhookSecretLength: MUX_WEBHOOK_SECRET?.length || 0,
  }, 'Mux environment variables check');

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET || !MUX_WEBHOOK_SECRET) {
    app.logger.warn('Mux environment variables not configured');
  }

  // ✅ AGREGADO: GET /api/webhooks/mux - Verificar que está activo
  app.fastify.get('/api/webhooks/mux', async (request: FastifyRequest, reply: FastifyReply) => {
    return { 
      status: 'Webhook endpoint active',
      timestamp: new Date().toISOString(),
      url: '/api/webhooks/mux'
    };
  });

  /**
   * POST /api/mux-upload
   * Create a Mux upload session and video record
   * Requires authentication
   * Returns signed upload URL for direct upload to Mux
   */
  app.fastify.post(
    '/api/mux-upload',
    {
      schema: {
        description: 'Create Mux upload session for video',
        tags: ['mux'],
        body: {
          type: 'object',
          properties: {
            caption: { type: 'string' },
            soundId: { type: 'string' },
            corsOrigin: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              videoId: { type: 'string' },
              uploadUrl: { type: 'string' },
              uploadId: { type: 'string' },
              assetId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      // ✅ CORREGIDO: Usar userId en lugar de id
      const userId = session.user.userId;
      const { caption, soundId, corsOrigin } = request.body as {
        caption?: string;
        soundId?: string;
        corsOrigin?: string;
      };

      app.logger.info({ userId }, 'Creating Mux upload session');

      try {
        if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
          app.logger.error({}, 'Mux credentials not configured');
          return reply.code(500).send({ success: false, error: 'Mux is not configured' });
        }

        // DEBUG: Log de las credenciales (solo longitud, no valores)
        app.logger.info({
          tokenIdLength: MUX_TOKEN_ID.length,
          tokenSecretLength: MUX_TOKEN_SECRET.length,
          tokenIdStart: MUX_TOKEN_ID.substring(0, 8) + '...',
        }, 'Mux credentials check before API call');

        // Create base64 auth header
        const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');

        // ✅ CORREGIDO: URL sin espacio al final
        const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cors_origin: corsOrigin || '*',
            new_asset_settings: {
              playback_policy: ['public'],
              mp4_support: 'none',
            },
          }),
        });

        // DEBUG: Log de la respuesta de Mux
        app.logger.info({
          status: muxResponse.status,
          statusText: muxResponse.statusText,
          ok: muxResponse.ok,
        }, 'Mux API response status');

        if (!muxResponse.ok) {
          const errorText = await muxResponse.text();
          app.logger.error({ userId, status: muxResponse.status, error: errorText }, 'Mux API error');
          return reply.code(500).send({ success: false, error: 'Failed to create upload' });
        }

        const data: any = await muxResponse.json();
        const uploadId = data.data.id;
        const assetId = data.data.asset_id;
        const uploadUrl = data.data.url;

        app.logger.info(
          { userId, uploadId, assetId },
          'Mux upload created'
        );

        // Create video record with Mux IDs
        // ✅ CORREGIDO: videoUrl y thumbnailUrl como null en lugar de ''
        const [video] = await app.db
          .insert(schema.videos)
          .values({
            userId,
            videoUrl: null,
            thumbnailUrl: null,
            caption: caption || null,
            soundId: soundId || null,
            muxUploadId: uploadId,
            muxAssetId: assetId,
            status: 'uploading',
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            allowComments: true,
            allowDuets: true,
            allowStitches: true,
          })
          .returning({ id: schema.videos.id });

        app.logger.info(
          { userId, videoId: video.id, uploadId, assetId },
          'Video record created for Mux upload'
        );

        // Increment sound usage count if provided
        if (soundId) {
          await app.db
            .update(schema.sounds)
            .set({ usageCount: sql`${schema.sounds.usageCount} + 1` })
            .where(eq(schema.sounds.id, soundId));
        }

        return {
          videoId: video.id,
          uploadUrl,
          uploadId,
          assetId,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to create Mux upload session');
        throw error;
      }
    }
  );

  /**
   * POST /api/mux/create-upload
   * Create a Mux direct upload URL
   * Requires authentication
   */
  app.fastify.post(
    '/api/mux/create-upload',
    {
      schema: {
        description: 'Create Mux direct upload URL',
        tags: ['mux'],
        body: {
          type: 'object',
          properties: {
            corsOrigin: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              uploadUrl: { type: 'string' },
              uploadId: { type: 'string' },
              assetId: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // DEBUG: Log de entrada al endpoint
      app.logger.info({
        headers: request.headers,
        body: request.body,
      }, '>>> ENTERING /api/mux/create-upload endpoint');

      const session = await requireAuth(request, reply);
      if (!session) {
        app.logger.warn('Authentication failed for mux/create-upload');
        return;
      }

      // ✅ CORREGIDO: Usar userId en lugar de id
      const userId = session.user.userId;
      const { corsOrigin } = request.body as { corsOrigin?: string };

      app.logger.info({ userId, corsOrigin }, 'Creating Mux upload URL');

      try {
        if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
          app.logger.error({
            hasTokenId: !!MUX_TOKEN_ID,
            hasTokenSecret: !!MUX_TOKEN_SECRET,
          }, 'Mux credentials not configured - DETAILED');
          return reply.code(500).send({ success: false, error: 'Mux is not configured' });
        }

        // Create base64 auth header
        const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');

        app.logger.info({
          authHeaderLength: auth.length,
          tokenIdLength: MUX_TOKEN_ID.length,
          tokenSecretLength: MUX_TOKEN_SECRET.length,
        }, 'Preparing Mux API call');

        // ✅ CORREGIDO: URL sin espacio al final
        const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cors_origin: corsOrigin || '*',
            new_asset_settings: {
              playback_policy: ['public'],
              mp4_support: 'none',
            },
          }),
        });

        // DEBUG: Log detallado de la respuesta
        app.logger.info({
          status: muxResponse.status,
          statusText: muxResponse.statusText,
          ok: muxResponse.ok,
          headers: Object.fromEntries(muxResponse.headers.entries()),
        }, 'Mux API response details');

        if (!muxResponse.ok) {
          const errorText = await muxResponse.text();
          app.logger.error({ 
            userId, 
            status: muxResponse.status, 
            error: errorText,
            tokenIdStart: MUX_TOKEN_ID.substring(0, 8),
          }, 'Mux API error - DETAILED');
          return reply.code(500).send({ success: false, error: 'Failed to create upload', details: errorText });
        }

        const data: any = await muxResponse.json();

        // DEBUG: Log completo de la estructura de datos
        app.logger.info(
          { 
            dataKeys: Object.keys(data),
            dataDataKeys: data.data ? Object.keys(data.data) : 'NO data.data',
            hasAssetId: !!data.data?.asset_id,
            assetIdValue: data.data?.asset_id || 'NOT_PRESENT',
          }, 
          'MUX DATA STRUCTURE DEBUG'
        );

        app.logger.info(
          { userId, uploadId: data.data.id, assetId: data.data.asset_id },
          'Mux upload created successfully'
        );

        return {
          uploadUrl: data.data.url,
          uploadId: data.data.id,
          assetId: data.data.asset_id || null,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to create Mux upload - EXCEPTION');
        return reply.code(500).send({ success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  );

  /**
   * POST /api/webhooks/mux
   * Webhook handler for Mux events - RUTA CORREGIDA
   * Public endpoint (Mux calls this)
   */
  app.fastify.post(
    '/api/webhooks/mux',
    {
      schema: {
        description: 'Mux webhook handler',
        tags: ['mux'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const muxSignature = request.headers['mux-signature'] as string;

      app.logger.info({ 
        eventType: (request.body as any)?.type,
        headers: request.headers,
      }, 'Mux webhook received');

      try {
        if (!MUX_WEBHOOK_SECRET) {
          app.logger.error({}, 'Mux webhook secret not configured');
          return reply.code(500).send({ received: false, error: 'Webhook secret not configured' });
        }

        // Verify webhook signature
        const body = JSON.stringify(request.body);
        
        // Mux usa un formato específico para la firma: t=timestamp,v1=signature
        const signatureParts = muxSignature?.split(',');
        const signatureV1 = signatureParts?.find((part: string) => part.startsWith('v1='))?.replace('v1=', '');
        
        if (!signatureV1) {
          app.logger.warn({ muxSignature }, 'Invalid webhook signature format');
          return reply.code(401).send({ received: false, error: 'Invalid signature format' });
        }

        const hash = crypto
          .createHmac('sha256', MUX_WEBHOOK_SECRET)
          .update(body)
          .digest('hex');

        if (signatureV1 !== hash) {
          app.logger.warn({ 
            muxSignature: signatureV1.substring(0, 20) + '...', 
            expectedHash: hash.substring(0, 20) + '...' 
          }, 'Invalid webhook signature');
          return reply.code(401).send({ received: false, error: 'Invalid signature' });
        }

        const { type, data } = request.body as {
          type: string;
          data: {
            id: string;
            upload_id?: string;
            status?: string;
            playback_ids?: Array<{ id: string; policy: string }>;
            duration?: number;
            aspect_ratio?: string;
            max_stored_resolution?: string;
            tracks?: Array<{ type: string; status: string }>;
          };
        };

        app.logger.info({ type, dataId: data.id }, 'Processing Mux webhook event');

        // Handle different event types
        if (type === 'video.upload.asset_created') {
          const uploadId = data.upload_id;
          const assetId = data.id;

          if (uploadId) {
            const videos = await app.db
              .select()
              .from(schema.videos)
              .where(eq(schema.videos.muxUploadId, uploadId));

            if (videos.length > 0) {
              await app.db
                .update(schema.videos)
                .set({ muxAssetId: assetId })
                .where(eq(schema.videos.muxUploadId, uploadId));

              app.logger.info({ uploadId, assetId }, 'Video asset created and linked');
            } else {
              app.logger.warn({ uploadId }, 'No video found for upload_id');
            }
          }
        } else if (type === 'video.asset.ready') {
          const assetId = data.id;
          const playbackId = data.playback_ids?.[0]?.id;
          const duration = data.duration;
          const aspectRatio = data.aspect_ratio;
          const maxResolution = data.max_stored_resolution;

          app.logger.info({ 
            assetId, 
            playbackId, 
            duration, 
            aspectRatio,
            hasPlaybackId: !!playbackId 
          }, 'Video asset ready event received');

          if (playbackId) {
            const masterPlaylistUrl = `https://stream.mux.com/${playbackId}.m3u8`;
            const muxThumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&height=1138&fit_mode=smartcrop&time=1`;
            const gifUrl = `https://image.mux.com/${playbackId}/animated.gif?width=320&height=569&fps=15`;

            await app.db
              .update(schema.videos)
              .set({
                status: 'ready',
                muxPlaybackId: playbackId,
                duration: duration ? Math.floor(duration) : null,
                aspectRatio,
                maxResolution,
                masterPlaylistUrl,
                muxThumbnailUrl,
                gifUrl,
                videoUrl: masterPlaylistUrl,
                thumbnailUrl: muxThumbnailUrl,
              })
              .where(eq(schema.videos.muxAssetId, assetId));

            const [video] = await app.db
              .select()
              .from(schema.videos)
              .where(eq(schema.videos.muxAssetId, assetId));

            if (video) {
              try {
                await app.db.insert(schema.notifications).values({
                  userId: video.userId,
                  type: 'video_published',
                  actorId: video.userId,
                  videoId: video.id,
                });
              } catch (notifError) {
                app.logger.warn({ err: notifError }, 'Failed to create notification (table may not exist)');
              }

              app.logger.info(
                { assetId, playbackId, videoId: video.id, masterPlaylistUrl },
                'Video ready and updated successfully'
              );
            }
          } else {
            app.logger.warn({ assetId }, 'No playback_id in asset.ready event');
          }
        } else if (type === 'video.asset.errored') {
          const assetId = data.id;

          await app.db
            .update(schema.videos)
            .set({ status: 'error' })
            .where(eq(schema.videos.muxAssetId, assetId));

          app.logger.warn({ assetId }, 'Video asset error');
        } else {
          app.logger.info({ type }, 'Unhandled Mux webhook event type');
        }

        return { received: true };
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to process webhook');
        return reply.code(500).send({ received: false, error: 'Internal server error' });
      }
    }
  );

  /**
   * GET /api/mux/playback/:videoId
   * Get playback information for a video
   * Requires authentication
   */
  app.fastify.get(
    '/api/mux/playback/:videoId',
    {
      schema: {
        description: 'Get video playback information',
        tags: ['mux'],
        params: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              playbackId: { type: 'string' },
              playbackUrl: { type: 'string' },
              thumbnailUrl: { type: 'string' },
              gifUrl: { type: 'string' },
              status: { type: 'string' },
              duration: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { videoId } = request.params as { videoId: string };

      app.logger.info({ videoId }, 'Fetching playback information');

      try {
        const [video] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        if (!video.muxPlaybackId) {
          app.logger.warn({ videoId, status: video.status }, 'Video not ready for playback');
          return reply.code(400).send({ 
            success: false, 
            error: 'Video not ready yet',
            status: video.status 
          });
        }

        const playbackUrl = `https://stream.mux.com/${video.muxPlaybackId}.m3u8`;

        app.logger.info({ 
          videoId, 
          status: video.status,
          playbackId: video.muxPlaybackId 
        }, 'Playback information retrieved');

        return {
          playbackId: video.muxPlaybackId,
          playbackUrl,
          thumbnailUrl: video.muxThumbnailUrl,
          gifUrl: video.gifUrl,
          status: video.status,
          duration: video.duration,
        };
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to fetch playback information');
        throw error;
      }
    }
  );
}