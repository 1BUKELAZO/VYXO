import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, gte, lte, count, sum, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';

// Utility function to calculate RPM based on CTR
function calculateRPM(ctr: number): number {
  if (ctr > 10) {
    return 1.0;
  } else if (ctr >= 5) {
    return 0.75;
  } else {
    return 0.5;
  }
}

// Utility function to convert numeric string to number
function numericToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return 0;
}

export function registerCreatorRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/creator/apply
   * Apply to become a creator
   * Requires authentication
   */
  app.fastify.post(
    '/api/creator/apply',
    {
      schema: {
        description: 'Apply to creator fund',
        tags: ['creator'],
        body: {
          type: 'object',
          properties: {
            paymentMethod: { type: 'string' },
            paymentDetails: { type: 'object' },
          },
          required: ['paymentMethod', 'paymentDetails'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              application: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  appliedAt: { type: 'string' },
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
      const { paymentMethod, paymentDetails } = request.body as {
        paymentMethod: string;
        paymentDetails: Record<string, unknown>;
      };

      app.logger.info({ userId, paymentMethod }, 'Creator application submitted');

      try {
        // Check if user already has an application
        const [existingApp] = await app.db
          .select()
          .from(schema.creatorApplications)
          .where(eq(schema.creatorApplications.userId, userId));

        if (existingApp) {
          app.logger.info({ userId, appId: existingApp.id }, 'User already has application');
          return {
            success: true,
            application: {
              id: existingApp.id,
              status: existingApp.status,
              appliedAt: existingApp.appliedAt,
            },
          };
        }

        // Check if user has >10k followers
        const followerCountResult = await app.db
          .select({ count: count() })
          .from(schema.follows)
          .where(eq(schema.follows.followingId, userId));

        const followerCount = followerCountResult[0]?.count || 0;

        if (followerCount < 10000) {
          app.logger.warn({ userId, followerCount }, 'User does not meet follower requirement');
          return reply.code(403).send({
            success: false,
            error: 'You must have at least 10,000 followers to apply to the creator fund',
          });
        }

        // Create application
        const [application] = await app.db
          .insert(schema.creatorApplications)
          .values({
            userId,
            paymentMethod,
            paymentDetails: paymentDetails as any,
            status: 'pending',
          })
          .returning();

        app.logger.info({ userId, appId: application.id, status: application.status }, 'Creator application created');

        return {
          success: true,
          application: {
            id: application.id,
            status: application.status,
            appliedAt: application.appliedAt,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to submit creator application');
        throw error;
      }
    }
  );

  /**
   * GET /api/creator/application-status
   * Get current user's creator application status
   * Requires authentication
   */
  app.fastify.get(
    '/api/creator/application-status',
    {
      schema: {
        description: 'Get creator application status',
        tags: ['creator'],
        response: {
          200: {
            type: 'object',
            properties: {
              hasApplied: { type: 'boolean' },
              status: { type: 'string' },
              appliedAt: { type: 'string' },
              approvedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching creator application status');

      try {
        const [application] = await app.db
          .select()
          .from(schema.creatorApplications)
          .where(eq(schema.creatorApplications.userId, userId));

        if (!application) {
          return {
            hasApplied: false,
          };
        }

        const response: any = {
          hasApplied: true,
          status: application.status,
          appliedAt: application.appliedAt,
        };

        if (application.approvedAt) {
          response.approvedAt = application.approvedAt;
        }

        app.logger.info({ userId, status: application.status }, 'Application status retrieved');

        return response;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch application status');
        throw error;
      }
    }
  );

  /**
   * GET /api/creator/dashboard
   * Get creator dashboard statistics
   * Requires authentication and approval
   */
  app.fastify.get(
    '/api/creator/dashboard',
    {
      schema: {
        description: 'Get creator dashboard',
        tags: ['creator'],
        response: {
          200: {
            type: 'object',
            properties: {
              views7d: { type: 'number' },
              views30d: { type: 'number' },
              views90d: { type: 'number' },
              earnings7d: { type: 'number' },
              earnings30d: { type: 'number' },
              earnings90d: { type: 'number' },
              rpm: { type: 'number' },
              cpm: { type: 'number' },
              ctr: { type: 'number' },
              avgWatchTime: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching creator dashboard');

      try {
        // Check if user is approved creator
        const [application] = await app.db
          .select()
          .from(schema.creatorApplications)
          .where(
            and(
              eq(schema.creatorApplications.userId, userId),
              eq(schema.creatorApplications.status, 'approved')
            )
          );

        if (!application) {
          app.logger.warn({ userId }, 'User is not an approved creator');
          return reply.code(403).send({
            success: false,
            error: 'You must be an approved creator to access this resource',
          });
        }

        const now = new Date();
        const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        // Get user's videos
        const userVideos = await app.db
          .select({ id: schema.videos.id, duration: schema.videos.duration })
          .from(schema.videos)
          .where(eq(schema.videos.userId, userId));

        const videoIds = userVideos.map((v) => v.id);

        // Calculate views by period
        let views7d = 0;
        let views30d = 0;
        let views90d = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;
        let totalAvgDuration = 0;

        if (videoIds.length > 0) {
          // Get video stats
          const videoStats = await app.db
            .select({
              likesCount: sum(schema.videos.likesCount),
              commentsCount: sum(schema.videos.commentsCount),
              sharesCount: sum(schema.videos.sharesCount),
            })
            .from(schema.videos)
            .where(sql`${schema.videos.id} IN (${sql.join(videoIds)})`);

          if (videoStats[0]) {
            totalLikes = numericToNumber(videoStats[0].likesCount);
            totalComments = numericToNumber(videoStats[0].commentsCount);
            totalShares = numericToNumber(videoStats[0].sharesCount);
          }

          // Calculate average watch time
          const durationSum = userVideos.reduce((sum, v) => sum + (v.duration || 0), 0);
          totalAvgDuration = userVideos.length > 0 ? durationSum / userVideos.length : 0;

          // Get views by period
          const views7dResult = await app.db
            .select({ count: count() })
            .from(schema.videoViews)
            .where(
              and(
                sql`${schema.videoViews.videoId} IN (${sql.join(videoIds)})`,
                gte(schema.videoViews.viewedAt, days7Ago)
              )
            );

          views7d = views7dResult[0]?.count || 0;

          const views30dResult = await app.db
            .select({ count: count() })
            .from(schema.videoViews)
            .where(
              and(
                sql`${schema.videoViews.videoId} IN (${sql.join(videoIds)})`,
                gte(schema.videoViews.viewedAt, days30Ago)
              )
            );

          views30d = views30dResult[0]?.count || 0;

          const views90dResult = await app.db
            .select({ count: count() })
            .from(schema.videoViews)
            .where(
              and(
                sql`${schema.videoViews.videoId} IN (${sql.join(videoIds)})`,
                gte(schema.videoViews.viewedAt, days90Ago)
              )
            );

          views90d = views90dResult[0]?.count || 0;
        }

        // Get earnings by period
        const earnings7dResult = await app.db
          .select({ sum: sum(schema.creatorEarnings.amount) })
          .from(schema.creatorEarnings)
          .where(
            and(eq(schema.creatorEarnings.userId, userId), gte(schema.creatorEarnings.createdAt, days7Ago))
          );

        const earnings7d = numericToNumber(earnings7dResult[0]?.sum);

        const earnings30dResult = await app.db
          .select({ sum: sum(schema.creatorEarnings.amount) })
          .from(schema.creatorEarnings)
          .where(
            and(eq(schema.creatorEarnings.userId, userId), gte(schema.creatorEarnings.createdAt, days30Ago))
          );

        const earnings30d = numericToNumber(earnings30dResult[0]?.sum);

        const earnings90dResult = await app.db
          .select({ sum: sum(schema.creatorEarnings.amount) })
          .from(schema.creatorEarnings)
          .where(
            and(eq(schema.creatorEarnings.userId, userId), gte(schema.creatorEarnings.createdAt, days90Ago))
          );

        const earnings90d = numericToNumber(earnings90dResult[0]?.sum);

        // Calculate CTR (Click-Through Rate)
        const totalEngagement = totalLikes + totalComments + totalShares;
        const ctr = views7d > 0 ? (totalEngagement / views7d) * 100 : 0;

        // Calculate RPM and CPM
        const rpm = views7d > 0 ? calculateRPM(ctr) : 0.75;
        const cpm = rpm; // CPM = RPM for creators

        app.logger.info(
          {
            userId,
            views7d,
            views30d,
            views90d,
            earnings7d,
            earnings30d,
            earnings90d,
            rpm,
            ctr,
          },
          'Creator dashboard stats calculated'
        );

        return {
          views7d,
          views30d,
          views90d,
          earnings7d: parseFloat(earnings7d.toFixed(2)),
          earnings30d: parseFloat(earnings30d.toFixed(2)),
          earnings90d: parseFloat(earnings90d.toFixed(2)),
          rpm: parseFloat(rpm.toFixed(2)),
          cpm: parseFloat(cpm.toFixed(2)),
          ctr: parseFloat(ctr.toFixed(2)),
          avgWatchTime: parseFloat(totalAvgDuration.toFixed(2)),
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch creator dashboard');
        throw error;
      }
    }
  );

  /**
   * GET /api/creator/earnings
   * Get creator earnings and balance
   * Requires authentication and approval
   */
  app.fastify.get(
    '/api/creator/earnings',
    {
      schema: {
        description: 'Get creator earnings',
        tags: ['creator'],
        response: {
          200: {
            type: 'object',
            properties: {
              currentBalance: { type: 'number' },
              earningsHistory: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    videoId: { type: 'string' },
                    amount: { type: 'number' },
                    source: { type: 'string' },
                    createdAt: { type: 'string' },
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

      app.logger.info({ userId }, 'Fetching creator earnings');

      try {
        // Check if user is approved creator
        const [application] = await app.db
          .select()
          .from(schema.creatorApplications)
          .where(
            and(
              eq(schema.creatorApplications.userId, userId),
              eq(schema.creatorApplications.status, 'approved')
            )
          );

        if (!application) {
          app.logger.warn({ userId }, 'User is not an approved creator');
          return reply.code(403).send({
            success: false,
            error: 'You must be an approved creator to access this resource',
          });
        }

        // Calculate total earnings
        const totalEarningsResult = await app.db
          .select({ sum: sum(schema.creatorEarnings.amount) })
          .from(schema.creatorEarnings)
          .where(eq(schema.creatorEarnings.userId, userId));

        const totalEarnings = numericToNumber(totalEarningsResult[0]?.sum);

        // Calculate total withdrawals
        const totalWithdrawalsResult = await app.db
          .select({ sum: sum(schema.creatorWithdrawals.amount) })
          .from(schema.creatorWithdrawals)
          .where(
            and(
              eq(schema.creatorWithdrawals.userId, userId),
              eq(schema.creatorWithdrawals.status, 'completed')
            )
          );

        const totalWithdrawals = numericToNumber(totalWithdrawalsResult[0]?.sum);
        const currentBalance = totalEarnings - totalWithdrawals;

        // Get earnings history
        const earningsHistory = await app.db
          .select({
            id: schema.creatorEarnings.id,
            videoId: schema.creatorEarnings.videoId,
            amount: schema.creatorEarnings.amount,
            source: schema.creatorEarnings.source,
            createdAt: schema.creatorEarnings.createdAt,
          })
          .from(schema.creatorEarnings)
          .where(eq(schema.creatorEarnings.userId, userId))
          .orderBy(desc(schema.creatorEarnings.createdAt))
          .limit(50);

        const formattedHistory = earningsHistory.map((e) => ({
          ...e,
          amount: parseFloat(numericToNumber(e.amount).toFixed(2)),
        }));

        app.logger.info({ userId, currentBalance, recordCount: formattedHistory.length }, 'Earnings fetched');

        return {
          currentBalance: parseFloat(currentBalance.toFixed(2)),
          earningsHistory: formattedHistory,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch earnings');
        throw error;
      }
    }
  );

  /**
   * POST /api/creator/withdraw
   * Request withdrawal of earnings
   * Requires authentication and approval
   */
  app.fastify.post(
    '/api/creator/withdraw',
    {
      schema: {
        description: 'Request withdrawal',
        tags: ['creator'],
        body: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
          },
          required: ['amount'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              withdrawal: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  amount: { type: 'number' },
                  status: { type: 'string' },
                  requestedAt: { type: 'string' },
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
      const { amount } = request.body as { amount: number };

      app.logger.info({ userId, amount }, 'Withdrawal requested');

      try {
        // Check if user is approved creator
        const [application] = await app.db
          .select()
          .from(schema.creatorApplications)
          .where(
            and(
              eq(schema.creatorApplications.userId, userId),
              eq(schema.creatorApplications.status, 'approved')
            )
          );

        if (!application) {
          app.logger.warn({ userId }, 'User is not an approved creator');
          return reply.code(403).send({
            success: false,
            error: 'You must be an approved creator to request withdrawals',
          });
        }

        // Validate amount
        if (amount < 100) {
          app.logger.warn({ userId, amount }, 'Withdrawal amount below minimum');
          return reply.code(400).send({
            success: false,
            error: 'Minimum withdrawal amount is $100',
          });
        }

        // Calculate available balance
        const totalEarningsResult = await app.db
          .select({ sum: sum(schema.creatorEarnings.amount) })
          .from(schema.creatorEarnings)
          .where(eq(schema.creatorEarnings.userId, userId));

        const totalEarnings = numericToNumber(totalEarningsResult[0]?.sum);

        const totalWithdrawalsResult = await app.db
          .select({ sum: sum(schema.creatorWithdrawals.amount) })
          .from(schema.creatorWithdrawals)
          .where(
            and(
              eq(schema.creatorWithdrawals.userId, userId),
              eq(schema.creatorWithdrawals.status, 'completed')
            )
          );

        const totalWithdrawals = numericToNumber(totalWithdrawalsResult[0]?.sum);
        const availableBalance = totalEarnings - totalWithdrawals;

        if (availableBalance < amount) {
          app.logger.warn({ userId, amount, availableBalance }, 'Insufficient balance');
          return reply.code(400).send({
            success: false,
            error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
          });
        }

        // Create withdrawal request
        const [withdrawal] = await app.db
          .insert(schema.creatorWithdrawals)
          .values({
            userId,
            amount: amount.toString() as any,
            paymentMethod: application.paymentMethod!,
            paymentDetails: application.paymentDetails || {},
            status: 'pending',
          })
          .returning();

        app.logger.info({ userId, withdrawalId: withdrawal.id, amount }, 'Withdrawal request created');

        return {
          success: true,
          withdrawal: {
            id: withdrawal.id,
            amount: parseFloat(numericToNumber(withdrawal.amount).toFixed(2)),
            status: withdrawal.status,
            requestedAt: withdrawal.requestedAt,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId, amount }, 'Failed to request withdrawal');
        throw error;
      }
    }
  );

  /**
   * GET /api/creator/withdrawals
   * Get withdrawal history
   * Requires authentication and approval
   */
  app.fastify.get(
    '/api/creator/withdrawals',
    {
      schema: {
        description: 'Get withdrawal history',
        tags: ['creator'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'number' },
                status: { type: 'string' },
                paymentMethod: { type: 'string' },
                requestedAt: { type: 'string' },
                processedAt: { type: 'string' },
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

      app.logger.info({ userId }, 'Fetching withdrawal history');

      try {
        // Check if user is approved creator
        const [application] = await app.db
          .select()
          .from(schema.creatorApplications)
          .where(
            and(
              eq(schema.creatorApplications.userId, userId),
              eq(schema.creatorApplications.status, 'approved')
            )
          );

        if (!application) {
          app.logger.warn({ userId }, 'User is not an approved creator');
          return reply.code(403).send({
            success: false,
            error: 'You must be an approved creator to access this resource',
          });
        }

        // Get withdrawal history
        const withdrawals = await app.db
          .select({
            id: schema.creatorWithdrawals.id,
            amount: schema.creatorWithdrawals.amount,
            status: schema.creatorWithdrawals.status,
            paymentMethod: schema.creatorWithdrawals.paymentMethod,
            requestedAt: schema.creatorWithdrawals.requestedAt,
            processedAt: schema.creatorWithdrawals.processedAt,
          })
          .from(schema.creatorWithdrawals)
          .where(eq(schema.creatorWithdrawals.userId, userId))
          .orderBy(desc(schema.creatorWithdrawals.requestedAt));

        const formattedWithdrawals = withdrawals.map((w) => ({
          ...w,
          amount: parseFloat(numericToNumber(w.amount).toFixed(2)),
        }));

        app.logger.info({ userId, count: formattedWithdrawals.length }, 'Withdrawal history fetched');

        return formattedWithdrawals;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch withdrawal history');
        throw error;
      }
    }
  );
}
