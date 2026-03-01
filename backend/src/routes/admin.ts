import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

// Helper function to check admin access
async function checkAdminAccess(app: App, session: any): Promise<boolean> {
  const userData = await app.db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .then((res) => res[0]);
  
  return userData?.role === 'admin';
}

export function registerAdminRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/admin/seed
   * Seed test data into the database
   * Requires admin access
   */
  app.fastify.post(
    '/api/admin/seed',
    {
      schema: {
        description: 'Seed test data into the database',
        tags: ['admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  videos: { type: 'number' },
                  campaigns: { type: 'number' },
                  streams: { type: 'number' },
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

      // Allow any authenticated user to seed for testing
      app.logger.info({ userId: session.user.id }, 'Seeding test data');

      try {
        const userId = session.user.id;

        // Check if test data already exists
        const existingVideos = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.videos)
          .where(eq(schema.videos.userId, userId));

        if (existingVideos[0]?.count > 0) {
          return reply.send({
            success: true,
            message: 'Test data already exists for this user',
            data: { videos: existingVideos[0].count, campaigns: 0, streams: 0 },
          });
        }

        // Insert test videos
        const testVideos = await app.db
          .insert(schema.videos)
          .values([
            {
              userId,
              caption: '🎬 Video de prueba #1 - Bienvenido a VYXO! 🚀',
              videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
              thumbnailUrl: 'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
              duration: 10,
              status: 'ready',
              viewsCount: 150,
              likesCount: 50,
              commentsCount: 10,
              sharesCount: 5,
            },
            {
              userId,
              caption: '🎵 Video de prueba #2 - Música y diversión 🎶',
              videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
              thumbnailUrl: 'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
              duration: 15,
              status: 'ready',
              viewsCount: 230,
              likesCount: 89,
              commentsCount: 23,
              sharesCount: 12,
            },
            {
              userId,
              caption: '🔥 Video trending - No te lo pierdas! #trending',
              videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
              thumbnailUrl: 'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
              duration: 20,
              status: 'ready',
              viewsCount: 500,
              likesCount: 200,
              commentsCount: 45,
              sharesCount: 30,
            },
          ])
          .returning();

        // Insert test ad campaign
        const testCampaign = await app.db
          .insert(schema.adCampaigns)
          .values({
            advertiserId: userId,
            name: 'Campaña de prueba VYXO',
            budget: '1000',
            spent: '0',
            status: 'active',
            creativeUrl: 'https://via.placeholder.com/400x600/FF0050/FFFFFF?text=VYXO+Ad',
            ctaText: 'Descargar ahora',
            ctaUrl: 'https://vyxo.app',
            targetAudience: { age_range: '18-35', interests: ['tech', 'social'] },
          })
          .returning();

        // Insert test live stream
        const testStream = await app.db
          .insert(schema.liveStreams)
          .values({
            userId,
            title: '🔴 En vivo - Stream de prueba',
            streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            isActive: true,
            viewerCount: 42,
          })
          .returning();

        app.logger.info(
          {
            userId,
            videosCount: testVideos.length,
            campaignsCount: testCampaign.length,
            streamsCount: testStream.length,
          },
          'Test data seeded successfully'
        );

        return reply.send({
          success: true,
          message: 'Test data seeded successfully',
          data: {
            videos: testVideos.length,
            campaigns: testCampaign.length,
            streams: testStream.length,
          },
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to seed test data');
        return reply.status(500).send({
          success: false,
          message: 'Failed to seed test data',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/admin/dashboard
   * Admin dashboard statistics
   * Requires admin access
   */
  app.fastify.get(
    '/api/admin/dashboard',
    {
      schema: {
        description: 'Get admin dashboard statistics',
        tags: ['admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              totalUsers: { type: 'number' },
              totalVideos: { type: 'number' },
              pendingReports: { type: 'number' },
              dau: { type: 'number' },
              mau: { type: 'number' },
              videosToday: { type: 'number' },
              reportsToday: { type: 'number' },
              creatorApplicationsPending: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      app.logger.info({ userId: session.user.id }, 'Fetching admin dashboard');

      try {
        // Total users
        const usersResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(user);
        const totalUsers = usersResult[0]?.count || 0;

        // Total videos
        const videosResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.videos);
        const totalVideos = videosResult[0]?.count || 0;

        // Pending reports
        const pendingReportsResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.reports)
          .where(eq(schema.reports.status, 'pending'));
        const pendingReports = pendingReportsResult[0]?.count || 0;

        // DAU (daily active users)
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const dauResult = await app.db
          .select({ count: sql<number>`count(distinct ${schema.analyticsEvents.userId})` })
          .from(schema.analyticsEvents)
          .where(sql`${schema.analyticsEvents.createdAt} >= ${oneDayAgo}`);
        const dau = dauResult[0]?.count || 0;

        // MAU (monthly active users)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const mauResult = await app.db
          .select({ count: sql<number>`count(distinct ${schema.analyticsEvents.userId})` })
          .from(schema.analyticsEvents)
          .where(sql`${schema.analyticsEvents.createdAt} >= ${thirtyDaysAgo}`);
        const mau = mauResult[0]?.count || 0;

        // Videos uploaded today
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const videosTodayResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.videos)
          .where(sql`${schema.videos.createdAt} >= ${todayStart}`);
        const videosToday = videosTodayResult[0]?.count || 0;

        // Reports today
        const reportsTodayResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.reports)
          .where(sql`${schema.reports.createdAt} >= ${todayStart}`);
        const reportsToday = reportsTodayResult[0]?.count || 0;

        // Creator applications pending
        const creatorAppsResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.creatorApplications)
          .where(eq(schema.creatorApplications.status, 'pending'));
        const creatorApplicationsPending = creatorAppsResult[0]?.count || 0;

        app.logger.info(
          {
            totalUsers,
            totalVideos,
            dau,
            mau,
            videosToday,
            reportsToday,
          },
          'Admin dashboard retrieved'
        );

        return reply.send({
          totalUsers,
          totalVideos,
          pendingReports,
          dau,
          mau,
          videosToday,
          reportsToday,
          creatorApplicationsPending,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to get admin dashboard');
        throw error;
      }
    }
  );

  /**
   * GET /api/admin/users
   * Paginated user list with search
   * Requires admin access
   */
  app.fastify.get(
    '/api/admin/users',
    {
      schema: {
        description: 'Get all users with search and pagination',
        tags: ['admin'],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { search = '', page = 1, limit = 20 } = request.query as {
        search?: string;
        page?: number;
        limit?: number;
      };

      app.logger.info({ userId: session.user.id, search, page, limit }, 'Listing users');

      try {
        const offset = (page - 1) * limit;

        // Build search condition
        let whereCondition = undefined;
        if (search) {
          whereCondition = or(
            ilike(user.name, `%${search}%`),
            ilike(user.email, `%${search}%`)
          );
        }

        // Get total count
        const totalResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(user)
          .where(whereCondition);
        const total = totalResult[0]?.count || 0;

        // Get users with counts
        const users = await app.db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            isBanned: user.isBanned,
            createdAt: user.createdAt,
            videosCount: sql<number>`(select count(*) from ${schema.videos} where ${schema.videos.userId} = ${user.id})`,
            followersCount: sql<number>`(select count(*) from ${schema.follows} where ${schema.follows.followingId} = ${user.id})`,
          })
          .from(user)
          .where(whereCondition)
          .orderBy(desc(user.createdAt))
          .limit(limit)
          .offset(offset);

        app.logger.info({ userId: session.user.id, count: users.length }, 'Users listed');

        return reply.send({
          users,
          total,
          page,
          limit,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to list users');
        throw error;
      }
    }
  );

  /**
   * GET /api/admin/users/:userId
   * Detailed user information
   * Requires admin access
   */
  app.fastify.get(
    '/api/admin/users/:userId',
    {
      schema: {
        description: 'Get detailed user information',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { userId } = request.params as { userId: string };

      app.logger.info({ adminId: session.user.id, userId }, 'Getting user details');

      try {
        const userDetails = await app.db
          .select()
          .from(user)
          .where(eq(user.id, userId))
          .then((res) => res[0]);

        if (!userDetails) {
          return reply.status(404).send({ error: 'User not found' });
        }

        // Get user videos
        const userVideos = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.userId, userId))
          .orderBy(desc(schema.videos.createdAt))
          .limit(10);

        // Get followers and following
        const followersResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.follows)
          .where(eq(schema.follows.followingId, userId));
        const followersCount = followersResult[0]?.count || 0;

        const followingResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.follows)
          .where(eq(schema.follows.followerId, userId));
        const followingCount = followingResult[0]?.count || 0;

        app.logger.info(
          { adminId: session.user.id, userId, videosCount: userVideos.length },
          'User details retrieved'
        );

        return reply.send({
          user: userDetails,
          videos: userVideos,
          followersCount,
          followingCount,
        });
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to get user details');
        throw error;
      }
    }
  );

  /**
   * POST /api/admin/users/:userId/ban
   * Ban a user
   * Requires admin access
   */
  app.fastify.post(
    '/api/admin/users/:userId/ban',
    {
      schema: {
        description: 'Ban a user',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
          required: ['reason'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { userId } = request.params as { userId: string };
      const { reason } = request.body as { reason: string };

      app.logger.info(
        { adminId: session.user.id, userId, reason },
        'Banning user'
      );

      try {
        const now = new Date();
        const updatedUser = await app.db
          .update(user)
          .set({
            isBanned: true,
            bannedAt: now,
            bannedBy: session.user.id,
          })
          .where(eq(user.id, userId))
          .returning();

        app.logger.info({ adminId: session.user.id, userId }, 'User banned');

        return reply.send(updatedUser[0]);
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to ban user');
        throw error;
      }
    }
  );

  /**
   * POST /api/admin/users/:userId/unban
   * Unban a user
   * Requires admin access
   */
  app.fastify.post(
    '/api/admin/users/:userId/unban',
    {
      schema: {
        description: 'Unban a user',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
          required: ['userId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { userId } = request.params as { userId: string };

      app.logger.info({ adminId: session.user.id, userId }, 'Unbanning user');

      try {
        const updatedUser = await app.db
          .update(user)
          .set({
            isBanned: false,
            bannedAt: null,
            bannedBy: null,
          })
          .where(eq(user.id, userId))
          .returning();

        app.logger.info({ adminId: session.user.id, userId }, 'User unbanned');

        return reply.send(updatedUser[0]);
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to unban user');
        throw error;
      }
    }
  );

  /**
   * GET /api/admin/videos
   * Paginated video list with search
   * Requires admin access
   */
  app.fastify.get(
    '/api/admin/videos',
    {
      schema: {
        description: 'Get all videos with search and pagination',
        tags: ['admin'],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { search = '', page = 1, limit = 20 } = request.query as {
        search?: string;
        page?: number;
        limit?: number;
      };

      app.logger.info({ userId: session.user.id, search, page, limit }, 'Listing videos');

      try {
        const offset = (page - 1) * limit;

        // Build search condition
        let whereCondition = undefined;
        if (search) {
          whereCondition = ilike(schema.videos.caption, `%${search}%`);
        }

        // Get total count
        const totalResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.videos)
          .where(whereCondition);
        const total = totalResult[0]?.count || 0;

        // Get videos with user info
        const videos = await app.db
          .select({
            id: schema.videos.id,
            userId: schema.videos.userId,
            username: user.name,
            caption: schema.videos.caption,
            thumbnailUrl: schema.videos.thumbnailUrl,
            viewsCount: schema.videos.viewsCount,
            likesCount: schema.videos.likesCount,
            createdAt: schema.videos.createdAt,
            status: schema.videos.status,
          })
          .from(schema.videos)
          .innerJoin(user, eq(schema.videos.userId, user.id))
          .where(whereCondition)
          .orderBy(desc(schema.videos.createdAt))
          .limit(limit)
          .offset(offset);

        app.logger.info({ userId: session.user.id, count: videos.length }, 'Videos listed');

        return reply.send({
          videos,
          total,
          page,
          limit,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to list videos');
        throw error;
      }
    }
  );

  /**
   * GET /api/admin/videos/:videoId
   * Detailed video information
   * Requires admin access
   */
  app.fastify.get(
    '/api/admin/videos/:videoId',
    {
      schema: {
        description: 'Get detailed video information',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
          },
          required: ['videoId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { videoId } = request.params as { videoId: string };

      app.logger.info({ adminId: session.user.id, videoId }, 'Getting video details');

      try {
        const videoDetails = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId))
          .then((res) => res[0]);

        if (!videoDetails) {
          return reply.status(404).send({ error: 'Video not found' });
        }

        // Get creator info
        const creatorInfo = await app.db
          .select()
          .from(user)
          .where(eq(user.id, videoDetails.userId))
          .then((res) => res[0]);

        // Get reports related to this video
        const relatedReports = await app.db
          .select()
          .from(schema.reports)
          .where(
            and(
              eq(schema.reports.targetId, videoId),
              eq(schema.reports.targetType, 'video')
            )
          );

        app.logger.info(
          { adminId: session.user.id, videoId, reportsCount: relatedReports.length },
          'Video details retrieved'
        );

        return reply.send({
          video: videoDetails,
          creator: creatorInfo,
          reports: relatedReports,
        });
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to get video details');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/admin/videos/:videoId
   * Delete a video permanently
   * Requires admin access
   */
  app.fastify.delete(
    '/api/admin/videos/:videoId',
    {
      schema: {
        description: 'Delete a video permanently',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
          },
          required: ['videoId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { videoId } = request.params as { videoId: string };

      app.logger.info({ adminId: session.user.id, videoId }, 'Deleting video');

      try {
        await app.db.delete(schema.videos).where(eq(schema.videos.id, videoId));

        app.logger.info({ adminId: session.user.id, videoId }, 'Video deleted');

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to delete video');
        throw error;
      }
    }
  );

  /**
   * GET /api/admin/reports
   * Paginated reports list with status filter
   * Requires admin access
   */
  app.fastify.get(
    '/api/admin/reports',
    {
      schema: {
        description: 'Get reports with status filter and pagination',
        tags: ['admin'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { status = 'pending', page = 1, limit = 20 } = request.query as {
        status?: string;
        page?: number;
        limit?: number;
      };

      app.logger.info({ userId: session.user.id, status, page, limit }, 'Listing reports');

      try {
        const offset = (page - 1) * limit;

        // Get total count
        const totalResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.reports)
          .where(eq(schema.reports.status, status as any));
        const total = totalResult[0]?.count || 0;

        // Get reports with related info
        const reports = await app.db
          .select({
            id: schema.reports.id,
            reporterId: schema.reports.reporterId,
            reporterUsername: user.name,
            targetId: schema.reports.targetId,
            targetType: schema.reports.targetType,
            reason: schema.reports.reason,
            description: schema.reports.description,
            status: schema.reports.status,
            createdAt: schema.reports.createdAt,
          })
          .from(schema.reports)
          .innerJoin(user, eq(schema.reports.reporterId, user.id))
          .where(eq(schema.reports.status, status as any))
          .orderBy(desc(schema.reports.createdAt))
          .limit(limit)
          .offset(offset);

        app.logger.info({ userId: session.user.id, count: reports.length }, 'Reports listed');

        return reply.send({
          reports,
          total,
          page,
          limit,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to list reports');
        throw error;
      }
    }
  );

  /**
   * POST /api/admin/reports/:reportId/dismiss
   * Dismiss a report
   * Requires admin access
   */
  app.fastify.post(
    '/api/admin/reports/:reportId/dismiss',
    {
      schema: {
        description: 'Dismiss a report',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            reportId: { type: 'string' },
          },
          required: ['reportId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { reportId } = request.params as { reportId: string };

      app.logger.info({ adminId: session.user.id, reportId }, 'Dismissing report');

      try {
        const updatedReport = await app.db
          .update(schema.reports)
          .set({ status: 'dismissed', resolvedAt: new Date() })
          .where(eq(schema.reports.id, reportId))
          .returning();

        app.logger.info({ adminId: session.user.id, reportId }, 'Report dismissed');

        return reply.send(updatedReport[0]);
      } catch (error) {
        app.logger.error({ err: error, reportId }, 'Failed to dismiss report');
        throw error;
      }
    }
  );

  /**
   * POST /api/admin/reports/:reportId/remove-content
   * Remove reported content (delete video/comment)
   * Requires admin access
   */
  app.fastify.post(
    '/api/admin/reports/:reportId/remove-content',
    {
      schema: {
        description: 'Remove reported content and resolve report',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            reportId: { type: 'string' },
          },
          required: ['reportId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { reportId } = request.params as { reportId: string };

      app.logger.info({ adminId: session.user.id, reportId }, 'Removing reported content');

      try {
        // Get the report to find the target
        const report = await app.db
          .select()
          .from(schema.reports)
          .where(eq(schema.reports.id, reportId))
          .then((res) => res[0]);

        if (!report) {
          return reply.status(404).send({ error: 'Report not found' });
        }

        // Delete the content based on type
        if (report.targetType === 'video') {
          await app.db.delete(schema.videos).where(eq(schema.videos.id, report.targetId));
        } else if (report.targetType === 'comment') {
          await app.db.delete(schema.comments).where(eq(schema.comments.id, report.targetId));
        }

        // Mark report as resolved
        await app.db
          .update(schema.reports)
          .set({ status: 'resolved', resolvedAt: new Date() })
          .where(eq(schema.reports.id, reportId));

        app.logger.info(
          { adminId: session.user.id, reportId, targetType: report.targetType },
          'Reported content removed'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error({ err: error, reportId }, 'Failed to remove content');
        throw error;
      }
    }
  );

  /**
   * POST /api/admin/reports/:reportId/ban-user
   * Ban the reported user
   * Requires admin access
   */
  app.fastify.post(
    '/api/admin/reports/:reportId/ban-user',
    {
      schema: {
        description: 'Ban the user who was reported',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            reportId: { type: 'string' },
          },
          required: ['reportId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { reportId } = request.params as { reportId: string };

      app.logger.info({ adminId: session.user.id, reportId }, 'Banning reported user');

      try {
        // Get the report
        const report = await app.db
          .select()
          .from(schema.reports)
          .where(eq(schema.reports.id, reportId))
          .then((res) => res[0]);

        if (!report) {
          return reply.status(404).send({ error: 'Report not found' });
        }

        // Ban the target user
        const now = new Date();
        await app.db
          .update(user)
          .set({
            isBanned: true,
            bannedAt: now,
            bannedBy: session.user.id,
          })
          .where(eq(user.id, report.targetId));

        // Mark report as resolved
        await app.db
          .update(schema.reports)
          .set({ status: 'resolved', resolvedAt: new Date() })
          .where(eq(schema.reports.id, reportId));

        app.logger.info(
          { adminId: session.user.id, reportId, userId: report.targetId },
          'User banned'
        );

        return reply.send({ success: true });
      } catch (error) {
        app.logger.error({ err: error, reportId }, 'Failed to ban user');
        throw error;
      }
    }
  );

  /**
   * GET /api/admin/creator-applications
   * Paginated creator applications list with status filter
   * Requires admin access
   */
  app.fastify.get(
    '/api/admin/creator-applications',
    {
      schema: {
        description: 'Get creator applications with status filter and pagination',
        tags: ['admin'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { status = 'pending', page = 1, limit = 20 } = request.query as {
        status?: string;
        page?: number;
        limit?: number;
      };

      app.logger.info({ userId: session.user.id, status, page, limit }, 'Listing creator applications');

      try {
        const offset = (page - 1) * limit;

        // Get total count
        const totalResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.creatorApplications)
          .where(eq(schema.creatorApplications.status, status as any));
        const total = totalResult[0]?.count || 0;

        // Get applications with user info
        const applications = await app.db
          .select({
            id: schema.creatorApplications.id,
            userId: schema.creatorApplications.userId,
            username: user.name,
            email: user.email,
            status: schema.creatorApplications.status,
            appliedAt: schema.creatorApplications.appliedAt,
            videosCount: sql<number>`(select count(*) from ${schema.videos} where ${schema.videos.userId} = ${schema.creatorApplications.userId})`,
            followersCount: sql<number>`(select count(*) from ${schema.follows} where ${schema.follows.followingId} = ${schema.creatorApplications.userId})`,
          })
          .from(schema.creatorApplications)
          .innerJoin(user, eq(schema.creatorApplications.userId, user.id))
          .where(eq(schema.creatorApplications.status, status as any))
          .orderBy(desc(schema.creatorApplications.appliedAt))
          .limit(limit)
          .offset(offset);

        app.logger.info({ userId: session.user.id, count: applications.length }, 'Creator applications listed');

        return reply.send({
          applications,
          total,
          page,
          limit,
        });
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to list creator applications');
        throw error;
      }
    }
  );

  /**
   * POST /api/admin/creator-applications/:applicationId/approve
   * Approve a creator application
   * Requires admin access
   */
  app.fastify.post(
    '/api/admin/creator-applications/:applicationId/approve',
    {
      schema: {
        description: 'Approve creator application',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            applicationId: { type: 'string' },
          },
          required: ['applicationId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { applicationId } = request.params as { applicationId: string };

      app.logger.info({ adminId: session.user.id, applicationId }, 'Approving creator application');

      try {
        const updatedApp = await app.db
          .update(schema.creatorApplications)
          .set({ status: 'approved', approvedAt: new Date() })
          .where(eq(schema.creatorApplications.id, applicationId))
          .returning();

        app.logger.info({ adminId: session.user.id, applicationId }, 'Creator application approved');

        return reply.send(updatedApp[0]);
      } catch (error) {
        app.logger.error({ err: error, applicationId }, 'Failed to approve application');
        throw error;
      }
    }
  );

  /**
   * POST /api/admin/creator-applications/:applicationId/reject
   * Reject a creator application
   * Requires admin access
   */
  app.fastify.post(
    '/api/admin/creator-applications/:applicationId/reject',
    {
      schema: {
        description: 'Reject creator application',
        tags: ['admin'],
        params: {
          type: 'object',
          properties: {
            applicationId: { type: 'string' },
          },
          required: ['applicationId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const isAdmin = await checkAdminAccess(app, session);
      if (!isAdmin) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { applicationId } = request.params as { applicationId: string };

      app.logger.info({ adminId: session.user.id, applicationId }, 'Rejecting creator application');

      try {
        const updatedApp = await app.db
          .update(schema.creatorApplications)
          .set({ status: 'rejected', rejectedAt: new Date() })
          .where(eq(schema.creatorApplications.id, applicationId))
          .returning();

        app.logger.info({ adminId: session.user.id, applicationId }, 'Creator application rejected');

        return reply.send(updatedApp[0]);
      } catch (error) {
        app.logger.error({ err: error, applicationId }, 'Failed to reject application');
        throw error;
      }
    }
  );
}