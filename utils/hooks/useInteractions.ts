
import { useState, useEffect, useCallback } from 'react';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';

export interface Like {
  id: string;
  userId: string;
  videoId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  content: string;
  likesCount: number;
  isLiked: boolean;
  repliesCount: number;
  createdAt: string;
  replies?: Comment[];
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export const useInteractions = (videoId?: string) => {
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!videoId) return;
    
    try {
      setLoading(true);
      console.log('[useInteractions] Fetching comments for video:', videoId);
      
      const data = await authenticatedGet<Comment[]>(`/api/videos/${videoId}/comments`);
      
      console.log('[useInteractions] Fetched comments:', data?.length || 0);
      setComments(data || []);
      setError(null);
    } catch (err: any) {
      console.error('[useInteractions] Unexpected error:', err);
      setError(err.message);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    if (videoId) {
      fetchComments();
    }
  }, [videoId, fetchComments]);

  // ============ LIKES ============
  const fetchLikes = async () => {
    if (!videoId) return;
    
    try {
      console.log('[useInteractions] Fetching likes for video:', videoId);
      // Note: There's no dedicated endpoint to fetch all likes for a video
      // The like status is included in the video feed response
      console.warn('[useInteractions] Fetch likes endpoint not available - use video feed data instead');
    } catch (err: any) {
      console.error('[useInteractions] Unexpected error:', err);
      setError(err.message);
    }
  };

  const likeVideo = async (videoId: string, userId: string) => {
    try {
      console.log('[useInteractions] Liking video:', videoId);
      const response = await authenticatedPost<{ success: boolean; likesCount: number }>(
        `/api/videos/${videoId}/like`,
        {}
      );
      
      console.log('[useInteractions] Video liked:', response);
      return { data: response, error: null };
    } catch (err: any) {
      console.error('[useInteractions] Like failed:', err);
      return { data: null, error: err };
    }
  };

  const unlikeVideo = async (videoId: string, userId: string) => {
    try {
      console.log('[useInteractions] Unliking video:', videoId);
      const response = await authenticatedDelete<{ success: boolean; likesCount: number }>(
        `/api/videos/${videoId}/like`
      );
      
      console.log('[useInteractions] Video unliked:', response);
      return { error: null };
    } catch (err: any) {
      console.error('[useInteractions] Unlike failed:', err);
      return { error: err };
    }
  };

  // ============ COMMENTS ============
  const createComment = async (videoId: string, userId: string, content: string, parentId?: string) => {
    try {
      console.log('[useInteractions] Creating comment on video:', videoId);
      
      const response = await authenticatedPost<{ id: string; userId: string; content: string; createdAt: string }>(
        `/api/videos/${videoId}/comments`,
        {
          content,
          parentCommentId: parentId,
        }
      );
      
      console.log('[useInteractions] Comment created:', response);
      await fetchComments(); // Refresh comments
      return { data: response, error: null };
    } catch (err: any) {
      console.error('[useInteractions] Create comment failed:', err);
      return { data: null, error: err };
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      console.log('[useInteractions] Deleting comment:', commentId);
      
      const response = await authenticatedDelete<{ success: boolean }>(
        `/api/comments/${commentId}`
      );
      
      console.log('[useInteractions] Comment deleted:', response);
      await fetchComments(); // Refresh comments
      return { error: null };
    } catch (err: any) {
      console.error('[useInteractions] Delete comment failed:', err);
      return { error: err };
    }
  };

  const likeComment = async (commentId: string) => {
    try {
      console.log('[useInteractions] Liking comment:', commentId);
      
      const response = await authenticatedPost<{ success: boolean; likesCount: number }>(
        `/api/comments/${commentId}/like`,
        {}
      );
      
      console.log('[useInteractions] Comment liked:', response);
      return { data: response, error: null };
    } catch (err: any) {
      console.error('[useInteractions] Like comment failed:', err);
      return { data: null, error: err };
    }
  };

  const unlikeComment = async (commentId: string) => {
    try {
      console.log('[useInteractions] Unliking comment:', commentId);
      
      const response = await authenticatedDelete<{ success: boolean; likesCount: number }>(
        `/api/comments/${commentId}/like`
      );
      
      console.log('[useInteractions] Comment unliked:', response);
      return { error: null };
    } catch (err: any) {
      console.error('[useInteractions] Unlike comment failed:', err);
      return { error: err };
    }
  };

  // ============ FOLLOWS ============
  const followUser = async (followerId: string, followingId: string) => {
    try {
      console.log('[useInteractions] Following user:', followingId);
      // Note: This endpoint would need to be created on the backend
      console.warn('[useInteractions] Follow user endpoint not yet implemented on backend');
      return { data: null, error: new Error('Follow user endpoint not implemented') };
    } catch (err: any) {
      console.error('[useInteractions] Follow failed:', err);
      return { data: null, error: err };
    }
  };

  const unfollowUser = async (followerId: string, followingId: string) => {
    try {
      console.log('[useInteractions] Unfollowing user:', followingId);
      // Note: This endpoint would need to be created on the backend
      console.warn('[useInteractions] Unfollow user endpoint not yet implemented on backend');
      return { error: new Error('Unfollow user endpoint not implemented') };
    } catch (err: any) {
      console.error('[useInteractions] Unfollow failed:', err);
      return { error: err };
    }
  };

  return {
    likes,
    comments,
    loading,
    error,
    fetchLikes,
    likeVideo,
    unlikeVideo,
    fetchComments,
    createComment,
    deleteComment,
    likeComment,
    unlikeComment,
    followUser,
    unfollowUser,
  };
};
