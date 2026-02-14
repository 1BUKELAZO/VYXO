
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '@/components/ui/Toast';
import { authenticatedGet, authenticatedPut } from '@/utils/api';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  actor: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  video?: {
    id: string;
    thumbnailUrl: string;
  };
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchNotifications = useCallback(async () => {
    try {
      console.log('[API] Fetching notifications');
      const response = await authenticatedGet<Notification[]>('/api/notifications');
      console.log('[API] Fetched notifications:', response.length);
      setNotifications(response);
    } catch (error) {
      console.error('[API] Error fetching notifications:', error);
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      console.log('[API] Marking notification as read:', notificationId);
      await authenticatedPut(`/api/notifications/${notificationId}/read`, {});
      
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('[API] Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('[API] Marking all notifications as read');
      await authenticatedPut('/api/notifications/read-all', {});
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      console.error('[API] Error marking all as read:', error);
      showToast('Failed to mark all as read', 'error');
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  };

  const getNotificationText = (notification: Notification): string => {
    switch (notification.type) {
      case 'like':
        return 'liked your video';
      case 'comment':
        return 'commented on your video';
      case 'follow':
        return 'started following you';
      case 'message':
        return 'sent you a message';
      default:
        return 'interacted with you';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return { ios: 'heart.fill', android: 'favorite', color: colors.secondary };
      case 'comment':
        return { ios: 'bubble.left.fill', android: 'chat', color: colors.accent };
      case 'follow':
        return { ios: 'person.badge.plus', android: 'person-add', color: colors.primary };
      case 'message':
        return { ios: 'paperplane.fill', android: 'send', color: colors.primary };
      default:
        return { ios: 'bell.fill', android: 'notifications', color: colors.textSecondary };
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const timeAgo = formatTimeAgo(item.createdAt);
    const notificationText = getNotificationText(item);
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.notificationItemUnread]}
        onPress={() => {
          markAsRead(item.id);
          if (item.video) {
            // Navigate to video
            router.push('/(tabs)/(home)');
          } else if (item.type === 'follow') {
            // Navigate to profile
            router.push('/(tabs)/profile');
          } else if (item.type === 'message') {
            // Navigate to messages
            router.push('/messages');
          }
        }}
      >
        <View style={styles.notificationAvatar}>
          <IconSymbol
            ios_icon_name="person.fill"
            android_material_icon_name="person"
            size={32}
            color={colors.textSecondary}
          />
          <View style={[styles.notificationBadge, { backgroundColor: icon.color }]}>
            <IconSymbol
              ios_icon_name={icon.ios}
              android_material_icon_name={icon.android}
              size={12}
              color={colors.text}
            />
          </View>
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.notificationUsername}>{item.actor.username}</Text>
            <Text style={styles.notificationAction}> {notificationText}</Text>
          </Text>
          <Text style={styles.notificationTime}>{timeAgo}</Text>
        </View>

        {item.video && (
          <View style={styles.notificationThumbnail}>
            <IconSymbol
              ios_icon_name="play.fill"
              android_material_icon_name="play-arrow"
              size={24}
              color={colors.textSecondary}
            />
          </View>
        )}

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
          headerRight: () =>
            unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="bell"
                android_material_icon_name="notifications"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  notificationAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationUsername: {
    fontWeight: '600',
  },
  notificationAction: {
    color: colors.textSecondary,
  },
  notificationTime: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  notificationThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
});
