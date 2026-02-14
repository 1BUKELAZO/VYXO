import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, count, isNull, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerCommentRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/videos/:videoId/comments
   * Returns comments for a video with nested replies
   * Requires authentication
   */
  app.fastify.get(
    '/api/videos/:videoId/comments',
    {
      schema: {
        description: 'Get comments for a video',
        tags: ['comments'],
        params: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
          },
        },
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
                content: { type: 'string' },
                likesCount: { type: 'number' },
                isLiked: { type: 'boolean' },
                repliesCount: { type: 'number' },
                createdAt: { type: 'string' },
                replies: { type: 'array' },
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
      const userId = session.user.id;

      app.logger.info({ videoId, userId }, 'Fetching comments for video');

      try {
        // Get root comments (no parent)
        const rootComments = await app.db
          .select({
            id: schema.comments.id,
            userId: schema.comments.userId,
            username: user.name,
            avatarUrl: user.image,
            content: schema.comments.content,
            likesCount: schema.comments.likesCount,
            createdAt: schema.comments.createdAt,
          })
          .from(schema.comments)
          .innerJoin(user, eq(schema.comments.userId, user.id))
          .where(and(eq(schema.comments.videoId, videoId), isNull(schema.comments.parentCommentId)))
          .orderBy(schema.comments.createdAt);

        // Get user likes for all comments
        const allCommentIds = rootComments.map((c) => c.id);
        let userLikes: any[] = [];
        if (allCommentIds.length > 0) {
          userLikes = await app.db
            .select({ commentId: schema.commentLikes.commentId })
            .from(schema.commentLikes)
            .where(and(eq(schema.commentLikes.userId, userId), inArray(schema.commentLikes.commentId, allCommentIds)));
        }

        const likedCommentIds = new Set(userLikes.map((l) => l.commentId));

        // Get replies for each root comment
        const commentsWithReplies = await Promise.all(
          rootComments.map(async (comment) => {
            const replies = await app.db
              .select({
                id: schema.comments.id,
                userId: schema.comments.userId,
                username: user.name,
                avatarUrl: user.image,
                content: schema.comments.content,
                likesCount: schema.comments.likesCount,
                createdAt: schema.comments.createdAt,
              })
              .from(schema.comments)
              .innerJoin(user, eq(schema.comments.userId, user.id))
              .where(eq(schema.comments.parentCommentId, comment.id))
              .orderBy(schema.comments.createdAt);

            return {
              ...comment,
              isLiked: likedCommentIds.has(comment.id),
              repliesCount: replies.length,
              replies: replies.map((r) => ({
                ...r,
                isLiked: likedCommentIds.has(r.id),
              })),
            };
          })
        );

        app.logger.info({ videoId, commentCount: commentsWithReplies.length }, 'Comments fetched successfully');
        return commentsWithReplies;
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to fetch comments');
        throw error;
      }
    }
  );

  /**
   * POST /api/videos/:videoId/comments
   * Creates a comment on a video
   * Requires authentication
   */
  app.fastify.post(
    '/api/videos/:videoId/comments',
    {
      schema: {
        description: 'Create a comment on a video',
        tags: ['comments'],
        params: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            parentCommentId: { type: 'string' },
          },
          required: ['content'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              content: { type: 'string' },
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
      const { content, parentCommentId } = request.body as { content: string; parentCommentId?: string };
      const userId = session.user.id;

      app.logger.info({ videoId, userId, parentCommentId }, 'Creating comment');

      try {
        // Check if video exists
        const video = await app.db.query.videos.findFirst({
          where: eq(schema.videos.id, videoId),
        });

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        // Check if parent comment exists if provided
        if (parentCommentId) {
          const parentComment = await app.db.query.comments.findFirst({
            where: eq(schema.comments.id, parentCommentId),
          });

          if (!parentComment) {
            app.logger.warn({ parentCommentId }, 'Parent comment not found');
            return reply.code(404).send({ success: false, error: 'Parent comment not found' });
          }
        }

        // Create comment and increment video comment count
        let createdComment: any;
        await app.db.transaction(async (tx) => {
          const inserted = await tx
            .insert(schema.comments)
            .values({
              videoId,
              userId,
              content,
              parentCommentId: parentCommentId || null,
            })
            .returning();

          createdComment = inserted[0];

          // Increment comment count on video
          await tx.update(schema.videos).set({ commentsCount: video.commentsCount + 1 }).where(eq(schema.videos.id, videoId));

          // Create notification for video owner if not a reply
          if (!parentCommentId && video.userId !== userId) {
            await tx.insert(schema.notifications).values({
              userId: video.userId,
              type: 'comment',
              actorId: userId,
              videoId,
              commentId: inserted[0].id,
            });
          }
        });

        app.logger.info({ commentId: createdComment.id, videoId }, 'Comment created successfully');
        return {
          id: createdComment.id,
          userId: createdComment.userId,
          content: createdComment.content,
          createdAt: createdComment.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, videoId, userId }, 'Failed to create comment');
        throw error;
      }
    }
  );

  /**
   * POST /api/comments/:commentId/like
   * Likes a comment
   * Requires authentication
   */
  app.fastify.post(
    '/api/comments/:commentId/like',
    {
      schema: {
        description: 'Like a comment',
        tags: ['comments'],
        params: {
          type: 'object',
          properties: {
            commentId: { type: 'string' },
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

      const { commentId } = request.params as { commentId: string };
      const userId = session.user.id;

      app.logger.info({ userId, commentId }, 'Liking comment');

      try {
        // Check if comment exists
        const comment = await app.db.query.comments.findFirst({
          where: eq(schema.comments.id, commentId),
        });

        if (!comment) {
          app.logger.warn({ commentId }, 'Comment not found');
          return reply.code(404).send({ success: false, error: 'Comment not found' });
        }

        // Check if already liked
        const existingLike = await app.db.query.commentLikes.findFirst({
          where: and(eq(schema.commentLikes.userId, userId), eq(schema.commentLikes.commentId, commentId)),
        });

        if (existingLike) {
          app.logger.warn({ userId, commentId }, 'Comment already liked');
          return reply.code(400).send({ success: false, error: 'Comment already liked' });
        }

        // Add like and increment counter
        await app.db.transaction(async (tx) => {
          await tx.insert(schema.commentLikes).values({
            userId,
            commentId,
          });

          await tx.update(schema.comments).set({ likesCount: comment.likesCount + 1 }).where(eq(schema.comments.id, commentId));
        });

        const updatedComment = await app.db.query.comments.findFirst({
          where: eq(schema.comments.id, commentId),
        });

        app.logger.info({ userId, commentId, likesCount: updatedComment?.likesCount }, 'Comment liked successfully');
        return { success: true, likesCount: updatedComment?.likesCount || 0 };
      } catch (error) {
        app.logger.error({ err: error, userId, commentId }, 'Failed to like comment');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/comments/:commentId/like
   * Unlikes a comment
   * Requires authentication
   */
  app.fastify.delete(
    '/api/comments/:commentId/like',
    {
      schema: {
        description: 'Unlike a comment',
        tags: ['comments'],
        params: {
          type: 'object',
          properties: {
            commentId: { type: 'string' },
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

      const { commentId } = request.params as { commentId: string };
      const userId = session.user.id;

      app.logger.info({ userId, commentId }, 'Unliking comment');

      try {
        // Check if comment exists
        const comment = await app.db.query.comments.findFirst({
          where: eq(schema.comments.id, commentId),
        });

        if (!comment) {
          app.logger.warn({ commentId }, 'Comment not found');
          return reply.code(404).send({ success: false, error: 'Comment not found' });
        }

        // Check if like exists
        const existingLike = await app.db.query.commentLikes.findFirst({
          where: and(eq(schema.commentLikes.userId, userId), eq(schema.commentLikes.commentId, commentId)),
        });

        if (!existingLike) {
          app.logger.warn({ userId, commentId }, 'Like not found');
          return reply.code(400).send({ success: false, error: 'Like not found' });
        }

        // Remove like and decrement counter
        await app.db.transaction(async (tx) => {
          await tx.delete(schema.commentLikes).where(eq(schema.commentLikes.id, existingLike.id));

          await tx.update(schema.comments).set({ likesCount: Math.max(0, comment.likesCount - 1) }).where(eq(schema.comments.id, commentId));
        });

        const updatedComment = await app.db.query.comments.findFirst({
          where: eq(schema.comments.id, commentId),
        });

        app.logger.info({ userId, commentId, likesCount: updatedComment?.likesCount }, 'Comment unliked successfully');
        return { success: true, likesCount: updatedComment?.likesCount || 0 };
      } catch (error) {
        app.logger.error({ err: error, userId, commentId }, 'Failed to unlike comment');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/comments/:commentId
   * Deletes a comment (only if user is the comment author)
   * Requires authentication
   */
  app.fastify.delete(
    '/api/comments/:commentId',
    {
      schema: {
        description: 'Delete a comment',
        tags: ['comments'],
        params: {
          type: 'object',
          properties: {
            commentId: { type: 'string' },
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

      const { commentId } = request.params as { commentId: string };
      const userId = session.user.id;

      app.logger.info({ userId, commentId }, 'Deleting comment');

      try {
        // Check if comment exists and user owns it
        const comment = await app.db.query.comments.findFirst({
          where: eq(schema.comments.id, commentId),
        });

        if (!comment) {
          app.logger.warn({ commentId }, 'Comment not found');
          return reply.code(404).send({ success: false, error: 'Comment not found' });
        }

        if (comment.userId !== userId) {
          app.logger.warn({ userId, commentOwnerId: comment.userId }, 'Unauthorized to delete comment');
          return reply.code(403).send({ success: false, error: 'Unauthorized to delete this comment' });
        }

        // Delete comment and decrement video comment count
        await app.db.transaction(async (tx) => {
          await tx.delete(schema.comments).where(eq(schema.comments.id, commentId));

          // Decrement comment count on video
          const video = await tx.query.videos.findFirst({
            where: eq(schema.videos.id, comment.videoId),
          });

          if (video) {
            await tx.update(schema.videos).set({ commentsCount: Math.max(0, video.commentsCount - 1) }).where(eq(schema.videos.id, comment.videoId));
          }
        });

        app.logger.info({ userId, commentId }, 'Comment deleted successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId, commentId }, 'Failed to delete comment');
        throw error;
      }
    }
  );
}
