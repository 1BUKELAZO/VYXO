
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';

interface AdminDashboardMetrics {
  totalUsers: number;
  totalVideos: number;
  pendingReports: number;
  dau: number;
  mau: number;
  videosToday: number;
  reportsToday: number;
  creatorApplicationsPending: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  is_banned: boolean;
  created_at: string;
  videosCount: number;
  followersCount: number;
}

interface AdminVideo {
  id: string;
  user_id: string;
  username: string;
  caption: string;
  thumbnail_url: string;
  views_count: number;
  likes_count: number;
  created_at: string;
  status: string;
}

interface AdminReport {
  id: string;
  reporter_id: string;
  reporter_username: string;
  target_id: string;
  target_type: 'video' | 'user' | 'comment';
  target_username?: string;
  target_caption?: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

interface CreatorApplication {
  id: string;
  user_id: string;
  username: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  videosCount: number;
  followersCount: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export function useAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<AdminDashboardMetrics | null>(null);

  const checkAdminAccess = useCallback(async () => {
    console.log('Checking admin access...');
    try {
      setIsLoading(true);
      const metrics = await authenticatedGet<AdminDashboardMetrics>('/api/admin/dashboard');
      setDashboardMetrics(metrics);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('Admin access check failed:', err);
      if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError('Access denied. Admin privileges required.');
        router.replace('/');
      } else {
        setError(err.message || 'Failed to verify admin access');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const fetchDashboardMetrics = useCallback(async () => {
    console.log('Fetching dashboard metrics...');
    try {
      setIsLoading(true);
      const metrics = await authenticatedGet<AdminDashboardMetrics>('/api/admin/dashboard');
      setDashboardMetrics(metrics);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch dashboard metrics:', err);
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (search: string = '', page: number = 1, limit: number = 20) => {
    console.log('Fetching users...', { search, page, limit });
    try {
      const queryParams = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString(),
      });
      const response = await authenticatedGet<{ users: AdminUser[]; total: number; page: number; limit: number }>(
        `/api/admin/users?${queryParams}`
      );
      return response;
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      throw err;
    }
  }, []);

  const fetchUserDetails = useCallback(async (userId: string) => {
    console.log('Fetching user details...', userId);
    try {
      const user = await authenticatedGet<AdminUser>(`/api/admin/users/${userId}`);
      return user;
    } catch (err: any) {
      console.error('Failed to fetch user details:', err);
      throw err;
    }
  }, []);

  const banUser = useCallback(async (userId: string, reason: string) => {
    console.log('Banning user...', userId, reason);
    try {
      const user = await authenticatedPost<AdminUser>(`/api/admin/users/${userId}/ban`, { reason });
      return user;
    } catch (err: any) {
      console.error('Failed to ban user:', err);
      throw err;
    }
  }, []);

  const unbanUser = useCallback(async (userId: string) => {
    console.log('Unbanning user...', userId);
    try {
      const user = await authenticatedPost<AdminUser>(`/api/admin/users/${userId}/unban`, {});
      return user;
    } catch (err: any) {
      console.error('Failed to unban user:', err);
      throw err;
    }
  }, []);

  const fetchVideos = useCallback(async (search: string = '', page: number = 1, limit: number = 20) => {
    console.log('Fetching videos...', { search, page, limit });
    try {
      const queryParams = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString(),
      });
      const response = await authenticatedGet<{ videos: AdminVideo[]; total: number; page: number; limit: number }>(
        `/api/admin/videos?${queryParams}`
      );
      return response;
    } catch (err: any) {
      console.error('Failed to fetch videos:', err);
      throw err;
    }
  }, []);

  const fetchVideoDetails = useCallback(async (videoId: string) => {
    console.log('Fetching video details...', videoId);
    try {
      const video = await authenticatedGet<AdminVideo>(`/api/admin/videos/${videoId}`);
      return video;
    } catch (err: any) {
      console.error('Failed to fetch video details:', err);
      throw err;
    }
  }, []);

  const deleteVideo = useCallback(async (videoId: string) => {
    console.log('Deleting video...', videoId);
    try {
      const result = await authenticatedDelete<{ success: boolean }>(`/api/admin/videos/${videoId}`);
      return result;
    } catch (err: any) {
      console.error('Failed to delete video:', err);
      throw err;
    }
  }, []);

  const fetchReports = useCallback(async (status: string = 'pending', page: number = 1, limit: number = 20) => {
    console.log('Fetching reports...', { status, page, limit });
    try {
      const queryParams = new URLSearchParams({
        status,
        page: page.toString(),
        limit: limit.toString(),
      });
      const response = await authenticatedGet<{ reports: AdminReport[]; total: number; page: number; limit: number }>(
        `/api/admin/reports?${queryParams}`
      );
      return response;
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      throw err;
    }
  }, []);

  const dismissReport = useCallback(async (reportId: string) => {
    console.log('Dismissing report...', reportId);
    try {
      const report = await authenticatedPost<AdminReport>(`/api/admin/reports/${reportId}/dismiss`, {});
      return report;
    } catch (err: any) {
      console.error('Failed to dismiss report:', err);
      throw err;
    }
  }, []);

  const removeReportedContent = useCallback(async (reportId: string) => {
    console.log('Removing reported content...', reportId);
    try {
      const result = await authenticatedPost<{ success: boolean }>(`/api/admin/reports/${reportId}/remove-content`, {});
      return result;
    } catch (err: any) {
      console.error('Failed to remove reported content:', err);
      throw err;
    }
  }, []);

  const banReportedUser = useCallback(async (reportId: string) => {
    console.log('Banning reported user...', reportId);
    try {
      const result = await authenticatedPost<{ success: boolean }>(`/api/admin/reports/${reportId}/ban-user`, {});
      return result;
    } catch (err: any) {
      console.error('Failed to ban reported user:', err);
      throw err;
    }
  }, []);

  const fetchCreatorApplications = useCallback(async (status: string = 'pending', page: number = 1, limit: number = 20) => {
    console.log('Fetching creator applications...', { status, page, limit });
    try {
      const queryParams = new URLSearchParams({
        status,
        page: page.toString(),
        limit: limit.toString(),
      });
      const response = await authenticatedGet<{ applications: CreatorApplication[]; total: number; page: number; limit: number }>(
        `/api/admin/creator-applications?${queryParams}`
      );
      return response;
    } catch (err: any) {
      console.error('Failed to fetch creator applications:', err);
      throw err;
    }
  }, []);

  const approveCreatorApplication = useCallback(async (applicationId: string) => {
    console.log('Approving creator application...', applicationId);
    try {
      const application = await authenticatedPost<CreatorApplication>(`/api/admin/creator-applications/${applicationId}/approve`, {});
      return application;
    } catch (err: any) {
      console.error('Failed to approve creator application:', err);
      throw err;
    }
  }, []);

  const rejectCreatorApplication = useCallback(async (applicationId: string) => {
    console.log('Rejecting creator application...', applicationId);
    try {
      const application = await authenticatedPost<CreatorApplication>(`/api/admin/creator-applications/${applicationId}/reject`, {});
      return application;
    } catch (err: any) {
      console.error('Failed to reject creator application:', err);
      throw err;
    }
  }, []);

  return {
    isLoading,
    error,
    dashboardMetrics,
    checkAdminAccess,
    fetchDashboardMetrics,
    fetchUsers,
    fetchUserDetails,
    banUser,
    unbanUser,
    fetchVideos,
    fetchVideoDetails,
    deleteVideo,
    fetchReports,
    dismissReport,
    removeReportedContent,
    banReportedUser,
    fetchCreatorApplications,
    approveCreatorApplication,
    rejectCreatorApplication,
  };
}
