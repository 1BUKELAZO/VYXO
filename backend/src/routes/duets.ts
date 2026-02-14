import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql, notInArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerDuetRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/videos/:videoId/duets
   * Returns list of duet/stitch videos made with this video
   * Requires authentication
   */
  app.fastify.get(
    '/api/videos/:videoId/duets',
    {
      schema: {
        description: 'Get duets and stitches for a video',
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
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                username: { type: 'string' },
                avatarUrl: { type: 'string' },
                thumbnailUrl: { type: 'string' },
                isDuet: { type: 'boolean' },
                isStitch: { type: 'boolean' },
                duetLayout: { type: 'string' },
                createdAt: { type: 'string' },
                likesCount: { type: 'number' },
                viewsCount: { type: 'number' },
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

      app.logger.info({ videoId, currentUserId, limit, offset }, 'Fetching duets/stitches');

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

        // Get blocked users
        const blockedUsers = await app.db
          .select({ blockedId: schema.blocks.blockedId })
          .from(schema.blocks)
          .where(eq(schema.blocks.blockerId, currentUserId));

        const blockedUserIds = blockedUsers.map((b) => b.blockedId);

        // Build where conditions
        const whereConditions = [
          eq(schema.videos.duetWithId, videoId),
          eq(schema.videos.status, 'ready'),
        ];

        if (blockedUserIds.length > 0) {
          whereConditions.push(notInArray(schema.videos.userId, blockedUserIds));
        }

        // Get duets/stitches
        const duets = await app.db
          .select({
            id: schema.videos.id,
            userId: schema.videos.userId,
            username: user.name,
            avatarUrl: user.image,
            thumbnailUrl: schema.videos.thumbnailUrl,
            isDuet: schema.videos.isDuet,
            isStitch: schema.videos.isStitch,
            duetLayout: schema.videos.duetLayout,
            createdAt: schema.videos.createdAt,
            likesCount: schema.videos.likesCount,
            viewsCount: schema.videos.viewsCount,
          })
          .from(schema.videos)
          .leftJoin(user, eq(schema.videos.userId, user.id))
          .where(and(...whereConditions))
          .orderBy(desc(schema.videos.createdAt))
          .limit(limit)
          .offset(offset);

        app.logger.info({ videoId, count: duets.length }, 'Duets/stitches fetched');

        return duets;
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to fetch duets/stitches');
        throw error;
      }
    }
  );

  /**
   * GET /api/videos/:videoId/duets-count
   * Returns count of duets/stitches for a video
   * Requires authentication
   */
  app.fastify.get(
    '/api/videos/:videoId/duets-count',
    {
      schema: {
        description: 'Get duets/stitches count for a video',
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
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { videoId } = request.params as { videoId: string };

      app.logger.info({ videoId }, 'Fetching duets/stitches count');

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

        const count = video.duetsCount || 0;

        app.logger.info({ videoId, count }, 'Duets/stitches count fetched');

        return { count };
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to fetch duets/stitches count');
        throw error;
      }
    }
  );
}
