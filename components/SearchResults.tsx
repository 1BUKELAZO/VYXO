
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
import { IconSymbol } from '@/components/IconSymbol';
import { FollowButton } from '@/components/FollowButton';
import { colors } from '@/styles/commonStyles';

const { width } = Dimensions.get('window');
const COLUMN_GAP = 8;
const THUMBNAIL_SIZE = (width - 48 - COLUMN_GAP) / 2;

interface SearchResult {
  id: string;
  type: 'user' | 'video';
  username?: string;
  avatarUrl?: string;
  caption?: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

interface SearchResultsProps {
  query: string;
  activeTab: 'users' | 'videos';
  results: SearchResult[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

// Helper to resolve image sources
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) {
    return { uri: '' };
  }
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source as ImageSourcePropType;
}

export default function SearchResults({ 
  query, 
  activeTab, 
  results, 
  loading, 
  loadingMore = false,
  hasMore = false,
  onLoadMore 
}: SearchResultsProps) {
  // Loading skeleton
  const renderLoadingSkeleton = () => {
    const skeletonCount = activeTab === 'users' ? 5 : 6;
    const skeletonItems = Array.from({ length: skeletonCount }, (_, i) => i);

    if (activeTab === 'users') {
      return (
        <View style={styles.container}>
          {skeletonItems.map((item) => (
            <View key={item} style={styles.userItem}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.userInfo}>
                <View style={styles.skeletonText} />
                <View style={styles.skeletonTextSmall} />
              </View>
              <View style={styles.skeletonButton} />
            </View>
          ))}
        </View>
      );
    } else {
      return (
        <View style={styles.videoGrid}>
          {skeletonItems.map((item) => (
            <View key={item} style={styles.videoItem}>
              <View style={styles.skeletonThumbnail} />
            </View>
          ))}
        </View>
      );
    }
  };

  // Empty state
  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    const emptyMessage = activeTab === 'users' 
      ? 'No users found' 
      : 'No videos found';

    return (
      <View style={styles.emptyState}>
        <IconSymbol
          ios_icon_name="magnifyingglass"
          android_material_icon_name="search"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyTitle}>{emptyMessage}</Text>
        <Text style={styles.emptySubtitle}>Try searching for something else</Text>
      </View>
    );
  };

  // Render user item
  const renderUserItem = ({ item }: { item: SearchResult }) => {
    const username = item.username || 'Unknown';
    const avatarUrl = item.avatarUrl;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => {
          console.log('User tapped:', username);
          router.push(`/profile/${item.id}`);
        }}
      >
        {avatarUrl ? (
          <Image
            source={resolveImageSource(avatarUrl)}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.userStats}>Tap to view profile</Text>
        </View>
        <FollowButton userId={item.id} size="small" />
      </TouchableOpacity>
    );
  };

  // Render video item
  const renderVideoItem = ({ item }: { item: SearchResult }) => {
    const caption = item.caption || '';
    const thumbnailUrl = item.thumbnailUrl;
    const username = item.username || 'Unknown';

    return (
      <TouchableOpacity
        style={styles.videoItem}
        onPress={() => {
          console.log('Video tapped:', item.id);
          router.push(`/(tabs)/(home)?videoId=${item.id}`);
        }}
      >
        <Image
          source={resolveImageSource(thumbnailUrl)}
          style={styles.videoThumbnail}
        />
        <View style={styles.videoOverlay}>
          <Text style={styles.videoCaption} numberOfLines={2}>
            {caption}
          </Text>
          <Text style={styles.videoUsername} numberOfLines={1}>
            @{username}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return renderLoadingSkeleton();
  }

  if (results.length === 0) {
    return renderEmptyState();
  }

  // Render footer with loading indicator
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.purple} />
      </View>
    );
  };

  // Handle end reached
  const handleEndReached = () => {
    if (hasMore && !loadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  if (activeTab === 'users') {
    return (
      <FlatList
        data={results}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    );
  } else {
    return (
      <FlatList
        data={results}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.videoGrid}
        columnWrapperStyle={styles.videoRow}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    );
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  avatarPlaceholderText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userStats: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  videoGrid: {
    paddingHorizontal: 16,
  },
  videoRow: {
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
  },
  videoItem: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  videoCaption: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoUsername: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  skeletonText: {
    width: 120,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  skeletonTextSmall: {
    width: 80,
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  skeletonButton: {
    width: 80,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  skeletonThumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.5,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
