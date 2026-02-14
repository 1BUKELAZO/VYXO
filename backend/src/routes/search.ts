import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, ilike, desc, count, gt, and } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerSearchRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/search/users?q=<query>&cursor=<cursor>
   * Search users by username with cursor-based pagination
   * Requires authentication
   */
  app.fastify.get(
    '/api/search/users',
    {
      schema: {
        description: 'Search users by username',
        tags: ['search'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string' },
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
                    username: { type: 'string' },
                    avatar: { type: 'string' },
                    followersCount: { type: 'number' },
                    isFollowing: { type: 'boolean' },
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

      const { q, cursor, limit = 20 } = request.query as {
        q: string;
        cursor?: string;
        limit?: number;
      };

      const currentUserId = session.user.id;

      app.logger.info({ q, cursor, limit }, 'Searching users');

      try {
        if (!q || q.trim().length === 0) {
          return reply.code(400).send({ success: false, error: 'Search query is required' });
        }

        // Fetch one extra to check if there are more results
        const searchLimit = limit + 1;

        // Build where conditions
        const whereConditions = cursor
          ? and(ilike(user.name, `%${q}%`), gt(user.id, cursor))
          : ilike(user.name, `%${q}%`);

        const results = await app.db
          .select({
            id: user.id,
            username: user.name,
            avatar: user.image,
            email: user.email,
            createdAt: user.createdAt,
          })
          .from(user)
          .where(whereConditions)
          .orderBy(user.id)
          .limit(searchLimit);

        // Check if there are more results
        const hasMore = results.length > limit;
        const paginatedResults = results.slice(0, limit);
        const nextCursor = hasMore ? paginatedResults[paginatedResults.length - 1]?.id : null;

        // Get followers count for each user
        const userIds = paginatedResults.map((u) => u.id);
        const followersCounts = await app.db
          .select({
            userId: schema.follows.followingId,
            count: count().as('count'),
          })
          .from(schema.follows)
          .where(eq(schema.follows.followingId, userIds[0]))
          .groupBy(schema.follows.followingId);

        const followersMap = new Map(followersCounts.map((f) => [f.userId, Number(f.count) || 0]));

        // Check if current user follows each result user
        const isFollowingList = await app.db
          .select({ followingId: schema.follows.followingId })
          .from(schema.follows)
          .where(
            and(
              eq(schema.follows.followerId, currentUserId),
              eq(schema.follows.followingId, userIds[0])
            )
          );

        const isFollowingSet = new Set(isFollowingList.map((f) => f.followingId));

        const enrichedResults = paginatedResults.map((u) => ({
          id: u.id,
          username: u.username,
          avatar: u.avatar,
          followersCount: followersMap.get(u.id) || 0,
          isFollowing: isFollowingSet.has(u.id),
        }));

        app.logger.info({ q, count: enrichedResults.length, hasMore }, 'User search completed');

        return {
          results: enrichedResults,
          nextCursor: nextCursor || null,
          hasMore,
        };
      } catch (error) {
        app.logger.error({ err: error, q }, 'Failed to search users');
        throw error;
      }
    }
  );

  /**
   * GET /api/search/videos?q=<query>&cursor=<cursor>
   * Search videos by caption with cursor-based pagination
   * Requires authentication
   */
  app.fastify.get(
    '/api/search/videos',
    {
      schema: {
        description: 'Search videos by caption',
        tags: ['search'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string' },
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
                    caption: { type: 'string' },
                    thumbnailUrl: { type: 'string' },
                    viewsCount: { type: 'number' },
                    duration: { type: 'number' },
                    likesCount: { type: 'number' },
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

      const { q, cursor, limit = 20 } = request.query as {
        q: string;
        cursor?: string;
        limit?: number;
      };

      app.logger.info({ q, cursor, limit }, 'Searching videos');

      try {
        if (!q || q.trim().length === 0) {
          return reply.code(400).send({ success: false, error: 'Search query is required' });
        }

        const searchLimit = limit + 1;

        // Build where conditions
        const whereConditions = cursor
          ? and(ilike(schema.videos.caption, `%${q}%`), gt(schema.videos.id, cursor))
          : ilike(schema.videos.caption, `%${q}%`);

        const results = await app.db
          .select({
            id: schema.videos.id,
            caption: schema.videos.caption,
            thumbnailUrl: schema.videos.thumbnailUrl,
            viewsCount: schema.videos.viewsCount,
            duration: schema.videos.duration,
            likesCount: schema.videos.likesCount,
            createdAt: schema.videos.createdAt,
          })
          .from(schema.videos)
          .where(whereConditions)
          .orderBy(desc(schema.videos.createdAt))
          .limit(searchLimit);

        const hasMore = results.length > limit;
        const paginatedResults = results.slice(0, limit);
        const nextCursor = hasMore ? paginatedResults[paginatedResults.length - 1]?.id : null;

        const enrichedResults = paginatedResults.map((v) => ({
          id: v.id,
          caption: v.caption,
          thumbnailUrl: v.thumbnailUrl,
          viewsCount: v.viewsCount || 0,
          duration: v.duration,
          likesCount: v.likesCount,
        }));

        app.logger.info({ q, count: enrichedResults.length, hasMore }, 'Video search completed');

        return {
          results: enrichedResults,
          nextCursor: nextCursor || null,
          hasMore,
        };
      } catch (error) {
        app.logger.error({ err: error, q }, 'Failed to search videos');
        throw error;
      }
    }
  );

  /**
   * GET /api/search/suggestions?q=<query>
   * Get search suggestions as user types (typeahead)
   * Requires authentication
   */
  app.fastify.get(
    '/api/search/suggestions',
    {
      schema: {
        description: 'Get search suggestions for typeahead',
        tags: ['search'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    avatar: { type: 'string' },
                  },
                },
              },
              hashtags: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    usageCount: { type: 'number' },
                  },
                },
              },
              sounds: {
                type: 'array',
                items: {
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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { q } = request.query as { q: string };

      app.logger.info({ q }, 'Fetching search suggestions');

      try {
        if (!q || q.trim().length < 2) {
          return {
            users: [],
            hashtags: [],
            sounds: [],
          };
        }

        const searchTerm = `%${q}%`;

        // Search users (limited to 5 results)
        const userResults = await app.db
          .select({
            id: user.id,
            username: user.name,
            avatar: user.image,
          })
          .from(user)
          .where(ilike(user.name, searchTerm))
          .limit(5);

        // Search hashtags (limited to 5 results)
        const hashtagResults = await app.db
          .select({
            id: schema.hashtags.id,
            name: schema.hashtags.name,
            usageCount: schema.hashtags.usageCount,
          })
          .from(schema.hashtags)
          .where(ilike(schema.hashtags.name, searchTerm))
          .orderBy(desc(schema.hashtags.usageCount))
          .limit(5);

        // Search sounds (limited to 5 results)
        const soundResults = await app.db
          .select({
            id: schema.sounds.id,
            title: schema.sounds.title,
            artistName: schema.sounds.artistName,
          })
          .from(schema.sounds)
          .where(ilike(schema.sounds.title, searchTerm))
          .limit(5);

        app.logger.info(
          { q, userCount: userResults.length, hashtagCount: hashtagResults.length, soundCount: soundResults.length },
          'Suggestions fetched'
        );

        return {
          users: userResults,
          hashtags: hashtagResults,
          sounds: soundResults,
        };
      } catch (error) {
        app.logger.error({ err: error, q }, 'Failed to fetch suggestions');
        throw error;
      }
    }
  );

  /**
   * GET /api/search/trending
   * Get trending content (hashtags, sounds, users)
   * Requires authentication
   */
  app.fastify.get(
    '/api/search/trending',
    {
      schema: {
        description: 'Get trending content',
        tags: ['search'],
        response: {
          200: {
            type: 'object',
            properties: {
              hashtags: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    usageCount: { type: 'number' },
                  },
                },
              },
              sounds: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    artistName: { type: 'string' },
                    usageCount: { type: 'number' },
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

      app.logger.info({}, 'Fetching trending content');

      try {
        // Get trending hashtags
        const trendingHashtags = await app.db
          .select({
            id: schema.hashtags.id,
            name: schema.hashtags.name,
            usageCount: schema.hashtags.usageCount,
          })
          .from(schema.hashtags)
          .orderBy(desc(schema.hashtags.usageCount))
          .limit(20);

        // Get trending sounds
        const trendingSounds = await app.db
          .select({
            id: schema.sounds.id,
            title: schema.sounds.title,
            artistName: schema.sounds.artistName,
            usageCount: schema.sounds.usageCount,
          })
          .from(schema.sounds)
          .orderBy(desc(schema.sounds.usageCount))
          .limit(20);

        app.logger.info(
          { hashtagCount: trendingHashtags.length, soundCount: trendingSounds.length },
          'Trending content fetched'
        );

        return {
          hashtags: trendingHashtags,
          sounds: trendingSounds,
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch trending content');
        throw error;
      }
    }
  );

  /**
   * GET /api/hashtags/:name/videos
   * Get videos with a specific hashtag
   * Requires authentication
   */
  app.fastify.get(
    '/api/hashtags/:name/videos',
    {
      schema: {
        description: 'Get videos with hashtag',
        tags: ['search'],
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
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

      const { name } = request.params as { name: string };
      const { cursor, limit = 20 } = request.query as { cursor?: string; limit?: number };

      app.logger.info({ name, cursor, limit }, 'Fetching videos for hashtag');

      try {
        const searchLimit = limit + 1;

        // Build where conditions
        const whereConditions = cursor
          ? and(ilike(schema.videos.caption, `%#${name}%`), gt(schema.videos.id, cursor))
          : ilike(schema.videos.caption, `%#${name}%`);

        const results = await app.db
          .select({
            id: schema.videos.id,
            caption: schema.videos.caption,
            thumbnailUrl: schema.videos.thumbnailUrl,
            viewsCount: schema.videos.viewsCount,
            likesCount: schema.videos.likesCount,
            createdAt: schema.videos.createdAt,
          })
          .from(schema.videos)
          .where(whereConditions)
          .orderBy(desc(schema.videos.createdAt))
          .limit(searchLimit);

        const hasMore = results.length > limit;
        const paginatedResults = results.slice(0, limit);
        const nextCursor = hasMore ? paginatedResults[paginatedResults.length - 1]?.id : null;

        app.logger.info({ name, count: paginatedResults.length, hasMore }, 'Hashtag videos fetched');

        return {
          results: paginatedResults,
          nextCursor: nextCursor || null,
          hasMore,
        };
      } catch (error) {
        app.logger.error({ err: error, name }, 'Failed to fetch hashtag videos');
        throw error;
      }
    }
  );
}
