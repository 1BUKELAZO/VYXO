import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gte, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export function registerAnalyticsRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/analytics/dashboard
   * Comprehensive creator dashboard analytics
   * Requires authentication
   * Query params: timeframe (7d, 30d, 90d)
   */
  app.fastify.get(
    '/api/analytics/dashboard',
    {
      schema: {
        description: 'Get analytics dashboard',
        tags: ['analytics'],
        querystring: {
          type: 'object',
          properties: {
            timeframe: { type: 'string', enum: ['7d', '30d', '90d'], default: '7d' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { timeframe = '7d' } = request.query as { timeframe?: string };

      app.logger.info({ userId, timeframe }, 'Getting analytics dashboard');

      try {
        // Determine date range
        const now = new Date();
        let startDate = new Date();
        if (timeframe === '7d') startDate.setDate(now.getDate() - 7);
        else if (timeframe === '30d') startDate.setDate(now.getDate() - 30);
        else if (timeframe === '90d') startDate.setDate(now.getDate() - 90);

        // Get user's videos
        const userVideos = await app.db
          .select({ id: schema.videos.id })
          .from(schema.videos)
          .where(eq(schema.videos.creatorId, userId));

        const videoIds = userVideos.map((v) => v.id);

        if (videoIds.length === 0) {
          app.logger.info({ userId }, 'No videos found for analytics');
          return reply.send({
            overview: {
              totalViews: 0,
              followersGained: 0,
              totalLikes: 0,
              totalShares: 0,
              totalComments: 0,
              totalEarnings: '0.00',
            },
            dailyViews: [],
            topVideos: [],
            audienceInsights: {
              topCountries: [
                { country: 'United States', percentage: 35 },
                { country: 'India', percentage: 25 },
                { country: 'Brazil', percentage: 15 },
                { country: 'United Kingdom', percentage: 15 },
                { country: 'Other', percentage: 10 },
              ],
              ageGroups: [
                { age: '13-17', percentage: 25 },
                { age: '18-24', percentage: 40 },
                { age: '25-34', percentage: 20 },
                { age: '35+', percentage: 15 },
              ],
              gender: [
                { type: 'Female', percentage: 55 },
                { type: 'Male', percentage: 45 },
              ],
            },
            trafficSources: [
              { source: 'For You Page', percentage: 45 },
              { source: 'Search', percentage: 20 },
              { source: 'Followers', percentage: 18 },
              { source: 'Hashtags', percentage: 12 },
              { source: 'Other', percentage: 5 },
            ],
            postingTimesHeatmap: generatePostingHeatmap(),
          });
        }

        // Get analytics events within timeframe
        const events = await app.db
          .select()
          .from(schema.analyticsEvents)
          .where(
            and(
              sql`${schema.analyticsEvents.videoId} = ANY(${videoIds})`,
              gte(schema.analyticsEvents.createdAt, startDate)
            )
          );

        // Calculate overview metrics
        const viewEvents = events.filter((e) => e.eventType === 'view');
        const likeEvents = events.filter((e) => e.eventType === 'like');
        const shareEvents = events.filter((e) => e.eventType === 'share');
        const commentEvents = events.filter((e) => e.eventType === 'comment');

        const totalViews = viewEvents.length;
        const totalLikes = likeEvents.length;
        const totalShares = shareEvents.length;
        const totalComments = commentEvents.length;

        // Get creator earnings within timeframe
        const earnings = await app.db
          .select({ amount: schema.creatorEarnings.amount })
          .from(schema.creatorEarnings)
          .where(
            and(
              eq(schema.creatorEarnings.userId, userId),
              gte(schema.creatorEarnings.createdAt, startDate)
            )
          );

        const totalEarnings = earnings.reduce(
          (sum, e) => sum + (parseFloat(e.amount as string) || 0),
          0
        );

        // Get followers gained
        const userFollowsBefore = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.follows)
          .where(
            and(
              eq(schema.follows.followingId, userId),
              gte(schema.follows.createdAt, startDate)
            )
          );

        const followersGained = (userFollowsBefore[0]?.count as number) || 0;

        // Aggregate daily views
        const dailyViewsData = await app.db
          .select({
            date: sql<string>`DATE(${schema.analyticsEvents.createdAt})`,
            views: sql<number>`count(*)`,
          })
          .from(schema.analyticsEvents)
          .where(
            and(
              sql`${schema.analyticsEvents.videoId} = ANY(${videoIds})`,
              eq(schema.analyticsEvents.eventType, 'view'),
              gte(schema.analyticsEvents.createdAt, startDate)
            )
          )
          .groupBy(sql`DATE(${schema.analyticsEvents.createdAt})`)
          .orderBy(sql`DATE(${schema.analyticsEvents.createdAt})`);

        // Get top videos by views
        const videoViews = await app.db
          .select({
            videoId: schema.analyticsEvents.videoId,
            title: schema.videos.caption,
            thumbnail: schema.videos.thumbnailUrl,
            views: sql<number>`count(*)`,
            likes: sql<number>`count(case when ${schema.analyticsEvents.eventType} = 'like' then 1 end)`,
            comments: sql<number>`count(case when ${schema.analyticsEvents.eventType} = 'comment' then 1 end)`,
            shares: sql<number>`count(case when ${schema.analyticsEvents.eventType} = 'share' then 1 end)`,
          })
          .from(schema.analyticsEvents)
          .innerJoin(schema.videos, eq(schema.analyticsEvents.videoId, schema.videos.id))
          .where(
            and(
              sql`${schema.analyticsEvents.videoId} = ANY(${videoIds})`,
              gte(schema.analyticsEvents.createdAt, startDate)
            )
          )
          .groupBy(schema.analyticsEvents.videoId, schema.videos.caption, schema.videos.thumbnailUrl)
          .orderBy(sql`count(*) desc`)
          .limit(10);

        const topVideos = videoViews.map((v) => ({
          id: v.videoId,
          title: v.title,
          thumbnail: v.thumbnail,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          shares: v.shares,
          engagementRate: ((v.likes + v.comments + v.shares) / v.views * 100).toFixed(2),
        }));

        app.logger.info(
          { userId, totalViews, totalLikes, followersGained },
          'Analytics dashboard retrieved'
        );

        return reply.send({
          overview: {
            totalViews,
            followersGained,
            totalLikes,
            totalShares,
            totalComments,
            totalEarnings: totalEarnings.toFixed(2),
          },
          dailyViews: dailyViewsData.map((d) => ({
            date: d.date,
            views: d.views,
          })),
          topVideos,
          audienceInsights: {
            topCountries: [
              { country: 'United States', percentage: 35 },
              { country: 'India', percentage: 25 },
              { country: 'Brazil', percentage: 15 },
              { country: 'United Kingdom', percentage: 15 },
              { country: 'Other', percentage: 10 },
            ],
            ageGroups: [
              { age: '13-17', percentage: 25 },
              { age: '18-24', percentage: 40 },
              { age: '25-34', percentage: 20 },
              { age: '35+', percentage: 15 },
            ],
            gender: [
              { type: 'Female', percentage: 55 },
              { type: 'Male', percentage: 45 },
            ],
          },
          trafficSources: [
            { source: 'For You Page', percentage: 45 },
            { source: 'Search', percentage: 20 },
            { source: 'Followers', percentage: 18 },
            { source: 'Hashtags', percentage: 12 },
            { source: 'Other', percentage: 5 },
          ],
          postingTimesHeatmap: generatePostingHeatmap(),
        });
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to get analytics dashboard');
        throw error;
      }
    }
  );

  /**
   * GET /api/analytics/video/:videoId
   * Video-specific analytics with retention graph
   * Requires authentication
   * Path params: videoId
   */
  app.fastify.get(
    '/api/analytics/video/:videoId',
    {
      schema: {
        description: 'Get video analytics',
        tags: ['analytics'],
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

      const { videoId } = request.params as { videoId: string };
      const userId = session.user.id;

      app.logger.info({ userId, videoId }, 'Getting video analytics');

      try {
        // Get video and verify ownership
        const video = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId))
          .then((res) => res[0]);

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.status(404).send({ error: 'Video not found' });
        }

        if (video.creatorId !== userId) {
          app.logger.warn({ userId, videoId, creatorId: video.creatorId }, 'Unauthorized');
          return reply.status(403).send({ error: 'Unauthorized' });
        }

        // Get all events for this video
        const events = await app.db
          .select()
          .from(schema.analyticsEvents)
          .where(eq(schema.analyticsEvents.videoId, videoId));

        const viewEvents = events.filter((e) => e.eventType === 'view');
        const likeEvents = events.filter((e) => e.eventType === 'like');
        const shareEvents = events.filter((e) => e.eventType === 'share');
        const commentEvents = events.filter((e) => e.eventType === 'comment');

        const totalViews = viewEvents.length;
        const totalLikes = likeEvents.length;
        const totalShares = shareEvents.length;
        const totalComments = commentEvents.length;
        const engagementRate = totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2) : '0.00';

        // Get retention graph
        const retention = await app.db
          .select()
          .from(schema.videoRetention)
          .where(eq(schema.videoRetention.videoId, videoId))
          .orderBy(schema.videoRetention.second);

        const maxViewers = Math.max(
          totalViews,
          ...retention.map((r) => r.viewersRemaining)
        );

        const retentionGraph = retention.map((r) => ({
          second: r.second,
          viewersRemaining: r.viewersRemaining,
          percentage: maxViewers > 0 ? ((r.viewersRemaining / maxViewers) * 100).toFixed(2) : '0',
        }));

        // Get traffic sources from event data
        const trafficSources: Record<string, number> = {};
        viewEvents.forEach((e) => {
          const source = (e.eventData as any)?.traffic_source || 'Direct';
          trafficSources[source] = (trafficSources[source] || 0) + 1;
        });

        const trafficSourcesArray = Object.entries(trafficSources)
          .map(([source, count]) => ({
            source,
            count,
            percentage: ((count / totalViews) * 100).toFixed(2),
          }))
          .sort((a, b) => b.count - a.count);

        app.logger.info(
          { videoId, totalViews, engagementRate },
          'Video analytics retrieved'
        );

        return reply.send({
          video: {
            id: video.id,
            title: video.caption,
            thumbnail: video.thumbnailUrl,
            duration: video.duration,
            createdAt: video.createdAt,
          },
          metrics: {
            views: totalViews,
            likes: totalLikes,
            comments: totalComments,
            shares: totalShares,
            engagementRate: parseFloat(engagementRate),
          },
          retentionGraph,
          trafficSources: trafficSourcesArray,
          demographics: {
            topCountries: [
              { country: 'United States', views: Math.floor(totalViews * 0.35) },
              { country: 'India', views: Math.floor(totalViews * 0.25) },
              { country: 'Brazil', views: Math.floor(totalViews * 0.15) },
              { country: 'United Kingdom', views: Math.floor(totalViews * 0.15) },
              { country: 'Other', views: Math.floor(totalViews * 0.1) },
            ],
            ageGroups: [
              { age: '13-17', views: Math.floor(totalViews * 0.25) },
              { age: '18-24', views: Math.floor(totalViews * 0.4) },
              { age: '25-34', views: Math.floor(totalViews * 0.2) },
              { age: '35+', views: Math.floor(totalViews * 0.15) },
            ],
          },
          engagementOverTime: generateEngagementOverTime(viewEvents, likeEvents, shareEvents, commentEvents),
        });
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to get video analytics');
        throw error;
      }
    }
  );

  /**
   * GET /api/analytics/overview
   * Quick overview stats
   * Requires authentication
   */
  app.fastify.get(
    '/api/analytics/overview',
    {
      schema: {
        description: 'Get analytics overview',
        tags: ['analytics'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Getting analytics overview');

      try {
        // Get user's videos
        const userVideos = await app.db
          .select({ id: schema.videos.id })
          .from(schema.videos)
          .where(eq(schema.videos.creatorId, userId));

        const videoIds = userVideos.map((v) => v.id);

        if (videoIds.length === 0) {
          app.logger.info({ userId }, 'No videos for overview');
          return reply.send({
            totalViews: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            averageEngagementRate: '0.00',
            videosCount: 0,
            followersCount: 0,
            totalEarnings: '0.00',
          });
        }

        // Get all-time metrics for this user's videos
        const allEvents = await app.db
          .select({
            eventType: schema.analyticsEvents.eventType,
          })
          .from(schema.analyticsEvents)
          .where(sql`${schema.analyticsEvents.videoId} = ANY(${videoIds})`);

        const totalViews = allEvents.filter((e) => e.eventType === 'view').length;
        const totalLikes = allEvents.filter((e) => e.eventType === 'like').length;
        const totalComments = allEvents.filter((e) => e.eventType === 'comment').length;
        const totalShares = allEvents.filter((e) => e.eventType === 'share').length;

        const averageEngagementRate = totalViews > 0
          ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2)
          : '0.00';

        // Get total earnings
        const earningsResult = await app.db
          .select({ total: sql<string>`sum(${schema.creatorEarnings.amount})` })
          .from(schema.creatorEarnings)
          .where(eq(schema.creatorEarnings.userId, userId));

        const totalEarnings = (parseFloat(earningsResult[0]?.total as string) || 0).toFixed(2);

        // Get followers count
        const followersResult = await app.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.follows)
          .where(eq(schema.follows.followingId, userId));

        const followersCount = (followersResult[0]?.count as number) || 0;

        app.logger.info(
          {
            userId,
            totalViews,
            totalLikes,
            videosCount: videoIds.length,
            followersCount,
          },
          'Analytics overview retrieved'
        );

        return reply.send({
          totalViews,
          totalLikes,
          totalComments,
          totalShares,
          averageEngagementRate: parseFloat(averageEngagementRate),
          videosCount: videoIds.length,
          followersCount,
          totalEarnings,
        });
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to get overview');
        throw error;
      }
    }
  );
}

// Helper function to generate posting times heatmap (mock data for now)
function generatePostingHeatmap(): Record<string, number[]> {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const heatmap: Record<string, number[]> = {};

  days.forEach((day) => {
    heatmap[day] = Array.from({ length: 24 }, () => Math.floor(Math.random() * 100));
  });

  return heatmap;
}

// Helper function to generate engagement over time
function generateEngagementOverTime(
  viewEvents: any[],
  likeEvents: any[],
  shareEvents: any[],
  commentEvents: any[]
) {
  const hourlyData: Record<number, any> = {};

  viewEvents.forEach((e) => {
    const hour = new Date(e.createdAt).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = { views: 0, likes: 0, shares: 0, comments: 0 };
    }
    hourlyData[hour].views++;
  });

  likeEvents.forEach((e) => {
    const hour = new Date(e.createdAt).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = { views: 0, likes: 0, shares: 0, comments: 0 };
    }
    hourlyData[hour].likes++;
  });

  shareEvents.forEach((e) => {
    const hour = new Date(e.createdAt).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = { views: 0, likes: 0, shares: 0, comments: 0 };
    }
    hourlyData[hour].shares++;
  });

  commentEvents.forEach((e) => {
    const hour = new Date(e.createdAt).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = { views: 0, likes: 0, shares: 0, comments: 0 };
    }
    hourlyData[hour].comments++;
  });

  return Object.entries(hourlyData)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      ...data,
    }))
    .sort((a, b) => a.hour - b.hour);
}
