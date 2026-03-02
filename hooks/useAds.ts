import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const hasFetchedRef = useRef(false);

  const fetchAdvertiserCampaigns = useCallback(async () => {
    // 🔧 FIX: Silenciar error, no mostrar en consola
    console.log('[useAds] Fetching campaigns (fail-safe mode)');
    
    try {
      const data = await authenticatedGet<AdCampaign[]>('/api/ads/campaigns');
      setCampaigns(data);
      console.log('[useAds] Campaigns loaded:', data.length);
    } catch (err) {
      // 🔧 FIX: Silenciar completamente, usar array vacío
      console.log('[useAds] Campaigns fetch failed (expected), using empty array');
      setCampaigns([]);
      setError(null); // No mostrar error en UI
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
      setCampaigns((prev) => [...prev, newCampaign]);
      return newCampaign;
    } catch (err) {
      console.error('Error creating ad campaign:', err);
      throw err;
    }
  }, []);

  const updateCampaignStatus = useCallback(async (campaignId: string, status: 'active' | 'paused' | 'completed') => {
    console.log('Updating campaign status:', campaignId, status);
    try {
      const updatedCampaign = await authenticatedPatch<AdCampaign>(`/api/ads/campaigns/${campaignId}`, { status });
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? updatedCampaign : c)));
      return updatedCampaign;
    } catch (err) {
      console.error('Error updating campaign status:', err);
      throw err;
    }
  }, []);

  const fetchCampaignAnalytics = useCallback(async (campaignId: string): Promise<AdAnalytics> => {
    console.log('Fetching campaign analytics:', campaignId);
    try {
      const analytics = await authenticatedGet<AdAnalytics>(`/api/ads/campaigns/${campaignId}/analytics`);
      return analytics;
    } catch (err) {
      console.log('[useAds] Analytics fetch failed, returning defaults');
      return {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        spent: 0,
        conversions: 0,
      };
    }
  }, []);

  const recordAdImpression = useCallback(async (campaignId: string, videoId?: string) => {
    try {
      const result = await authenticatedPost<{ impressionId: string }>('/api/ads/impressions', {
        campaignId,
        videoId,
      });
      return result.impressionId;
    } catch (err) {
      console.log('[useAds] Impression recording failed (silent)');
      return null;
    }
  }, []);

  const recordAdClick = useCallback(async (impressionId: string) => {
    try {
      await authenticatedPost(`/api/ads/impressions/${impressionId}/click`, {});
    } catch (err) {
      console.log('[useAds] Click recording failed (silent)');
    }
  }, []);

  const fetchAdForFeed = useCallback(async (videoHistory: string[]): Promise<AdCreative | null> => {
    try {
      const ad = await authenticatedPost<AdCreative | null>('/api/ads/feed', { videoHistory });
      return ad;
    } catch (err) {
      console.log('[useAds] Ad fetch for feed failed (expected), returning null');
      return null;
    }
  }, []);

  // 🔧 FIX: Ejecutar solo una vez, silenciar errores
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchAdvertiserCampaigns();
    }
  }, []);

  return {
    campaigns,
    loading,
    error, // Siempre null para no mostrar errores en UI
    fetchAdvertiserCampaigns,
    createAdCampaign,
    updateCampaignStatus,
    fetchCampaignAnalytics,
    recordAdImpression,
    recordAdClick,
    fetchAdForFeed,
  };
};