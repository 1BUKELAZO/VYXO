
import { useState, useEffect, useCallback } from 'react';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';

export interface Video {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  createdAt: string;
}

export const useVideos = (userId?: string) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[useVideos] Fetching videos from API', userId ? `for user: ${userId}` : '');
      
      // Use the feed endpoint for all videos
      const data = await authenticatedGet<Video[]>('/api/videos/feed');
      
      console.log('[useVideos] Fetched videos:', data?.length || 0);
      setVideos(data || []);
      setError(null);
    } catch (err: any) {
      console.error('[useVideos] Unexpected error:', err);
      setError(err.message);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const createVideo = async (videoData: Partial<Video>) => {
    try {
      console.log('[useVideos] Creating video:', videoData);
      // Note: This endpoint would need to be created on the backend
      // For now, this is a placeholder
      console.warn('[useVideos] Create video endpoint not yet implemented on backend');
      return { data: null, error: new Error('Create video endpoint not implemented') };
    } catch (err: any) {
      console.error('[useVideos] Create failed:', err);
      return { data: null, error: err };
    }
  };

  const updateVideo = async (videoId: string, updates: Partial<Video>) => {
    try {
      console.log('[useVideos] Updating video:', videoId, updates);
      // Note: This endpoint would need to be created on the backend
      // For now, this is a placeholder
      console.warn('[useVideos] Update video endpoint not yet implemented on backend');
      return { data: null, error: new Error('Update video endpoint not implemented') };
    } catch (err: any) {
      console.error('[useVideos] Update failed:', err);
      return { data: null, error: err };
    }
  };

  const deleteVideo = async (videoId: string) => {
    try {
      console.log('[useVideos] Deleting video:', videoId);
      // Note: This endpoint would need to be created on the backend
      // For now, this is a placeholder
      console.warn('[useVideos] Delete video endpoint not yet implemented on backend');
      return { error: new Error('Delete video endpoint not implemented') };
    } catch (err: any) {
      console.error('[useVideos] Delete failed:', err);
      return { error: err };
    }
  };

  return {
    videos,
    loading,
    error,
    fetchVideos,
    createVideo,
    updateVideo,
    deleteVideo,
  };
};
