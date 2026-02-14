
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import { colors } from '@/styles/commonStyles';
import type { Conversation } from '@/hooks/useMessages';

interface ChatListItemProps {
  conversation: Conversation;
  onPress: () => void;
}

function resolveImageSource(url: string | null | undefined) {
  if (!url) return 'https://via.placeholder.com/50';
  return url;
}

export default function ChatListItem({ conversation, onPress }: ChatListItemProps) {
  const username = conversation.otherUser.username;
  const avatarUrl = resolveImageSource(conversation.otherUser.avatarUrl);
  const lastMessage = conversation.lastMessage?.content;
  const timestamp = conversation.lastMessage?.createdAt;
  const unreadCount = conversation.unreadCount;

  const timeAgo = timestamp ? formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true }) : '';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.username} numberOfLines={1}>
            {username}
          </Text>
          {timestamp && (
            <Text style={styles.timestamp}>
              {timeAgo}
            </Text>
          )}
        </View>
        
        <Text style={styles.lastMessage} numberOfLines={1}>
          {lastMessage || 'No messages yet'}
        </Text>
      </View>
      
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.dark,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#333',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
    flex: 1,
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: colors.coral,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
});
