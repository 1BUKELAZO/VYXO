
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import ChatListItem from '@/components/ChatListItem';

export default function MessagesListScreen() {
  const { user } = useAuth();
  const { conversations, loading, error, fetchConversations } = useMessages(user?.id);

  useEffect(() => {
    if (user?.id) {
      console.log('[MessagesListScreen] Fetching conversations for user:', user.id);
      fetchConversations();
    }
  }, [user?.id, fetchConversations]);

  const handleConversationPress = (conversation: any) => {
    console.log('[MessagesListScreen] Opening conversation:', conversation.id);
    router.push(`/messages/${conversation.id}`);
  };

  const handleRefresh = () => {
    console.log('[MessagesListScreen] Refreshing conversations');
    fetchConversations();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Messages',
          headerStyle: {
            backgroundColor: colors.dark,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      {loading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="error"
            size={64}
            color={colors.coral}
          />
          <Text style={styles.errorTitle}>Error loading messages</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.placeholderContainer}>
          <IconSymbol
            ios_icon_name="message.fill"
            android_material_icon_name="message"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.placeholderTitle}>No messages yet</Text>
          <Text style={styles.placeholderSubtitle}>
            Start a conversation by visiting a user's profile
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor={colors.purple}
            />
          }
        >
          {conversations.map((conversation) => (
            <ChatListItem
              key={conversation.id}
              conversation={conversation}
              onPress={() => handleConversationPress(conversation)}
            />
          ))}
        </ScrollView>
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
  scrollView: {
    flex: 1,
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
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 100,
  },
  placeholderTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
