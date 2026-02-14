
import { useState, useCallback, useEffect } from 'react';
import { authenticatedGet, authenticatedPost } from '@/utils/api';

export type FeedType = 'foryou' | 'trending';

export interface Video {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  soundId?: string;
  soundTitle?: string;
  soundArtistName?: string;
  soundName?: string;
  muxPlaybackId?: string;
  muxThumbnailUrl?: string;
  masterPlaylistUrl?: string;
  gifUrl?: string;
  status?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount?: number;
  viewsCount: number;
  videoRepliesCount?: number;
  isLiked: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  createdAt: string;
  isNew?: boolean;
  trendingScore?: number;
  rank?: number;
  parentVideoId?: string;
  isReply?: boolean;
  parentVideoAuthorUsername?: string;
  // Duet/Stitch metadata
  allowDuets?: boolean;
  allowStitches?: boolean;
  duetWithId?: string;
  isDuet?: boolean;
  isStitch?: boolean;
  duetLayout?: 'side' | 'top-bottom';
  duetsCount?: number;
  duetWithUsername?: string;
  duetWithAvatarUrl?: string;
  // API response fields (nested)
  author?: {
    id: string;
    username: string;
    avatar: string;
  };
  sound?: {
    id: string;
    title: string;
    artistName: string;
  };
}

export interface AdItem {
  id: string;
  type: 'ad';
  campaignId: string;
  creative_url: string;
  cta_text: string;
  cta_url: string;
  impressionId?: string;
}

export type FeedItem = Video | AdItem;

interface FeedResponse {
  results?: Video[];
  videos?: Video[];
  nextCursor?: string | null;
  hasMore?: boolean;
}

interface UseFeedAlgorithmOptions {
  type: FeedType;
  limit?: number;
  autoFetch?: boolean;
}

interface UseFeedAlgorithmReturn {
  videos: Video[];
  feedItems: FeedItem[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: string | null;
  fetchFeed: () => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  recordView: (videoId: string) => Promise<void>;
}

export function useFeedAlgorithm({
  type,
  limit = 20,
  autoFetch = true,
}: UseFeedAlgorithmOptions): UseFeedAlgorithmReturn {
  const [videos, setVideos] = useState<Video[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [videoHistory, setVideoHistory] = useState<string[]>([]);

  const injectAds = useCallback(async (videoList: Video[], currentHistory: string[]) => {
    console.log('[Ads] Injecting ads into feed, video count:', videoList.length);
    const items: FeedItem[] = [];
    
    for (let i = 0; i < videoList.length; i++) {
      items.push(videoList[i]);
      
      // Inject ad every 5 videos (frequency cap)
      if ((i + 1) % 5 === 0 && i < videoList.length - 1) {
        try {
          console.log('[Ads] Fetching ad for position', i + 1);
          const ad = await authenticatedPost<{
            campaignId: string;
            creative_url: string;
            cta_text: string;
            cta_url: string;
            type: 'in-feed' | 'brand-takeover';
          } | null>('/api/ads/feed', { 
            videoHistory: [...currentHistory, ...videoList.slice(0, i + 1).map(v => v.id)] 
          });
          
          if (ad) {
            console.log('[Ads] Ad fetched:', ad.campaignId);
            // Record impression immediately
            const impressionResult = await authenticatedPost<{ impressionId: string }>(
              '/api/ads/impressions',
              { campaignId: ad.campaignId }
            );
            
            const adItem: AdItem = {
              id: `ad-${ad.campaignId}-${Date.now()}`,
              type: 'ad',
              campaignId: ad.campaignId,
              creative_url: ad.creative_url,
              cta_text: ad.cta_text,
              cta_url: ad.cta_url,
              impressionId: impressionResult.impressionId,
            };
            
            items.push(adItem);
            console.log('[Ads] Ad injected at position', items.length - 1);
          } else {
            console.log('[Ads] No ad available for this position');
          }
        } catch (err) {
          console.error('[Ads] Error fetching ad:', err);
          // Continue without ad if fetch fails
        }
      }
    }
    
    return items;
  }, []);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    console.log(`Fetching ${type} feed, isRefresh:`, isRefresh);
    
    if (isRefresh) {
      setRefreshing(true);
      setCursor(null);
      setVideoHistory([]);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const endpoint = type === 'foryou' ? '/api/feed/foryou' : '/api/feed/trending';
      const params = new URLSearchParams();
      
      if (limit) {
        params.append('limit', limit.toString());
      }
      
      if (!isRefresh && cursor) {
        params.append('cursor', cursor);
      }

      const queryString = params.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;

      console.log(`Fetching from: ${url}`);
      const response = await authenticatedGet<FeedResponse>(url);

      // Handle both 'results' and 'videos' response formats
      const rawVideoList = response.results || response.videos || [];
      console.log(`Received ${rawVideoList.length} videos, nextCursor:`, response.nextCursor);

      // Transform API response to match frontend Video interface
      const videoList = rawVideoList.map((video: any) => ({
        ...video,
        // Flatten author fields
        userId: video.userId || video.author?.id,
        username: video.username || video.author?.username,
        avatarUrl: video.avatarUrl || video.author?.avatar,
        // Flatten sound fields
        soundId: video.soundId || video.sound?.id,
        soundTitle: video.soundTitle || video.sound?.title,
        soundArtistName: video.soundArtistName || video.sound?.artistName,
      }));

      // Update video history
      const newHistory = isRefresh 
        ? videoList.map(v => v.id)
        : [...videoHistory, ...videoList.map(v => v.id)];
      setVideoHistory(newHistory);

      // Inject ads into feed
      const itemsWithAds = await injectAds(videoList, isRefresh ? [] : videoHistory);

      if (isRefresh) {
        setVideos(videoList);
        setFeedItems(itemsWithAds);
      } else {
        setVideos((prev) => [...prev, ...videoList]);
        setFeedItems((prev) => [...prev, ...itemsWithAds]);
      }

      setCursor(response.nextCursor || null);
      setHasMore(response.hasMore !== undefined ? response.hasMore : !!response.nextCursor);
    } catch (err) {
      console.error(`Error fetching ${type} feed:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feed';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type, limit, cursor, videoHistory, injectAds]);

  const refresh = useCallback(async () => {
    console.log(`Refreshing ${type} feed`);
    await fetchFeed(true);
  }, [fetchFeed, type]);

  const loadMore = useCallback(async () => {
    if (!loading && !refreshing && hasMore && cursor) {
      console.log(`Loading more ${type} videos, cursor:`, cursor);
      await fetchFeed(false);
    }
  }, [loading, refreshing, hasMore, cursor, fetchFeed, type]);

  const recordView = useCallback(async (videoId: string) => {
    console.log('Recording view for video:', videoId);
    try {
      const response = await authenticatedPost<{
        success: boolean;
        isNewView: boolean;
        viewsCount: number;
      }>(`/api/videos/${videoId}/view`, {});
      
      // Update local video views count with actual count from server
      if (response.success) {
        setVideos((prev) =>
          prev.map((video) =>
            video.id === videoId
              ? { ...video, viewsCount: response.viewsCount }
              : video
          )
        );
      }
    } catch (err) {
      console.error('Error recording view:', err);
      // Don't show error to user - view tracking is non-critical
    }
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchFeed(true);
    }
  }, [autoFetch, fetchFeed, type]);

  return {
    videos,
    feedItems,
    loading,
    refreshing,
    hasMore,
    error,
    fetchFeed: () => fetchFeed(false),
    refresh,
    loadMore,
    recordView,
  };
}
