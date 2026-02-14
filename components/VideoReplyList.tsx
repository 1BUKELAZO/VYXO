
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { Video } from '@/hooks/useFeedAlgorithm';
import { IconSymbol } from '@/components/IconSymbol';

interface VideoReplyListProps {
  replies: Video[];
  loading: boolean;
  error: string | null;
}

const ITEM_WIDTH = 120;
const ITEM_HEIGHT = 180;

// Helper to resolve image sources (handles both local and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function VideoReplyList({ replies, loading, error }: VideoReplyListProps) {
  const handleReplyPress = (reply: Video) => {
    console.log('[VideoReplyList] Opening reply video:', reply.id);
    
    // Navigate to home feed with this specific video
    router.push({
      pathname: '/(tabs)/(home)',
      params: {
        videoId: reply.id,
      },
    });
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      const formatted = (count / 1000000).toFixed(1);
      return `${formatted}M`;
    }
    if (count >= 1000) {
      const formatted = (count / 1000).toFixed(1);
      return `${formatted}K`;
    }
    return count.toString();
  };

  const renderReplyItem = ({ item }: { item: Video }) => {
    const thumbnailUrl = item.muxThumbnailUrl || item.thumbnailUrl || item.gifUrl;
    const viewsText = formatCount(item.viewsCount || 0);
    
    return (
      <TouchableOpacity
        style={styles.replyItem}
        onPress={() => handleReplyPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.thumbnailContainer}>
          {thumbnailUrl ? (
            <Image
              source={resolveImageSource(thumbnailUrl)}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
              <IconSymbol
                ios_icon_name="video.fill"
                android_material_icon_name="videocam"
                size={32}
                color={colors.textSecondary}
              />
            </View>
          )}
          
          <View style={styles.overlay}>
            <View style={styles.statsContainer}>
              <IconSymbol
                ios_icon_name="play.fill"
                android_material_icon_name="play-arrow"
                size={14}
                color={colors.text}
              />
              <Text style={styles.viewsText}>{viewsText}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.replyInfo}>
          <Text style={styles.username} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading video replies...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="error"
          size={24}
          color={colors.secondary}
        />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (replies.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol
          ios_icon_name="video.slash"
          android_material_icon_name="videocam-off"
          size={32}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No video replies yet</Text>
        <Text style={styles.emptySubtext}>Be the first to reply with a video!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Video Replies</Text>
        <Text style={styles.countText}>{replies.length}</Text>
      </View>
      
      <FlatList
        data={replies}
        keyExtractor={(item) => item.id}
        renderItem={renderReplyItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  headerText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  countText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 15,
  },
  replyItem: {
    width: ITEM_WIDTH,
    marginRight: 12,
  },
  thumbnailContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  replyInfo: {
    marginTop: 6,
  },
  username: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  errorText: {
    color: colors.secondary,
    fontSize: 14,
    marginLeft: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 15,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
});
