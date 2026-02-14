import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and, not, isNull, inArray, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerVideoRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/videos/upload
   * Upload a video with thumbnail
   * Requires authentication
   * Validates video duration (3-60 seconds) and file size (max 100MB for video, 5MB for thumbnail)
   */
  app.fastify.post(
    '/api/videos/upload',
    {
      schema: {
        description: 'Upload a video with thumbnail',
        tags: ['videos'],
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              videoId: { type: 'string' },
              videoUrl: { type: 'string' },
              thumbnailUrl: { type: 'string' },
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

      const userId = session.user.id;
      app.logger.info({ userId }, 'Starting video upload');

      try {
        // Process multipart form data
        const parts = request.parts();

        let videoFile: any = null;
        let thumbnailFile: any = null;
        let caption: string | undefined = undefined;
        let duration: number | undefined = undefined;
        let allowComments: boolean = true;
        let allowDuets: boolean = true;
        let allowStitches: boolean = true;
        let muxUploadId: string | undefined = undefined;
        let muxAssetId: string | undefined = undefined;
        let soundId: string | undefined = undefined;
        let duetWithId: string | undefined = undefined;
        let isDuet: boolean = false;
        let isStitch: boolean = false;
        let duetLayout: string = 'side';

        for await (const part of parts) {
          if (part.type === 'file') {
            if (part.fieldname === 'video') {
              // Validate video file type
              const videoMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
              if (!videoMimeTypes.includes(part.mimetype)) {
                return reply.code(400).send({
                  success: false,
                  error: 'Invalid video format. Only MP4, MOV, and AVI are supported'
                });
              }
              videoFile = part;
            } else if (part.fieldname === 'thumbnail') {
              // Validate thumbnail file type
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
            // Handle form fields
            const value = (part as any).value;
            if (part.fieldname === 'caption') {
              caption = value;
              if (caption && caption.length > 150) {
                return reply.code(400).send({
                  success: false,
                  error: 'Caption must be 150 characters or less'
                });
              }
            } else if (part.fieldname === 'duration') {
              duration = parseFloat(value);
            } else if (part.fieldname === 'allowComments') {
              allowComments = value === 'true' || value === true;
            } else if (part.fieldname === 'allowDuets') {
              allowDuets = value === 'true' || value === true;
            } else if (part.fieldname === 'allowStitches') {
              allowStitches = value === 'true' || value === true;
            } else if (part.fieldname === 'muxUploadId') {
              muxUploadId = value;
            } else if (part.fieldname === 'muxAssetId') {
              muxAssetId = value;
            } else if (part.fieldname === 'soundId') {
              soundId = value;
            } else if (part.fieldname === 'duetWithId') {
              duetWithId = value;
            } else if (part.fieldname === 'isDuet') {
              isDuet = value === 'true' || value === true;
            } else if (part.fieldname === 'isStitch') {
              isStitch = value === 'true' || value === true;
            } else if (part.fieldname === 'duetLayout') {
              duetLayout = value === 'top-bottom' ? 'top-bottom' : 'side';
            }
          }
        }

        // Validate required files (or Mux IDs)
        if (!videoFile && !muxUploadId) {
          app.logger.warn({ userId }, 'No video file or muxUploadId provided');
          return reply.code(400).send({ success: false, error: 'Video file or muxUploadId is required' });
        }

        if (!thumbnailFile && !muxAssetId) {
          app.logger.warn({ userId }, 'No thumbnail file or muxAssetId provided');
          return reply.code(400).send({ success: false, error: 'Thumbnail file or muxAssetId is required' });
        }

        // Validate duration if provided
        if (duration !== undefined) {
          if (duration < 3 || duration > 60) {
            app.logger.warn({ userId, duration }, 'Video duration out of range');
            return reply.code(400).send({
              success: false,
              error: 'Video duration must be between 3 and 60 seconds'
            });
          }
        }

        // Validate duet/stitch if provided
        if (duetWithId && (isDuet || isStitch)) {
          const [originalVideo] = await app.db
            .select()
            .from(schema.videos)
            .where(eq(schema.videos.id, duetWithId));

          if (!originalVideo) {
            app.logger.warn({ duetWithId }, 'Original video not found for duet/stitch');
            return reply.code(404).send({
              success: false,
              error: 'Original video not found'
            });
          }

          // Check if duets or stitches are allowed
          if (isDuet && !originalVideo.allowDuets) {
            app.logger.warn({ duetWithId, userId }, 'Duets not allowed on original video');
            return reply.code(403).send({
              success: false,
              error: 'Duets are not allowed on this video'
            });
          }

          if (isStitch && !originalVideo.allowStitches) {
            app.logger.warn({ duetWithId, userId }, 'Stitches not allowed on original video');
            return reply.code(403).send({
              success: false,
              error: 'Stitches are not allowed on this video'
            });
          }
        }

        app.logger.info(
          { userId, hasVideo: !!videoFile, hasThumbnail: !!thumbnailFile, duration, muxUploadId, muxAssetId, isDuet, isStitch, duetWithId },
          'Files received'
        );

        // Handle Mux workflow (no file uploads, just create record with Mux IDs)
        if (muxUploadId && muxAssetId) {
          // Increment sound usage count if soundId provided
          if (soundId) {
            await app.db
              .update(schema.sounds)
              .set({ usageCount: sql`${schema.sounds.usageCount} + 1` })
              .where(eq(schema.sounds.id, soundId));
          }

          const [video] = await app.db
            .insert(schema.videos)
            .values({
              userId,
              videoUrl: '', // Will be updated by Mux webhook
              thumbnailUrl: '', // Will be updated by Mux webhook
              caption: caption || null,
              duration: duration || null,
              allowComments,
              allowDuets,
              allowStitches,
              muxUploadId,
              muxAssetId,
              soundId: soundId || null,
              duetWithId: duetWithId || null,
              isDuet,
              isStitch,
              duetLayout: isDuet || isStitch ? duetLayout : null,
              status: 'uploading',
              likesCount: 0,
              commentsCount: 0,
              sharesCount: 0,
              viewsCount: 0,
            })
            .returning({ id: schema.videos.id });

          // Increment duets count on original video if creating a duet/stitch
          if (duetWithId && (isDuet || isStitch)) {
            await app.db
              .update(schema.videos)
              .set({ duetsCount: sql`${schema.videos.duetsCount} + 1` })
              .where(eq(schema.videos.id, duetWithId));
          }

          app.logger.info(
            { userId, videoId: video.id, muxUploadId, muxAssetId, soundId },
            'Video record created with Mux IDs'
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

        // Handle traditional file upload workflow
        const videoBuffer = await videoFile.toBuffer();

        // Validate video file size (max 100MB)
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

        // Upload thumbnail to storage
        const thumbnailBuffer = await thumbnailFile.toBuffer();

        // Validate thumbnail file size (max 5MB)
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

        // Increment sound usage count if soundId provided
        if (soundId) {
          await app.db
            .update(schema.sounds)
            .set({ usageCount: sql`${schema.sounds.usageCount} + 1` })
            .where(eq(schema.sounds.id, soundId));
        }

        // Create video record in database
        const [video] = await app.db
          .insert(schema.videos)
          .values({
            userId,
            videoUrl: uploadedVideoKey,
            thumbnailUrl: uploadedThumbnailKey,
            caption: caption || null,
            duration: duration || null,
            allowComments,
            allowDuets,
            allowStitches,
            soundId: soundId || null,
            duetWithId: duetWithId || null,
            isDuet,
            isStitch,
            duetLayout: isDuet || isStitch ? duetLayout : null,
            status: 'ready',
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
          })
          .returning({ id: schema.videos.id });

        // Increment duets count on original video if creating a duet/stitch
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
        app.logger.error({ err: error, userId }, 'Failed to upload video');
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

      const userId = session.user.id;
      const { id: videoId } = request.params as { id: string };
      const { caption, allowComments, allowDuets } = request.body as {
        caption?: string;
        allowComments?: boolean;
        allowDuets?: boolean;
      };

      app.logger.info({ userId, videoId }, 'Updating video metadata');

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

        // Validate caption length
        if (caption !== undefined && caption.length > 150) {
          return reply.code(400).send({
            success: false,
            error: 'Caption must be 150 characters or less'
          });
        }

        // Update video
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
   * Returns videos for the feed from followed users and trending videos
   * Requires authentication
   */
  app.fastify.get(
    '/api/videos/feed',
    {
      schema: {
        description: 'Get video feed for authenticated user',
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
                soundId: { type: 'string' },
                soundTitle: { type: 'string' },
                soundArtistName: { type: 'string' },
                status: { type: 'string' },
                muxPlaybackId: { type: 'string' },
                muxThumbnailUrl: { type: 'string' },
                masterPlaylistUrl: { type: 'string' },
                gifUrl: { type: 'string' },
                isLiked: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Fetching video feed');

      try {
        // Get list of users that current user follows
        const followingUsers = await app.db
          .select({ followingId: schema.follows.followingId })
          .from(schema.follows)
          .where(eq(schema.follows.followerId, userId));

        const followingIds = followingUsers.map((f) => f.followingId);

        // Get videos based on follows status
        // If user has follows, show videos from followed users only
        // If no follows, show ALL videos (For You page for new users)
        const videosData = await (
          followingIds.length > 0
            ? app.db
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
                  soundId: schema.videos.soundId,
                  soundTitle: schema.sounds.title,
                  soundArtistName: schema.sounds.artistName,
                  status: schema.videos.status,
                  muxPlaybackId: schema.videos.muxPlaybackId,
                  muxThumbnailUrl: schema.videos.muxThumbnailUrl,
                  masterPlaylistUrl: schema.videos.masterPlaylistUrl,
                  gifUrl: schema.videos.gifUrl,
                  createdAt: schema.videos.createdAt,
                })
                .from(schema.videos)
                .innerJoin(user, eq(schema.videos.userId, user.id))
                .leftJoin(schema.sounds, eq(schema.videos.soundId, schema.sounds.id))
                .where(inArray(schema.videos.userId, followingIds))
                .orderBy(desc(schema.videos.createdAt))
                .limit(50)
            : app.db
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
                  soundId: schema.videos.soundId,
                  soundTitle: schema.sounds.title,
                  soundArtistName: schema.sounds.artistName,
                  status: schema.videos.status,
                  muxPlaybackId: schema.videos.muxPlaybackId,
                  muxThumbnailUrl: schema.videos.muxThumbnailUrl,
                  masterPlaylistUrl: schema.videos.masterPlaylistUrl,
                  gifUrl: schema.videos.gifUrl,
                  createdAt: schema.videos.createdAt,
                })
                .from(schema.videos)
                .innerJoin(user, eq(schema.videos.userId, user.id))
                .leftJoin(schema.sounds, eq(schema.videos.soundId, schema.sounds.id))
                .orderBy(desc(schema.videos.createdAt))
                .limit(50)
        );

        // Get likes for current user on these videos
        const videoIds = videosData.map((v) => v.id);
        let userLikes: any[] = [];

        // Only query likes if we have videos to check
        if (videoIds.length > 0) {
          userLikes = await app.db
            .select({ videoId: schema.likes.videoId })
            .from(schema.likes)
            .where(
              and(
                eq(schema.likes.userId, userId),
                inArray(schema.likes.videoId, videoIds)
              )
            );
        }

        const likedVideoIds = new Set(userLikes.map((l) => l.videoId));

        // Map likes to videos and use Mux URLs when ready
        const feed = videosData.map((video) => ({
          ...video,
          avatarUrl: video.avatarUrl || null,
          // Use HLS master playlist if video is ready from Mux, fallback to original URL
          videoUrl: video.status === 'ready' && video.masterPlaylistUrl ? video.masterPlaylistUrl : video.videoUrl,
          isLiked: likedVideoIds.has(video.id),
        }));

        app.logger.info({ userId, count: feed.length }, 'Video feed fetched successfully');
        return feed;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch video feed');
        throw error;
      }
    }
  );

  /**
   * POST /api/videos/:id/like
   * Likes a video
   * Requires authentication
   */
  app.fastify.post(
    '/api/videos/:id/like',
    {
      schema: {
        description: 'Like a video',
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id: videoId } = request.params as { id: string };
      const userId = session.user.id;

      app.logger.info({ userId, videoId }, 'Liking video');

      try {
        // Check if video exists
        const video = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        // Check if already liked
        const existingLike = await app.db.query.likes.findFirst({
          where: and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, videoId)),
        });

        if (existingLike) {
          app.logger.warn({ userId, videoId }, 'Video already liked');
          return reply.code(400).send({ success: false, error: 'Video already liked' });
        }

        // Add like and increment counter in transaction
        await app.db.transaction(async (tx) => {
          await tx.insert(schema.likes).values({
            userId,
            videoId,
          });

          await tx.update(schema.videos).set({ likesCount: video.likesCount + 1 }).where(eq(schema.videos.id, videoId));
        });

        const updatedVideo = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        app.logger.info({ userId, videoId, likesCount: updatedVideo?.likesCount }, 'Video liked successfully');
        return { success: true, likesCount: updatedVideo?.likesCount || 0 };
      } catch (error) {
        app.logger.error({ err: error, userId, videoId }, 'Failed to like video');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/videos/:id/like
   * Unlikes a video
   * Requires authentication
   */
  app.fastify.delete(
    '/api/videos/:id/like',
    {
      schema: {
        description: 'Unlike a video',
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
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id: videoId } = request.params as { id: string };
      const userId = session.user.id;

      app.logger.info({ userId, videoId }, 'Unliking video');

      try {
        // Check if video exists
        const video = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        // Check if like exists
        const existingLike = await app.db.query.likes.findFirst({
          where: and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, videoId)),
        });

        if (!existingLike) {
          app.logger.warn({ userId, videoId }, 'Like not found');
          return reply.code(400).send({ success: false, error: 'Like not found' });
        }

        // Remove like and decrement counter in transaction
        await app.db.transaction(async (tx) => {
          await tx.delete(schema.likes).where(eq(schema.likes.id, existingLike.id));

          await tx.update(schema.videos).set({ likesCount: Math.max(0, video.likesCount - 1) }).where(eq(schema.videos.id, videoId));
        });

        const updatedVideo = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        app.logger.info({ userId, videoId, likesCount: updatedVideo?.likesCount }, 'Video unliked successfully');
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
      const userId = session.user.id;

      app.logger.info({ userId, videoId }, 'Sharing video');

      try {
        // Check if video exists
        const video = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        // Increment share count
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
   * Seeds 3 sample videos for testing
   * Protected endpoint (requires authentication)
   */
  app.fastify.post(
    '/api/videos/seed',
    {
      schema: {
        description: 'Seed sample videos for testing',
        tags: ['videos'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              videos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    video_url: { type: 'string' },
                    thumbnail_url: { type: 'string' },
                    caption: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      app.logger.info({ userId }, 'Seeding sample videos');

      try {
        const sampleVideos = [
          {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
            caption: 'Amazing nature documentary 🌿 #nature #wildlife',
            userId,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
          },
          {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
            caption: 'Creative animation showcase ✨ #animation #art',
            userId,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
          },
          {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400',
            caption: 'Epic adventure compilation 🎬 #adventure #travel',
            userId,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
          },
        ];

        // Insert all videos
        const insertedVideos = await app.db
          .insert(schema.videos)
          .values(sampleVideos)
          .returning();

        const insertedVideoArray = Array.isArray(insertedVideos) ? insertedVideos : [];

        app.logger.info({ userId, videoCount: insertedVideoArray.length }, 'Sample videos seeded successfully');

        const response = {
          success: true,
          message: `${insertedVideoArray.length} sample videos created successfully`,
          videos: insertedVideoArray.map((video) => ({
            id: video.id,
            video_url: video.videoUrl,
            thumbnail_url: video.thumbnailUrl,
            caption: video.caption,
          })),
        };

        return response;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to seed sample videos');
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
        // Get video with duet video author info
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

        // Get duet video author info if this is a duet/stitch
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
