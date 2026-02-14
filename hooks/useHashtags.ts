
import { useState, useCallback } from 'react';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';

export interface Hashtag {
  id: string;
  name: string;
  usage_count: number;
  usageCount?: number; // Alias for compatibility
  created_at?: string;
  createdAt?: string;
  isFollowing?: boolean;
  followedAt?: string;
}

export interface HashtagVideo {
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
  muxPlaybackId?: string;
  muxThumbnailUrl?: string;
  masterPlaylistUrl?: string;
  gifUrl?: string;
  status: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  createdAt: string;
}

const HASHTAG_REGEX = /#[a-zA-Z0-9_]+/g;

/**
 * Extract hashtags from text
 * @param text - Text containing hashtags
 * @returns Array of hashtag names (without # symbol, lowercase, unique)
 */
export const extractHashtags = (text: string): string[] => {
  const matches = text.match(HASHTAG_REGEX);
  if (!matches) return [];
  
  const hashtags = matches.map(tag => tag.substring(1).toLowerCase());
  return Array.from(new Set(hashtags)); // Remove duplicates
};

/**
 * Save hashtags for a video
 * @param videoId - Video ID
 * @param hashtags - Array of hashtag names (without # symbol)
 */
export const saveHashtags = async (videoId: string, hashtags: string[]): Promise<void> => {
  if (hashtags.length === 0) return;
  
  try {
    console.log('Saving hashtags for video:', videoId, hashtags);
    await authenticatedPost(`/api/videos/${videoId}/hashtags`, { hashtags });
  } catch (error) {
    console.error('Failed to save hashtags:', error);
    throw error;
  }
};

/**
 * Hook for hashtag operations
 */
export const useHashtags = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get trending hashtags
   */
  const getTrendingHashtags = useCallback(async (limit: number = 20): Promise<Hashtag[]> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching trending hashtags, limit:', limit);
      const response = await authenticatedGet(`/api/hashtags/trending?limit=${limit}`);
      
      // Normalize response
      const hashtags = response.map((h: any) => ({
        ...h,
        usageCount: h.usage_count || h.usageCount || 0,
        createdAt: h.created_at || h.createdAt,
      }));
      
      return hashtags;
    } catch (err: any) {
      console.error('Failed to fetch trending hashtags:', err);
      setError(err.message || 'Failed to fetch trending hashtags');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search hashtags
   */
  const searchHashtags = useCallback(async (query: string): Promise<Hashtag[]> => {
    if (!query.trim()) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Searching hashtags with query:', query);
      const response = await authenticatedGet(`/api/hashtags/search?q=${encodeURIComponent(query)}`);
      
      // Normalize response
      const hashtags = response.map((h: any) => ({
        ...h,
        usageCount: h.usage_count || h.usageCount || 0,
        createdAt: h.created_at || h.createdAt,
      }));
      
      return hashtags;
    } catch (err: any) {
      console.error('Failed to search hashtags:', err);
      setError(err.message || 'Failed to search hashtags');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get hashtag details
   */
  const getHashtagDetails = useCallback(async (name: string): Promise<Hashtag | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching hashtag details for:', name);
      const response = await authenticatedGet(`/api/hashtags/${encodeURIComponent(name)}`);
      
      // Normalize response
      return {
        ...response,
        usageCount: response.usage_count || response.usageCount || 0,
        createdAt: response.created_at || response.createdAt,
      };
    } catch (err: any) {
      console.error('Failed to fetch hashtag details:', err);
      setError(err.message || 'Failed to fetch hashtag details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get videos for a hashtag
   */
  const getHashtagVideos = useCallback(async (
    name: string,
    cursor?: string,
    limit: number = 20
  ): Promise<{ videos: HashtagVideo[]; nextCursor: string | null }> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching videos for hashtag:', name, 'cursor:', cursor);
      const url = `/api/hashtags/${encodeURIComponent(name)}/videos?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
      const response = await authenticatedGet(url);
      
      return {
        videos: response.videos || [],
        nextCursor: response.nextCursor || null,
      };
    } catch (err: any) {
      console.error('Failed to fetch hashtag videos:', err);
      setError(err.message || 'Failed to fetch videos');
      return { videos: [], nextCursor: null };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Follow a hashtag
   */
  const followHashtag = useCallback(async (hashtagId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Following hashtag:', hashtagId);
      await authenticatedPost('/api/users/follow-hashtag', { hashtagId });
      return true;
    } catch (err: any) {
      console.error('Failed to follow hashtag:', err);
      setError(err.message || 'Failed to follow hashtag');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Unfollow a hashtag
   */
  const unfollowHashtag = useCallback(async (hashtagId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Unfollowing hashtag:', hashtagId);
      await authenticatedDelete(`/api/users/follow-hashtag/${hashtagId}`);
      return true;
    } catch (err: any) {
      console.error('Failed to unfollow hashtag:', err);
      setError(err.message || 'Failed to unfollow hashtag');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get followed hashtags
   */
  const getFollowedHashtags = useCallback(async (): Promise<Hashtag[]> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching followed hashtags');
      const response = await authenticatedGet('/api/users/followed-hashtags');
      
      // Normalize response
      const hashtags = response.map((h: any) => ({
        ...h,
        usageCount: h.usage_count || h.usageCount || 0,
        createdAt: h.created_at || h.createdAt,
        followedAt: h.followedAt || h.followed_at,
      }));
      
      return hashtags;
    } catch (err: any) {
      console.error('Failed to fetch followed hashtags:', err);
      setError(err.message || 'Failed to fetch followed hashtags');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getTrendingHashtags,
    searchHashtags,
    getHashtagDetails,
    getHashtagVideos,
    followHashtag,
    unfollowHashtag,
    getFollowedHashtags,
  };
};
