import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, gte, count, sum, lt } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { user } from '../db/auth-schema.js';

// Utility function to convert numeric to number
function numericToNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return 0;
}

// Calculate CPM based on targeting options
function calculateCPM(targetAudience: any): number {
  let cpm = 5; // Base CPM $5

  if (targetAudience) {
    if (targetAudience.ageRange) cpm += 5;
    if (targetAudience.interests && targetAudience.interests.length > 0) cpm += 5;
    if (targetAudience.locations && targetAudience.locations.length > 0) cpm += 5;
  }

  return Math.min(cpm, 20); // Cap at $20
}

export function registerAdRoutes(app: App) {
  const requireAuth = app.requireAuth();

  /**
   * GET /api/ads/campaigns
   * Get all campaigns for authenticated advertiser
   * Protected endpoint
   */
  app.fastify.get(
    '/api/ads/campaigns',
    {
      schema: {
        description: 'Get advertiser campaigns',
        tags: ['ads'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                advertiserId: { type: 'string' },
                name: { type: 'string' },
                budget: { type: 'number' },
                spent: { type: 'number' },
                status: { type: 'string' },
                targetAudience: { type: 'object' },
                creativeUrl: { type: 'string' },
                ctaText: { type: 'string' },
                ctaUrl: { type: 'string' },
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

      const advertiserId = session.user.id;

      app.logger.info({ advertiserId }, 'Fetching advertiser campaigns');

      try {
        const campaigns = await app.db
          .select()
          .from(schema.adCampaigns)
          .where(eq(schema.adCampaigns.advertiserId, advertiserId))
          .orderBy(desc(schema.adCampaigns.createdAt));

        const formattedCampaigns = campaigns.map((c) => ({
          ...c,
          budget: parseFloat(numericToNumber(c.budget).toFixed(2)),
          spent: parseFloat(numericToNumber(c.spent).toFixed(2)),
        }));

        app.logger.info({ advertiserId, count: formattedCampaigns.length }, 'Campaigns fetched');

        return formattedCampaigns;
      } catch (error) {
        app.logger.error({ err: error, advertiserId }, 'Failed to fetch campaigns');
        throw error;
      }
    }
  );

  /**
   * POST /api/ads/campaigns
   * Create new ad campaign
   * Protected endpoint
   */
  app.fastify.post(
    '/api/ads/campaigns',
    {
      schema: {
        description: 'Create ad campaign',
        tags: ['ads'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            budget: { type: 'number' },
            creativeUrl: { type: 'string' },
            ctaText: { type: 'string' },
            ctaUrl: { type: 'string' },
            targetAudience: { type: 'object' },
          },
          required: ['name', 'budget', 'creativeUrl', 'ctaText', 'ctaUrl'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              advertiserId: { type: 'string' },
              name: { type: 'string' },
              budget: { type: 'number' },
              spent: { type: 'number' },
              status: { type: 'string' },
              creativeUrl: { type: 'string' },
              ctaText: { type: 'string' },
              ctaUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const advertiserId = session.user.id;
      const { name, budget, creativeUrl, ctaText, ctaUrl, targetAudience } = request.body as {
        name: string;
        budget: number;
        creativeUrl: string;
        ctaText: string;
        ctaUrl: string;
        targetAudience?: Record<string, unknown>;
      };

      app.logger.info({ advertiserId, name, budget }, 'Creating ad campaign');

      try {
        const [campaign] = await app.db
          .insert(schema.adCampaigns)
          .values({
            advertiserId,
            name,
            budget: budget.toString() as any,
            spent: '0' as any,
            creativeUrl,
            ctaText,
            ctaUrl,
            targetAudience: targetAudience || null,
            status: 'active',
          })
          .returning();

        app.logger.info({ advertiserId, campaignId: campaign.id }, 'Campaign created');

        return {
          id: campaign.id,
          advertiserId: campaign.advertiserId,
          name: campaign.name,
          budget: parseFloat(numericToNumber(campaign.budget).toFixed(2)),
          spent: parseFloat(numericToNumber(campaign.spent).toFixed(2)),
          status: campaign.status,
          creativeUrl: campaign.creativeUrl,
          ctaText: campaign.ctaText,
          ctaUrl: campaign.ctaUrl,
        };
      } catch (error) {
        app.logger.error({ err: error, advertiserId, name }, 'Failed to create campaign');
        throw error;
      }
    }
  );

  /**
   * PATCH /api/ads/campaigns/:campaignId
   * Update campaign status
   * Protected endpoint
   */
  app.fastify.patch(
    '/api/ads/campaigns/:campaignId',
    {
      schema: {
        description: 'Update campaign status',
        tags: ['ads'],
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['active', 'paused', 'completed'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              budget: { type: 'number' },
              spent: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const advertiserId = session.user.id;
      const { campaignId } = request.params as { campaignId: string };
      const { status } = request.body as { status: string };

      app.logger.info({ advertiserId, campaignId, status }, 'Updating campaign status');

      try {
        // Verify campaign belongs to advertiser
        const [campaign] = await app.db
          .select()
          .from(schema.adCampaigns)
          .where(eq(schema.adCampaigns.id, campaignId));

        if (!campaign) {
          app.logger.warn({ campaignId }, 'Campaign not found');
          return reply.code(404).send({ success: false, error: 'Campaign not found' });
        }

        if (campaign.advertiserId !== advertiserId) {
          app.logger.warn({ advertiserId, campaignId }, 'User does not own campaign');
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        // Update status
        const [updatedCampaign] = await app.db
          .update(schema.adCampaigns)
          .set({ status })
          .where(eq(schema.adCampaigns.id, campaignId))
          .returning();

        app.logger.info({ campaignId, status }, 'Campaign status updated');

        return {
          id: updatedCampaign.id,
          status: updatedCampaign.status,
          budget: parseFloat(numericToNumber(updatedCampaign.budget).toFixed(2)),
          spent: parseFloat(numericToNumber(updatedCampaign.spent).toFixed(2)),
        };
      } catch (error) {
        app.logger.error({ err: error, advertiserId, campaignId }, 'Failed to update campaign');
        throw error;
      }
    }
  );

  /**
   * GET /api/ads/campaigns/:campaignId/analytics
   * Get campaign analytics
   * Protected endpoint
   */
  app.fastify.get(
    '/api/ads/campaigns/:campaignId/analytics',
    {
      schema: {
        description: 'Get campaign analytics',
        tags: ['ads'],
        params: {
          type: 'object',
          properties: {
            campaignId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              impressions: { type: 'number' },
              clicks: { type: 'number' },
              ctr: { type: 'number' },
              spent: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const advertiserId = session.user.id;
      const { campaignId } = request.params as { campaignId: string };

      app.logger.info({ advertiserId, campaignId }, 'Fetching campaign analytics');

      try {
        // Verify campaign belongs to advertiser
        const [campaign] = await app.db
          .select()
          .from(schema.adCampaigns)
          .where(eq(schema.adCampaigns.id, campaignId));

        if (!campaign) {
          app.logger.warn({ campaignId }, 'Campaign not found');
          return reply.code(404).send({ success: false, error: 'Campaign not found' });
        }

        if (campaign.advertiserId !== advertiserId) {
          app.logger.warn({ advertiserId, campaignId }, 'User does not own campaign');
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        // Get impressions count
        const impressionCountResult = await app.db
          .select({ count: count() })
          .from(schema.adImpressions)
          .where(eq(schema.adImpressions.campaignId, campaignId));

        const impressions = impressionCountResult[0]?.count || 0;

        // Get clicks count
        const clicksCountResult = await app.db
          .select({ count: count() })
          .from(schema.adImpressions)
          .where(and(eq(schema.adImpressions.campaignId, campaignId), eq(schema.adImpressions.clicked, true)));

        const clicks = clicksCountResult[0]?.count || 0;

        // Calculate CTR
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const spent = numericToNumber(campaign.spent);

        app.logger.info(
          { campaignId, impressions, clicks, ctr, spent },
          'Campaign analytics fetched'
        );

        return {
          impressions,
          clicks,
          ctr: parseFloat(ctr.toFixed(2)),
          spent: parseFloat(spent.toFixed(2)),
        };
      } catch (error) {
        app.logger.error({ err: error, advertiserId, campaignId }, 'Failed to fetch analytics');
        throw error;
      }
    }
  );

  /**
   * POST /api/ads/feed
   * Get ad to show in feed
   * Protected endpoint
   */
  app.fastify.post(
    '/api/ads/feed',
    {
      schema: {
        description: 'Get feed ad',
        tags: ['ads'],
        body: {
          type: 'object',
          properties: {
            videoHistory: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['videoHistory'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              campaignId: { type: 'string' },
              creativeUrl: { type: 'string' },
              ctaText: { type: 'string' },
              ctaUrl: { type: 'string' },
              type: { type: 'string' },
            },
            nullable: true,
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { videoHistory } = request.body as { videoHistory: string[] };

      app.logger.info({ userId, videoHistoryLength: videoHistory.length }, 'Fetching feed ad');

      try {
        // Check frequency cap: show ad every 5 videos
        if (videoHistory.length % 5 !== 0) {
          app.logger.info({ userId }, 'Ad frequency cap not met');
          return null;
        }

        // Get active campaigns with budget remaining
        const campaigns = await app.db
          .select()
          .from(schema.adCampaigns)
          .where(
            and(
              eq(schema.adCampaigns.status, 'active'),
              lt(schema.adCampaigns.spent, schema.adCampaigns.budget)
            )
          );

        if (campaigns.length === 0) {
          app.logger.info({ userId }, 'No eligible campaigns found');
          return null;
        }

        // Select random campaign from eligible ones
        const selectedCampaign = campaigns[Math.floor(Math.random() * campaigns.length)];

        app.logger.info(
          { userId, campaignId: selectedCampaign.id },
          'Ad selected for feed'
        );

        return {
          campaignId: selectedCampaign.id,
          creativeUrl: selectedCampaign.creativeUrl,
          ctaText: selectedCampaign.ctaText,
          ctaUrl: selectedCampaign.ctaUrl,
          type: 'in-feed',
        };
      } catch (error) {
        app.logger.error({ err: error, userId }, 'Failed to fetch feed ad');
        return null;
      }
    }
  );

  /**
   * POST /api/ads/impressions
   * Record ad impression
   * Protected endpoint
   */
  app.fastify.post(
    '/api/ads/impressions',
    {
      schema: {
        description: 'Record ad impression',
        tags: ['ads'],
        body: {
          type: 'object',
          properties: {
            campaignId: { type: 'string' },
            videoId: { type: 'string' },
          },
          required: ['campaignId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              impressionId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { campaignId, videoId } = request.body as {
        campaignId: string;
        videoId?: string;
      };

      app.logger.info({ userId, campaignId, videoId }, 'Recording ad impression');

      try {
        // Get campaign
        const [campaign] = await app.db
          .select()
          .from(schema.adCampaigns)
          .where(eq(schema.adCampaigns.id, campaignId));

        if (!campaign) {
          app.logger.warn({ campaignId }, 'Campaign not found');
          return reply.code(404).send({ success: false, error: 'Campaign not found' });
        }

        // Create impression
        const [impression] = await app.db
          .insert(schema.adImpressions)
          .values({
            campaignId,
            userId,
            videoId: videoId || null,
          })
          .returning();

        // Calculate cost based on CPM
        const cpm = calculateCPM(campaign.targetAudience);
        const costPerImpression = cpm / 1000;

        // Update campaign spent
        const newSpent = numericToNumber(campaign.spent) + costPerImpression;
        await app.db
          .update(schema.adCampaigns)
          .set({ spent: newSpent.toString() as any })
          .where(eq(schema.adCampaigns.id, campaignId));

        // Create creator earnings record (50% of ad revenue)
        if (videoId) {
          const [video] = await app.db
            .select({ userId: schema.videos.userId })
            .from(schema.videos)
            .where(eq(schema.videos.id, videoId));

          if (video) {
            const creatorRevenue = (costPerImpression * 0.5).toFixed(2);
            await app.db
              .insert(schema.creatorEarnings)
              .values({
                userId: video.userId,
                videoId: videoId,
                amount: creatorRevenue as any,
                source: 'ads',
              });
          }
        }

        app.logger.info(
          { impressionId: impression.id, campaignId, costPerImpression },
          'Impression recorded'
        );

        return {
          impressionId: impression.id,
        };
      } catch (error) {
        app.logger.error({ err: error, userId, campaignId }, 'Failed to record impression');
        throw error;
      }
    }
  );

  /**
   * POST /api/ads/impressions/:impressionId/click
   * Record ad click
   * Protected endpoint
   */
  app.fastify.post(
    '/api/ads/impressions/:impressionId/click',
    {
      schema: {
        description: 'Record ad click',
        tags: ['ads'],
        params: {
          type: 'object',
          properties: {
            impressionId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const userId = session.user.id;
      const { impressionId } = request.params as { impressionId: string };

      app.logger.info({ userId, impressionId }, 'Recording ad click');

      try {
        // Verify impression belongs to user
        const [impression] = await app.db
          .select()
          .from(schema.adImpressions)
          .where(eq(schema.adImpressions.id, impressionId));

        if (!impression) {
          app.logger.warn({ impressionId }, 'Impression not found');
          return reply.code(404).send({ success: false, error: 'Impression not found' });
        }

        if (impression.userId !== userId) {
          app.logger.warn({ userId, impressionId }, 'User does not own impression');
          return reply.code(401).send({ success: false, error: 'Unauthorized' });
        }

        // Mark as clicked
        await app.db
          .update(schema.adImpressions)
          .set({ clicked: true })
          .where(eq(schema.adImpressions.id, impressionId));

        app.logger.info({ impressionId }, 'Click recorded');

        return { success: true };
      } catch (error) {
        app.logger.error({ err: error, userId, impressionId }, 'Failed to record click');
        throw error;
      }
    }
  );
}
