import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerNotificationRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/notifications
   * Returns user's notifications with actor and video details
   * Requires authentication
   */
  app.fastify.get(
    '/api/notifications',
    {
      schema: {
        description: 'Get user notifications',
        tags: ['notifications'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                actor: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    avatarUrl: { type: 'string' },
                  },
                },
                video: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    thumbnailUrl: { type: 'string' },
                  },
                },
                isRead: { type: 'boolean' },
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
      app.logger.info({ userId }, 'Fetching notifications');

      try {
        // Get notifications
        const notifications = await app.db
          .select({
            id: schema.notifications.id,
            type: schema.notifications.type,
            actorId: schema.notifications.actorId,
            videoId: schema.notifications.videoId,
            isRead: schema.notifications.isRead,
            createdAt: schema.notifications.createdAt,
          })
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, userId))
          .orderBy(desc(schema.notifications.createdAt));

        // Get actor details and video details for each notification
        const notificationsWithDetails = await Promise.all(
          notifications.map(async (notif) => {
            const actor = await app.db.query.user.findFirst({
              where: eq(user.id, notif.actorId),
            });

            let video = null;
            if (notif.videoId) {
              video = await app.db.query.videos.findFirst({
                where: eq(schema.videos.id, notif.videoId),
              });
            }

            return {
              id: notif.id,
              type: notif.type,
              actor: {
                id: actor?.id || '',
                username: actor?.name || '',
                avatarUrl: actor?.image || null,
              },
              video: video
                ? {
                    id: video.id,
                    thumbnailUrl: video.thumbnailUrl,
                  }
                : null,
              isRead: notif.isRead,
              createdAt: notif.createdAt,
            };
          })
        );

        app.logger.info({ userId, count: notificationsWithDetails.length }, 'Notifications fetched successfully');
        return notificationsWithDetails;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch notifications');
        throw error;
      }
    }
  );

  /**
   * PUT /api/notifications/:notificationId/read
   * Marks notification as read
   * Requires authentication
   */
  app.fastify.put(
    '/api/notifications/:notificationId/read',
    {
      schema: {
        description: 'Mark notification as read',
        tags: ['notifications'],
        params: {
          type: 'object',
          properties: {
            notificationId: { type: 'string' },
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

      const { notificationId } = request.params as { notificationId: string };
      const userId = session.user.id;

      app.logger.info({ userId, notificationId }, 'Marking notification as read');

      try {
        // Check if notification exists and belongs to user
        const notification = await app.db.query.notifications.findFirst({
          where: eq(schema.notifications.id, notificationId),
        });

        if (!notification) {
          app.logger.warn({ notificationId }, 'Notification not found');
          return reply.code(404).send({ success: false, error: 'Notification not found' });
        }

        if (notification.userId !== userId) {
          app.logger.warn({ userId, notificationOwnerId: notification.userId }, 'Unauthorized to mark notification as read');
          return reply.code(403).send({ success: false, error: 'Unauthorized' });
        }

        // Mark as read
        await app.db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.id, notificationId));

        app.logger.info({ notificationId }, 'Notification marked as read');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, notificationId }, 'Failed to mark notification as read');
        throw error;
      }
    }
  );

  /**
   * PUT /api/notifications/read-all
   * Marks all notifications as read
   * Requires authentication
   */
  app.fastify.put(
    '/api/notifications/read-all',
    {
      schema: {
        description: 'Mark all notifications as read',
        tags: ['notifications'],
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

      app.logger.info({ userId }, 'Marking all notifications as read');

      try {
        // Mark all as read
        await app.db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false)));

        app.logger.info({ userId }, 'All notifications marked as read');
        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to mark all notifications as read');
        throw error;
      }
    }
  );
}
