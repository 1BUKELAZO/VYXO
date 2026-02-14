
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import ChatListItem from '@/components/ChatListItem';

type TabType = 'notifications' | 'messages';

export default function InboxScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const { user } = useAuth();
  const { conversations, loading, fetchConversations } = useMessages(user?.id);

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  useEffect(() => {
    if (user?.id && activeTab === 'messages') {
      console.log('[InboxScreen] Fetching conversations for user:', user.id);
      fetchConversations();
    }
  }, [user?.id, activeTab, fetchConversations]);

  // Refresh conversations when tab becomes active
  useEffect(() => {
    if (activeTab === 'messages' && user?.id) {
      const interval = setInterval(() => {
        console.log('[InboxScreen] Auto-refreshing conversations...');
        fetchConversations();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab, user?.id, fetchConversations]);

  const handleConversationPress = (conversation: any) => {
    console.log('[InboxScreen] Opening conversation:', conversation.id);
    router.push(`/messages/${conversation.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
          onPress={() => setActiveTab('notifications')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            Notifications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
              Messages
            </Text>
            {totalUnreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'notifications' ? (
          <ScrollView style={styles.scrollView}>
            <View style={styles.placeholderContainer}>
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.placeholderTitle}>No notifications yet</Text>
              <Text style={styles.placeholderSubtitle}>
                You'll see likes, comments, and follows here
              </Text>
            </View>
          </ScrollView>
        ) : (
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.purple} />
              </View>
            ) : conversations.length === 0 ? (
              <ScrollView style={styles.scrollView}>
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
              </ScrollView>
            ) : (
              <ScrollView style={styles.scrollView}>
                {conversations.map((conversation) => (
                  <ChatListItem
                    key={conversation.id}
                    conversation={conversation}
                    onPress={() => handleConversationPress(conversation)}
                  />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.purple,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.coral,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
