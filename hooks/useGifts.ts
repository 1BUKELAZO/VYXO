
import { useState, useEffect, useCallback } from 'react';
import { authenticatedGet, authenticatedPost } from '@/utils/api';

export interface Gift {
  id: string;
  name: string;
  icon: string;
  price_coins: number;
  value_coins: number;
  animation_url?: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_usd: string;
}

export interface UserCoins {
  balance: number;
  total_spent: number;
  total_earned: number;
}

export interface GiftTransaction {
  id: string;
  giftName: string;
  giftIcon: string;
  recipientUsername?: string;
  recipientAvatar?: string;
  senderUsername?: string;
  senderAvatar?: string;
  videoId?: string;
  amount_coins: number;
  created_at: string;
}

interface SendGiftResponse {
  success: boolean;
  newBalance: number;
  transaction: {
    id: string;
    giftName: string;
    giftIcon: string;
    recipientUsername: string;
  };
}

interface SendGiftError {
  error: string;
  required?: number;
  current?: number;
}

export function useGifts() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [userCoins, setUserCoins] = useState<UserCoins | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchGifts = useCallback(async () => {
    try {
      console.log('Fetching available gifts');
      const response = await authenticatedGet<Gift[]>('/api/gifts');
      setGifts(response);
    } catch (err) {
      console.error('Failed to fetch gifts:', err);
      setError(err as Error);
    }
  }, []);

  const fetchCoinPackages = useCallback(async () => {
    try {
      console.log('Fetching coin packages');
      const response = await authenticatedGet<CoinPackage[]>('/api/gifts/coin-packages');
      setCoinPackages(response);
    } catch (err) {
      console.error('Failed to fetch coin packages:', err);
      setError(err as Error);
    }
  }, []);

  const fetchUserCoins = useCallback(async () => {
    try {
      console.log('Fetching user coins balance');
      const response = await authenticatedGet<UserCoins>('/api/gifts/user-coins');
      setUserCoins(response);
    } catch (err) {
      console.error('Failed to fetch user coins:', err);
      setError(err as Error);
    }
  }, []);

  const sendGift = useCallback(async (
    giftId: string,
    videoId: string,
    recipientId: string
  ): Promise<SendGiftResponse> => {
    try {
      console.log('Sending gift:', { giftId, videoId, recipientId });
      const response = await authenticatedPost<SendGiftResponse>('/api/gifts/send', {
        giftId,
        videoId,
        recipientId,
      });

      // Update local balance
      if (userCoins) {
        setUserCoins({
          ...userCoins,
          balance: response.newBalance,
        });
      }

      return response;
    } catch (err: any) {
      console.error('Failed to send gift:', err);
      
      // Check if it's an insufficient coins error
      if (err.message && err.message.includes('Insufficient coins')) {
        const insufficientError: SendGiftError = {
          error: 'Insufficient coins',
          required: 0,
          current: userCoins?.balance || 0,
        };
        throw insufficientError;
      }
      
      throw err;
    }
  }, [userCoins]);

  const buyCoins = useCallback(async (packageId: string): Promise<string> => {
    try {
      console.log('Creating Stripe checkout session for package:', packageId);
      const response = await authenticatedPost<{ checkoutUrl: string; sessionId: string }>(
        '/api/gifts/stripe/create-checkout',
        { packageId }
      );
      return response.checkoutUrl;
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      throw err;
    }
  }, []);

  const fetchTransactions = useCallback(async (
    type: 'sent' | 'received',
    limit: number = 50,
    offset: number = 0
  ): Promise<GiftTransaction[]> => {
    try {
      console.log('Fetching gift transactions:', { type, limit, offset });
      const response = await authenticatedGet<GiftTransaction[]>(
        `/api/gifts/transactions?type=${type}&limit=${limit}&offset=${offset}`
      );
      return response;
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      throw err;
    }
  }, []);

  const fetchLeaderboard = useCallback(async (userId: string) => {
    try {
      console.log('Fetching gift leaderboard for user:', userId);
      const response = await authenticatedGet<Array<{
        username: string;
        avatar: string;
        totalCoinsGifted: number;
        giftCount: number;
        rank: number;
      }>>(`/api/gifts/leaderboard/${userId}`);
      return response;
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      throw err;
    }
  }, []);

  const refetchCoins = useCallback(() => {
    fetchUserCoins();
  }, [fetchUserCoins]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchGifts(),
      fetchCoinPackages(),
      fetchUserCoins(),
    ]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchGifts, fetchCoinPackages, fetchUserCoins]);

  return {
    gifts,
    coinPackages,
    userCoins,
    isLoading,
    error,
    sendGift,
    buyCoins,
    fetchTransactions,
    fetchLeaderboard,
    refetchCoins,
  };
}
