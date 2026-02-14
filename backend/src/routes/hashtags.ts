import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, gt, desc, sql, ne, notInArray, gte, ilike, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

// Utility function to extract hashtags from caption
function extractHashtagsFromCaption(caption: string): string[] {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const matches = caption.match(hashtagRegex) || [];
  return matches
    .map((tag) => tag.substring(1).toLowerCase()) // Remove # and lowercase
    .filter((tag) => tag.length > 0);
}

// Utility function to normalize hashtag name
function normalizeHashtagName(name: string): string {
  return name.toLowerCase().replace(/^#/, ''); // Remove # if present and lowercase
}

export function registerHashtagRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * POST /api/videos/:videoId/hashtags
   * Adds hashtags to a video and updates usage counts
   * Requires authentication
   */
  app.fastify.post(
    '/api/videos/:videoId/hashtags',
    {
      schema: {
        description: 'Add hashtags to a video',
        tags: ['hashtags'],
        params: {
          type: 'object',
          properties: {
            videoId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            hashtags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['hashtags'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
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
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { videoId } = request.params as { videoId: string };
      const { hashtags: hashtagNames } = request.body as { hashtags: string[] };

      app.logger.info({ videoId, hashtagCount: hashtagNames.length }, 'Adding hashtags to video');

      try {
        // Verify video exists and user owns it
        const [video] = await app.db
          .select()
          .from(schema.videos)
          .where(eq(schema.videos.id, videoId));

        if (!video) {
          app.logger.warn({ videoId }, 'Video not found');
          return reply.code(404).send({ success: false, error: 'Video not found' });
        }

        if (video.userId !== session.user.id) {
          app.logger.warn({ videoId, userId: session.user.id }, 'User does not own video');
          return reply.code(403).send({ success: false, error: 'Unauthorized' });
        }

        // Normalize and deduplicate hashtag names
        const normalizedNames = Array.from(new Set(hashtagNames.map(normalizeHashtagName))).filter(
          (name) => name.length > 0
        );

        const createdHashtags = [];

        // Process each hashtag
        for (const hashtagName of normalizedNames) {
          // Check if hashtag exists
          let [hashtag] = await app.db
            .select()
            .from(schema.hashtags)
            .where(eq(schema.hashtags.name, hashtagName));

          // If not exists, create it
          if (!hashtag) {
            const [newHashtag] = await app.db
              .insert(schema.hashtags)
              .values({
                name: hashtagName,
                usageCount: 0,
              })
              .returning();

            hashtag = newHashtag;
            app.logger.info({ hashtagName }, 'Created new hashtag');
          }

          // Create video_hashtags relationship (ignore if already exists)
          await app.db
            .insert(schema.videoHashtags)
            .values({
              videoId,
              hashtagId: hashtag.id,
            })
            .onConflictDoNothing();

          // Increment usage count
          await app.db
            .update(schema.hashtags)
            .set({ usageCount: sql`${schema.hashtags.usageCount} + 1` })
            .where(eq(schema.hashtags.id, hashtag.id));

          createdHashtags.push({
            id: hashtag.id,
            name: hashtag.name,
            usageCount: hashtag.usageCount + 1,
          });
        }

        app.logger.info({ videoId, hashtagCount: createdHashtags.length }, 'Hashtags added to video');

        return {
          success: true,
          hashtags: createdHashtags,
        };
      } catch (error) {
        app.logger.error({ err: error, videoId }, 'Failed to add hashtags to video');
        throw error;
      }
    }
  );

  /**
   * GET /api/hashtags/trending
   * Returns top trending hashtags
   */
  app.fastify.get(
    '/api/hashtags/trending',
    {
      schema: {
        description: 'Get trending hashtags',
        tags: ['hashtags'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                usageCount: { type: 'number' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { limit = 20 } = request.query as { limit?: number };

      app.logger.info({ limit }, 'Fetching trending hashtags');

      try {
        const trendingHashtags = await app.db
          .select()
          .from(schema.hashtags)
          .orderBy(desc(schema.hashtags.usageCount))
          .limit(limit);

        app.logger.info({ count: trendingHashtags.length }, 'Trending hashtags fetched');

        return trendingHashtags;
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch trending hashtags');
        throw error;
      }
    }
  );

  /**
   * GET /api/hashtags/search
   * Search hashtags by name
   */
  app.fastify.get(
    '/api/hashtags/search',
    {
      schema: {
        description: 'Search hashtags',
        tags: ['hashtags'],
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string' },
          },
          required: ['q'],
        },
        response: {
          200: {
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
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { q } = request.query as { q: string };

      if (!q || q.length < 1) {
        app.logger.warn({ q }, 'Hashtag search query too short');
        return [];
      }

      app.logger.info({ query: q }, 'Searching hashtags');

      try {
        const results = await app.db
          .select()
          .from(schema.hashtags)
          .where(ilike(schema.hashtags.name, `%${q}%`))
          .orderBy(desc(schema.hashtags.usageCount))
          .limit(10);

        app.logger.info({ query: q, count: results.length }, 'Hashtag search completed');

        return results;
      } catch (error) {
        app.logger.error({ err: error, query: q }, 'Failed to search hashtags');
        throw error;
      }
    }
  );

  /**
   * GET /api/hashtags/:name
   * Get hashtag details with following status
   */
  app.fastify.get(
    '/api/hashtags/:name',
    {
      schema: {
        description: 'Get hashtag details',
        tags: ['hashtags'],
        params: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              usageCount: { type: 'number' },
              createdAt: { type: 'string' },
              isFollowing: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { name } = request.params as { name: string };
      const normalizedName = normalizeHashtagName(name);

      app.logger.info({ hashtagName: normalizedName }, 'Fetching hashtag details');

      try {
        const [hashtag] = await app.db
          .select()
          .from(schema.hashtags)
          .where(eq(schema.hashtags.name, normalizedName));

        if (!hashtag) {
          app.logger.warn({ hashtagName: normalizedName }, 'Hashtag not found');
          return reply.code(404).send({ success: false, error: 'Hashtag not found' });
        }

        // Check if current user follows this hashtag
        const [following] = await app.db
          .select()
          .from(schema.userFollowedHashtags)
          .where(
            and(
              eq(schema.userFollowedHashtags.userId, session.user.id),
              eq(schema.userFollowedHashtags.hashtagId, hashtag.id)
            )
          );

        app.logger.info({ hashtagName: normalizedName, isFollowing: Boolean(following) }, 'Hashtag details fetched');

        return {
          id: hashtag.id,
          name: hashtag.name,
          usageCount: hashtag.usageCount,
          createdAt: hashtag.createdAt,
          isFollowing: Boolean(following),
        };
      } catch (error) {
        app.logger.error({ err: error, hashtagName: normalizedName }, 'Failed to fetch hashtag details');
        throw error;
      }
    }
  );

  /**
   * POST /api/users/follow-hashtag
   * Follow a hashtag
   * Requires authentication
   */
  app.fastify.post(
    '/api/users/follow-hashtag',
    {
      schema: {
        description: 'Follow a hashtag',
        tags: ['hashtags'],
        body: {
          type: 'object',
          properties: {
            hashtagId: { type: 'string' },
          },
          required: ['hashtagId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              isFollowing: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { hashtagId } = request.body as { hashtagId: string };

      app.logger.info({ userId: session.user.id, hashtagId }, 'Following hashtag');

      try {
        // Verify hashtag exists
        const [hashtag] = await app.db
          .select()
          .from(schema.hashtags)
          .where(eq(schema.hashtags.id, hashtagId));

        if (!hashtag) {
          app.logger.warn({ hashtagId }, 'Hashtag not found');
          return reply.code(404).send({ success: false, error: 'Hashtag not found' });
        }

        // Create relationship (ignore if already exists)
        await app.db
          .insert(schema.userFollowedHashtags)
          .values({
            userId: session.user.id,
            hashtagId,
          })
          .onConflictDoNothing();

        app.logger.info({ userId: session.user.id, hashtagId }, 'Hashtag followed');

        return {
          success: true,
          isFollowing: true,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, hashtagId }, 'Failed to follow hashtag');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/users/follow-hashtag/:hashtagId
   * Unfollow a hashtag
   * Requires authentication
   */
  app.fastify.delete(
    '/api/users/follow-hashtag/:hashtagId',
    {
      schema: {
        description: 'Unfollow a hashtag',
        tags: ['hashtags'],
        params: {
          type: 'object',
          properties: {
            hashtagId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              isFollowing: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { hashtagId } = request.params as { hashtagId: string };

      app.logger.info({ userId: session.user.id, hashtagId }, 'Unfollowing hashtag');

      try {
        await app.db
          .delete(schema.userFollowedHashtags)
          .where(
            and(
              eq(schema.userFollowedHashtags.userId, session.user.id),
              eq(schema.userFollowedHashtags.hashtagId, hashtagId)
            )
          );

        app.logger.info({ userId: session.user.id, hashtagId }, 'Hashtag unfollowed');

        return {
          success: true,
          isFollowing: false,
        };
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id, hashtagId }, 'Failed to unfollow hashtag');
        throw error;
      }
    }
  );

  /**
   * GET /api/users/followed-hashtags
   * Get hashtags followed by current user
   * Requires authentication
   */
  app.fastify.get(
    '/api/users/followed-hashtags',
    {
      schema: {
        description: 'Get followed hashtags',
        tags: ['hashtags'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                usageCount: { type: 'number' },
                followedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, 'Fetching followed hashtags');

      try {
        const followedHashtags = await app.db
          .select({
            id: schema.hashtags.id,
            name: schema.hashtags.name,
            usageCount: schema.hashtags.usageCount,
            followedAt: schema.userFollowedHashtags.createdAt,
          })
          .from(schema.userFollowedHashtags)
          .innerJoin(schema.hashtags, eq(schema.userFollowedHashtags.hashtagId, schema.hashtags.id))
          .where(eq(schema.userFollowedHashtags.userId, session.user.id))
          .orderBy(desc(schema.userFollowedHashtags.createdAt));

        app.logger.info({ userId: session.user.id, count: followedHashtags.length }, 'Followed hashtags fetched');

        return followedHashtags;
      } catch (error) {
        app.logger.error({ err: error, userId: session.user.id }, 'Failed to fetch followed hashtags');
        throw error;
      }
    }
  );
}
