// hooks/useFeedAlgorithm.ts - REEMPLAZAR TODO EL ARCHIVO CON ESTO
import { useState, useCallback, useEffect, useRef } from 'react';
import { authenticatedPost, publicGet } from '@/utils/api';

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
  allowDuets?: boolean;
  allowStitches?: boolean;
  duetWithId?: string;
  isDuet?: boolean;
  isStitch?: boolean;
  duetLayout?: 'side' | 'top-bottom';
  duetsCount?: number;
  duetWithUsername?: string;
  duetWithAvatarUrl?: string;
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
  
  const hasFetchedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const injectAds = useCallback(async (videoList: Video[], currentHistory: string[]) => {
    console.log('[Ads] Injecting ads into feed, video count:', videoList.length);
    const items: FeedItem[] = [];
    
    for (let i = 0; i < videoList.length; i++) {
      items.push(videoList[i]);
      
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
          }
        } catch (err) {
          // 🔧 FIX: Silenciar error de ads (no crítico)
          console.log('[Ads] Ad fetch failed (expected), continuing without ad');
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
      const endpoint = type === 'foryou' ? '/api/videos/feed' : '/api/feed/trending';
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
      const response = await publicGet<FeedResponse | Video[]>(url);

      const rawVideoList = Array.isArray(response) ? response : (response.results || response.videos || []);
      console.log(`Received ${rawVideoList.length} videos`);

      const videoList = rawVideoList.map((video: any) => ({
        ...video,
        userId: video.userId || video.author?.id,
        username: video.username || video.author?.username,
        avatarUrl: video.avatarUrl || video.author?.avatar,
        soundId: video.soundId || video.sound?.id,
        soundTitle: video.soundTitle || video.sound?.title,
        soundArtistName: video.soundArtistName || video.sound?.artistName,
      }));

      const newHistory = isRefresh 
        ? videoList.map(v => v.id)
        : [...videoHistory, ...videoList.map(v => v.id)];
      setVideoHistory(newHistory);

      const itemsWithAds = await injectAds(videoList, isRefresh ? [] : videoHistory);

      if (isMountedRef.current) {
        if (isRefresh) {
          setVideos(videoList);
          setFeedItems(itemsWithAds);
        } else {
          setVideos((prev) => [...prev, ...videoList]);
          setFeedItems((prev) => [...prev, ...itemsWithAds]);
        }

        if (Array.isArray(response)) {
          setCursor(null);
          setHasMore(false);
        } else {
          setCursor(response.nextCursor || null);
          setHasMore(response.hasMore !== undefined ? response.hasMore : !!response.nextCursor);
        }
      }
    } catch (err) {
      console.error(`Error fetching ${type} feed:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feed';
      if (isMountedRef.current) {
        setError(errorMessage);
        setHasMore(false);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [type, limit, cursor, videoHistory, injectAds]);

  const refresh = useCallback(async () => {
    console.log(`Refreshing ${type} feed`);
    hasFetchedRef.current = false;
    await fetchFeed(true);
  }, [fetchFeed, type]);

  const loadMore = useCallback(async () => {
    if (!loading && !refreshing && hasMore && cursor && !error) {
      console.log(`Loading more ${type} videos, cursor:`, cursor);
      await fetchFeed(false);
    }
  }, [loading, refreshing, hasMore, cursor, error, fetchFeed, type]);

  const recordView = useCallback(async (videoId: string) => {
    console.log('Recording view for video:', videoId);
    try {
      const response = await authenticatedPost<{
        success: boolean;
        isNewView: boolean;
        viewsCount: number;
      }>(`/api/videos/${videoId}/view`, {});
      
      if (response.success && isMountedRef.current) {
        setVideos((prev) =>
          prev.map((video) =>
            video.id === videoId
              ? { ...video, viewsCount: response.viewsCount }
              : video
          )
        );
      }
    } catch (err) {
      // 🔧 FIX: Silenciar error de view recording (no crítico)
      console.log('[Feed] View recording failed (expected), continuing silently');
    }
  }, []);

  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current && isMountedRef.current) {
      hasFetchedRef.current = true;
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