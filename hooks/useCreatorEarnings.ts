
import { useState, useEffect, useCallback } from 'react';
import { authenticatedGet, authenticatedPost } from '@/utils/api';

export interface CreatorApplication {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  approvedAt?: string;
  paymentMethod?: string;
  paymentDetails?: Record<string, any>;
}

export interface CreatorDashboardStats {
  views7d: number;
  views30d: number;
  views90d: number;
  earnings7d: number;
  earnings30d: number;
  earnings90d: number;
  rpm: number;
  cpm: number;
  ctr: number;
  avgWatchTime: number;
}

export interface CreatorEarning {
  id: string;
  userId: string;
  videoId?: string;
  amount: number;
  source: 'views' | 'gifts' | 'tips';
  createdAt: string;
}

export interface CreatorEarningsSummary {
  currentBalance: number;
  earningsHistory: CreatorEarning[];
}

export interface CreatorWithdrawal {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  requestedAt: string;
  processedAt?: string;
}

export interface ApplicationStatus {
  hasApplied: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  appliedAt?: string;
  approvedAt?: string;
}

export function useCreatorEarnings() {
  const [dashboardStats, setDashboardStats] = useState<CreatorDashboardStats | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<CreatorEarningsSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<CreatorWithdrawal[]>([]);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchApplicationStatus = useCallback(async () => {
    console.log('[Creator] Fetching application status');
    setIsLoading(true);
    setError(null);
    try {
      const status = await authenticatedGet<ApplicationStatus>('/api/creator/application-status');
      console.log('[Creator] Application status:', status);
      setApplicationStatus(status);
      return status;
    } catch (err) {
      console.error('[Creator] Error fetching application status:', err);
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    console.log('[Creator] Fetching dashboard stats');
    setIsLoading(true);
    setError(null);
    try {
      const stats = await authenticatedGet<CreatorDashboardStats>('/api/creator/dashboard');
      console.log('[Creator] Dashboard stats:', stats);
      setDashboardStats(stats);
      return stats;
    } catch (err) {
      console.error('[Creator] Error fetching dashboard stats:', err);
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchEarningsSummary = useCallback(async () => {
    console.log('[Creator] Fetching earnings summary');
    setIsLoading(true);
    setError(null);
    try {
      const summary = await authenticatedGet<CreatorEarningsSummary>('/api/creator/earnings');
      console.log('[Creator] Earnings summary:', summary);
      setEarningsSummary(summary);
      return summary;
    } catch (err) {
      console.error('[Creator] Error fetching earnings summary:', err);
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    console.log('[Creator] Fetching withdrawals');
    setIsLoading(true);
    setError(null);
    try {
      const withdrawalList = await authenticatedGet<CreatorWithdrawal[]>('/api/creator/withdrawals');
      console.log('[Creator] Withdrawals:', withdrawalList);
      setWithdrawals(withdrawalList);
      return withdrawalList;
    } catch (err) {
      console.error('[Creator] Error fetching withdrawals:', err);
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyForCreatorFund = useCallback(async (paymentMethod: string, paymentDetails: Record<string, any>) => {
    console.log('[Creator] Applying for Creator Fund');
    setIsLoading(true);
    setError(null);
    try {
      const response = await authenticatedPost<{ success: boolean; application: CreatorApplication }>(
        '/api/creator/apply',
        { paymentMethod, paymentDetails }
      );
      console.log('[Creator] Application submitted:', response);
      // Refresh application status
      await fetchApplicationStatus();
      return response.success;
    } catch (err) {
      console.error('[Creator] Error applying for Creator Fund:', err);
      setError(err as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchApplicationStatus]);

  const requestWithdrawal = useCallback(async (amount: number) => {
    console.log('[Creator] Requesting withdrawal:', amount);
    setIsLoading(true);
    setError(null);
    try {
      const response = await authenticatedPost<{ success: boolean; withdrawal: CreatorWithdrawal }>(
        '/api/creator/withdraw',
        { amount }
      );
      console.log('[Creator] Withdrawal requested:', response);
      // Refresh earnings and withdrawals
      await Promise.all([fetchEarningsSummary(), fetchWithdrawals()]);
      return response.success;
    } catch (err) {
      console.error('[Creator] Error requesting withdrawal:', err);
      setError(err as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchEarningsSummary, fetchWithdrawals]);

  return {
    dashboardStats,
    earningsSummary,
    withdrawals,
    applicationStatus,
    isLoading,
    error,
    fetchApplicationStatus,
    fetchDashboardStats,
    fetchEarningsSummary,
    fetchWithdrawals,
    applyForCreatorFund,
    requestWithdrawal,
  };
}
