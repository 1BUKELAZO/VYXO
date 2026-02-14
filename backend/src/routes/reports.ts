import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerReportRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/reports
   * Create a report for a video, user, or comment
   * Requires authentication
   */
  app.fastify.post(
    '/api/reports',
    {
      schema: {
        description: 'Create a report',
        tags: ['reports'],
        body: {
          type: 'object',
          required: ['target_id', 'target_type', 'reason'],
          properties: {
            target_id: { type: 'string' },
            target_type: { type: 'string', enum: ['video', 'user', 'comment'] },
            reason: { type: 'string' },
            description: { type: 'string' },
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

      const reporterId = session.user.id;
      const { target_id, target_type, reason, description } = request.body as {
        target_id: string;
        target_type: 'video' | 'user' | 'comment';
        reason: string;
        description?: string;
      };

      app.logger.info({ reporterId, target_id, target_type, reason }, 'Creating report');

      try {
        // Prevent self-reports for users
        if (target_type === 'user' && reporterId === target_id) {
          app.logger.warn({ reporterId, target_id }, 'Cannot report yourself');
          return reply.code(400).send({ success: false, error: 'Cannot report yourself' });
        }

        // Validate report reason
        const validReasons = [
          'Spam',
          'Inappropriate content',
          'Harassment or bullying',
          'Violence or dangerous content',
          'Hate speech',
          'Copyright violation',
          'Other',
        ];

        if (!validReasons.includes(reason)) {
          app.logger.warn({ reason }, 'Invalid report reason');
          return reply.code(400).send({ success: false, error: 'Invalid report reason' });
        }

        // Create report
        const [report] = await app.db
          .insert(schema.reports)
          .values({
            reporterId,
            targetId: target_id,
            targetType: target_type,
            reason,
            description: description || null,
            status: 'pending',
          })
          .returning({ id: schema.reports.id, createdAt: schema.reports.createdAt });

        app.logger.info({ reportId: report.id, reporterId, target_id }, 'Report created successfully');
        return { id: report.id, created_at: report.createdAt };
      } catch (error) {
        app.logger.error({ err: error, reporterId, target_id }, 'Failed to create report');
        throw error;
      }
    }
  );
}
