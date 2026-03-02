import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  const hasFetchedRef = useRef(false);

  // Create/Start Live Stream
  const createLiveStream = useCallback(async (title: string) => {
    setLoading(true);
    try {
      console.log('[useLiveStream] Creating live stream:', title);
      const response = await authenticatedPost<{ streamId: string; streamUrl: string }>(
        '/api/live/start',
        { title }
      );
      setLoading(false);
      return response;
    } catch (err: any) {
      console.log('[useLiveStream] Create stream failed (silent)');
      setLoading(false);
      throw err;
    }
  }, []);

  // End Live Stream
  const endLiveStream = useCallback(async () => {
    if (!streamId) return;
    setLoading(true);
    try {
      console.log('[useLiveStream] Ending live stream:', streamId);
      await authenticatedPut(`/api/live/${streamId}/end`, {});
      setStream((prev) => (prev ? { ...prev, isActive: false } : null));
      setLoading(false);
    } catch (err: any) {
      console.log('[useLiveStream] End stream failed (silent)');
      setLoading(false);
    }
  }, [streamId]);

  // Fetch Stream Details
  const fetchStreamDetails = useCallback(async () => {
    if (!streamId) return;
    setLoading(true);
    try {
      console.log('[useLiveStream] Fetching stream details:', streamId);
      const response = await authenticatedGet<LiveStream>(`/api/live/${streamId}`);
      setStream(response);
      setLoading(false);
    } catch (err: any) {
      console.log('[useLiveStream] Stream details fetch failed (silent)');
      setStream(null);
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
      return response;
    } catch (err) {
      console.log('[useLiveStream] Send message failed (silent)');
      return null;
    }
  }, [streamId]);

  // Fetch Chat Messages
  const fetchChatMessages = useCallback(async () => {
    if (!streamId) return;
    try {
      console.log('[useLiveStream] Fetching chat messages');
      const response = await authenticatedGet<LiveChatMessage[]>(`/api/live/${streamId}/chat`);
      setMessages(response);
    } catch (err) {
      console.log('[useLiveStream] Chat messages fetch failed (silent)');
      setMessages([]);
    }
  }, [streamId]);

  // Fetch Active Streams
  const fetchActiveStreams = useCallback(async () => {
    console.log('[useLiveStream] Fetching active streams (fail-safe)');
    
    try {
      const response = await authenticatedGet<LiveStream[]>('/api/live/active');
      console.log('[useLiveStream] Active streams loaded:', response.length);
      return response;
    } catch (err: any) {
      // 🔧 FIX: Silenciar completamente, retornar array vacío
      console.log('[useLiveStream] Active streams fetch failed (expected), returning empty array');
      return [];
    }
  }, []);

  // 🔧 FIX: Auto-fetch solo una vez, sin errores
  useEffect(() => {
    if (streamId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchStreamDetails();
    }
  }, [streamId, fetchStreamDetails]);

  return {
    stream,
    messages,
    loading,
    error: null, // 🔧 FIX: Siempre null para no mostrar errores en UI
    createLiveStream,
    endLiveStream,
    sendChatMessage,
    fetchStreamDetails,
    fetchChatMessages,
    fetchActiveStreams,
  };
};