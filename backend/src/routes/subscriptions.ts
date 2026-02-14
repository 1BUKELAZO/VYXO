import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, inArray, count, sum } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

// Utility function to convert numeric to number
function numericToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return 0;
}

export function registerSubscriptionRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/subscriptions/tiers/:creatorId
   * Get subscription tiers for a creator
   * Public endpoint
   */
  app.fastify.get(
    '/api/subscriptions/tiers/:creatorId',
    {
      schema: {
        description: 'Get subscription tiers for creator',
        tags: ['subscriptions'],
        params: {
          type: 'object',
          properties: {
            creatorId: { type: 'string' },
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
                priceMonthly: { type: 'number' },
                benefits: {
                  type: 'array',
                  items: { type: 'string' },
                },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { creatorId } = request.params as { creatorId: string };

      app.logger.info({ creatorId }, 'Fetching subscription tiers');

      try {
        const tiers = await app.db
          .select()
          .from(schema.subscriptionTiers)
          .where(
            and(
              eq(schema.subscriptionTiers.creatorId, creatorId),
              eq(schema.subscriptionTiers.isActive, true)
            )
          )
          .orderBy(schema.subscriptionTiers.priceMonthly);

        app.logger.info({ creatorId, count: tiers.length }, 'Tiers fetched');

        return tiers;
      } catch (error) {
        app.logger.error({ err: error, creatorId }, 'Failed to fetch tiers');
        throw error;
      }
    }
  );

  /**
   * GET /api/subscriptions/user-status/:creatorId
   * Get current user's subscription status for a creator
   * Requires authentication
   */
  app.fastify.get(
    '/api/subscriptions/user-status/:creatorId',
    {
      schema: {
        description: 'Get user subscription status',
        tags: ['subscriptions'],
        params: {
          type: 'object',
          properties: {
            creatorId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              subscription: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  tierId: { type: 'string' },
                  tierName: { type: 'string' },
                  status: { type: 'string' },
                  currentPeriodStart: { type: 'string' },
                  currentPeriodEnd: { type: 'string' },
                  cancelAtPeriodEnd: { type: 'boolean' },
                },
                nullable: true,
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
      const { creatorId } = request.params as { creatorId: string };

      app.logger.info({ userId, creatorId }, 'Fetching subscription status');

      try {
        const [subscription] = await app.db
          .select({
            id: schema.userSubscriptions.id,
            tierId: schema.userSubscriptions.tierId,
            tierName: schema.subscriptionTiers.name,
            status: schema.userSubscriptions.status,
            currentPeriodStart: schema.userSubscriptions.currentPeriodStart,
            currentPeriodEnd: schema.userSubscriptions.currentPeriodEnd,
            cancelAtPeriodEnd: schema.userSubscriptions.cancelAtPeriodEnd,
          })
          .from(schema.userSubscriptions)
          .leftJoin(schema.subscriptionTiers, eq(schema.userSubscriptions.tierId, schema.subscriptionTiers.id))
          .where(
            and(
              eq(schema.userSubscriptions.subscriberId, userId),
              eq(schema.userSubscriptions.creatorId, creatorId)
            )
          );

        app.logger.info({ userId, creatorId, hasSubscription: Boolean(subscription) }, 'Subscription status fetched');

        return {
          subscription: subscription || null,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, creatorId }, 'Failed to fetch subscription status');
        throw error;
      }
    }
  );

  /**
   * GET /api/subscriptions/check-access/:creatorId
   * Check if user has active subscription to creator
   * Requires authentication
   */
  app.fastify.get(
    '/api/subscriptions/check-access/:creatorId',
    {
      schema: {
        description: 'Check subscription access',
        tags: ['subscriptions'],
        params: {
          type: 'object',
          properties: {
            creatorId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              hasAccess: { type: 'boolean' },
              tier: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
                nullable: true,
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
      const { creatorId } = request.params as { creatorId: string };

      app.logger.info({ userId, creatorId }, 'Checking subscription access');

      try {
        const [subscription] = await app.db
          .select({
            tierId: schema.userSubscriptions.tierId,
            tierName: schema.subscriptionTiers.name,
          })
          .from(schema.userSubscriptions)
          .leftJoin(schema.subscriptionTiers, eq(schema.userSubscriptions.tierId, schema.subscriptionTiers.id))
          .where(
            and(
              eq(schema.userSubscriptions.subscriberId, userId),
              eq(schema.userSubscriptions.creatorId, creatorId),
              eq(schema.userSubscriptions.status, 'active')
            )
          );

        const hasAccess = Boolean(subscription);

        return {
          hasAccess,
          tier: hasAccess ? { id: subscription!.tierId, name: subscription!.tierName } : null,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, creatorId }, 'Failed to check access');
        throw error;
      }
    }
  );

  /**
   * GET /api/subscriptions/manage
   * Get all active subscriptions for current user
   * Requires authentication
   */
  app.fastify.get(
    '/api/subscriptions/manage',
    {
      schema: {
        description: 'Get user subscriptions',
        tags: ['subscriptions'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                creatorId: { type: 'string' },
                creatorUsername: { type: 'string' },
                creatorAvatar: { type: 'string' },
                tierId: { type: 'string' },
                tierName: { type: 'string' },
                priceMonthly: { type: 'number' },
                status: { type: 'string' },
                currentPeriodStart: { type: 'string' },
                currentPeriodEnd: { type: 'string' },
                cancelAtPeriodEnd: { type: 'boolean' },
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

      app.logger.info({ userId }, 'Fetching user subscriptions');

      try {
        const subscriptions = await app.db
          .select({
            id: schema.userSubscriptions.id,
            creatorId: schema.userSubscriptions.creatorId,
            creatorUsername: user.name,
            creatorAvatar: user.image,
            tierId: schema.userSubscriptions.tierId,
            tierName: schema.subscriptionTiers.name,
            priceMonthly: schema.subscriptionTiers.priceMonthly,
            status: schema.userSubscriptions.status,
            currentPeriodStart: schema.userSubscriptions.currentPeriodStart,
            currentPeriodEnd: schema.userSubscriptions.currentPeriodEnd,
            cancelAtPeriodEnd: schema.userSubscriptions.cancelAtPeriodEnd,
          })
          .from(schema.userSubscriptions)
          .innerJoin(user, eq(schema.userSubscriptions.creatorId, user.id))
          .innerJoin(schema.subscriptionTiers, eq(schema.userSubscriptions.tierId, schema.subscriptionTiers.id))
          .where(
            and(
              eq(schema.userSubscriptions.subscriberId, userId),
              inArray(schema.userSubscriptions.status, ['active', 'past_due'])
            )
          )
          .orderBy(desc(schema.userSubscriptions.createdAt));

        app.logger.info({ userId, count: subscriptions.length }, 'User subscriptions fetched');

        return subscriptions;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch user subscriptions');
        throw error;
      }
    }
  );

  /**
   * POST /api/subscriptions/tiers
   * Create a subscription tier (creator only)
   * Requires authentication
   */
  app.fastify.post(
    '/api/subscriptions/tiers',
    {
      schema: {
        description: 'Create subscription tier',
        tags: ['subscriptions'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            priceMonthly: { type: 'number' },
            benefits: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['name', 'priceMonthly', 'benefits'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              tier: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  priceMonthly: { type: 'number' },
                  benefits: {
                    type: 'array',
                    items: { type: 'string' },
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
      const { name, priceMonthly, benefits } = request.body as {
        name: string;
        priceMonthly: number;
        benefits: string[];
      };

      app.logger.info({ userId, name, priceMonthly }, 'Creating subscription tier');

      try {
        // Verify user is approved creator
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
            error: 'You must be an approved creator to create subscription tiers',
          });
        }

        // Create tier
        const [tier] = await app.db
          .insert(schema.subscriptionTiers)
          .values({
            creatorId: userId,
            name,
            priceMonthly,
            benefits,
            isActive: true,
          })
          .returning();

        app.logger.info({ userId, tierId: tier.id }, 'Subscription tier created');

        return {
          success: true,
          tier: {
            id: tier.id,
            name: tier.name,
            priceMonthly: tier.priceMonthly,
            benefits: tier.benefits,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId, name }, 'Failed to create subscription tier');
        throw error;
      }
    }
  );

  /**
   * PUT /api/subscriptions/tiers/:tierId
   * Update subscription tier (creator only)
   * Requires authentication
   */
  app.fastify.put(
    '/api/subscriptions/tiers/:tierId',
    {
      schema: {
        description: 'Update subscription tier',
        tags: ['subscriptions'],
        params: {
          type: 'object',
          properties: {
            tierId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            benefits: {
              type: 'array',
              items: { type: 'string' },
            },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              tier: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  priceMonthly: { type: 'number' },
                  benefits: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  isActive: { type: 'boolean' },
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
      const { tierId } = request.params as { tierId: string };
      const { name, benefits, isActive } = request.body as {
        name?: string;
        benefits?: string[];
        isActive?: boolean;
      };

      app.logger.info({ userId, tierId }, 'Updating subscription tier');

      try {
        // Verify tier belongs to user
        const [tier] = await app.db
          .select()
          .from(schema.subscriptionTiers)
          .where(eq(schema.subscriptionTiers.id, tierId));

        if (!tier) {
          app.logger.warn({ tierId }, 'Tier not found');
          return reply.code(404).send({ success: false, error: 'Tier not found' });
        }

        if (tier.creatorId !== userId) {
          app.logger.warn({ userId, tierId, creatorId: tier.creatorId }, 'User does not own tier');
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        // Update tier
        const updateData: any = {};
        if (name) updateData.name = name;
        if (benefits) updateData.benefits = benefits;
        if (isActive !== undefined) updateData.isActive = isActive;

        const [updatedTier] = await app.db
          .update(schema.subscriptionTiers)
          .set(updateData)
          .where(eq(schema.subscriptionTiers.id, tierId))
          .returning();

        app.logger.info({ userId, tierId }, 'Subscription tier updated');

        return {
          success: true,
          tier: {
            id: updatedTier.id,
            name: updatedTier.name,
            priceMonthly: updatedTier.priceMonthly,
            benefits: updatedTier.benefits,
            isActive: updatedTier.isActive,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId, tierId }, 'Failed to update subscription tier');
        throw error;
      }
    }
  );

  /**
   * POST /api/subscriptions/create-checkout-session
   * Create Stripe checkout session for subscription
   * Requires authentication
   */
  app.fastify.post(
    '/api/subscriptions/create-checkout-session',
    {
      schema: {
        description: 'Create subscription checkout session',
        tags: ['subscriptions'],
        body: {
          type: 'object',
          properties: {
            tierId: { type: 'string' },
          },
          required: ['tierId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              checkoutUrl: { type: 'string' },
              sessionId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { tierId } = request.body as { tierId: string };

      app.logger.info({ userId, tierId }, 'Creating subscription checkout session');

      try {
        // Fetch tier details
        const [tier] = await app.db
          .select()
          .from(schema.subscriptionTiers)
          .where(eq(schema.subscriptionTiers.id, tierId));

        if (!tier) {
          app.logger.warn({ tierId }, 'Tier not found');
          return reply.code(404).send({ success: false, error: 'Tier not found' });
        }

        // Check if already subscribed
        const [existingSubscription] = await app.db
          .select()
          .from(schema.userSubscriptions)
          .where(
            and(
              eq(schema.userSubscriptions.subscriberId, userId),
              eq(schema.userSubscriptions.creatorId, tier.creatorId)
            )
          );

        if (existingSubscription) {
          app.logger.warn({ userId, creatorId: tier.creatorId }, 'Already subscribed to creator');
          return reply.code(400).send({
            success: false,
            error: 'You are already subscribed to this creator',
          });
        }

        // Get creator info
        const [creatorUser] = await app.db
          .select()
          .from(user)
          .where(eq(user.id, tier.creatorId));

        // Mock session creation (in production use Stripe API)
        const mockSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        app.logger.info(
          { userId, tierId, creatorId: tier.creatorId, sessionId: mockSessionId },
          'Subscription session created'
        );

        // Mock checkout URL
        const mockCheckoutUrl = `https://checkout.stripe.com/pay/${mockSessionId}`;

        return {
          checkoutUrl: mockCheckoutUrl,
          sessionId: mockSessionId,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, tierId }, 'Failed to create checkout session');
        throw error;
      }
    }
  );

  /**
   * POST /api/subscriptions/cancel/:subscriptionId
   * Cancel subscription
   * Requires authentication
   */
  app.fastify.post(
    '/api/subscriptions/cancel/:subscriptionId',
    {
      schema: {
        description: 'Cancel subscription',
        tags: ['subscriptions'],
        params: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              subscription: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  cancelAtPeriodEnd: { type: 'boolean' },
                  currentPeriodEnd: { type: 'string' },
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
      const { subscriptionId } = request.params as { subscriptionId: string };

      app.logger.info({ userId, subscriptionId }, 'Canceling subscription');

      try {
        // Verify subscription belongs to user
        const [subscription] = await app.db
          .select()
          .from(schema.userSubscriptions)
          .where(eq(schema.userSubscriptions.id, subscriptionId));

        if (!subscription) {
          app.logger.warn({ subscriptionId }, 'Subscription not found');
          return reply.code(404).send({ success: false, error: 'Subscription not found' });
        }

        if (subscription.subscriberId !== userId) {
          app.logger.warn({ userId, subscriptionId }, 'User does not own subscription');
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        // Mock Stripe cancellation (in production use Stripe API)
        // In production: call Stripe API to set cancel_at_period_end = true

        // Update subscription
        const [updatedSubscription] = await app.db
          .update(schema.userSubscriptions)
          .set({
            cancelAtPeriodEnd: true,
            updatedAt: new Date(),
          })
          .where(eq(schema.userSubscriptions.id, subscriptionId))
          .returning();

        app.logger.info({ subscriptionId }, 'Subscription canceled');

        return {
          success: true,
          subscription: {
            id: updatedSubscription.id,
            status: updatedSubscription.status,
            cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
            currentPeriodEnd: updatedSubscription.currentPeriodEnd,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId, subscriptionId }, 'Failed to cancel subscription');
        throw error;
      }
    }
  );

  /**
   * POST /api/subscriptions/reactivate/:subscriptionId
   * Reactivate canceled subscription
   * Requires authentication
   */
  app.fastify.post(
    '/api/subscriptions/reactivate/:subscriptionId',
    {
      schema: {
        description: 'Reactivate subscription',
        tags: ['subscriptions'],
        params: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              subscription: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  cancelAtPeriodEnd: { type: 'boolean' },
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
      const { subscriptionId } = request.params as { subscriptionId: string };

      app.logger.info({ userId, subscriptionId }, 'Reactivating subscription');

      try {
        // Verify subscription belongs to user
        const [subscription] = await app.db
          .select()
          .from(schema.userSubscriptions)
          .where(eq(schema.userSubscriptions.id, subscriptionId));

        if (!subscription) {
          app.logger.warn({ subscriptionId }, 'Subscription not found');
          return reply.code(404).send({ success: false, error: 'Subscription not found' });
        }

        if (subscription.subscriberId !== userId) {
          app.logger.warn({ userId, subscriptionId }, 'User does not own subscription');
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        if (!subscription.cancelAtPeriodEnd) {
          app.logger.warn({ subscriptionId }, 'Subscription is not scheduled for cancellation');
          return reply.code(400).send({
            success: false,
            error: 'Subscription is not scheduled for cancellation',
          });
        }

        // Mock Stripe reactivation (in production use Stripe API)
        // In production: call Stripe API to remove cancel_at_period_end

        // Update subscription
        const [updatedSubscription] = await app.db
          .update(schema.userSubscriptions)
          .set({
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(schema.userSubscriptions.id, subscriptionId))
          .returning();

        app.logger.info({ subscriptionId }, 'Subscription reactivated');

        return {
          success: true,
          subscription: {
            id: updatedSubscription.id,
            status: updatedSubscription.status,
            cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, userId, subscriptionId }, 'Failed to reactivate subscription');
        throw error;
      }
    }
  );

  /**
   * POST /api/subscriptions/stripe/webhook
   * Stripe webhook handler for subscription events
   * Public endpoint
   */
  app.fastify.post(
    '/api/subscriptions/stripe/webhook',
    {
      schema: {
        description: 'Stripe subscription webhook',
        tags: ['subscriptions'],
        response: {
          200: {
            type: 'object',
            properties: {
              received: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info({}, 'Received subscription webhook');

      try {
        // Note: In production, verify webhook signature with STRIPE_WEBHOOK_SECRET
        const body = request.body as any;
        const eventType = body.type;
        const data = body.data.object;

        if (eventType === 'checkout.session.completed') {
          const { userId, creatorId, tierId } = data.metadata || {};

          if (!userId || !creatorId || !tierId) {
            app.logger.warn({ metadata: data.metadata }, 'Missing metadata in checkout session');
            return { received: true };
          }

          // Create user subscription
          try {
            const [subscription] = await app.db
              .insert(schema.userSubscriptions)
              .values({
                subscriberId: userId,
                creatorId,
                tierId,
                stripeSubscriptionId: data.subscription || data.id,
                stripeCustomerId: data.customer,
                status: 'active',
                currentPeriodStart: new Date(data.current_period_start * 1000),
                currentPeriodEnd: new Date(data.current_period_end * 1000),
                cancelAtPeriodEnd: false,
              })
              .returning();

            // Create notification for creator
            await app.db
              .insert(schema.notifications)
              .values({
                userId: creatorId,
                type: 'subscription',
                actorId: userId,
                isRead: false,
              });

            // Create creator earnings record (80% of subscription price)
            const [tier] = await app.db
              .select({ priceMonthly: schema.subscriptionTiers.priceMonthly })
              .from(schema.subscriptionTiers)
              .where(eq(schema.subscriptionTiers.id, tierId));

            if (tier) {
              const earningsAmount = ((tier.priceMonthly / 100) * 0.8).toFixed(2);
              await app.db
                .insert(schema.creatorEarnings)
                .values({
                  userId: creatorId,
                  amount: earningsAmount as any,
                  source: 'subscriptions',
                });
            }

            app.logger.info({ userId, creatorId, subscriptionId: subscription.id }, 'Subscription created');
          } catch (error) {
            app.logger.error(
              { err: error, userId, creatorId, tierId },
              'Failed to create subscription from webhook'
            );
          }
        } else if (eventType === 'customer.subscription.updated') {
          const subscriptionId = data.id;
          const status =
            data.status === 'past_due'
              ? 'past_due'
              : data.status === 'canceled'
                ? 'canceled'
                : 'active';

          try {
            const [subscription] = await app.db
              .select()
              .from(schema.userSubscriptions)
              .where(eq(schema.userSubscriptions.stripeSubscriptionId, subscriptionId));

            if (subscription) {
              await app.db
                .update(schema.userSubscriptions)
                .set({
                  status,
                  currentPeriodStart: new Date(data.current_period_start * 1000),
                  currentPeriodEnd: new Date(data.current_period_end * 1000),
                  cancelAtPeriodEnd: data.cancel_at_period_end || false,
                  updatedAt: new Date(),
                })
                .where(eq(schema.userSubscriptions.id, subscription.id));

              app.logger.info({ subscriptionId, status }, 'Subscription updated');
            }
          } catch (error) {
            app.logger.error({ err: error, subscriptionId }, 'Failed to update subscription from webhook');
          }
        } else if (eventType === 'customer.subscription.deleted') {
          const subscriptionId = data.id;

          try {
            const [subscription] = await app.db
              .select()
              .from(schema.userSubscriptions)
              .where(eq(schema.userSubscriptions.stripeSubscriptionId, subscriptionId));

            if (subscription) {
              await app.db
                .update(schema.userSubscriptions)
                .set({
                  status: 'expired',
                  updatedAt: new Date(),
                })
                .where(eq(schema.userSubscriptions.id, subscription.id));

              app.logger.info({ subscriptionId }, 'Subscription expired');
            }
          } catch (error) {
            app.logger.error({ err: error, subscriptionId }, 'Failed to expire subscription from webhook');
          }
        } else if (eventType === 'invoice.payment_failed') {
          const subscriptionId = data.subscription;

          try {
            const [subscription] = await app.db
              .select()
              .from(schema.userSubscriptions)
              .where(eq(schema.userSubscriptions.stripeSubscriptionId, subscriptionId));

            if (subscription) {
              await app.db
                .update(schema.userSubscriptions)
                .set({
                  status: 'past_due',
                  updatedAt: new Date(),
                })
                .where(eq(schema.userSubscriptions.id, subscription.id));

              // Notify subscriber
              await app.db
                .insert(schema.notifications)
                .values({
                  userId: subscription.subscriberId,
                  type: 'payment_failed',
                  actorId: subscription.creatorId,
                  isRead: false,
                });

              app.logger.info({ subscriptionId }, 'Payment failed notification sent');
            }
          } catch (error) {
            app.logger.error({ err: error, subscriptionId }, 'Failed to handle payment failure');
          }
        }

        return { received: true };
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to process subscription webhook');
        return { received: true };
      }
    }
  );
}
