import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerBlockRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/blocks
   * Block a user
   * Requires authentication
   */
  app.fastify.post(
    '/api/blocks',
    {
      schema: {
        description: 'Block a user',
        tags: ['blocks'],
        body: {
          type: 'object',
          required: ['blocked_id'],
          properties: {
            blocked_id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              created_at: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const blockerId = session.user.id;
      const { blocked_id } = request.body as { blocked_id: string };

      app.logger.info({ blockerId, blocked_id }, 'Blocking user');

      try {
        // Prevent self-blocking
        if (blockerId === blocked_id) {
          app.logger.warn({ blockerId }, 'Cannot block yourself');
          return reply.code(400).send({ success: false, error: 'Cannot block yourself' });
        }

        // Check if user exists
        const targetUser = await app.db.query.user.findFirst({
          where: eq(user.id, blocked_id),
        });

        if (!targetUser) {
          app.logger.warn({ blocked_id }, 'User not found');
          return reply.code(404).send({ success: false, error: 'User not found' });
        }

        // Check if already blocked
        const existingBlock = await app.db.query.blocks.findFirst({
          where: and(eq(schema.blocks.blockerId, blockerId), eq(schema.blocks.blockedId, blocked_id)),
        });

        if (existingBlock) {
          app.logger.info({ blockerId, blocked_id, blockId: existingBlock.id }, 'User already blocked');
          return { id: existingBlock.id, created_at: existingBlock.createdAt };
        }

        // Create block
        const [block] = await app.db
          .insert(schema.blocks)
          .values({
            blockerId,
            blockedId: blocked_id,
          })
          .returning({ id: schema.blocks.id, createdAt: schema.blocks.createdAt });

        app.logger.info({ blockId: block.id, blockerId, blocked_id }, 'User blocked successfully');
        return { id: block.id, created_at: block.createdAt };
      } catch (error) {
        app.logger.error({ err: error, blockerId, blocked_id }, 'Failed to block user');
        throw error;
      }
    }
  );

  /**
   * GET /api/blocks
   * Get list of blocked users by authenticated user
   * Requires authentication
   */
  app.fastify.get(
    '/api/blocks',
    {
      schema: {
        description: 'Get blocked users',
        tags: ['blocks'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                blocked_id: { type: 'string' },
                created_at: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const blockerId = session.user.id;

      app.logger.info({ blockerId }, 'Fetching blocked users');

      try {
        const blockedUsers = await app.db
          .select({
            id: schema.blocks.id,
            blocked_id: schema.blocks.blockedId,
            created_at: schema.blocks.createdAt,
          })
          .from(schema.blocks)
          .where(eq(schema.blocks.blockerId, blockerId));

        app.logger.info({ blockerId, count: blockedUsers.length }, 'Blocked users fetched successfully');
        return blockedUsers;
      } catch (error) {
        app.logger.error({ err: error, blockerId }, 'Failed to fetch blocked users');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/blocks/:blockedId
   * Unblock a user
   * Requires authentication
   */
  app.fastify.delete(
    '/api/blocks/:blockedId',
    {
      schema: {
        description: 'Unblock a user',
        tags: ['blocks'],
        params: {
          type: 'object',
          properties: {
            blockedId: { type: 'string' },
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

      const blockerId = session.user.id;
      const { blockedId } = request.params as { blockedId: string };

      app.logger.info({ blockerId, blockedId }, 'Unblocking user');

      try {
        // Check if block exists
        const existingBlock = await app.db.query.blocks.findFirst({
          where: and(eq(schema.blocks.blockerId, blockerId), eq(schema.blocks.blockedId, blockedId)),
        });

        if (!existingBlock) {
          app.logger.warn({ blockerId, blockedId }, 'Block not found');
          return reply.code(404).send({ success: false, error: 'Block not found' });
        }

        // Delete block
        await app.db.delete(schema.blocks).where(eq(schema.blocks.id, existingBlock.id));

        app.logger.info({ blockerId, blockedId }, 'User unblocked successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, blockerId, blockedId }, 'Failed to unblock user');
        throw error;
      }
    }
  );
}
