
import { useState, useEffect, useCallback } from 'react';
import { authenticatedGet, authenticatedPost, authenticatedPatch } from '@/utils/api';

export interface AdCampaign {
  id: string;
  advertiser_id: string;
  name: string;
  budget: number;
  spent: number;
  status: 'active' | 'paused' | 'completed';
  target_audience: {
    age_range: string;
    interests: string[];
    locations: string[];
  };
  creative_url: string;
  cta_text: string;
  cta_url: string;
  created_at: string;
}

export interface AdCreative {
  campaignId: string;
  creative_url: string;
  cta_text: string;
  cta_url: string;
  type: 'in-feed' | 'brand-takeover';
}

export interface AdAnalytics {
  impressions: number;
  clicks: number;
  ctr: number;
  spent: number;
  conversions: number;
}

export const useAds = () => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvertiserCampaigns = useCallback(async () => {
    console.log('Fetching advertiser campaigns');
    setLoading(true);
    setError(null);
    try {
      const data = await authenticatedGet<AdCampaign[]>('/api/ads/campaigns');
      console.log('Campaigns fetched:', data);
      setCampaigns(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch campaigns';
      setError(errorMessage);
      console.error('Error fetching ad campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAdCampaign = useCallback(async (campaignData: {
    name: string;
    budget: number;
    creative_url: string;
    cta_text: string;
    cta_url: string;
    target_audience: {
      age_range: string;
      interests: string[];
      locations: string[];
    };
  }) => {
    console.log('Creating ad campaign:', campaignData);
    try {
      const newCampaign = await authenticatedPost<AdCampaign>('/api/ads/campaigns', campaignData);
      console.log('Campaign created:', newCampaign);
      setCampaigns((prev) => [...prev, newCampaign]);
      return newCampaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(errorMessage);
      console.error('Error creating ad campaign:', err);
      throw err;
    }
  }, []);

  const updateCampaignStatus = useCallback(async (campaignId: string, status: 'active' | 'paused' | 'completed') => {
    console.log('Updating campaign status:', campaignId, status);
    try {
      const updatedCampaign = await authenticatedPatch<AdCampaign>(`/api/ads/campaigns/${campaignId}`, { status });
      console.log('Campaign updated:', updatedCampaign);
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? updatedCampaign : c)));
      return updatedCampaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign';
      setError(errorMessage);
      console.error('Error updating campaign status:', err);
      throw err;
    }
  }, []);

  const fetchCampaignAnalytics = useCallback(async (campaignId: string): Promise<AdAnalytics> => {
    console.log('Fetching campaign analytics:', campaignId);
    try {
      const analytics = await authenticatedGet<AdAnalytics>(`/api/ads/campaigns/${campaignId}/analytics`);
      console.log('Analytics fetched:', analytics);
      return analytics;
    } catch (err) {
      console.error('Error fetching campaign analytics:', err);
      throw err;
    }
  }, []);

  const recordAdImpression = useCallback(async (campaignId: string, videoId?: string) => {
    console.log('Recording ad impression:', campaignId, videoId);
    try {
      const result = await authenticatedPost<{ impressionId: string }>('/api/ads/impressions', {
        campaignId,
        videoId,
      });
      console.log('Impression recorded:', result);
      return result.impressionId;
    } catch (err) {
      console.error('Error recording ad impression:', err);
      throw err;
    }
  }, []);

  const recordAdClick = useCallback(async (impressionId: string) => {
    console.log('Recording ad click:', impressionId);
    try {
      await authenticatedPost(`/api/ads/impressions/${impressionId}/click`, {});
      console.log('Click recorded');
    } catch (err) {
      console.error('Error recording ad click:', err);
    }
  }, []);

  const fetchAdForFeed = useCallback(async (videoHistory: string[]): Promise<AdCreative | null> => {
    console.log('Fetching ad for feed, video history length:', videoHistory.length);
    try {
      const ad = await authenticatedPost<AdCreative | null>('/api/ads/feed', { videoHistory });
      console.log('Ad fetched:', ad);
      return ad;
    } catch (err) {
      console.error('Error fetching ad for feed:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchAdvertiserCampaigns();
  }, [fetchAdvertiserCampaigns]);

  return {
    campaigns,
    loading,
    error,
    fetchAdvertiserCampaigns,
    createAdCampaign,
    updateCampaignStatus,
    fetchCampaignAnalytics,
    recordAdImpression,
    recordAdClick,
    fetchAdForFeed,
  };
};
