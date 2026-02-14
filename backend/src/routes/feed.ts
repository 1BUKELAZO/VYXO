import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, gt, desc, sql, ne, notInArray, gte, lt } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

// Simple in-memory cache for trending scores (1 hour TTL)
interface TrendingCache {
  data: any[];
  timestamp: number;
}

const TRENDING_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
let trendingCache: TrendingCache | null = null;

export function registerFeedRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/feed/foryou
   * Returns personalized feed based on followed users, trending content, recent videos, and random popular videos
   * Requires authentication
   * Cursor-based pagination
   */
  app.fastify.get(
    '/api/feed/foryou',
    {
      schema: {
        description: 'Get personalized For You feed',
        tags: ['feed'],
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'number', default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    caption: { type: 'string' },
                    videoUrl: { type: 'string' },
                    thumbnailUrl: { type: 'string' },
                    masterPlaylistUrl: { type: 'string' },
                    muxThumbnailUrl: { type: 'string' },
                    gifUrl: { type: 'string' },
                    duration: { type: 'number' },
                    viewsCount: { type: 'number' },
                    likesCount: { type: 'number' },
                    commentsCount: { type: 'number' },
                    sharesCount: { type: 'number' },
                    status: { type: 'string' },
                    isLiked: { type: 'boolean' },
                    author: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        avatar: { type: 'string' },
                      },
                    },
                    sound: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        artistName: { type: 'string' },
                      },
                    },
                  },
                },
              },
              nextCursor: { type: 'string' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const currentUserId = session.user.id;
      const { cursor, limit = 20 } = request.query as {
        cursor?: string;
        limit?: number;
      };

      app.logger.info({ currentUserId, cursor, limit }, 'Fetching For You feed');

      try {
        const searchLimit = limit + 1;

        // Get list of users that current user follows
        const followedUsers = await app.db
          .select({ followingId: schema.follows.followingId })
          .from(schema.follows)
          .where(eq(schema.follows.followerId, currentUserId));

        const followedUserIds = followedUsers.map((f) => f.followingId);

        // Get list of users that current user has blocked
        const blockedUsers = await app.db
          .select({ blockedId: schema.blocks.blockedId })
          .from(schema.blocks)
          .where(eq(schema.blocks.blockerId, currentUserId));

        const blockedUserIds = blockedUsers.map((b) => b.blockedId);

        // Get videos already viewed by current user
        const viewedVideos = await app.db
          .select({ videoId: schema.videoViews.videoId })
          .from(schema.videoViews)
          .where(eq(schema.videoViews.userId, currentUserId));

        const viewedVideoIds = viewedVideos.map((v) => v.videoId);

        // Build base exclusion conditions
        const excludeConditions = [];
        if (blockedUserIds.length > 0) {
          excludeConditions.push(notInArray(schema.videos.userId, blockedUserIds));
        }
        if (viewedVideoIds.length > 0) {
          excludeConditions.push(notInArray(schema.videos.id, viewedVideoIds));
        }

        // Fetch videos from multiple sources with weighted distribution
        // Source 1: Videos from followed users (50%)
        const followedVideosCount = Math.ceil((searchLimit * 0.5) / 1);
        const followedVideoConditions = [
          eq(schema.videos.status, 'ready'),
          followedUserIds.length > 0
            ? sql`${schema.videos.userId} IN (${sql.join(followedUserIds)})`
            : sql`false`,
        ];

        if (excludeConditions.length > 0) {
          followedVideoConditions.push(and(...excludeConditions));
        }

        const followedVideosQuery = app.db
          .select({
            id: schema.videos.id,
            userId: schema.videos.userId,
            videoUrl: schema.videos.videoUrl,
            thumbnailUrl: schema.videos.thumbnailUrl,
            caption: schema.videos.caption,
            likesCount: schema.videos.likesCount,
            commentsCount: schema.videos.commentsCount,
            sharesCount: schema.videos.sharesCount,
            viewsCount: schema.videos.viewsCount,
            duration: schema.videos.duration,
            status: schema.videos.status,
            muxPlaybackId: schema.videos.muxPlaybackId,
            masterPlaylistUrl: schema.videos.masterPlaylistUrl,
            muxThumbnailUrl: schema.videos.muxThumbnailUrl,
            gifUrl: schema.videos.gifUrl,
            soundId: schema.videos.soundId,
            createdAt: schema.videos.createdAt,
            authorId: user.id,
            authorName: user.name,
            authorImage: user.image,
            soundTitle: schema.sounds.title,
            soundArtistName: schema.sounds.artistName,
            isLiked: sql<number>`CASE WHEN ${schema.likes.id} IS NOT NULL THEN 1 ELSE 0 END`,
          })
          .from(schema.videos)
          .leftJoin(user, eq(schema.videos.userId, user.id))
          .leftJoin(schema.sounds, eq(schema.videos.soundId, schema.sounds.id))
          .leftJoin(
            schema.likes,
            and(
              eq(schema.likes.videoId, schema.videos.id),
              eq(schema.likes.userId, currentUserId)
            )
          )
          .where(
            followedUserIds.length > 0
              ? and(
                  eq(schema.videos.status, 'ready'),
                  sql`${schema.videos.userId} IN (${sql.join(followedUserIds)})`,
                  ...excludeConditions
                )
              : sql`false`
          )
          .orderBy(desc(schema.videos.createdAt))
          .limit(followedVideosCount);

        const followedVideos = await followedVideosQuery;

        // Source 2: Trending videos (20%) - last 24 hours
        const trendingVideosCount = Math.ceil((searchLimit * 0.2) / 1);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const trendingVideos = await app.db
          .select({
            id: schema.videos.id,
            userId: schema.videos.userId,
            videoUrl: schema.videos.videoUrl,
            thumbnailUrl: schema.videos.thumbnailUrl,
            caption: schema.videos.caption,
            likesCount: schema.videos.likesCount,
            commentsCount: schema.videos.commentsCount,
            sharesCount: schema.videos.sharesCount,
            viewsCount: schema.videos.viewsCount,
            duration: schema.videos.duration,
            status: schema.videos.status,
            muxPlaybackId: schema.videos.muxPlaybackId,
            masterPlaylistUrl: schema.videos.masterPlaylistUrl,
            muxThumbnailUrl: schema.videos.muxThumbnailUrl,
            gifUrl: schema.videos.gifUrl,
            soundId: schema.videos.soundId,
            createdAt: schema.videos.createdAt,
            authorId: user.id,
            authorName: user.name,
            authorImage: user.image,
            soundTitle: schema.sounds.title,
            soundArtistName: schema.sounds.artistName,
            isLiked: sql<number>`CASE WHEN ${schema.likes.id} IS NOT NULL THEN 1 ELSE 0 END`,
          })
          .from(schema.videos)
          .leftJoin(user, eq(schema.videos.userId, user.id))
          .leftJoin(schema.sounds, eq(schema.videos.soundId, schema.sounds.id))
          .leftJoin(
            schema.likes,
            and(
              eq(schema.likes.videoId, schema.videos.id),
              eq(schema.likes.userId, currentUserId)
            )
          )
          .where(
            and(
              eq(schema.videos.status, 'ready'),
              gte(schema.videos.createdAt, oneDayAgo),
              ...excludeConditions
            )
          )
          .orderBy(desc(schema.videos.scoreTrending))
          .limit(trendingVideosCount);

        // Source 3: Recent videos (10%) - last 24h
        const recentVideosCount = Math.ceil((searchLimit * 0.1) / 1);

        const recentVideos = await app.db
          .select({
            id: schema.videos.id,
            userId: schema.videos.userId,
            videoUrl: schema.videos.videoUrl,
            thumbnailUrl: schema.videos.thumbnailUrl,
            caption: schema.videos.caption,
            likesCount: schema.videos.likesCount,
            commentsCount: schema.videos.commentsCount,
            sharesCount: schema.videos.sharesCount,
            viewsCount: schema.videos.viewsCount,
            duration: schema.videos.duration,
            status: schema.videos.status,
            muxPlaybackId: schema.videos.muxPlaybackId,
            masterPlaylistUrl: schema.videos.masterPlaylistUrl,
            muxThumbnailUrl: schema.videos.muxThumbnailUrl,
            gifUrl: schema.videos.gifUrl,
            soundId: schema.videos.soundId,
            createdAt: schema.videos.createdAt,
            authorId: user.id,
            authorName: user.name,
            authorImage: user.image,
            soundTitle: schema.sounds.title,
            soundArtistName: schema.sounds.artistName,
            isLiked: sql<number>`CASE WHEN ${schema.likes.id} IS NOT NULL THEN 1 ELSE 0 END`,
          })
          .from(schema.videos)
          .leftJoin(user, eq(schema.videos.userId, user.id))
          .leftJoin(schema.sounds, eq(schema.videos.soundId, schema.sounds.id))
          .leftJoin(
            schema.likes,
            and(
              eq(schema.likes.videoId, schema.videos.id),
              eq(schema.likes.userId, currentUserId)
            )
          )
          .where(
            and(
              eq(schema.videos.status, 'ready'),
              gte(schema.videos.createdAt, oneDayAgo),
              ...excludeConditions
            )
          )
          .orderBy(desc(schema.videos.createdAt))
          .limit(recentVideosCount);

        // Source 4: Random popular videos (20%)
        const popularVideosCount = Math.ceil((searchLimit * 0.2) / 1);

        const popularVideos = await app.db
          .select({
            id: schema.videos.id,
            userId: schema.videos.userId,
            videoUrl: schema.videos.videoUrl,
            thumbnailUrl: schema.videos.thumbnailUrl,
            caption: schema.videos.caption,
            likesCount: schema.videos.likesCount,
            commentsCount: schema.videos.commentsCount,
            sharesCount: schema.videos.sharesCount,
            viewsCount: schema.videos.viewsCount,
            duration: schema.videos.duration,
            status: schema.videos.status,
            muxPlaybackId: schema.videos.muxPlaybackId,
            masterPlaylistUrl: schema.videos.masterPlaylistUrl,
            muxThumbnailUrl: schema.videos.muxThumbnailUrl,
            gifUrl: schema.videos.gifUrl,
            soundId: schema.videos.soundId,
            createdAt: schema.videos.createdAt,
            authorId: user.id,
            authorName: user.name,
            authorImage: user.image,
            soundTitle: schema.sounds.title,
            soundArtistName: schema.sounds.artistName,
            isLiked: sql<number>`CASE WHEN ${schema.likes.id} IS NOT NULL THEN 1 ELSE 0 END`,
          })
          .from(schema.videos)
          .leftJoin(user, eq(schema.videos.userId, user.id))
          .leftJoin(schema.sounds, eq(schema.videos.soundId, schema.sounds.id))
          .leftJoin(
            schema.likes,
            and(
              eq(schema.likes.videoId, schema.videos.id),
              eq(schema.likes.userId, currentUserId)
            )
          )
          .where(
            and(
              eq(schema.videos.status, 'ready'),
              gt(schema.videos.viewsCount, 10),
              ...excludeConditions
            )
          )
          .orderBy(sql`RANDOM()`)
          .limit(popularVideosCount);

        // Combine and deduplicate videos
        const allVideos = [...followedVideos, ...trendingVideos, ...recentVideos, ...popularVideos];
        const seenIds = new Set<string>();
        const uniqueVideos = allVideos.filter((v) => {
          if (seenIds.has(v.id)) return false;
          seenIds.add(v.id);
          return true;
        });

        // Apply cursor pagination
        let paginatedResults = uniqueVideos;
        if (cursor) {
          paginatedResults = uniqueVideos.filter((v) => v.id > cursor);
        }

        paginatedResults = paginatedResults.slice(0, limit);

        const hasMore = uniqueVideos.length > (cursor ? paginatedResults.length : limit);
        const nextCursor = hasMore ? paginatedResults[paginatedResults.length - 1]?.id : null;

        // Format response
        const enrichedResults = paginatedResults.map((v) => ({
          id: v.id,
          userId: v.userId,
          caption: v.caption,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl,
          masterPlaylistUrl: v.masterPlaylistUrl || v.videoUrl,
          muxThumbnailUrl: v.muxThumbnailUrl,
          gifUrl: v.gifUrl,
          duration: v.duration,
          viewsCount: v.viewsCount || 0,
          likesCount: v.likesCount,
          commentsCount: v.commentsCount,
          sharesCount: v.sharesCount,
          status: v.status,
          isLiked: Boolean(v.isLiked),
          author: {
            id: v.authorId,
            username: v.authorName,
            avatar: v.authorImage,
          },
          sound: v.soundId
            ? {
                id: v.soundId,
                title: v.soundTitle,
                artistName: v.soundArtistName,
              }
            : null,
        }));

        app.logger.info(
          {
            currentUserId,
            count: enrichedResults.length,
            hasMore,
            followedCount: followedVideos.length,
            trendingCount: trendingVideos.length,
            recentCount: recentVideos.length,
            popularCount: popularVideos.length,
          },
          'For You feed fetched'
        );

        return {
          results: enrichedResults,
          nextCursor: nextCursor || null,
          hasMore,
        };
      } catch (error) {
        app.logger.error({ err: error, currentUserId }, 'Failed to fetch For You feed');
        throw error;
      }
    }
  );

  /**
   * GET /api/feed/trending
   * Returns trending videos based on engagement metrics from last 24 hours
   * Trending score formula: (views24h * 0.4) + (likes24h * 0.3) + (shares24h * 0.2) + (comments24h * 0.1)
   * Results cached for 1 hour
   * Requires authentication
   * Cursor-based pagination
   */
  app.fastify.get(
    '/api/feed/trending',
    {
      schema: {
        description: 'Get trending videos with engagement scoring',
        tags: ['feed'],
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'number', default: 20 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    caption: { type: 'string' },
                    videoUrl: { type: 'string' },
                    thumbnailUrl: { type: 'string' },
                    masterPlaylistUrl: { type: 'string' },
                    muxThumbnailUrl: { type: 'string' },
                    gifUrl: { type: 'string' },
                    duration: { type: 'number' },
                    viewsCount: { type: 'number' },
                    likesCount: { type: 'number' },
                    commentsCount: { type: 'number' },
                    sharesCount: { type: 'number' },
                    status: { type: 'string' },
                    isLiked: { type: 'boolean' },
                    rank: { type: 'number' },
                    author: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        avatar: { type: 'string' },
                      },
                    },
                    sound: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        artistName: { type: 'string' },
                      },
                    },
                  },
                },
              },
              nextCursor: { type: 'string' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const currentUserId = session.user.id;
      const { cursor, limit = 20 } = request.query as {
        cursor?: string;
        limit?: number;
      };

      app.logger.info({ currentUserId, cursor, limit, cacheValid: trendingCache !== null }, 'Fetching trending feed');

      try {
        const searchLimit = limit + 1;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Check cache validity
        const now = Date.now();
        const cacheIsValid = trendingCache && now - trendingCache.timestamp < TRENDING_CACHE_TTL;

        let trendingVideosData: any[];

        if (cacheIsValid && trendingCache) {
          app.logger.info({}, 'Using cached trending data');
          trendingVideosData = trendingCache.data;
        } else {
          // Calculate trending scores for videos with engagement in last 24h
          const videosWithMetrics = await app.db
            .select({
              id: schema.videos.id,
              userId: schema.videos.userId,
              videoUrl: schema.videos.videoUrl,
              thumbnailUrl: schema.videos.thumbnailUrl,
              caption: schema.videos.caption,
              likesCount: schema.videos.likesCount,
              commentsCount: schema.videos.commentsCount,
              sharesCount: schema.videos.sharesCount,
              viewsCount: schema.videos.viewsCount,
              duration: schema.videos.duration,
              status: schema.videos.status,
              muxPlaybackId: schema.videos.muxPlaybackId,
              masterPlaylistUrl: schema.videos.masterPlaylistUrl,
              muxThumbnailUrl: schema.videos.muxThumbnailUrl,
              gifUrl: schema.videos.gifUrl,
              soundId: schema.videos.soundId,
              createdAt: schema.videos.createdAt,
              authorId: user.id,
              authorName: user.name,
              authorImage: user.image,
              soundTitle: schema.sounds.title,
              soundArtistName: schema.sounds.artistName,
              viewsLast24h: sql<number>`COALESCE(COUNT(DISTINCT ${schema.videoViews.id}), 0)`,
              likesLast24h: sql<number>`COALESCE(COUNT(DISTINCT CASE WHEN ${schema.likes.createdAt} >= ${oneDayAgo} THEN ${schema.likes.id} END), 0)`,
              commentsLast24h: sql<number>`COALESCE(COUNT(DISTINCT CASE WHEN ${schema.comments.createdAt} >= ${oneDayAgo} THEN ${schema.comments.id} END), 0)`,
              sharesLast24h: sql<number>`COALESCE(${schema.videos.sharesCount}, 0)`,
              isLiked: sql<number>`CASE WHEN ${schema.likes.userId} = ${currentUserId} THEN 1 ELSE 0 END`,
            })
            .from(schema.videos)
            .leftJoin(user, eq(schema.videos.userId, user.id))
            .leftJoin(schema.sounds, eq(schema.videos.soundId, schema.sounds.id))
            .leftJoin(
              schema.videoViews,
              and(
                eq(schema.videoViews.videoId, schema.videos.id),
                gte(schema.videoViews.viewedAt, oneDayAgo)
              )
            )
            .leftJoin(
              schema.likes,
              and(
                eq(schema.likes.videoId, schema.videos.id),
                gte(schema.likes.createdAt, oneDayAgo)
              )
            )
            .leftJoin(schema.comments, eq(schema.comments.videoId, schema.videos.id))
            .where(eq(schema.videos.status, 'ready'))
            .groupBy(
              schema.videos.id,
              user.id,
              schema.sounds.id,
              schema.likes.userId
            )
            .orderBy(desc(schema.videos.createdAt));

          // Calculate trending scores
          const scoredVideos = videosWithMetrics
            .map((v: any) => {
              const views24h = Number(v.viewsLast24h) || 0;
              const likes24h = Number(v.likesLast24h) || 0;
              const shares24h = Number(v.sharesLast24h) || 0;
              const comments24h = Number(v.commentsLast24h) || 0;

              // Trending score formula: views(0.4) + likes(0.3) + shares(0.2) + comments(0.1)
              const score = views24h * 0.4 + likes24h * 0.3 + shares24h * 0.2 + comments24h * 0.1;

              return {
                ...v,
                trendingScore: score,
              };
            })
            .sort((a: any, b: any) => b.trendingScore - a.trendingScore);

          trendingVideosData = scoredVideos;

          // Update cache
          trendingCache = {
            data: scoredVideos,
            timestamp: now,
          };

          app.logger.info({ videosCount: scoredVideos.length }, 'Trending data recalculated and cached');
        }

        // Apply cursor pagination
        let paginatedResults = trendingVideosData;
        if (cursor) {
          paginatedResults = trendingVideosData.filter((v: any) => v.id > cursor);
        }

        const hasMore = paginatedResults.length > limit;
        const finalResults = paginatedResults.slice(0, limit);
        const nextCursor = hasMore ? finalResults[finalResults.length - 1]?.id : null;

        // Add rank and format response
        const enrichedResults = finalResults.map((v: any, index: number) => ({
          id: v.id,
          userId: v.userId,
          caption: v.caption,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl,
          masterPlaylistUrl: v.masterPlaylistUrl || v.videoUrl,
          muxThumbnailUrl: v.muxThumbnailUrl,
          gifUrl: v.gifUrl,
          duration: v.duration,
          viewsCount: v.viewsCount || 0,
          likesCount: v.likesCount,
          commentsCount: v.commentsCount,
          sharesCount: v.sharesCount,
          status: v.status,
          isLiked: Boolean(v.isLiked),
          rank: cursor ? -1 : index + 1, // Rank only valid for first page
          author: {
            id: v.authorId,
            username: v.authorName,
            avatar: v.authorImage,
          },
          sound: v.soundId
            ? {
                id: v.soundId,
                title: v.soundTitle,
                artistName: v.soundArtistName,
              }
            : null,
        }));

        app.logger.info(
          {
            currentUserId,
            count: enrichedResults.length,
            hasMore,
            cacheUsed: cacheIsValid,
          },
          'Trending feed fetched'
        );

        return {
          results: enrichedResults,
          nextCursor: nextCursor || null,
          hasMore,
        };
      } catch (error) {
        app.logger.error({ err: error, currentUserId }, 'Failed to fetch trending feed');
        throw error;
      }
    }
  );

  /**
   * POST /api/videos/:videoId/view
   * Records a unique view for the video by the current user
   * Requires authentication
   */
  app.fastify.post(
    '/api/videos/:videoId/view',
    {
      schema: {
        description: 'Record a view for a video',
        tags: ['feed'],
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
              success: { type: 'boolean' },
              isNewView: { type: 'boolean' },
              viewsCount: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { videoId } = request.params as { videoId: string };

      app.logger.info({ userId, videoId }, 'Recording video view');

      try {
        // Check if video exists
        const [video] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        // Try to insert view (will be ignored if already exists due to unique constraint)
        const insertResult = await app.db
          .insert(schema.videoViews)
          .values({
            videoId,
            userId,
          })
          .onConflictDoNothing()
          .returning();

        const isNewView = insertResult.length > 0;

        // Increment views count if it's a new view
        if (isNewView) {
          await app.db
            .update(schema.videos)
            .set({ viewsCount: sql`${schema.videos.viewsCount} + 1` })
            .where(eq(schema.videos.id, videoId));

          app.logger.info({ userId, videoId }, 'View recorded and count incremented');
        } else {
          app.logger.info({ userId, videoId }, 'View already exists (idempotent)');
        }

        // Get updated video views count
        const updatedVideo = await app.db
          .select({ viewsCount: schema.videos.viewsCount })
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        return {
          success: true,
          isNewView,
          viewsCount: updatedVideo[0]?.viewsCount || 0,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, videoId }, 'Failed to record view');
        throw error;
      }
    }
  );
}
