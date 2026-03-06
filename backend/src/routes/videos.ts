import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and, not, isNull, inArray, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

// Add App type import
type App = any; // Replace with your actual App type

export function registerVideoRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/videos/upload
   * Create a video record (for Mux workflow) or upload with files
   * Requires authentication
   */
  app.fastify.post(
    '/api/videos/upload',
    {
      schema: {
        description: 'Create video record or upload with files',
        tags: ['videos'],
        consumes: ['application/json', 'multipart/form-data'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      // ✅ CORREGIDO: Usar userId en lugar de id
      const userId = session.user.userId;

      app.logger.info({ 
        userId, 
        hasUserId: !!userId,
        sessionUser: session.user 
      }, 'Video upload - User ID check');

      if (!userId) {
        app.logger.error({ session }, 'No userId in session');
        return reply.code(401).send({ success: false, error: 'Authentication required' });
      }

      app.logger.info({ userId }, 'Starting video upload/create');

      try {
        // Detectar si es JSON o multipart
        const contentType = request.headers['content-type'] || '';
        const isJson = contentType.includes('application/json');

        let muxUploadId: string | undefined;
        let muxAssetId: string | undefined;
        let caption: string | undefined;
        let duration: number | undefined;
        let allowComments: boolean = true;
        let allowDuets: boolean = true;
        let allowStitches: boolean = true;
        let visibility: string = 'public';
        let soundId: string | undefined;
        let duetWithId: string | undefined;
        let isDuet: boolean = false;
        let isStitch: boolean = false;
        let duetLayout: string = 'side';
        let videoFile: any = null;
        let thumbnailFile: any = null;
        let hashtags: string[] = [];
        let mentions: string[] = [];

        if (isJson) {
          // Manejar JSON (Mux workflow)
          const body = request.body as any;
          muxUploadId = body.muxUploadId;
          muxAssetId = body.muxAssetId;
          caption = body.caption;
          hashtags = body.hashtags || [];
          mentions = body.mentions || [];
          allowComments = body.allowComments !== undefined ? body.allowComments : true;
          allowDuets = body.allowDuet !== undefined ? body.allowDuet : true;
          allowStitches = body.allowStitch !== undefined ? body.allowStitch : true;
          visibility = body.visibility || 'public';
          soundId = body.soundId;
          duetWithId = body.duetWithId;
          isDuet = body.isDuet || false;
          isStitch = body.isStitch || false;
          duetLayout = body.duetLayout || 'side';

          app.logger.info({ 
            userId, 
            muxUploadId, 
            muxAssetId, 
            caption,
            isJson: true 
          }, 'JSON body received');
        } else {
          // Manejar multipart (legacy workflow)
          const parts = request.parts();

          for await (const part of parts) {
            if (part.type === 'file') {
              if (part.fieldname === 'video') {
                const videoMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
                if (!videoMimeTypes.includes(part.mimetype)) {
                  return reply.code(400).send({
                    success: false,
                    error: 'Invalid video format. Only MP4, MOV, and AVI are supported'
                  });
                }
                videoFile = part;
              } else if (part.fieldname === 'thumbnail') {
                const imageMimeTypes = ['image/jpeg', 'image/png'];
                if (!imageMimeTypes.includes(part.mimetype)) {
                  return reply.code(400).send({
                    success: false,
                    error: 'Invalid thumbnail format. Only JPG and PNG are supported'
                  });
                }
                thumbnailFile = part;
              }
            } else {
              const value = (part as any).value;
              if (part.fieldname === 'caption') caption = value;
              else if (part.fieldname === 'duration') duration = parseFloat(value);
              else if (part.fieldname === 'allowComments') allowComments = value === 'true' || value === true;
              else if (part.fieldname === 'allowDuets') allowDuets = value === 'true' || value === true;
              else if (part.fieldname === 'allowStitches') allowStitches = value === 'true' || value === true;
              else if (part.fieldname === 'muxUploadId') muxUploadId = value;
              else if (part.fieldname === 'muxAssetId') muxAssetId = value;
              else if (part.fieldname === 'soundId') soundId = value;
              else if (part.fieldname === 'duetWithId') duetWithId = value;
              else if (part.fieldname === 'isDuet') isDuet = value === 'true' || value === true;
              else if (part.fieldname === 'isStitch') isStitch = value === 'true' || value === true;
              else if (part.fieldname === 'duetLayout') duetLayout = value === 'top-bottom' ? 'top-bottom' : 'side';
            }
          }
        }

        // Validar que tengamos Mux IDs o archivos
        if (!muxUploadId && !videoFile) {
          app.logger.warn({ userId }, 'No video file or muxUploadId provided');
          return reply.code(400).send({ success: false, error: 'Video file or muxUploadId is required' });
        }

        // Validar caption
        if (caption && caption.length > 150) {
          return reply.code(400).send({
            success: false,
            error: 'Caption must be 150 characters or less'
          });
        }

        // Validar duet/stitch
        if (duetWithId && (isDuet || isStitch)) {
          const [originalVideo] = await app.db
            .select()
            .from(schema.videos)
            .where(eq(schema.videos.id, duetWithId));

          if (!originalVideo) {
            return reply.code(404).send({
              success: false,
              error: 'Original video not found'
            });
          }

          if (isDuet && !originalVideo.allowDuets) {
            return reply.code(403).send({
              success: false,
              error: 'Duets are not allowed on this video'
            });
          }

          if (isStitch && !originalVideo.allowStitches) {
            return reply.code(403).send({
              success: false,
              error: 'Stitches are not allowed on this video'
            });
          }
        }

        // Mux workflow (JSON)
        if (muxUploadId && muxAssetId && !videoFile) {
          if (soundId) {
            await app.db
              .update(schema.sounds)
              .set({ usageCount: sql`${schema.sounds.usageCount} + 1` })
              .where(eq(schema.sounds.id, soundId));
          }

          // ✅ CORREGIDO: videoUrl y thumbnailUrl como null en lugar de ''
          const videoData = {
            userId: userId,
            videoUrl: null, // ← CORREGIDO: null en lugar de ''
            thumbnailUrl: null, // ← CORREGIDO: null en lugar de ''
            caption: caption || null,
            duration: duration || null,
            allowComments: allowComments,
            allowDuets: allowDuets,
            allowStitches: allowStitches,
            muxUploadId: muxUploadId,
            muxAssetId: muxAssetId,
            soundId: soundId || null,
            duetWithId: duetWithId || null,
            isDuet: isDuet,
            isStitch: isStitch,
            duetLayout: (isDuet || isStitch) ? duetLayout : null,
            status: 'uploading',
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
          };

          app.logger.info({ 
            userId, 
            videoData,
            videoDataUserId: videoData.userId 
          }, 'About to insert video record');

          const [video] = await app.db
            .insert(schema.videos)
            .values(videoData)
            .returning({ id: schema.videos.id });

          if (duetWithId && (isDuet || isStitch)) {
            await app.db
              .update(schema.videos)
              .set({ duetsCount: sql`${schema.videos.duetsCount} + 1` })
              .where(eq(schema.videos.id, duetWithId));
          }

          app.logger.info(
            { userId, videoId: video.id, muxUploadId, muxAssetId },
            'Video record created with Mux IDs (JSON)'
          );

          return {
            success: true,
            videoId: video.id,
            videoUrl: '',
            thumbnailUrl: '',
            status: 'uploading',
            duration: duration || 0,
          };
        }

        // Legacy file upload workflow (multipart)
        const videoBuffer = await videoFile.toBuffer();

        if (videoBuffer.length > 100 * 1024 * 1024) {
          app.logger.warn({ userId, size: videoBuffer.length }, 'Video file exceeds max size');
          return reply.code(400).send({
            success: false,
            error: 'Video file exceeds maximum size of 100MB'
          });
        }

        const videoKey = `videos/${userId}/${Date.now()}-${videoFile.filename}`;
        const uploadedVideoKey = await app.storage.upload(videoKey, videoBuffer);
        const { url: videoUrl } = await app.storage.getSignedUrl(uploadedVideoKey);

        app.logger.info({ userId, videoKey: uploadedVideoKey, size: videoBuffer.length }, 'Video uploaded to storage');

        const thumbnailBuffer = await thumbnailFile.toBuffer();

        if (thumbnailBuffer.length > 5 * 1024 * 1024) {
          app.logger.warn({ userId, size: thumbnailBuffer.length }, 'Thumbnail file exceeds max size');
          return reply.code(400).send({
            success: false,
            error: 'Thumbnail file exceeds maximum size of 5MB'
          });
        }

        const thumbnailKey = `thumbnails/${userId}/${Date.now()}-${thumbnailFile.filename}`;
        const uploadedThumbnailKey = await app.storage.upload(thumbnailKey, thumbnailBuffer);
        const { url: thumbnailUrl } = await app.storage.getSignedUrl(uploadedThumbnailKey);

        app.logger.info({ userId, thumbnailKey: uploadedThumbnailKey, size: thumbnailBuffer.length }, 'Thumbnail uploaded to storage');

        if (soundId) {
          await app.db
            .update(schema.sounds)
            .set({ usageCount: sql`${schema.sounds.usageCount} + 1` })
            .where(eq(schema.sounds.id, soundId));
        }

        // ✅ CORREGIDO: Asegurar que userId se pase correctamente en legacy también
        const [video] = await app.db
          .insert(schema.videos)
          .values({
            userId: userId,
            videoUrl: uploadedVideoKey,
            thumbnailUrl: uploadedThumbnailKey,
            caption: caption || null,
            duration: duration || null,
            allowComments: allowComments,
            allowDuets: allowDuets,
            allowStitches: allowStitches,
            soundId: soundId || null,
            duetWithId: duetWithId || null,
            isDuet: isDuet,
            isStitch: isStitch,
            duetLayout: (isDuet || isStitch) ? duetLayout : null,
            status: 'ready',
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
          })
          .returning({ id: schema.videos.id });

        if (duetWithId && (isDuet || isStitch)) {
          await app.db
            .update(schema.videos)
            .set({ duetsCount: sql`${schema.videos.duetsCount} + 1` })
            .where(eq(schema.videos.id, duetWithId));
        }

        app.logger.info({ userId, videoId: video.id, duration }, 'Video record created in database');

        return {
          success: true,
          videoId: video.id,
          videoUrl,
          thumbnailUrl,
          status: 'ready',
          duration: duration || 0,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to upload/create video');
        throw error;
      }
    }
  );

  /**
   * PUT /api/videos/:id
   * Update video metadata (caption, allow_comments, allow_duets)
   * Requires authentication - only video owner can update
   */
  app.fastify.put(
    '/api/videos/:id',
    {
      schema: {
        description: 'Update video metadata',
        tags: ['videos'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            caption: { type: 'string' },
            allowComments: { type: 'boolean' },
            allowDuets: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              videoId: { type: 'string' },
              caption: { type: 'string' },
              allowComments: { type: 'boolean' },
              allowDuets: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.userId;
      const { id: videoId } = request.params as { id: string };
      const { caption, allowComments, allowDuets } = request.body as {
        caption?: string;
        allowComments?: boolean;
        allowDuets?: boolean;
      };

      app.logger.info({ userId, videoId }, 'Updating video metadata');

      try {
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

        if (caption !== undefined && caption.length > 150) {
          return reply.code(400).send({
            success: false,
            error: 'Caption must be 150 characters or less'
          });
        }

        const updateData: any = {};
        if (caption !== undefined) updateData.caption = caption || null;
        if (allowComments !== undefined) updateData.allowComments = allowComments;
        if (allowDuets !== undefined) updateData.allowDuets = allowDuets;

        const [updated] = await app.db
          .update(schema.videos)
          .set(updateData)
          .where(eq(schema.videos.id, videoId))
          .returning();

        app.logger.info({ userId, videoId, updates: updateData }, 'Video metadata updated');

        return {
          success: true,
          videoId: updated.id,
          caption: updated.caption,
          allowComments: updated.allowComments,
          allowDuets: updated.allowDuets,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, videoId }, 'Failed to update video metadata');
        throw error;
      }
    }
  );

  /**
   * GET /api/videos/:id/status
   * Get video processing status
   * Public endpoint
   */
  app.fastify.get(
    '/api/videos/:id/status',
    {
      schema: {
        description: 'Get video processing status',
        tags: ['videos'],
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
              videoId: { type: 'string' },
              status: { type: 'string' },
              duration: { type: 'number' },
              thumbnailUrl: { type: 'string' },
              videoUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: videoId } = request.params as { id: string };

      app.logger.info({ videoId }, 'Checking video status');

      try {
        const [video] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        app.logger.info({ videoId, status: video.status }, 'Video status retrieved');

        return {
          videoId: video.id,
          status: video.status,
          duration: video.duration,
          thumbnailUrl: video.thumbnailUrl,
          videoUrl: video.videoUrl,
        };
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to check video status');
        throw error;
      }
    }
  );

  /**
   * GET /api/videos/:id/thumbnail
   * Get video thumbnail with duration info
   * Public endpoint
   */
  app.fastify.get(
    '/api/videos/:id/thumbnail',
    {
      schema: {
        description: 'Get video thumbnail',
        tags: ['videos'],
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
              thumbnailUrl: { type: 'string' },
              duration: { type: 'number' },
              videoId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: videoId } = request.params as { id: string };

      app.logger.info({ videoId }, 'Fetching video thumbnail');

      try {
        const [video] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        app.logger.info({ videoId }, 'Thumbnail retrieved');

        return {
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          videoId: video.id,
        };
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to fetch thumbnail');
        throw error;
      }
    }
  );

  /**
   * GET /api/videos/feed
   * Returns videos for the feed - PUBLIC ENDPOINT (temporarily)
   */
  app.fastify.get(
    '/api/videos/feed',
    {
      schema: {
        description: 'Get video feed - Public endpoint',
        tags: ['videos'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                username: { type: 'string' },
                avatarUrl: { type: 'string' },
                videoUrl: { type: 'string' },
                thumbnailUrl: { type: 'string' },
                caption: { type: 'string' },
                likesCount: { type: 'number' },
                commentsCount: { type: 'number' },
                sharesCount: { type: 'number' },
                status: { type: 'string' },
                isLiked: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info('Fetching video feed - PUBLIC');

      try {
        const videosData = await app.db
          .select({
            id: schema.videos.id,
            userId: schema.videos.userId,
            username: user.name,
            avatarUrl: user.image,
            videoUrl: schema.videos.videoUrl,
            thumbnailUrl: schema.videos.thumbnailUrl,
            caption: schema.videos.caption,
            likesCount: schema.videos.likesCount,
            commentsCount: schema.videos.commentsCount,
            sharesCount: schema.videos.sharesCount,
            status: schema.videos.status,
            createdAt: schema.videos.createdAt,
          })
          .from(schema.videos)
          .innerJoin(user, eq(schema.videos.userId, user.id))
          .orderBy(desc(schema.videos.createdAt))
          .limit(50);

        const feed = videosData.map((video) => ({
          ...video,
          avatarUrl: video.avatarUrl || null,
          videoUrl: video.videoUrl,
          isLiked: false,
        }));

        app.logger.info({ count: feed.length }, 'Video feed fetched successfully');
        return feed;
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch video feed');
        throw error;
      }
    }
  );

  /**
   * POST /api/videos/:id/like
   * Likes a video - PUBLIC ENDPOINT (temporarily)
   */
  app.fastify.post(
    '/api/videos/:id/like',
    {
      schema: {
        description: 'Like a video - Public endpoint',
        tags: ['videos'],
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
              likesCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = 'temp-user-id';
      const { id: videoId } = request.params as { id: string };

      app.logger.info({ userId, videoId }, 'Liking video (public endpoint)');

      try {
        const video = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        await app.db.update(schema.videos)
          .set({ likesCount: video.likesCount + 1 })
          .where(eq(schema.videos.id, videoId));

        const updatedVideo = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        app.logger.info({ userId, videoId, likesCount: updatedVideo?.likesCount }, 'Video liked successfully (public)');
        return { success: true, likesCount: updatedVideo?.likesCount || 0 };
      } catch (error) {
        app.logger.error({ err: error, userId, videoId }, 'Failed to like video');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/videos/:id/like
   * Unlikes a video - PUBLIC ENDPOINT (temporarily)
   */
  app.fastify.delete(
    '/api/videos/:id/like',
    {
      schema: {
        description: 'Unlike a video - Public endpoint',
        tags: ['videos'],
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
              likesCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = 'temp-user-id';
      const { id: videoId } = request.params as { id: string };

      app.logger.info({ userId, videoId }, 'Unliking video (public endpoint)');

      try {
        const video = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        const newLikesCount = Math.max(0, video.likesCount - 1);
        
        await app.db.update(schema.videos)
          .set({ likesCount: newLikesCount })
          .where(eq(schema.videos.id, videoId));

        const updatedVideo = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        app.logger.info({ userId, videoId, likesCount: updatedVideo?.likesCount }, 'Video unliked successfully (public)');
        return { success: true, likesCount: updatedVideo?.likesCount || 0 };
      } catch (error) {
        app.logger.error({ err: error, userId, videoId }, 'Failed to unlike video');
        throw error;
      }
    }
  );

  /**
   * POST /api/videos/:id/share
   * Increments share count
   * Requires authentication
   */
  app.fastify.post(
    '/api/videos/:id/share',
    {
      schema: {
        description: 'Share a video',
        tags: ['videos'],
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
              sharesCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id: videoId } = request.params as { id: string };
      const userId = session.user.userId;

      app.logger.info({ userId, videoId }, 'Sharing video');

      try {
        const video = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        await app.db.update(schema.videos).set({ sharesCount: video.sharesCount + 1 }).where(eq(schema.videos.id, videoId));

        const updatedVideo = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        app.logger.info({ userId, videoId, sharesCount: updatedVideo?.sharesCount }, 'Video shared successfully');
        return { success: true, sharesCount: updatedVideo?.sharesCount || 0 };
      } catch (error) {
        app.logger.error({ err: error, userId, videoId }, 'Failed to share video');
        throw error;
      }
    }
  );

  /**
   * POST /api/videos/seed
   * Seeds sample data for testing (videos, ads, live streams)
   * Protected endpoint (requires authentication)
   */
  app.fastify.post(
    '/api/videos/seed',
    {
      schema: {
        description: 'Seed sample data for testing',
        tags: ['videos'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              videos: { type: 'number' },
              adCampaigns: { type: 'number' },
              liveStreams: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.userId;
      app.logger.info({ userId }, 'Seeding sample data');

      try {
        const sampleVideos = [
          {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
            caption: 'Amazing nature documentary 🌿 #nature #wildlife',
            userId,
            duration: 30,
            status: 'ready',
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            allowComments: true,
            allowDuets: true,
            allowStitches: true,
          },
          {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
            caption: 'Creative animation showcase ✨ #animation #art',
            userId,
            duration: 25,
            status: 'ready',
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            allowComments: true,
            allowDuets: true,
            allowStitches: true,
          },
          {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400',
            caption: 'Epic adventure compilation 🎬 #adventure #travel',
            userId,
            duration: 20,
            status: 'ready',
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            allowComments: true,
            allowDuets: true,
            allowStitches: true,
          },
        ];

        const insertedVideos = await app.db
          .insert(schema.videos)
          .values(sampleVideos)
          .returning();

        const sampleAds = [
          {
            advertiserId: userId,
            name: 'Summer Sale Campaign',
            budget: 1000,
            dailyBudget: 100,
            spent: 0,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            targetAudience: { demographics: ['18-35'], interests: ['technology', 'shopping'] },
          },
          {
            advertiserId: userId,
            name: 'New Product Launch',
            budget: 5000,
            dailyBudget: 200,
            spent: 0,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            targetAudience: { demographics: ['25-45'], interests: ['lifestyle', 'fashion'] },
          },
        ];

        const insertedAds = await app.db
          .insert(schema.adCampaigns)
          .values(sampleAds)
          .returning();

        const sampleStreams = [
          {
            userId,
            title: 'Live Gaming Session',
            description: 'Playing the latest games live!',
            status: 'active',
            streamKey: 'stream-key-1',
            viewerCount: 0,
          },
          {
            userId,
            title: 'Q&A with Fans',
            description: 'Ask me anything!',
            status: 'active',
            streamKey: 'stream-key-2',
            viewerCount: 0,
          },
        ];

        const insertedStreams = await app.db
          .insert(schema.liveStreams)
          .values(sampleStreams)
          .returning();

        app.logger.info(
          { 
            userId, 
            videos: insertedVideos.length, 
            ads: insertedAds.length, 
            streams: insertedStreams.length 
          }, 
          'Sample data seeded successfully'
        );

        return {
          success: true,
          message: 'Sample data created successfully',
          videos: insertedVideos.length,
          adCampaigns: insertedAds.length,
          liveStreams: insertedStreams.length,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to seed sample data');
        throw error;
      }
    }
  );

  /**
   * GET /api/videos/:videoId
   * Get video details with all metadata
   * Requires authentication
   */
  app.fastify.get(
    '/api/videos/:videoId',
    {
      schema: {
        description: 'Get video details',
        tags: ['videos'],
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
              id: { type: 'string' },
              userId: { type: 'string' },
              caption: { type: 'string' },
              videoUrl: { type: 'string' },
              thumbnailUrl: { type: 'string' },
              likesCount: { type: 'number' },
              commentsCount: { type: 'number' },
              sharesCount: { type: 'number' },
              viewsCount: { type: 'number' },
              allowComments: { type: 'boolean' },
              allowDuets: { type: 'boolean' },
              allowStitches: { type: 'boolean' },
              duration: { type: 'number' },
              status: { type: 'string' },
              masterPlaylistUrl: { type: 'string' },
              muxThumbnailUrl: { type: 'string' },
              gifUrl: { type: 'string' },
              isDuet: { type: 'boolean' },
              isStitch: { type: 'boolean' },
              duetLayout: { type: 'string' },
              duetWithId: { type: 'string' },
              duetWithUsername: { type: 'string' },
              duetWithAvatarUrl: { type: 'string' },
              duetsCount: { type: 'number' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { videoId } = request.params as { videoId: string };

      app.logger.info({ videoId }, 'Fetching video details');

      try {
        const [video] = await app.db
          .select({
            id: schema.videos.id,
            userId: schema.videos.userId,
            caption: schema.videos.caption,
            videoUrl: schema.videos.videoUrl,
            thumbnailUrl: schema.videos.thumbnailUrl,
            likesCount: schema.videos.likesCount,
            commentsCount: schema.videos.commentsCount,
            sharesCount: schema.videos.sharesCount,
            viewsCount: schema.videos.viewsCount,
            allowComments: schema.videos.allowComments,
            allowDuets: schema.videos.allowDuets,
            allowStitches: schema.videos.allowStitches,
            duration: schema.videos.duration,
            status: schema.videos.status,
            masterPlaylistUrl: schema.videos.masterPlaylistUrl,
            muxThumbnailUrl: schema.videos.muxThumbnailUrl,
            gifUrl: schema.videos.gifUrl,
            isDuet: schema.videos.isDuet,
            isStitch: schema.videos.isStitch,
            duetLayout: schema.videos.duetLayout,
            duetWithId: schema.videos.duetWithId,
            duetsCount: schema.videos.duetsCount,
            createdAt: schema.videos.createdAt,
          })
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        let duetWithUsername: string | null = null;
        let duetWithAvatarUrl: string | null = null;

        if (video.duetWithId) {
          const [duetAuthor] = await app.db
            .select({
              name: user.name,
              image: user.image,
            })
            .from(schema.videos)
            .innerJoin(user, eq(schema.videos.userId, user.id))
            .where(eq(schema.videos.id, video.duetWithId));

          if (duetAuthor) {
            duetWithUsername = duetAuthor.name;
            duetWithAvatarUrl = duetAuthor.image;
          }
        }

        app.logger.info({ videoId }, 'Video details fetched');

        return {
          ...video,
          duetWithUsername,
          duetWithAvatarUrl,
        };
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to fetch video details');
        throw error;
      }
    }
  );
}