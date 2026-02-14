
import { useState, useEffect, useCallback } from 'react';
import { authenticatedGet, authenticatedPost } from '../utils/api';
import { Video } from './useFeedAlgorithm';

interface VideoRepliesResponse {
  success: boolean;
  data: {
    replies: Video[];
    count: number;
  };
}

interface PostReplyResponse {
  success: boolean;
  data: {
    reply: {
      id: string;
      parentVideoId: string;
      isReply: boolean;
    };
  };
}

interface UseVideoRepliesReturn {
  replies: Video[];
  loading: boolean;
  error: string | null;
  replyCount: number;
  fetchVideoReplies: () => Promise<void>;
  postVideoReply: (replyVideoId: string) => Promise<{ success: boolean; message?: string }>;
}

export function useVideoReplies(videoId: string): UseVideoRepliesReturn {
  const [replies, setReplies] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyCount, setReplyCount] = useState(0);

  const fetchVideoReplies = useCallback(async () => {
    console.log('[useVideoReplies] Fetching replies for video:', videoId);
    setLoading(true);
    setError(null);
    
    try {
      const response = await authenticatedGet<VideoRepliesResponse>(`/api/videos/${videoId}/replies`);
      console.log('[useVideoReplies] Fetched replies:', response.data.replies.length);
      
      if (response.success) {
        setReplies(response.data.replies);
        setReplyCount(response.data.count);
      } else {
        setError('Failed to fetch video replies.');
      }
    } catch (err: any) {
      console.error('[useVideoReplies] Error fetching replies:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  const postVideoReply = useCallback(async (replyVideoId: string) => {
    console.log('[useVideoReplies] Posting reply:', replyVideoId, 'to video:', videoId);
    
    try {
      const response = await authenticatedPost<PostReplyResponse>(
        `/api/videos/${videoId}/reply`,
        { replyVideoId }
      );
      
      if (response.success) {
        console.log('[useVideoReplies] Reply posted successfully');
        // Refetch replies to update the list
        await fetchVideoReplies();
        return { success: true };
      } else {
        return { success: false, message: 'Failed to post video reply.' };
      }
    } catch (err: any) {
      console.error('[useVideoReplies] Error posting reply:', err);
      return { success: false, message: err.message || 'An unexpected error occurred.' };
    }
  }, [videoId, fetchVideoReplies]);

  useEffect(() => {
    fetchVideoReplies();
  }, [fetchVideoReplies]);

  return {
    replies,
    loading,
    error,
    replyCount,
    fetchVideoReplies,
    postVideoReply,
  };
}
