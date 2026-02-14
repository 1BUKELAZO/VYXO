import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, ilike } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerSoundRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/sounds/trending
   * Get trending sounds
   * Public endpoint (no auth required)
   */
  app.fastify.get(
    '/api/sounds/trending',
    {
      schema: {
        description: 'Get trending sounds',
        tags: ['sounds'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20 },
            offset: { type: 'number', default: 0 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                artist_name: { type: 'string' },
                duration: { type: 'number' },
                file_url: { type: 'string' },
                waveform_url: { type: 'string' },
                usage_count: { type: 'number' },
                trending_score: { type: 'number' },
                category: { type: 'string' },
                is_original: { type: 'boolean' },
                created_at: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { limit: queryLimit = 20, offset: queryOffset = 0 } = request.query as {
        limit?: number;
        offset?: number;
      };

      app.logger.info({ limit: queryLimit, offset: queryOffset }, 'Fetching trending sounds');

      try {
        const trendingSounds = await app.db
          .select({
            id: schema.sounds.id,
            title: schema.sounds.title,
            artist_name: schema.sounds.artistName,
            duration: schema.sounds.duration,
            file_url: schema.sounds.fileUrl,
            waveform_url: schema.sounds.waveformUrl,
            usage_count: schema.sounds.usageCount,
            trending_score: schema.sounds.trendingScore,
            category: schema.sounds.category,
            is_original: schema.sounds.isOriginal,
            created_at: schema.sounds.createdAt,
          })
          .from(schema.sounds)
          .orderBy(desc(schema.sounds.trendingScore), desc(schema.sounds.usageCount))
          .limit(queryLimit)
          .offset(queryOffset);

        app.logger.info({ count: trendingSounds.length }, 'Trending sounds fetched');
        return trendingSounds;
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch trending sounds');
        throw error;
      }
    }
  );

  /**
   * GET /api/sounds/search
   * Search sounds by title or artist
   * Public endpoint
   */
  app.fastify.get(
    '/api/sounds/search',
    {
      schema: {
        description: 'Search sounds',
        tags: ['sounds'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string' },
            limit: { type: 'number', default: 20 },
            offset: { type: 'number', default: 0 },
          },
        },
        response: {
          200: {
            type: 'array',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { q, limit: queryLimit = 20, offset: queryOffset = 0 } = request.query as {
        q: string;
        limit?: number;
        offset?: number;
      };

      if (!q || q.trim().length === 0) {
        return reply.code(400).send({ success: false, error: 'Search query is required' });
      }

      app.logger.info({ query: q, limit: queryLimit, offset: queryOffset }, 'Searching sounds');

      try {
        const searchTerm = `%${q}%`;
        const results = await app.db
          .select({
            id: schema.sounds.id,
            title: schema.sounds.title,
            artist_name: schema.sounds.artistName,
            duration: schema.sounds.duration,
            file_url: schema.sounds.fileUrl,
            waveform_url: schema.sounds.waveformUrl,
            usage_count: schema.sounds.usageCount,
            category: schema.sounds.category,
            is_original: schema.sounds.isOriginal,
            created_at: schema.sounds.createdAt,
          })
          .from(schema.sounds)
          .where(
            q
              ? ilike(schema.sounds.title, searchTerm) || ilike(schema.sounds.artistName, searchTerm)
              : undefined
          )
          .limit(queryLimit)
          .offset(queryOffset);

        app.logger.info({ query: q, count: results.length }, 'Sounds search completed');
        return results;
      } catch (error) {
        app.logger.error({ err: error, query: q }, 'Failed to search sounds');
        throw error;
      }
    }
  );

  /**
   * GET /api/sounds/:id
   * Get sound details
   * Public endpoint
   */
  app.fastify.get(
    '/api/sounds/:id',
    {
      schema: {
        description: 'Get sound details',
        tags: ['sounds'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      app.logger.info({ soundId: id }, 'Fetching sound details');

      try {
        const [sound] = await app.db
          .select()
          .from(schema.sounds)
          .where(eq(schema.sounds.id, id));

        if (!sound) {
          app.logger.warn({ soundId: id }, 'Sound not found');
          return reply.code(404).send({ success: false, error: 'Sound not found' });
        }

        app.logger.info({ soundId: id }, 'Sound details fetched');
        return {
          id: sound.id,
          title: sound.title,
          artist_name: sound.artistName,
          duration: sound.duration,
          file_url: sound.fileUrl,
          waveform_url: sound.waveformUrl,
          usage_count: sound.usageCount,
          trending_score: sound.trendingScore,
          category: sound.category,
          created_by: sound.createdBy,
          is_original: sound.isOriginal,
          created_at: sound.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, soundId: id }, 'Failed to fetch sound details');
        throw error;
      }
    }
  );

  /**
   * GET /api/sounds/:id/videos
   * Get videos using this sound
   * Public endpoint
   */
  app.fastify.get(
    '/api/sounds/:id/videos',
    {
      schema: {
        description: 'Get videos using this sound',
        tags: ['sounds'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20 },
            offset: { type: 'number', default: 0 },
          },
        },
        response: {
          200: {
            type: 'array',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { limit: queryLimit = 20, offset: queryOffset = 0 } = request.query as {
        limit?: number;
        offset?: number;
      };

      app.logger.info({ soundId: id, limit: queryLimit, offset: queryOffset }, 'Fetching videos for sound');

      try {
        const videos = await app.db
          .select({
            id: schema.videos.id,
            user_id: schema.videos.userId,
            username: user.email,
            avatar_url: user.image,
            video_url: schema.videos.videoUrl,
            thumbnail_url: schema.videos.thumbnailUrl,
            caption: schema.videos.caption,
            likes_count: schema.videos.likesCount,
            comments_count: schema.videos.commentsCount,
            created_at: schema.videos.createdAt,
          })
          .from(schema.videos)
          .innerJoin(user, eq(schema.videos.userId, user.id))
          .where(eq(schema.videos.soundId, id))
          .orderBy(desc(schema.videos.createdAt))
          .limit(queryLimit)
          .offset(queryOffset);

        app.logger.info({ soundId: id, count: videos.length }, 'Videos for sound fetched');
        return videos;
      } catch (error) {
        app.logger.error({ err: error, soundId: id }, 'Failed to fetch videos for sound');
        throw error;
      }
    }
  );

  /**
   * POST /api/sounds/upload
   * Upload custom audio
   * Requires authentication
   */
  app.fastify.post(
    '/api/sounds/upload',
    {
      schema: {
        description: 'Upload custom audio',
        tags: ['sounds'],
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              artist_name: { type: 'string' },
              duration: { type: 'number' },
              file_url: { type: 'string' },
              category: { type: 'string' },
              is_original: { type: 'boolean' },
              created_by: { type: 'string' },
              created_at: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Starting audio upload');

      try {
        const parts = request.parts();

        let audioFile: any = null;
        let title: string | undefined = undefined;
        let artistName: string | undefined = undefined;

        for await (const part of parts) {
          if (part.type === 'file') {
            if (part.fieldname === 'audio') {
              const audioMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-wav'];
              if (!audioMimeTypes.includes(part.mimetype)) {
                return reply.code(400).send({
                  success: false,
                  error: 'Invalid audio format. Only MP3, WAV, and M4A are supported'
                });
              }
              audioFile = part;
            }
          } else {
            const value = (part as any).value;
            if (part.fieldname === 'title') {
              title = value;
            } else if (part.fieldname === 'artistName') {
              artistName = value;
            }
          }
        }

        if (!audioFile) {
          app.logger.warn({ userId }, 'No audio file provided');
          return reply.code(400).send({ success: false, error: 'Audio file is required' });
        }

        if (!title || title.trim().length === 0) {
          app.logger.warn({ userId }, 'No title provided');
          return reply.code(400).send({ success: false, error: 'Title is required' });
        }

        app.logger.info({ userId, title }, 'Audio file received');

        // Upload audio to storage
        const audioBuffer = await audioFile.toBuffer();

        // Validate file size (max 10MB)
        if (audioBuffer.length > 10 * 1024 * 1024) {
          return reply.code(400).send({
            success: false,
            error: 'Audio file exceeds maximum size of 10MB'
          });
        }

        const audioKey = `sounds/${userId}/${Date.now()}-${audioFile.filename}`;
        const uploadedAudioKey = await app.storage.upload(audioKey, audioBuffer);
        const { url: fileUrl } = await app.storage.getSignedUrl(uploadedAudioKey);

        app.logger.info({ userId, audioKey: uploadedAudioKey }, 'Audio uploaded to storage');

        // Estimate duration (this is a placeholder - in production you'd use an audio processing library)
        // For now, assume 60 seconds max as per requirements
        const duration = 60;

        // Create sound record
        const [sound] = await app.db
          .insert(schema.sounds)
          .values({
            title,
            artistName: artistName || null,
            duration,
            fileUrl: uploadedAudioKey,
            category: 'original',
            createdBy: userId,
            isOriginal: true,
          })
          .returning({ id: schema.sounds.id, createdAt: schema.sounds.createdAt });

        app.logger.info({ userId, soundId: sound.id }, 'Sound record created');

        return {
          id: sound.id,
          title,
          artist_name: artistName || null,
          duration,
          file_url: fileUrl,
          category: 'original',
          is_original: true,
          created_by: userId,
          created_at: sound.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to upload audio');
        throw error;
      }
    }
  );

  /**
   * POST /api/sounds
   * Create sound from video (extract audio)
   * Requires authentication
   */
  app.fastify.post(
    '/api/sounds',
    {
      schema: {
        description: 'Create sound from video',
        tags: ['sounds'],
        body: {
          type: 'object',
          required: ['videoId', 'title'],
          properties: {
            videoId: { type: 'string' },
            title: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { videoId, title } = request.body as { videoId: string; title: string };

      app.logger.info({ userId, videoId, title }, 'Creating sound from video');

      try {
        // Check if video exists and belongs to user
        const [video] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        if (video.userId !== userId) {
          app.logger.warn({ userId, videoId, videoOwner: video.userId }, 'Not video owner');
          return reply.code(403).send({ success: false, error: 'You do not own this video' });
        }

        // In production, you would extract audio from the video file here
        // For now, we'll create a sound record pointing to the video
        const duration = video.duration || 60;

        const [sound] = await app.db
          .insert(schema.sounds)
          .values({
            title,
            duration,
            fileUrl: video.videoUrl,
            category: 'original',
            createdBy: userId,
            isOriginal: true,
          })
          .returning({ id: schema.sounds.id, createdAt: schema.sounds.createdAt });

        app.logger.info({ userId, soundId: sound.id, videoId }, 'Sound created from video');

        return {
          id: sound.id,
          title,
          duration,
          file_url: video.videoUrl,
          category: 'original',
          is_original: true,
          created_by: userId,
          created_at: sound.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, videoId }, 'Failed to create sound from video');
        throw error;
      }
    }
  );

  /**
   * PUT /api/sounds/:id
   * Update sound metadata (only if created_by matches auth user)
   * Requires authentication
   */
  app.fastify.put(
    '/api/sounds/:id',
    {
      schema: {
        description: 'Update sound metadata',
        tags: ['sounds'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            artist_name: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params as { id: string };
      const { title, artist_name } = request.body as { title?: string; artist_name?: string };

      app.logger.info({ userId, soundId: id }, 'Updating sound metadata');

      try {
        // Check if sound exists and user is creator
        const [sound] = await app.db
          .select()
          .from(schema.sounds)
          .where(eq(schema.sounds.id, id));

        if (!sound) {
          app.logger.warn({ soundId: id }, 'Sound not found');
          return reply.code(404).send({ success: false, error: 'Sound not found' });
        }

        if (sound.createdBy !== userId) {
          app.logger.warn({ userId, soundId: id, creator: sound.createdBy }, 'Not sound creator');
          return reply.code(403).send({ success: false, error: 'You do not own this sound' });
        }

        // Update sound
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (artist_name !== undefined) updateData.artistName = artist_name;

        const [updated] = await app.db
          .update(schema.sounds)
          .set(updateData)
          .where(eq(schema.sounds.id, id))
          .returning();

        app.logger.info({ userId, soundId: id }, 'Sound metadata updated');

        return {
          id: updated.id,
          title: updated.title,
          artist_name: updated.artistName,
          duration: updated.duration,
          file_url: updated.fileUrl,
          waveform_url: updated.waveformUrl,
          usage_count: updated.usageCount,
          trending_score: updated.trendingScore,
          category: updated.category,
          created_by: updated.createdBy,
          is_original: updated.isOriginal,
          created_at: updated.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, soundId: id }, 'Failed to update sound');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/sounds/:id
   * Delete sound (only if created_by matches auth user)
   * Requires authentication
   */
  app.fastify.delete(
    '/api/sounds/:id',
    {
      schema: {
        description: 'Delete sound',
        tags: ['sounds'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { id } = request.params as { id: string };

      app.logger.info({ userId, soundId: id }, 'Deleting sound');

      try {
        // Check if sound exists and user is creator
        const [sound] = await app.db
          .select()
          .from(schema.sounds)
          .where(eq(schema.sounds.id, id));

        if (!sound) {
          app.logger.warn({ soundId: id }, 'Sound not found');
          return reply.code(404).send({ success: false, error: 'Sound not found' });
        }

        if (sound.createdBy !== userId) {
          app.logger.warn({ userId, soundId: id, creator: sound.createdBy }, 'Not sound creator');
          return reply.code(403).send({ success: false, error: 'You do not own this sound' });
        }

        // Delete sound
        await app.db.delete(schema.sounds).where(eq(schema.sounds.id, id));

        app.logger.info({ userId, soundId: id }, 'Sound deleted successfully');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId, soundId: id }, 'Failed to delete sound');
        throw error;
      }
    }
  );
}
