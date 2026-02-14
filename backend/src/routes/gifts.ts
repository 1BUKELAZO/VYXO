import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, sum, count, sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

// Utility function to convert numeric to number
function numericToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return 0;
}

export function registerGiftRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/gifts
   * Get all available gifts
   * Public endpoint
   */
  app.fastify.get(
    '/api/gifts',
    {
      schema: {
        description: 'Get available gifts',
        tags: ['gifts'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                icon: { type: 'string' },
                priceCoins: { type: 'number' },
                valueCoins: { type: 'number' },
                animationUrl: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info({}, 'Fetching gifts list');

      try {
        const gifts = await app.db
          .select()
          .from(schema.gifts)
          .orderBy(schema.gifts.priceCoins);

        app.logger.info({ count: gifts.length }, 'Gifts fetched');

        return gifts;
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch gifts');
        throw error;
      }
    }
  );

  /**
   * GET /api/gifts/coin-packages
   * Get all active coin packages
   * Public endpoint
   */
  app.fastify.get(
    '/api/gifts/coin-packages',
    {
      schema: {
        description: 'Get coin packages',
        tags: ['gifts'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                coins: { type: 'number' },
                priceUsd: { type: 'number' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      app.logger.info({}, 'Fetching coin packages');

      try {
        const packages = await app.db
          .select({
            id: schema.coinPackages.id,
            name: schema.coinPackages.name,
            coins: schema.coinPackages.coins,
            priceUsd: schema.coinPackages.priceUsd,
          })
          .from(schema.coinPackages)
          .where(eq(schema.coinPackages.isActive, true))
          .orderBy(schema.coinPackages.coins);

        const formattedPackages = packages.map((p) => ({
          ...p,
          priceUsd: parseFloat(numericToNumber(p.priceUsd).toFixed(2)),
        }));

        app.logger.info({ count: formattedPackages.length }, 'Coin packages fetched');

        return formattedPackages;
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to fetch coin packages');
        throw error;
      }
    }
  );

  /**
   * GET /api/gifts/user-coins
   * Get current user's coin balance
   * Requires authentication
   */
  app.fastify.get(
    '/api/gifts/user-coins',
    {
      schema: {
        description: 'Get user coin balance',
        tags: ['gifts'],
        response: {
          200: {
            type: 'object',
            properties: {
              balance: { type: 'number' },
              totalSpent: { type: 'number' },
              totalEarned: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;

      app.logger.info({ userId }, 'Fetching user coin balance');

      try {
        let [userCoinRecord] = await app.db
          .select()
          .from(schema.userCoins)
          .where(eq(schema.userCoins.userId, userId));

        // Create record if doesn't exist
        if (!userCoinRecord) {
          [userCoinRecord] = await app.db
            .insert(schema.userCoins)
            .values({
              userId,
              balance: 0,
              totalSpent: 0,
              totalEarned: 0,
            })
            .returning();

          app.logger.info({ userId }, 'User coins record created');
        }

        return {
          balance: userCoinRecord.balance,
          totalSpent: userCoinRecord.totalSpent,
          totalEarned: userCoinRecord.totalEarned,
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch user coin balance');
        throw error;
      }
    }
  );

  /**
   * POST /api/gifts/send
   * Send a gift to another user
   * Requires authentication
   */
  app.fastify.post(
    '/api/gifts/send',
    {
      schema: {
        description: 'Send a gift',
        tags: ['gifts'],
        body: {
          type: 'object',
          properties: {
            giftId: { type: 'string' },
            recipientId: { type: 'string' },
            videoId: { type: 'string' },
          },
          required: ['giftId', 'recipientId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              newBalance: { type: 'number' },
              transaction: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  giftName: { type: 'string' },
                  giftIcon: { type: 'string' },
                  recipientUsername: { type: 'string' },
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

      const senderId = session.user.id;
      const { giftId, recipientId, videoId } = request.body as {
        giftId: string;
        recipientId: string;
        videoId?: string;
      };

      app.logger.info({ senderId, giftId, recipientId, videoId }, 'Sending gift');

      try {
        // Verify gift exists
        const [gift] = await app.db
          .select()
          .from(schema.gifts)
          .where(eq(schema.gifts.id, giftId));

        if (!gift) {
          app.logger.warn({ giftId }, 'Gift not found');
          return reply.code(404).send({ success: false, error: 'Gift not found' });
        }

        // Verify recipient exists
        const [recipientUser] = await app.db
          .select()
          .from(user)
          .where(eq(user.id, recipientId));

        if (!recipientUser) {
          app.logger.warn({ recipientId }, 'Recipient not found');
          return reply.code(404).send({ success: false, error: 'Recipient not found' });
        }

        // Prevent self-gifting
        if (senderId === recipientId) {
          app.logger.warn({ senderId }, 'Cannot gift to self');
          return reply.code(400).send({ success: false, error: 'Cannot gift to yourself' });
        }

        // Get sender's coin balance
        let [senderCoins] = await app.db
          .select()
          .from(schema.userCoins)
          .where(eq(schema.userCoins.userId, senderId));

        if (!senderCoins) {
          [senderCoins] = await app.db
            .insert(schema.userCoins)
            .values({
              userId: senderId,
              balance: 0,
              totalSpent: 0,
              totalEarned: 0,
            })
            .returning();
        }

        // Check sufficient coins
        if (senderCoins.balance < gift.priceCoins) {
          app.logger.warn(
            { senderId, required: gift.priceCoins, current: senderCoins.balance },
            'Insufficient coins'
          );
          return reply.code(400).send({
            success: false,
            error: 'Insufficient coins',
            required: gift.priceCoins,
            current: senderCoins.balance,
          });
        }

        // Create transaction
        const [transaction] = await app.db
          .insert(schema.giftTransactions)
          .values({
            senderId,
            recipientId,
            giftId,
            videoId: videoId || null,
            amountCoins: gift.priceCoins,
          })
          .returning();

        // Deduct from sender
        await app.db
          .update(schema.userCoins)
          .set({
            balance: sql`${schema.userCoins.balance} - ${gift.priceCoins}`,
            totalSpent: sql`${schema.userCoins.totalSpent} + ${gift.priceCoins}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.userCoins.userId, senderId));

        // Add to recipient
        let [recipientCoins] = await app.db
          .select()
          .from(schema.userCoins)
          .where(eq(schema.userCoins.userId, recipientId));

        if (!recipientCoins) {
          [recipientCoins] = await app.db
            .insert(schema.userCoins)
            .values({
              userId: recipientId,
              balance: gift.valueCoins,
              totalSpent: 0,
              totalEarned: gift.valueCoins,
            })
            .returning();
        } else {
          await app.db
            .update(schema.userCoins)
            .set({
              balance: sql`${schema.userCoins.balance} + ${gift.valueCoins}`,
              totalEarned: sql`${schema.userCoins.totalEarned} + ${gift.valueCoins}`,
              updatedAt: new Date(),
            })
            .where(eq(schema.userCoins.userId, recipientId));
        }

        // Create creator earnings record (convert coins to USD: 1 coin = $0.01)
        const earningsAmount = (gift.valueCoins / 100).toFixed(2);
        await app.db
          .insert(schema.creatorEarnings)
          .values({
            userId: recipientId,
            videoId: videoId || null,
            amount: earningsAmount as any,
            source: 'gifts',
          });

        // Create notification
        await app.db
          .insert(schema.notifications)
          .values({
            userId: recipientId,
            type: 'gift',
            actorId: senderId,
            videoId: videoId || null,
            isRead: false,
          });

        app.logger.info(
          { senderId, recipientId, giftId, transactionId: transaction.id },
          'Gift sent successfully'
        );

        return {
          success: true,
          newBalance: senderCoins.balance - gift.priceCoins,
          transaction: {
            id: transaction.id,
            giftName: gift.name,
            giftIcon: gift.icon,
            recipientUsername: recipientUser.name,
          },
        };
      } catch (error) {
        app.logger.error({ err: error, senderId, giftId, recipientId }, 'Failed to send gift');
        throw error;
      }
    }
  );

  /**
   * GET /api/gifts/transactions
   * Get gift transaction history
   * Requires authentication
   */
  app.fastify.get(
    '/api/gifts/transactions',
    {
      schema: {
        description: 'Get gift transactions',
        tags: ['gifts'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['sent', 'received'] },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
          required: ['type'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                giftName: { type: 'string' },
                giftIcon: { type: 'string' },
                otherUsername: { type: 'string' },
                otherAvatar: { type: 'string' },
                videoId: { type: 'string' },
                amountCoins: { type: 'number' },
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
      const { type, limit = 50, offset = 0 } = request.query as {
        type: string;
        limit?: number;
        offset?: number;
      };

      app.logger.info({ userId, type, limit, offset }, 'Fetching gift transactions');

      try {
        if (type === 'sent') {
          const transactions = await app.db
            .select({
              id: schema.giftTransactions.id,
              giftName: schema.gifts.name,
              giftIcon: schema.gifts.icon,
              otherUsername: user.name,
              otherAvatar: user.image,
              videoId: schema.giftTransactions.videoId,
              amountCoins: schema.giftTransactions.amountCoins,
              createdAt: schema.giftTransactions.createdAt,
            })
            .from(schema.giftTransactions)
            .innerJoin(schema.gifts, eq(schema.giftTransactions.giftId, schema.gifts.id))
            .leftJoin(user, eq(schema.giftTransactions.recipientId, user.id))
            .where(eq(schema.giftTransactions.senderId, userId))
            .orderBy(desc(schema.giftTransactions.createdAt))
            .limit(limit)
            .offset(offset);

          app.logger.info({ userId, count: transactions.length }, 'Sent transactions fetched');

          return transactions;
        } else if (type === 'received') {
          const transactions = await app.db
            .select({
              id: schema.giftTransactions.id,
              giftName: schema.gifts.name,
              giftIcon: schema.gifts.icon,
              otherUsername: user.name,
              otherAvatar: user.image,
              videoId: schema.giftTransactions.videoId,
              amountCoins: schema.giftTransactions.amountCoins,
              createdAt: schema.giftTransactions.createdAt,
            })
            .from(schema.giftTransactions)
            .innerJoin(schema.gifts, eq(schema.giftTransactions.giftId, schema.gifts.id))
            .leftJoin(user, eq(schema.giftTransactions.senderId, user.id))
            .where(eq(schema.giftTransactions.recipientId, userId))
            .orderBy(desc(schema.giftTransactions.createdAt))
            .limit(limit)
            .offset(offset);

          app.logger.info({ userId, count: transactions.length }, 'Received transactions fetched');

          return transactions;
        } else {
          return reply.code(400).send({ success: false, error: 'Invalid type parameter' });
        }
      } catch (error) {
        app.logger.error({ err: error, userId, type }, 'Failed to fetch gift transactions');
        throw error;
      }
    }
  );

  /**
   * GET /api/gifts/leaderboard/:userId
   * Get top gifters for a creator
   * Public endpoint
   */
  app.fastify.get(
    '/api/gifts/leaderboard/:userId',
    {
      schema: {
        description: 'Get gift leaderboard for creator',
        tags: ['gifts'],
        params: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                avatar: { type: 'string' },
                totalCoinsGifted: { type: 'number' },
                giftCount: { type: 'number' },
                rank: { type: 'number' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      app.logger.info({ userId }, 'Fetching gift leaderboard');

      try {
        // Verify creator exists
        const [creatorUser] = await app.db
          .select()
          .from(user)
          .where(eq(user.id, userId));

        if (!creatorUser) {
          app.logger.warn({ userId }, 'Creator not found');
          return reply.code(404).send({ success: false, error: 'Creator not found' });
        }

        // Get top gifters
        const leaderboard = await app.db
          .select({
            senderId: schema.giftTransactions.senderId,
            username: user.name,
            avatar: user.image,
            totalCoinsGifted: sum(schema.giftTransactions.amountCoins),
            giftCount: count(schema.giftTransactions.id),
          })
          .from(schema.giftTransactions)
          .innerJoin(user, eq(schema.giftTransactions.senderId, user.id))
          .where(eq(schema.giftTransactions.recipientId, userId))
          .groupBy(schema.giftTransactions.senderId, user.id, user.name, user.image)
          .orderBy(sql`SUM(${schema.giftTransactions.amountCoins}) DESC`)
          .limit(10);

        const formattedLeaderboard = leaderboard.map((entry, index) => ({
          username: entry.username,
          avatar: entry.avatar,
          totalCoinsGifted: numericToNumber(entry.totalCoinsGifted),
          giftCount: numericToNumber(entry.giftCount),
          rank: index + 1,
        }));

        app.logger.info({ userId, count: formattedLeaderboard.length }, 'Leaderboard fetched');

        return formattedLeaderboard;
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch leaderboard');
        throw error;
      }
    }
  );

  /**
   * POST /api/gifts/stripe/create-checkout
   * Create Stripe checkout session for coin purchase
   * Requires authentication
   */
  app.fastify.post(
    '/api/gifts/stripe/create-checkout',
    {
      schema: {
        description: 'Create Stripe checkout session',
        tags: ['gifts'],
        body: {
          type: 'object',
          properties: {
            packageId: { type: 'string' },
          },
          required: ['packageId'],
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
      const { packageId } = request.body as { packageId: string };

      app.logger.info({ userId, packageId }, 'Creating Stripe checkout session');

      try {
        // Verify package exists
        const [coinPackage] = await app.db
          .select()
          .from(schema.coinPackages)
          .where(
            and(
              eq(schema.coinPackages.id, packageId),
              eq(schema.coinPackages.isActive, true)
            )
          );

        if (!coinPackage) {
          app.logger.warn({ packageId }, 'Coin package not found');
          return reply.code(404).send({ success: false, error: 'Coin package not found' });
        }

        // In production, use actual Stripe API
        // For now, return a mock response
        const mockSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create stripe transaction record
        const [stripeTransaction] = await app.db
          .insert(schema.stripeTransactions)
          .values({
            userId,
            stripeSessionId: mockSessionId,
            packageId,
            coinsPurchased: coinPackage.coins,
            amountUsd: coinPackage.priceUsd,
            status: 'pending',
          })
          .returning();

        app.logger.info(
          { userId, transactionId: stripeTransaction.id, sessionId: mockSessionId },
          'Stripe session created'
        );

        // Mock checkout URL - in production this would be from Stripe
        const mockCheckoutUrl = `https://checkout.stripe.com/pay/${mockSessionId}`;

        return {
          checkoutUrl: mockCheckoutUrl,
          sessionId: mockSessionId,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, packageId }, 'Failed to create checkout session');
        throw error;
      }
    }
  );

  /**
   * POST /api/gifts/stripe/webhook
   * Stripe webhook handler for payment completion
   * Public endpoint (Stripe signature verification required)
   */
  app.fastify.post(
    '/api/gifts/stripe/webhook',
    {
      schema: {
        description: 'Stripe webhook handler',
        tags: ['gifts'],
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
      app.logger.info({}, 'Received Stripe webhook');

      try {
        // Note: In production, verify the webhook signature with STRIPE_WEBHOOK_SECRET
        const body = request.body as any;

        if (body.type === 'checkout.session.completed') {
          const sessionId = body.data.object.id;

          // Find transaction by session ID
          const [transaction] = await app.db
            .select()
            .from(schema.stripeTransactions)
            .where(eq(schema.stripeTransactions.stripeSessionId, sessionId));

          if (!transaction) {
            app.logger.warn({ sessionId }, 'Transaction not found for session');
            return { received: true };
          }

          // Update transaction status
          await app.db
            .update(schema.stripeTransactions)
            .set({
              status: 'completed',
              stripePaymentIntentId: body.data.object.payment_intent,
              completedAt: new Date(),
            })
            .where(eq(schema.stripeTransactions.id, transaction.id));

          // Add coins to user balance
          let [userCoins] = await app.db
            .select()
            .from(schema.userCoins)
            .where(eq(schema.userCoins.userId, transaction.userId));

          if (!userCoins) {
            [userCoins] = await app.db
              .insert(schema.userCoins)
              .values({
                userId: transaction.userId,
                balance: transaction.coinsPurchased,
                totalSpent: 0,
                totalEarned: 0,
              })
              .returning();
          } else {
            await app.db
              .update(schema.userCoins)
              .set({
                balance: sql`${schema.userCoins.balance} + ${transaction.coinsPurchased}`,
                updatedAt: new Date(),
              })
              .where(eq(schema.userCoins.userId, transaction.userId));
          }

          app.logger.info(
            { userId: transaction.userId, coins: transaction.coinsPurchased },
            'Coins added to user balance'
          );
        } else if (body.type === 'charge.refunded') {
          const paymentIntentId = body.data.object.payment_intent;

          // Find transaction by payment intent
          const [transaction] = await app.db
            .select()
            .from(schema.stripeTransactions)
            .where(eq(schema.stripeTransactions.stripePaymentIntentId, paymentIntentId));

          if (!transaction) {
            app.logger.warn({ paymentIntentId }, 'Transaction not found for refund');
            return { received: true };
          }

          // Update transaction status
          await app.db
            .update(schema.stripeTransactions)
            .set({ status: 'refunded' })
            .where(eq(schema.stripeTransactions.id, transaction.id));

          // Deduct coins if transaction was completed
          if (transaction.status === 'completed') {
            await app.db
              .update(schema.userCoins)
              .set({
                balance: sql`${schema.userCoins.balance} - ${transaction.coinsPurchased}`,
                updatedAt: new Date(),
              })
              .where(eq(schema.userCoins.userId, transaction.userId));

            app.logger.info(
              { userId: transaction.userId, coins: transaction.coinsPurchased },
              'Coins refunded from user balance'
            );
          }
        }

        return { received: true };
      } catch (error) {
        app.logger.error({ err: error }, 'Failed to process Stripe webhook');
        // Return 200 to acknowledge receipt even on error
        return { received: true };
      }
    }
  );
}
