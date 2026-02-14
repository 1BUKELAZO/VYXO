
import { useState, useCallback } from 'react';
import { authenticatedGet, authenticatedPost } from '@/utils/api';

export interface DuetVideo {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  thumbnailUrl: string;
  isDuet: boolean;
  isStitch: boolean;
  duetLayout: 'side' | 'top-bottom';
  createdAt: string;
  likesCount: number;
  viewsCount: number;
}

export interface DuetMetadata {
  duetWithId: string;
  isDuet: boolean;
  isStitch: boolean;
  duetLayout: 'side' | 'top-bottom';
}

export function useDuets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get list of duets/stitches for a video
   */
  const getDuets = useCallback(async (videoId: string): Promise<DuetVideo[]> => {
    console.log('Fetching duets for video:', videoId);
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedGet<DuetVideo[]>(`/api/videos/${videoId}/duets`);
      console.log('Duets fetched successfully:', response);
      return response;
    } catch (err) {
      console.error('Error fetching duets:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar duets';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get duets count for a video
   */
  const getDuetsCount = useCallback(async (videoId: string): Promise<number> => {
    console.log('Fetching duets count for video:', videoId);

    try {
      const response = await authenticatedGet<{ count: number }>(`/api/videos/${videoId}/duets-count`);
      console.log('Duets count fetched:', response.count);
      return response.count;
    } catch (err) {
      console.error('Error fetching duets count:', err);
      return 0;
    }
  }, []);

  /**
   * Create a duet/stitch video
   * This is called from VideoEditor after recording
   */
  const createDuet = useCallback(async (
    muxUploadId: string,
    muxAssetId: string,
    metadata: DuetMetadata & {
      caption: string;
      hashtags: string[];
      mentions: string[];
      allowComments: boolean;
      allowDuet: boolean;
      allowStitch: boolean;
      visibility: 'public' | 'friends' | 'private';
      soundId?: string;
    }
  ): Promise<string> => {
    console.log('Creating duet video:', metadata);
    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedPost<{ id: string; videoId: string }>('/api/videos/upload', {
        muxUploadId,
        muxAssetId,
        caption: metadata.caption,
        hashtags: metadata.hashtags,
        mentions: metadata.mentions,
        allowComments: metadata.allowComments,
        allowDuet: metadata.allowDuet,
        allowStitch: metadata.allowStitch,
        visibility: metadata.visibility,
        soundId: metadata.soundId,
        duetWithId: metadata.duetWithId,
        isDuet: metadata.isDuet,
        isStitch: metadata.isStitch,
        duetLayout: metadata.duetLayout,
      });

      const videoId = response.id || response.videoId;
      console.log('Duet video created successfully:', videoId);
      return videoId;
    } catch (err) {
      console.error('Error creating duet video:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear duet';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getDuets,
    getDuetsCount,
    createDuet,
    loading,
    error,
  };
}
