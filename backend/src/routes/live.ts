import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, isNotNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerLiveRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/live/start
   * Creates a live stream
   * Requires authentication
   */
  app.fastify.post(
    '/api/live/start',
    {
      schema: {
        description: 'Start a live stream',
        tags: ['live'],
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
          },
          required: ['title'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              streamId: { type: 'string' },
              streamUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { title } = request.body as { title: string };
      const userId = session.user.id;

      app.logger.info({ userId, title }, 'Starting live stream');

      try {
        // Generate a stream URL (in production, this would use a streaming service)
        const streamUrl = `https://live.vyxo.app/${userId}-${Date.now()}`;

        const stream = await app.db
          .insert(schema.liveStreams)
          .values({
            userId,
            title,
            streamUrl,
          })
          .returning();

        app.logger.info({ streamId: stream[0].id, userId }, 'Live stream started successfully');
        return {
          streamId: stream[0].id,
          streamUrl: stream[0].streamUrl,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, title }, 'Failed to start live stream');
        throw error;
      }
    }
  );

  /**
   * PUT /api/live/:streamId/end
   * Ends a live stream (only if user is the streamer)
   * Requires authentication
   */
  app.fastify.put(
    '/api/live/:streamId/end',
    {
      schema: {
        description: 'End a live stream',
        tags: ['live'],
        params: {
          type: 'object',
          properties: {
            streamId: { type: 'string' },
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

      const { streamId } = request.params as { streamId: string };
      const userId = session.user.id;

      app.logger.info({ streamId, userId }, 'Ending live stream');

      try {
        // Check if stream exists and user owns it
        const stream = await app.db.query.liveStreams.findFirst({
          where: eq(schema.liveStreams.id, streamId),
        });

        if (!stream) {
          app.logger.warn({ streamId }, 'Stream not found');
          return reply.code(404).send({ success: false, error: 'Stream not found' });
        }

        if (stream.userId !== userId) {
          app.logger.warn({ streamId, userId, streamerUserId: stream.userId }, 'Unauthorized to end stream');
          return reply.code(403).send({ success: false, error: 'Unauthorized to end this stream' });
        }

        // End the stream
        await app.db
          .update(schema.liveStreams)
          .set({ isActive: false, endedAt: new Date() })
          .where(eq(schema.liveStreams.id, streamId));

        app.logger.info({ streamId }, 'Live stream ended successfully');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, streamId }, 'Failed to end live stream');
        throw error;
      }
    }
  );

  /**
   * GET /api/live/:streamId
   * Returns stream details
   * Requires authentication
   */
  app.fastify.get(
    '/api/live/:streamId',
    {
      schema: {
        description: 'Get live stream details',
        tags: ['live'],
        params: {
          type: 'object',
          properties: {
            streamId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              username: { type: 'string' },
              avatarUrl: { type: 'string' },
              title: { type: 'string' },
              viewerCount: { type: 'number' },
              startedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { streamId } = request.params as { streamId: string };

      app.logger.info({ streamId }, 'Fetching stream details');

      try {
        const stream = await app.db
          .select({
            id: schema.liveStreams.id,
            userId: schema.liveStreams.userId,
            username: user.name,
            avatarUrl: user.image,
            title: schema.liveStreams.title,
            viewerCount: schema.liveStreams.viewerCount,
            startedAt: schema.liveStreams.startedAt,
          })
          .from(schema.liveStreams)
          .innerJoin(user, eq(schema.liveStreams.userId, user.id))
          .where(eq(schema.liveStreams.id, streamId));

        if (stream.length === 0) {
          app.logger.warn({ streamId }, 'Stream not found');
          return reply.code(404).send({ success: false, error: 'Stream not found' });
        }

        app.logger.info({ streamId }, 'Stream details fetched successfully');
        return stream[0];
      } catch (error) {
        app.logger.error({ err: error, streamId }, 'Failed to fetch stream details');
        throw error;
      }
    }
  );

  /**
   * GET /api/live/active
   * Returns active live streams
   * Requires authentication
   */
  app.fastify.get(
    '/api/live/active',
    {
      schema: {
        description: 'Get active live streams',
        tags: ['live'],
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
                title: { type: 'string' },
                viewerCount: { type: 'number' },
                thumbnailUrl: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({}, 'Fetching active streams');

      try {
        const streams = await app.db
          .select({
            id: schema.liveStreams.id,
            userId: schema.liveStreams.userId,
            username: user.name,
            avatarUrl: user.image,
            title: schema.liveStreams.title,
            viewerCount: schema.liveStreams.viewerCount,
            thumbnailUrl: null,
          })
          .from(schema.liveStreams)
          .innerJoin(user, eq(schema.liveStreams.userId, user.id))
          .where(eq(schema.liveStreams.isActive, true))
          .orderBy(desc(schema.liveStreams.viewerCount))
          .limit(50);

        app.logger.info({ count: streams.length }, 'Active streams fetched successfully');
        return streams;
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch active streams');
        throw error;
      }
    }
  );

  /**
   * POST /api/live/:streamId/chat
   * Sends a chat message in live stream
   * Requires authentication
   */
  app.fastify.post(
    '/api/live/:streamId/chat',
    {
      schema: {
        description: 'Send chat message in live stream',
        tags: ['live'],
        params: {
          type: 'object',
          properties: {
            streamId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              message: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { streamId } = request.params as { streamId: string };
      const { message } = request.body as { message: string };
      const userId = session.user.id;

      app.logger.info({ streamId, userId }, 'Sending chat message');

      try {
        // Check if stream exists
        const stream = await app.db.query.liveStreams.findFirst({
          where: eq(schema.liveStreams.id, streamId),
        });

        if (!stream) {
          app.logger.warn({ streamId }, 'Stream not found');
          return reply.code(404).send({ success: false, error: 'Stream not found' });
        }

        const chatMessage = await app.db
          .insert(schema.liveChatMessages)
          .values({
            streamId,
            userId,
            message,
          })
          .returning();

        app.logger.info({ streamId, messageId: chatMessage[0].id }, 'Chat message sent successfully');
        return {
          id: chatMessage[0].id,
          userId: chatMessage[0].userId,
          message: chatMessage[0].message,
          createdAt: chatMessage[0].createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error, streamId, userId }, 'Failed to send chat message');
        throw error;
      }
    }
  );

  /**
   * GET /api/live/:streamId/chat
   * Returns recent chat messages
   * Requires authentication
   */
  app.fastify.get(
    '/api/live/:streamId/chat',
    {
      schema: {
        description: 'Get recent chat messages',
        tags: ['live'],
        params: {
          type: 'object',
          properties: {
            streamId: { type: 'string' },
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
                message: { type: 'string' },
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

      const { streamId } = request.params as { streamId: string };

      app.logger.info({ streamId }, 'Fetching chat messages');

      try {
        // Check if stream exists
        const stream = await app.db.query.liveStreams.findFirst({
          where: eq(schema.liveStreams.id, streamId),
        });

        if (!stream) {
          app.logger.warn({ streamId }, 'Stream not found');
          return reply.code(404).send({ success: false, error: 'Stream not found' });
        }

        const messages = await app.db
          .select({
            id: schema.liveChatMessages.id,
            userId: schema.liveChatMessages.userId,
            username: user.name,
            message: schema.liveChatMessages.message,
            createdAt: schema.liveChatMessages.createdAt,
          })
          .from(schema.liveChatMessages)
          .innerJoin(user, eq(schema.liveChatMessages.userId, user.id))
          .where(eq(schema.liveChatMessages.streamId, streamId))
          .orderBy(desc(schema.liveChatMessages.createdAt))
          .limit(100);

        app.logger.info({ streamId, count: messages.length }, 'Chat messages fetched successfully');
        return messages.reverse(); // Return in chronological order
      } catch (error) {
        app.logger.error({ err: error, streamId }, 'Failed to fetch chat messages');
        throw error;
      }
    }
  );
}
