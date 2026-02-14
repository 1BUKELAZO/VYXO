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

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET || !MUX_WEBHOOK_SECRET) {
    app.logger.warn('Mux environment variables not configured');
  }

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

      const userId = session.user.id;
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

        // Create base64 auth header
        const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');

        // Call Mux API to create direct upload
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
              mp4_support: 'standard',
            },
          }),
        });

        if (!muxResponse.ok) {
          const error = await muxResponse.text();
          app.logger.error({ userId, status: muxResponse.status, error }, 'Mux API error');
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
        const [video] = await app.db
          .insert(schema.videos)
          .values({
            userId,
            videoUrl: '', // Will be updated when Mux processes
            thumbnailUrl: '', // Will be updated when Mux processes
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
              assetId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { corsOrigin } = request.body as { corsOrigin?: string };

      app.logger.info({ userId }, 'Creating Mux upload URL');

      try {
        if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
          app.logger.error({}, 'Mux credentials not configured');
          return reply.code(500).send({ success: false, error: 'Mux is not configured' });
        }

        // Create base64 auth header
        const auth = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');

        // Call Mux API to create direct upload
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
              mp4_support: 'standard',
            },
          }),
        });

        if (!muxResponse.ok) {
          const error = await muxResponse.text();
          app.logger.error({ userId, status: muxResponse.status, error }, 'Mux API error');
          return reply.code(500).send({ success: false, error: 'Failed to create upload' });
        }

        const data: any = await muxResponse.json();

        app.logger.info(
          { userId, uploadId: data.data.id, assetId: data.data.asset_id },
          'Mux upload created successfully'
        );

        return {
          uploadUrl: data.data.url,
          uploadId: data.data.id,
          assetId: data.data.asset_id,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to create Mux upload');
        throw error;
      }
    }
  );

  /**
   * POST /api/mux/webhook
   * Webhook handler for Mux events
   * Public endpoint (Mux calls this)
   */
  app.fastify.post(
    '/api/mux/webhook',
    {
      schema: {
        description: 'Mux webhook handler',
        tags: ['mux'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const muxSignature = request.headers['mux-signature'] as string;

      app.logger.info({ eventType: (request.body as any)?.type }, 'Mux webhook received');

      try {
        if (!MUX_WEBHOOK_SECRET) {
          app.logger.error({}, 'Mux webhook secret not configured');
          return reply.code(500).send({ received: false });
        }

        // Verify webhook signature
        const body = JSON.stringify(request.body);
        const hash = crypto
          .createHmac('sha256', MUX_WEBHOOK_SECRET)
          .update(body)
          .digest('base64');

        if (muxSignature !== hash) {
          app.logger.warn({ muxSignature, expectedHash: hash }, 'Invalid webhook signature');
          return reply.code(401).send({ received: false });
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
          };
        };

        // Handle different event types
        if (type === 'video.upload.asset_created') {
          // Update video with mux_asset_id
          const uploadId = data.upload_id;
          const assetId = data.id;

          const videos = await app.db
            .select()
            .from(schema.videos)
            .where(eq(schema.videos.muxUploadId, uploadId));

          if (videos.length > 0) {
            await app.db
              .update(schema.videos)
              .set({ muxAssetId: assetId })
              .where(eq(schema.videos.muxUploadId, uploadId));

            app.logger.info({ uploadId, assetId }, 'Video asset created');
          }
        } else if (type === 'video.asset.ready') {
          // Video is ready for playback
          const assetId = data.id;
          const playbackId = data.playback_ids?.[0]?.id;
          const duration = data.duration;
          const aspectRatio = data.aspect_ratio;
          const maxResolution = data.max_stored_resolution;

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
              })
              .where(eq(schema.videos.muxAssetId, assetId));

            // Fetch the video to get userId for notification
            const [video] = await app.db
              .select()
              .from(schema.videos)
              .where(eq(schema.videos.muxAssetId, assetId));

            if (video) {
              // Create notification for video owner
              await app.db.insert(schema.notifications).values({
                userId: video.userId,
                type: 'video_published',
                actorId: video.userId,
                videoId: video.id,
              });

              app.logger.info(
                { assetId, playbackId, videoId: video.id },
                'Video ready and notification created'
              );
            }
          }
        } else if (type === 'video.asset.errored') {
          // Video processing failed
          const assetId = data.id;

          await app.db
            .update(schema.videos)
            .set({ status: 'error' })
            .where(eq(schema.videos.muxAssetId, assetId));

          app.logger.warn({ assetId }, 'Video asset error');
        }

        return { received: true };
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to process webhook');
        throw error;
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
          app.logger.warn({ videoId }, 'Video not ready for playback');
          return reply.code(400).send({ success: false, error: 'Video not ready yet' });
        }

        const playbackUrl = `https://stream.mux.com/${video.muxPlaybackId}.m3u8`;

        app.logger.info({ videoId, status: video.status }, 'Playback information retrieved');

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
