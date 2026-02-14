
import { useState, useEffect, useCallback } from 'react';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    content: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export function useMessages(currentUserId: string | undefined, conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useMessages] Fetching conversations for user:', currentUserId);
      const data = await authenticatedGet<Conversation[]>('/api/conversations');
      console.log('[useMessages] Conversations fetched:', data);
      setConversations(data);
    } catch (err: any) {
      console.error('[useMessages] Error fetching conversations:', err);
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (convId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[useMessages] Fetching messages for conversation:', convId);
      const data = await authenticatedGet<Message[]>(`/api/conversations/${convId}/messages`);
      console.log('[useMessages] Messages fetched:', data);
      setMessages(data);
      return data;
    } catch (err: any) {
      console.error('[useMessages] Error fetching messages:', err);
      setError(err.message || 'Failed to fetch messages');
      // Don't set messages to empty array on error - might be a new conversation
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (recipientId: string, content: string) => {
    if (!currentUserId || !content.trim()) {
      console.warn('[useMessages] Cannot send message: missing userId or content');
      return;
    }
    
    try {
      console.log('[useMessages] Sending message to:', recipientId, 'content:', content);
      const data = await authenticatedPost<{ 
        message: { id: string; senderId: string; content: string; createdAt: string }; 
        conversationId: string 
      }>(`/api/conversations/${recipientId}/messages`, {
        content: content.trim(),
      });
      
      console.log('[useMessages] Message sent:', data);
      
      // Add the new message to the local state
      if (data.message) {
        const newMessage: Message = {
          id: data.message.id,
          senderId: data.message.senderId,
          content: data.message.content,
          isRead: false,
          createdAt: data.message.createdAt,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
      
      // If it's a new conversation, refresh the conversation list
      if (!conversationId && data.conversationId) {
        fetchConversations();
      }
      
      return data;
    } catch (err: any) {
      console.error('[useMessages] Error sending message:', err);
      setError(err.message || 'Failed to send message');
      throw err;
    }
  }, [currentUserId, conversationId, fetchConversations]);

  // Mark a message as read
  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      console.log('[useMessages] Marking message as read:', messageId);
      await authenticatedPut(`/api/messages/${messageId}/read`, {});
      
      // Update local state
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId && !msg.isRead
            ? { ...msg, isRead: true }
            : msg
        )
      );
      
      // Refresh conversations to update unread count
      fetchConversations();
    } catch (err: any) {
      console.error('[useMessages] Error marking message as read:', err);
    }
  }, [fetchConversations]);

  // Mark all messages in a conversation as read
  const markConversationAsRead = useCallback(async (convId: string) => {
    if (!convId || !currentUserId) return;
    
    try {
      console.log('[useMessages] Marking conversation as read:', convId);
      
      // Mark all unread messages in this conversation as read
      const unreadMessages = messages.filter(
        (msg) => !msg.isRead && msg.senderId !== currentUserId
      );
      
      await Promise.all(
        unreadMessages.map((msg) => authenticatedPut(`/api/messages/${msg.id}/read`, {}))
      );
      
      // Update local state
      setConversations((prev) =>
        prev.map((conv) => (conv.id === convId ? { ...conv, unreadCount: 0 } : conv))
      );
      
      // Update messages state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId !== currentUserId && !msg.isRead
            ? { ...msg, isRead: true }
            : msg
        )
      );
    } catch (err: any) {
      console.error('[useMessages] Error marking conversation as read:', err);
    }
  }, [currentUserId, messages, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    } else {
      fetchConversations();
    }
  }, [conversationId, fetchMessages, fetchConversations]);

  // Poll for new messages every 5 seconds when viewing a conversation
  useEffect(() => {
    if (!conversationId) return;
    
    const interval = setInterval(() => {
      console.log('[useMessages] Polling for new messages...');
      fetchMessages(conversationId);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  return {
    messages,
    conversations,
    loading,
    error,
    sendMessage,
    markMessageAsRead,
    markConversationAsRead,
    fetchConversations,
    fetchMessages,
  };
}
