import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql, notInArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerVideoReplyRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/videos/:videoId/replies
   * Returns all video replies for a specific video
   * Requires authentication
   */
  app.fastify.get(
    '/api/videos/:videoId/replies',
    {
      schema: {
        description: 'Get video replies',
        tags: ['videos'],
        params: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
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
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  replies: {
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
                        viewsCount: { type: 'number' },
                        videoRepliesCount: { type: 'number' },
                        createdAt: { type: 'string' },
                        muxPlaybackId: { type: 'string' },
                        muxThumbnailUrl: { type: 'string' },
                        masterPlaylistUrl: { type: 'string' },
                        gifUrl: { type: 'string' },
                        status: { type: 'string' },
                        duration: { type: 'number' },
                        isLiked: { type: 'boolean' },
                        isFollowing: { type: 'boolean' },
                        parentVideoId: { type: 'string' },
                        isReply: { type: 'boolean' },
                      },
                    },
                  },
                  count: { type: 'number' },
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

      const { videoId } = request.params as { videoId: string };
      const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

      const currentUserId = session.user.id;

      app.logger.info({ videoId, currentUserId, limit, offset }, 'Fetching video replies');

      try {
        // Verify parent video exists
        const [parentVideo] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!parentVideo) {
          app.logger.warn({ videoId }, 'Parent video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        // Get blocked users
        const blockedUsers = await app.db
          .select({ blockedId: schema.blocks.blockedId })
          .from(schema.blocks)
          .where(eq(schema.blocks.blockerId, currentUserId));

        const blockedUserIds = blockedUsers.map((b) => b.blockedId);

        // Build where conditions
        const whereConditions = [
          eq(schema.videos.parentVideoId, videoId),
          eq(schema.videos.isReply, true),
          eq(schema.videos.status, 'ready'),
        ];

        if (blockedUserIds.length > 0) {
          whereConditions.push(notInArray(schema.videos.userId, blockedUserIds));
        }

        // Get total count
        const countResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.videos)
          .where(and(...whereConditions));

        const totalCount = countResult[0]?.count || 0;

        // Get replies
        const replies = await app.db
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
            viewsCount: schema.videos.viewsCount,
            videoRepliesCount: schema.videos.videoRepliesCount,
            createdAt: schema.videos.createdAt,
            muxPlaybackId: schema.videos.muxPlaybackId,
            muxThumbnailUrl: schema.videos.muxThumbnailUrl,
            masterPlaylistUrl: schema.videos.masterPlaylistUrl,
            gifUrl: schema.videos.gifUrl,
            status: schema.videos.status,
            duration: schema.videos.duration,
            parentVideoId: schema.videos.parentVideoId,
            isReply: schema.videos.isReply,
            isLiked: sql<number>`CASE WHEN ${schema.likes.id} IS NOT NULL THEN 1 ELSE 0 END`,
            isFollowing: sql<number>`CASE WHEN ${schema.follows.id} IS NOT NULL THEN 1 ELSE 0 END`,
          })
          .from(schema.videos)
          .leftJoin(user, eq(schema.videos.userId, user.id))
          .leftJoin(
            schema.likes,
            and(
              eq(schema.likes.videoId, schema.videos.id),
              eq(schema.likes.userId, currentUserId)
            )
          )
          .leftJoin(
            schema.follows,
            and(
              eq(schema.follows.followerId, currentUserId),
              eq(schema.follows.followingId, schema.videos.userId)
            )
          )
          .where(and(...whereConditions))
          .orderBy(desc(schema.videos.createdAt))
          .limit(limit)
          .offset(offset);

        // Format response
        const enrichedReplies = replies.map((v) => ({
          id: v.id,
          userId: v.userId,
          username: v.username,
          avatarUrl: v.avatarUrl,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl,
          caption: v.caption,
          likesCount: v.likesCount,
          commentsCount: v.commentsCount,
          sharesCount: v.sharesCount,
          viewsCount: v.viewsCount || 0,
          videoRepliesCount: v.videoRepliesCount,
          createdAt: v.createdAt,
          muxPlaybackId: v.muxPlaybackId,
          muxThumbnailUrl: v.muxThumbnailUrl,
          masterPlaylistUrl: v.masterPlaylistUrl || v.videoUrl,
          gifUrl: v.gifUrl,
          status: v.status,
          duration: v.duration,
          isLiked: Boolean(v.isLiked),
          isFollowing: Boolean(v.isFollowing),
          parentVideoId: v.parentVideoId,
          isReply: v.isReply,
        }));

        app.logger.info({ videoId, count: enrichedReplies.length, totalCount }, 'Video replies fetched');

        return {
          success: true,
          data: {
            replies: enrichedReplies,
            count: totalCount,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to fetch video replies');
        throw error;
      }
    }
  );

  /**
   * POST /api/videos/:videoId/reply
   * Links an existing video as a reply to the parent video
   * Requires authentication
   */
  app.fastify.post(
    '/api/videos/:videoId/reply',
    {
      schema: {
        description: 'Link a video as a reply',
        tags: ['videos'],
        params: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            replyVideoId: { type: 'string' },
          },
          required: ['replyVideoId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  reply: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      parentVideoId: { type: 'string' },
                      isReply: { type: 'boolean' },
                    },
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

      const { videoId } = request.params as { videoId: string };
      const { replyVideoId } = request.body as { replyVideoId: string };

      const currentUserId = session.user.id;

      app.logger.info({ videoId, replyVideoId, currentUserId }, 'Creating video reply');

      try {
        // Verify parent video exists
        const [parentVideo] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!parentVideo) {
          app.logger.warn({ videoId }, 'Parent video not found');
          return reply.code(404).send({ success: false, error: 'Parent video not found' });
        }

        // Verify reply video exists and belongs to current user
        const [replyVideo] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, replyVideoId));

        if (!replyVideo) {
          app.logger.warn({ replyVideoId }, 'Reply video not found');
          return reply.code(404).send({ success: false, error: 'Reply video not found' });
        }

        if (replyVideo.userId !== currentUserId) {
          app.logger.warn({ replyVideoId, userId: replyVideo.userId, currentUserId }, 'User does not own reply video');
          return reply.code(403).send({ success: false, error: 'Unauthorized' });
        }

        // Check duration (3-15 seconds)
        if (replyVideo.duration && (replyVideo.duration < 3 || replyVideo.duration > 15)) {
          app.logger.warn({ replyVideoId, duration: replyVideo.duration }, 'Reply video duration out of range');
          return reply.code(400).send({ success: false, error: 'Reply videos must be 3-15 seconds long' });
        }

        // Prevent self-replies
        if (videoId === replyVideoId) {
          app.logger.warn({ videoId }, 'Cannot reply to own video');
          return reply.code(400).send({ success: false, error: 'Cannot reply to your own video' });
        }

        // Prevent replying to replies
        if (replyVideo.isReply) {
          app.logger.warn({ replyVideoId }, 'Cannot reply to a reply');
          return reply.code(400).send({ success: false, error: 'Cannot reply to a reply' });
        }

        // Update reply video
        const [updatedReply] = await app.db
          .update(schema.videos)
          .set({
            parentVideoId: videoId,
            isReply: true,
          })
          .where(eq(schema.videos.id, replyVideoId))
          .returning();

        // Increment parent video's reply count
        await app.db
          .update(schema.videos)
          .set({ videoRepliesCount: sql`${schema.videos.videoRepliesCount} + 1` })
          .where(eq(schema.videos.id, videoId));

        app.logger.info({ videoId, replyVideoId, parentVideoId: updatedReply.parentVideoId }, 'Video reply created');

        return {
          success: true,
          data: {
            reply: {
              id: updatedReply.id,
              parentVideoId: updatedReply.parentVideoId,
              isReply: updatedReply.isReply,
            },
          },
        };
      } catch (error) {
        app.logger.error({ err: error, videoId, replyVideoId }, 'Failed to create video reply');
        throw error;
      }
    }
  );

  /**
   * GET /api/videos/:videoId/reply-count
   * Returns the count of video replies for a specific video
   * Requires authentication
   */
  app.fastify.get(
    '/api/videos/:videoId/reply-count',
    {
      schema: {
        description: 'Get video reply count',
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
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  count: { type: 'number' },
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

      const { videoId } = request.params as { videoId: string };

      app.logger.info({ videoId }, 'Fetching video reply count');

      try {
        // Verify video exists
        const [video] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        const count = video.videoRepliesCount || 0;

        app.logger.info({ videoId, count }, 'Video reply count fetched');

        return {
          success: true,
          data: {
            count,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to fetch video reply count');
        throw error;
      }
    }
  );
}
