
import { useState, useEffect, useCallback } from 'react';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import * as WebBrowser from 'expo-web-browser';

export interface SubscriptionTier {
  id: string;
  name: string;
  price_monthly: number; // in cents
  benefits: string[];
  created_at: string;
}

export interface UserSubscription {
  id: string;
  tier_id: string;
  tier_name: string;
  status: 'active' | 'canceled' | 'expired' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  creator_id?: string;
  creator_username?: string;
  creator_avatar?: string;
  price_monthly?: number;
}

export interface SubscriptionAccess {
  hasAccess: boolean;
  tier: {
    id: string;
    name: string;
  } | null;
}

export function useSubscriptions(creatorId?: string) {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscriptionTiers = useCallback(async () => {
    if (!creatorId) return;
    
    try {
      console.log('Fetching subscription tiers for creator:', creatorId);
      const response = await authenticatedGet<SubscriptionTier[]>(
        `/api/subscriptions/tiers/${creatorId}`
      );
      setTiers(response);
    } catch (err) {
      console.error('Failed to fetch subscription tiers:', err);
      setError(err as Error);
    }
  }, [creatorId]);

  const fetchUserSubscription = useCallback(async () => {
    if (!creatorId) return;
    
    try {
      console.log('Fetching user subscription status for creator:', creatorId);
      const response = await authenticatedGet<{ subscription: UserSubscription | null }>(
        `/api/subscriptions/user-status/${creatorId}`
      );
      setUserSubscription(response.subscription);
    } catch (err) {
      console.error('Failed to fetch user subscription:', err);
      setError(err as Error);
    }
  }, [creatorId]);

  const createSubscriptionCheckout = useCallback(async (tierId: string) => {
    try {
      console.log('Creating subscription checkout session for tier:', tierId);
      setIsLoading(true);
      
      const response = await authenticatedPost<{ checkoutUrl: string; sessionId: string }>(
        '/api/subscriptions/create-checkout-session',
        { tierId }
      );

      // Open Stripe checkout in browser
      if (response.checkoutUrl) {
        await WebBrowser.openBrowserAsync(response.checkoutUrl);
      }

      return response;
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelSubscription = useCallback(async (subscriptionId: string) => {
    try {
      console.log('Canceling subscription:', subscriptionId);
      setIsLoading(true);
      
      const response = await authenticatedPost<{
        success: boolean;
        subscription: UserSubscription;
      }>(`/api/subscriptions/cancel/${subscriptionId}`, {});

      // Update local state
      setUserSubscription(response.subscription);

      return response;
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reactivateSubscription = useCallback(async (subscriptionId: string) => {
    try {
      console.log('Reactivating subscription:', subscriptionId);
      setIsLoading(true);
      
      const response = await authenticatedPost<{
        success: boolean;
        subscription: UserSubscription;
      }>(`/api/subscriptions/reactivate/${subscriptionId}`, {});

      // Update local state
      setUserSubscription(response.subscription);

      return response;
    } catch (err) {
      console.error('Failed to reactivate subscription:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchActiveSubscriptions = useCallback(async (): Promise<UserSubscription[]> => {
    try {
      console.log('Fetching active subscriptions');
      setIsLoading(true);
      
      const response = await authenticatedGet<UserSubscription[]>('/api/subscriptions/manage');
      return response;
    } catch (err) {
      console.error('Failed to fetch active subscriptions:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAccess = useCallback(async (checkCreatorId: string): Promise<SubscriptionAccess> => {
    try {
      console.log('Checking subscription access for creator:', checkCreatorId);
      const response = await authenticatedGet<SubscriptionAccess>(
        `/api/subscriptions/check-access/${checkCreatorId}`
      );
      return response;
    } catch (err) {
      console.error('Failed to check subscription access:', err);
      throw err;
    }
  }, []);

  const createTier = useCallback(async (
    name: string,
    priceMonthly: number,
    benefits: string[]
  ) => {
    try {
      console.log('Creating subscription tier:', { name, priceMonthly, benefits });
      setIsLoading(true);
      
      const response = await authenticatedPost<{
        success: boolean;
        tier: SubscriptionTier;
      }>('/api/subscriptions/tiers', {
        name,
        price_monthly: priceMonthly,
        benefits,
      });

      return response.tier;
    } catch (err) {
      console.error('Failed to create tier:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (creatorId) {
      setIsLoading(true);
      Promise.all([
        fetchSubscriptionTiers(),
        fetchUserSubscription(),
      ]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [creatorId, fetchSubscriptionTiers, fetchUserSubscription]);

  return {
    tiers,
    userSubscription,
    isLoading,
    error,
    fetchSubscriptionTiers,
    fetchUserSubscription,
    createSubscriptionCheckout,
    cancelSubscription,
    reactivateSubscription,
    fetchActiveSubscriptions,
    checkAccess,
    createTier,
  };
}
