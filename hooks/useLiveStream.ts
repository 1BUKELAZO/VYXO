
import { useState, useEffect, useCallback } from 'react';
import { authenticatedPost, authenticatedGet, authenticatedPut } from '@/utils/api';

export interface LiveStream {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  title: string;
  viewerCount: number;
  startedAt: string;
  streamUrl?: string;
  isActive?: boolean;
}

export interface LiveChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

export const useLiveStream = (streamId?: string) => {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create/Start Live Stream
  const createLiveStream = useCallback(async (title: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useLiveStream] Creating live stream with title:', title);
      const response = await authenticatedPost<{ streamId: string; streamUrl: string }>(
        '/api/live/start',
        { title }
      );
      console.log('[useLiveStream] Live stream created:', response);
      setLoading(false);
      return response;
    } catch (err: any) {
      console.error('[useLiveStream] Error creating live stream:', err);
      setError(err.message || 'Failed to create live stream.');
      setLoading(false);
      throw err;
    }
  }, []);

  // End Live Stream
  const endLiveStream = useCallback(async () => {
    if (!streamId) return;
    setLoading(true);
    setError(null);
    try {
      console.log('[useLiveStream] Ending live stream:', streamId);
      await authenticatedPut(`/api/live/${streamId}/end`, {});
      console.log('[useLiveStream] Live stream ended');
      setStream((prev) => (prev ? { ...prev, isActive: false } : null));
      setLoading(false);
    } catch (err: any) {
      console.error('[useLiveStream] Error ending live stream:', err);
      setError(err.message || 'Failed to end live stream.');
      setLoading(false);
      throw err;
    }
  }, [streamId]);

  // Fetch Stream Details
  const fetchStreamDetails = useCallback(async () => {
    if (!streamId) return;
    setLoading(true);
    setError(null);
    try {
      console.log('[useLiveStream] Fetching stream details:', streamId);
      const response = await authenticatedGet<LiveStream>(`/api/live/${streamId}`);
      console.log('[useLiveStream] Stream details fetched:', response);
      setStream(response);
      setLoading(false);
    } catch (err: any) {
      console.error('[useLiveStream] Error fetching stream details:', err);
      setError(err.message || 'Failed to fetch stream details.');
      setLoading(false);
    }
  }, [streamId]);

  // Send Chat Message
  const sendChatMessage = useCallback(async (content: string) => {
    if (!streamId) return;
    try {
      console.log('[useLiveStream] Sending chat message:', content);
      const response = await authenticatedPost<LiveChatMessage>(
        `/api/live/${streamId}/chat`,
        { message: content }
      );
      console.log('[useLiveStream] Chat message sent:', response);
      return response;
    } catch (err) {
      console.error('[useLiveStream] Failed to send chat message:', err);
      throw err;
    }
  }, [streamId]);

  // Fetch Chat Messages
  const fetchChatMessages = useCallback(async () => {
    if (!streamId) return;
    try {
      console.log('[useLiveStream] Fetching chat messages');
      const response = await authenticatedGet<LiveChatMessage[]>(`/api/live/${streamId}/chat`);
      console.log('[useLiveStream] Chat messages fetched:', response.length);
      setMessages(response);
    } catch (err) {
      console.error('[useLiveStream] Error fetching chat messages:', err);
    }
  }, [streamId]);

  // Fetch Active Streams
  const fetchActiveStreams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useLiveStream] Fetching active streams');
      const response = await authenticatedGet<LiveStream[]>('/api/live/active');
      console.log('[useLiveStream] Active streams fetched:', response.length);
      setLoading(false);
      return response;
    } catch (err: any) {
      console.error('[useLiveStream] Error fetching active streams:', err);
      setError(err.message || 'Failed to fetch active streams.');
      setLoading(false);
      return [];
    }
  }, []);

  // Auto-fetch stream details on mount
  useEffect(() => {
    if (streamId) {
      fetchStreamDetails();
    }
  }, [streamId, fetchStreamDetails]);

  return {
    stream,
    messages,
    loading,
    error,
    createLiveStream,
    endLiveStream,
    sendChatMessage,
    fetchStreamDetails,
    fetchChatMessages,
    fetchActiveStreams,
  };
};
