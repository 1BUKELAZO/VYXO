import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, count, sum, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

export function registerUserRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/users/:id
   * Returns user profile with follower/following counts and like stats
   * Requires authentication to check if current user follows this user
   */
  app.fastify.get(
    '/api/users/:id',
    {
      schema: {
        description: 'Get user profile',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              name: { type: 'string' },
              avatarUrl: { type: 'string' },
              bio: { type: 'string' },
              followersCount: { type: 'number' },
              followingCount: { type: 'number' },
              likesCount: { type: 'number' },
              isFollowing: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id: profileUserId } = request.params as { id: string };
      const currentUserId = session.user.id;

      app.logger.info({ profileUserId, currentUserId }, 'Fetching user profile');

      try {
        // Get user profile
        const userProfile = await app.db.query.user.findFirst({
          where: eq(user.id, profileUserId),
        });

        if (!userProfile) {
          app.logger.warn({ profileUserId }, 'User not found');
          return reply.code(404).send({ success: false, error: 'User not found' });
        }

        // Get followers count
        const [{ followers }] = await app.db
          .select({ followers: count(schema.follows.followerId).as('followers') })
          .from(schema.follows)
          .where(eq(schema.follows.followingId, profileUserId));

        // Get following count
        const [{ following }] = await app.db
          .select({ following: count(schema.follows.followingId).as('following') })
          .from(schema.follows)
          .where(eq(schema.follows.followerId, profileUserId));

        // Get total likes on user's videos
        const [{ totalLikes }] = await app.db
          .select({ totalLikes: sum(schema.videos.likesCount).as('total_likes') })
          .from(schema.videos)
          .where(eq(schema.videos.userId, profileUserId));

        // Check if current user follows this user
        const isFollowing = await app.db.query.follows.findFirst({
          where: and(eq(schema.follows.followerId, currentUserId), eq(schema.follows.followingId, profileUserId)),
        });

        app.logger.info(
          {
            profileUserId,
            followersCount: followers || 0,
            followingCount: following || 0,
            totalLikes: totalLikes || 0,
          },
          'User profile fetched successfully'
        );

        return {
          id: userProfile.id,
          username: userProfile.email || '',
          name: userProfile.name || '',
          avatarUrl: userProfile.image || null,
          bio: null,
          followersCount: Number(followers) || 0,
          followingCount: Number(following) || 0,
          likesCount: Number(totalLikes) || 0,
          isFollowing: !!isFollowing,
        };
      } catch (error) {
        app.logger.error({ err: error, profileUserId }, 'Failed to fetch user profile');
        throw error;
      }
    }
  );

  /**
   * GET /api/users/:id/videos
   * Returns all videos uploaded by a specific user
   * Public endpoint (no auth required)
   */
  app.fastify.get(
    '/api/users/:id/videos',
    {
      schema: {
        description: 'Get all videos by user',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                thumbnail_url: { type: 'string' },
                video_url: { type: 'string' },
                caption: { type: 'string' },
                likes_count: { type: 'number' },
                comments_count: { type: 'number' },
                shares_count: { type: 'number' },
                views_count: { type: 'number' },
                created_at: { type: 'string' },
                username: { type: 'string' },
                avatar_url: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: userId } = request.params as { id: string };

      app.logger.info({ userId }, 'Fetching user videos');

      try {
        const userVideos = await app.db
          .select({
            id: schema.videos.id,
            user_id: schema.videos.userId,
            thumbnail_url: schema.videos.thumbnailUrl,
            video_url: schema.videos.videoUrl,
            caption: schema.videos.caption,
            likes_count: schema.videos.likesCount,
            comments_count: schema.videos.commentsCount,
            shares_count: schema.videos.sharesCount,
            status: schema.videos.status,
            muxPlaybackId: schema.videos.muxPlaybackId,
            muxThumbnailUrl: schema.videos.muxThumbnailUrl,
            masterPlaylistUrl: schema.videos.masterPlaylistUrl,
            gifUrl: schema.videos.gifUrl,
            created_at: schema.videos.createdAt,
            username: user.email,
            avatar_url: user.image,
          })
          .from(schema.videos)
          .innerJoin(user, eq(schema.videos.userId, user.id))
          .where(eq(schema.videos.userId, userId))
          .orderBy(desc(schema.videos.createdAt));

        // Map to include views_count with default value of 0 and use Mux URLs when ready
        const videosWithViews = userVideos.map(video => ({
          ...video,
          views_count: 0,
          // Use HLS master playlist if video is ready from Mux, fallback to original URL
          video_url: video.status === 'ready' && video.masterPlaylistUrl ? video.masterPlaylistUrl : video.video_url,
        }));

        app.logger.info({ userId, count: videosWithViews.length }, 'User videos fetched successfully');
        return videosWithViews;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch user videos');
        throw error;
      }
    }
  );

  /**
   * GET /api/users/:id/followers/count
   * Returns follower count for a user
   */
  app.fastify.get(
    '/api/users/:id/followers/count',
    {
      schema: {
        description: 'Get follower count',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: userId } = request.params as { id: string };

      app.logger.info({ userId }, 'Fetching follower count');

      try {
        const [{ followers }] = await app.db
          .select({ followers: count(schema.follows.followerId).as('followers') })
          .from(schema.follows)
          .where(eq(schema.follows.followingId, userId));

        app.logger.info({ userId, count: followers || 0 }, 'Follower count fetched');
        return { count: Number(followers) || 0 };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch follower count');
        throw error;
      }
    }
  );

  /**
   * GET /api/users/:id/following/count
   * Returns following count for a user
   */
  app.fastify.get(
    '/api/users/:id/following/count',
    {
      schema: {
        description: 'Get following count',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: userId } = request.params as { id: string };

      app.logger.info({ userId }, 'Fetching following count');

      try {
        const [{ following }] = await app.db
          .select({ following: count(schema.follows.followingId).as('following') })
          .from(schema.follows)
          .where(eq(schema.follows.followerId, userId));

        app.logger.info({ userId, count: following || 0 }, 'Following count fetched');
        return { count: Number(following) || 0 };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch following count');
        throw error;
      }
    }
  );

  /**
   * GET /api/users/:id/is-following
   * Check if current user is following the specified user
   * Requires authentication
   */
  app.fastify.get(
    '/api/users/:id/is-following',
    {
      schema: {
        description: 'Check if following user',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              isFollowing: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id: followingId } = request.params as { id: string };
      const followerId = session.user.id;

      app.logger.info({ followerId, followingId }, 'Checking follow status');

      try {
        const existingFollow = await app.db.query.follows.findFirst({
          where: and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)),
        });

        const isFollowing = !!existingFollow;
        app.logger.info({ followerId, followingId, isFollowing }, 'Follow status checked');
        return { isFollowing };
      } catch (error) {
        app.logger.error({ err: error, followerId, followingId }, 'Failed to check follow status');
        throw error;
      }
    }
  );

  /**
   * GET /api/users/:id/followers
   * Returns list of followers for a user
   */
  app.fastify.get(
    '/api/users/:id/followers',
    {
      schema: {
        description: 'Get user followers',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                name: { type: 'string' },
                avatarUrl: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: userId } = request.params as { id: string };

      app.logger.info({ userId }, 'Fetching followers list');

      try {
        const followers = await app.db
          .select({
            id: user.id,
            username: user.email,
            name: user.name,
            avatarUrl: user.image,
            createdAt: schema.follows.createdAt,
          })
          .from(schema.follows)
          .innerJoin(user, eq(schema.follows.followerId, user.id))
          .where(eq(schema.follows.followingId, userId))
          .orderBy(desc(schema.follows.createdAt));

        app.logger.info({ userId, count: followers.length }, 'Followers list fetched');
        return followers;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch followers list');
        throw error;
      }
    }
  );

  /**
   * GET /api/users/:id/following
   * Returns list of users that this user is following
   */
  app.fastify.get(
    '/api/users/:id/following',
    {
      schema: {
        description: 'Get users being followed',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                name: { type: 'string' },
                avatarUrl: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: userId } = request.params as { id: string };

      app.logger.info({ userId }, 'Fetching following list');

      try {
        const following = await app.db
          .select({
            id: user.id,
            username: user.email,
            name: user.name,
            avatarUrl: user.image,
            createdAt: schema.follows.createdAt,
          })
          .from(schema.follows)
          .innerJoin(user, eq(schema.follows.followingId, user.id))
          .where(eq(schema.follows.followerId, userId))
          .orderBy(desc(schema.follows.createdAt));

        app.logger.info({ userId, count: following.length }, 'Following list fetched');
        return following;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch following list');
        throw error;
      }
    }
  );

  /**
   * POST /api/users/:id/follow
   * Follows a user
   * Requires authentication
   */
  app.fastify.post(
    '/api/users/:id/follow',
    {
      schema: {
        description: 'Follow a user',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
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

      const { id: followingId } = request.params as { id: string };
      const followerId = session.user.id;

      app.logger.info({ followerId, followingId }, 'Following user');

      try {
        // Check if user exists
        const targetUser = await app.db.query.user.findFirst({
          where: eq(user.id, followingId),
        });

        if (!targetUser) {
          app.logger.warn({ followingId }, 'User not found');
          return reply.code(404).send({ success: false, error: 'User not found' });
        }

        // Check if trying to follow self
        if (followerId === followingId) {
          app.logger.warn({ followerId }, 'Cannot follow self');
          return reply.code(400).send({ success: false, error: 'Cannot follow yourself' });
        }

        // Check if already following
        const existingFollow = await app.db.query.follows.findFirst({
          where: and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)),
        });

        if (existingFollow) {
          app.logger.warn({ followerId, followingId }, 'Already following user');
          return reply.code(400).send({ success: false, error: 'Already following this user' });
        }

        // Add follow
        await app.db.insert(schema.follows).values({
          followerId,
          followingId,
        });

        // Create notification
        await app.db.insert(schema.notifications).values({
          userId: followingId,
          type: 'follow',
          actorId: followerId,
        });

        app.logger.info({ followerId, followingId }, 'User followed successfully');
        return { success: true, isFollowing: true };
      } catch (error) {
        app.logger.error({ err: error, followerId, followingId }, 'Failed to follow user');
        throw error;
      }
    }
  );

  /**
   * DELETE /api/users/:id/follow
   * Unfollows a user
   * Requires authentication
   */
  app.fastify.delete(
    '/api/users/:id/follow',
    {
      schema: {
        description: 'Unfollow a user',
        tags: ['users'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
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

      const { id: followingId } = request.params as { id: string };
      const followerId = session.user.id;

      app.logger.info({ followerId, followingId }, 'Unfollowing user');

      try {
        // Check if user exists
        const targetUser = await app.db.query.user.findFirst({
          where: eq(user.id, followingId),
        });

        if (!targetUser) {
          app.logger.warn({ followingId }, 'User not found');
          return reply.code(404).send({ success: false, error: 'User not found' });
        }

        // Check if follow relationship exists
        const existingFollow = await app.db.query.follows.findFirst({
          where: and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, followingId)),
        });

        if (!existingFollow) {
          app.logger.warn({ followerId, followingId }, 'Not following user');
          return reply.code(400).send({ success: false, error: 'Not following this user' });
        }

        // Delete follow
        await app.db.delete(schema.follows).where(eq(schema.follows.id, existingFollow.id));

        app.logger.info({ followerId, followingId }, 'User unfollowed successfully');
        return { success: true, isFollowing: false };
      } catch (error) {
        app.logger.error({ err: error, followerId, followingId }, 'Failed to unfollow user');
        throw error;
      }
    }
  );
}
