import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, desc, count, isNull } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

// Utility function to normalize participant IDs (ensure smaller ID is participant_1)
function normalizeParticipants(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

export function registerMessageRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/messages/conversations
   * Returns all conversations for the authenticated user
   * Requires authentication
   */
  app.fastify.get(
    '/api/messages/conversations',
    {
      schema: {
        description: 'Get user conversations',
        tags: ['messages'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                participant1: { type: 'string' },
                participant2: { type: 'string' },
                lastMessageAt: { type: 'string' },
                otherParticipantId: { type: 'string' },
                otherParticipantUsername: { type: 'string' },
                otherParticipantAvatarUrl: { type: 'string' },
                lastMessageContent: { type: 'string' },
                unreadCount: { type: 'number' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const currentUserId = session.user.id;

      app.logger.info({ currentUserId }, 'Fetching conversations');

      try {
        // Get all conversations where user is a participant
        const conversations = await app.db
          .select({
            id: schema.conversations.id,
            participant1: schema.conversations.participant1,
            participant2: schema.conversations.participant2,
            lastMessageAt: schema.conversations.lastMessageAt,
            otherParticipantId: schema.conversations.participant1 === currentUserId
              ? schema.conversations.participant2
              : schema.conversations.participant1,
            otherParticipantUsername: user.name,
            otherParticipantAvatarUrl: user.image,
            lastMessageContent: schema.messages.content,
            unreadCount: count(schema.messages.id),
          })
          .from(schema.conversations)
          .leftJoin(
            schema.messages,
            and(
              eq(schema.messages.conversationId, schema.conversations.id),
              isNull(schema.messages.readAt),
              eq(schema.messages.senderId,
                schema.conversations.participant1 === currentUserId
                  ? schema.conversations.participant2
                  : schema.conversations.participant1
              )
            )
          )
          .leftJoin(
            user,
            eq(
              user.id,
              schema.conversations.participant1 === currentUserId
                ? schema.conversations.participant2
                : schema.conversations.participant1
            )
          )
          .where(
            or(
              eq(schema.conversations.participant1, currentUserId),
              eq(schema.conversations.participant2, currentUserId)
            )
          )
          .groupBy(
            schema.conversations.id,
            schema.conversations.participant1,
            schema.conversations.participant2,
            schema.conversations.lastMessageAt,
            user.id,
            user.name,
            user.image,
            schema.messages.content
          )
          .orderBy(desc(schema.conversations.lastMessageAt));

        app.logger.info({ currentUserId, count: conversations.length }, 'Conversations fetched');

        return conversations;
      } catch (error) {
        app.logger.error({ err: error, currentUserId }, 'Failed to fetch conversations');
        throw error;
      }
    }
  );

  /**
   * GET /api/messages/conversations/:conversationId/messages
   * Returns all messages for a specific conversation
   * Requires authentication
   */
  app.fastify.get(
    '/api/messages/conversations/:conversationId/messages',
    {
      schema: {
        description: 'Get messages in a conversation',
        tags: ['messages'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
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
                conversationId: { type: 'string' },
                senderId: { type: 'string' },
                content: { type: 'string' },
                createdAt: { type: 'string' },
                readAt: { type: 'string' },
                senderUsername: { type: 'string' },
                senderAvatarUrl: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const currentUserId = session.user.id;
      const { conversationId } = request.params as { conversationId: string };
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };

      app.logger.info({ currentUserId, conversationId, limit, offset }, 'Fetching conversation messages');

      try {
        // Verify user is a participant in the conversation
        const [conversation] = await app.db
          .select()
          .from(schema.conversations)
          .where(
            and(
              eq(schema.conversations.id, conversationId),
              or(
                eq(schema.conversations.participant1, currentUserId),
                eq(schema.conversations.participant2, currentUserId)
              )
            )
          );

        if (!conversation) {
          app.logger.warn({ currentUserId, conversationId }, 'User not participant in conversation');
          return reply.code(403).send({ success: false, error: 'Unauthorized' });
        }

        // Get messages
        const messages = await app.db
          .select({
            id: schema.messages.id,
            conversationId: schema.messages.conversationId,
            senderId: schema.messages.senderId,
            content: schema.messages.content,
            createdAt: schema.messages.createdAt,
            readAt: schema.messages.readAt,
            senderUsername: user.name,
            senderAvatarUrl: user.image,
          })
          .from(schema.messages)
          .leftJoin(user, eq(schema.messages.senderId, user.id))
          .where(eq(schema.messages.conversationId, conversationId))
          .orderBy(schema.messages.createdAt)
          .limit(limit)
          .offset(offset);

        app.logger.info({ currentUserId, conversationId, count: messages.length }, 'Conversation messages fetched');

        return messages;
      } catch (error) {
        app.logger.error({ err: error, currentUserId, conversationId }, 'Failed to fetch messages');
        throw error;
      }
    }
  );

  /**
   * POST /api/messages/send
   * Sends a message to another user
   * Creates or finds conversation, creates message
   * Requires authentication
   */
  app.fastify.post(
    '/api/messages/send',
    {
      schema: {
        description: 'Send a message',
        tags: ['messages'],
        body: {
          type: 'object',
          properties: {
            recipientId: { type: 'string' },
            content: { type: 'string' },
            conversationId: { type: 'string' },
          },
          required: ['recipientId', 'content'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  conversationId: { type: 'string' },
                  senderId: { type: 'string' },
                  content: { type: 'string' },
                  createdAt: { type: 'string' },
                  readAt: { type: 'string' },
                },
              },
              conversationId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const currentUserId = session.user.id;
      const { recipientId, content, conversationId } = request.body as {
        recipientId: string;
        content: string;
        conversationId?: string;
      };

      app.logger.info({ currentUserId, recipientId, contentLength: content.length }, 'Sending message');

      try {
        // Validate content length
        if (!content || content.trim().length === 0) {
          app.logger.warn({ currentUserId }, 'Empty message content');
          return reply.code(400).send({ success: false, error: 'Message content cannot be empty' });
        }

        if (content.length > 5000) {
          app.logger.warn({ currentUserId }, 'Message content too long');
          return reply.code(400).send({ success: false, error: 'Message content too long' });
        }

        // Prevent self-messaging
        if (currentUserId === recipientId) {
          app.logger.warn({ currentUserId }, 'Cannot message self');
          return reply.code(400).send({ success: false, error: 'Cannot message yourself' });
        }

        // Normalize participant IDs
        const [participant1, participant2] = normalizeParticipants(currentUserId, recipientId);

        // Find or create conversation
        let conversation = await app.db
          .select()
          .from(schema.conversations)
          .where(
            and(
              eq(schema.conversations.participant1, participant1),
              eq(schema.conversations.participant2, participant2)
            )
          );

        let finalConversationId: string;

        if (conversation.length > 0) {
          finalConversationId = conversation[0].id;
        } else {
          // Create new conversation
          const [newConversation] = await app.db
            .insert(schema.conversations)
            .values({
              participant1,
              participant2,
            })
            .returning();

          finalConversationId = newConversation.id;
          app.logger.info({ conversationId: finalConversationId }, 'Conversation created');
        }

        // Create message
        const [message] = await app.db
          .insert(schema.messages)
          .values({
            conversationId: finalConversationId,
            senderId: currentUserId,
            content: content.trim(),
          })
          .returning();

        // Update conversation's lastMessageAt
        await app.db
          .update(schema.conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(schema.conversations.id, finalConversationId));

        app.logger.info({ messageId: message.id, conversationId: finalConversationId }, 'Message sent');

        return {
          message: {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            content: message.content,
            createdAt: message.createdAt,
            readAt: message.readAt,
          },
          conversationId: finalConversationId,
        };
      } catch (error) {
        app.logger.error({ err: error, currentUserId, recipientId }, 'Failed to send message');
        throw error;
      }
    }
  );

  /**
   * POST /api/messages/:messageId/read
   * Marks a message as read
   * Requires authentication
   */
  app.fastify.post(
    '/api/messages/:messageId/read',
    {
      schema: {
        description: 'Mark message as read',
        tags: ['messages'],
        params: {
          type: 'object',
          properties: {
            messageId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  readAt: { type: 'string' },
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

      const currentUserId = session.user.id;
      const { messageId } = request.params as { messageId: string };

      app.logger.info({ currentUserId, messageId }, 'Marking message as read');

      try {
        // Get message
        const [message] = await app.db
          .select()
          .from(schema.messages)
          .where(eq(schema.messages.id, messageId));

        if (!message) {
          app.logger.warn({ messageId }, 'Message not found');
          return reply.code(404).send({ success: false, error: 'Message not found' });
        }

        // Verify user is the recipient (not the sender)
        if (message.senderId === currentUserId) {
          app.logger.warn({ currentUserId, messageId }, 'User cannot mark own message as read');
          return reply.code(403).send({ success: false, error: 'Cannot mark your own message as read' });
        }

        // Verify user is a participant in the conversation
        const [conversation] = await app.db
          .select()
          .from(schema.conversations)
          .where(
            and(
              eq(schema.conversations.id, message.conversationId),
              or(
                eq(schema.conversations.participant1, currentUserId),
                eq(schema.conversations.participant2, currentUserId)
              )
            )
          );

        if (!conversation) {
          app.logger.warn({ currentUserId, conversationId: message.conversationId }, 'User not participant');
          return reply.code(403).send({ success: false, error: 'Unauthorized' });
        }

        // Mark as read
        const [updatedMessage] = await app.db
          .update(schema.messages)
          .set({ readAt: new Date() })
          .where(eq(schema.messages.id, messageId))
          .returning();

        app.logger.info({ messageId, readAt: updatedMessage.readAt }, 'Message marked as read');

        return {
          success: true,
          message: {
            id: updatedMessage.id,
            readAt: updatedMessage.readAt,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, currentUserId, messageId }, 'Failed to mark message as read');
        throw error;
      }
    }
  );

  /**
   * POST /api/messages/conversations/:conversationId/read-all
   * Marks all unread messages in a conversation as read
   * Requires authentication
   */
  app.fastify.post(
    '/api/messages/conversations/:conversationId/read-all',
    {
      schema: {
        description: 'Mark all messages in conversation as read',
        tags: ['messages'],
        params: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              markedCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const currentUserId = session.user.id;
      const { conversationId } = request.params as { conversationId: string };

      app.logger.info({ currentUserId, conversationId }, 'Marking all messages in conversation as read');

      try {
        // Verify user is a participant in the conversation
        const [conversation] = await app.db
          .select()
          .from(schema.conversations)
          .where(
            and(
              eq(schema.conversations.id, conversationId),
              or(
                eq(schema.conversations.participant1, currentUserId),
                eq(schema.conversations.participant2, currentUserId)
              )
            )
          );

        if (!conversation) {
          app.logger.warn({ currentUserId, conversationId }, 'User not participant in conversation');
          return reply.code(403).send({ success: false, error: 'Unauthorized' });
        }

        // Get other participant ID
        const otherParticipantId =
          conversation.participant1 === currentUserId ? conversation.participant2 : conversation.participant1;

        // Mark all unread messages from other participant as read
        const result = await app.db
          .update(schema.messages)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(schema.messages.conversationId, conversationId),
              eq(schema.messages.senderId, otherParticipantId),
              isNull(schema.messages.readAt)
            )
          )
          .returning();

        app.logger.info({ conversationId, markedCount: result.length }, 'All messages marked as read');

        return {
          success: true,
          markedCount: result.length,
        };
      } catch (error) {
        app.logger.error({ err: error, currentUserId, conversationId }, 'Failed to mark all messages as read');
        throw error;
      }
    }
  );

  /**
   * GET /api/messages/unread-count
   * Returns total count of unread messages for the authenticated user
   * Requires authentication
   */
  app.fastify.get(
    '/api/messages/unread-count',
    {
      schema: {
        description: 'Get unread message count',
        tags: ['messages'],
        response: {
          200: {
            type: 'object',
            properties: {
              unreadCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const currentUserId = session.user.id;

      app.logger.info({ currentUserId }, 'Fetching unread message count');

      try {
        // Count unread messages where user is recipient
        const result = await app.db
          .select({ count: count(schema.messages.id) })
          .from(schema.messages)
          .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
          .where(
            and(
              isNull(schema.messages.readAt),
              or(
                eq(schema.conversations.participant1, currentUserId),
                eq(schema.conversations.participant2, currentUserId)
              ),
              // Not the sender
              eq(
                schema.messages.senderId,
                schema.conversations.participant1 === currentUserId
                  ? schema.conversations.participant2
                  : schema.conversations.participant1
              )
            )
          );

        const unreadCount = result[0]?.count || 0;

        app.logger.info({ currentUserId, unreadCount }, 'Unread count fetched');

        return {
          unreadCount,
        };
      } catch (error) {
        app.logger.error({ err: error, currentUserId }, 'Failed to fetch unread count');
        throw error;
      }
    }
  );
}
