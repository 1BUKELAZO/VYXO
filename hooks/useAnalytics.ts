
import { useState, useCallback } from 'react';
import { authenticatedGet } from '@/utils/api';

export interface AnalyticsOverview {
  totalViews: number;
  followersGained: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalEarnings: number;
}

export interface DailyViewsData {
  date: string;
  views: number;
}

export interface TopVideo {
  id: string;
  caption: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  createdAt: string;
}

export interface AudienceDemographics {
  ageGroups: { range: string; percentage: number }[];
  genders: { type: string; percentage: number }[];
  locations: { country: string; percentage: number }[];
}

export interface TrafficSource {
  source: string;
  views: number;
  percentage: number;
}

export interface PostingTimeHeatmap {
  day: number;
  hour: number;
  engagement: number;
}

export interface DashboardData {
  overview: AnalyticsOverview;
  dailyViews: DailyViewsData[];
  topVideos: TopVideo[];
  audienceInsights: AudienceDemographics;
  trafficSources: TrafficSource[];
  postingTimes: PostingTimeHeatmap[];
}

export interface VideoMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  averageWatchTime: number;
  completionRate: number;
}

export interface VideoAnalytics {
  video: {
    id: string;
    caption: string;
    thumbnailUrl: string;
    createdAt: string;
    duration: number;
  };
  metrics: VideoMetrics;
  retentionGraph: { second: number; percentage: number }[];
  trafficSources: TrafficSource[];
  demographics: AudienceDemographics;
  engagement: {
    likesOverTime: { date: string; count: number }[];
    commentsOverTime: { date: string; count: number }[];
    sharesOverTime: { date: string; count: number }[];
  };
}

export type Timeframe = '7d' | '30d' | '90d';

export function useAnalytics() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [videoAnalytics, setVideoAnalytics] = useState<VideoAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDashboardData = useCallback(async (timeframe: Timeframe = '30d') => {
    console.log('Fetching analytics dashboard data for timeframe:', timeframe);
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedGet<DashboardData>(
        `/api/analytics/dashboard?timeframe=${timeframe}`
      );
      console.log('Analytics dashboard data fetched successfully');
      setDashboardData(response);
    } catch (err) {
      console.error('Error fetching analytics dashboard:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVideoAnalytics = useCallback(async (videoId: string) => {
    console.log('Fetching video analytics for video:', videoId);
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedGet<VideoAnalytics>(
        `/api/analytics/video/${videoId}`
      );
      console.log('Video analytics fetched successfully');
      setVideoAnalytics(response);
    } catch (err) {
      console.error('Error fetching video analytics:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch video analytics'));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    dashboardData,
    videoAnalytics,
    loading,
    error,
    fetchDashboardData,
    fetchVideoAnalytics,
  };
}
