
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import Toast from '@/components/ui/Toast';
import { authenticatedGet } from '@/utils/api';

interface UserProfile {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { user } = useAuth();
  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(null);
  const [actualConversationId, setActualConversationId] = useState<string | undefined>(undefined);
  const [isNewConversation, setIsNewConversation] = useState(false);
  
  const { messages, loading, error, sendMessage, markConversationAsRead, fetchMessages } = useMessages(
    user?.id,
    actualConversationId
  );
  const flatListRef = useRef<FlatList>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Determine if conversationId is actually a userId (for new conversations)
  useEffect(() => {
    const initializeChat = async () => {
      if (!conversationId || !user?.id) return;

      try {
        // Try to fetch as a conversation first
        console.log('[ChatScreen] Attempting to fetch conversation:', conversationId);
        await fetchMessages(conversationId);
        setActualConversationId(conversationId);
        setIsNewConversation(false);
      } catch (err: any) {
        // If it fails, it's likely a userId for a new conversation
        console.log('[ChatScreen] Not a conversation, treating as new chat with user:', conversationId);
        setIsNewConversation(true);
        
        // Fetch the recipient's profile
        try {
          const profile = await authenticatedGet<UserProfile>(`/api/users/${conversationId}`);
          setRecipientProfile(profile);
        } catch (profileErr) {
          console.error('[ChatScreen] Error fetching recipient profile:', profileErr);
          showToast('Failed to load user profile', 'error');
        }
      }
    };

    initializeChat();
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (actualConversationId && user?.id) {
      console.log('[ChatScreen] Marking conversation as read:', actualConversationId);
      markConversationAsRead(actualConversationId);
    }
  }, [actualConversationId, user?.id, markConversationAsRead]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!user?.id || !conversationId) {
      showToast('Unable to send message', 'error');
      return;
    }

    setSending(true);
    try {
      console.log('[ChatScreen] Sending message to recipient:', conversationId);
      const result = await sendMessage(conversationId, content);
      
      // If this was a new conversation, update the actual conversation ID
      if (isNewConversation && result?.conversationId) {
        console.log('[ChatScreen] New conversation created:', result.conversationId);
        setActualConversationId(result.conversationId);
        setIsNewConversation(false);
      }
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.error('[ChatScreen] Error sending message:', err);
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // Determine the chat title
  const getChatTitle = () => {
    if (recipientProfile) {
      return recipientProfile.username || recipientProfile.name || 'Chat';
    }
    return 'Chat';
  };

  const chatTitle = getChatTitle();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: chatTitle,
          headerStyle: {
            backgroundColor: colors.dark,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessage message={item} isCurrentUser={item.senderId === user?.id} />
            )}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <ChatInput onSendMessage={handleSendMessage} disabled={sending} />
      </KeyboardAvoidingView>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: colors.coral,
    fontSize: 16,
    textAlign: 'center',
  },
});
