
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useHashtags, Hashtag, HashtagVideo } from '@/hooks/useHashtags';
import Toast from '@/components/ui/Toast';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 6) / 3; // 3 columns with 2px gaps

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function HashtagDetailScreen() {
  const params = useLocalSearchParams();
  const tag = params.tag as string;
  
  const {
    getHashtagDetails,
    getHashtagVideos,
    followHashtag,
    unfollowHashtag,
    loading,
    error,
  } = useHashtags();

  const [hashtag, setHashtag] = useState<Hashtag | null>(null);
  const [videos, setVideos] = useState<HashtagVideo[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    fetchHashtagData();
  }, [tag]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchHashtagData = async () => {
    console.log('Fetching hashtag data for:', tag);
    
    // Fetch hashtag details
    const details = await getHashtagDetails(tag);
    if (details) {
      setHashtag(details);
    }

    // Fetch videos
    const result = await getHashtagVideos(tag);
    setVideos(result.videos);
    setNextCursor(result.nextCursor);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHashtagData();
    setRefreshing(false);
  }, [tag]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !nextCursor) return;

    setLoadingMore(true);
    const result = await getHashtagVideos(tag, nextCursor);
    setVideos([...videos, ...result.videos]);
    setNextCursor(result.nextCursor);
    setLoadingMore(false);
  }, [tag, nextCursor, videos, loadingMore]);

  const handleFollowToggle = async () => {
    if (!hashtag) return;

    const wasFollowing = hashtag.isFollowing;
    
    // Optimistic update
    setHashtag({
      ...hashtag,
      isFollowing: !wasFollowing,
    });

    const success = wasFollowing 
      ? await unfollowHashtag(hashtag.id)
      : await followHashtag(hashtag.id);

    if (success) {
      showToast(
        wasFollowing ? 'Hashtag unfollowed' : 'Hashtag followed',
        'success'
      );
    } else {
      // Revert on failure
      setHashtag({
        ...hashtag,
        isFollowing: wasFollowing,
      });
    }
  };

  const handleVideoPress = (videoId: string) => {
    console.log('User tapped video, navigating to home with video:', videoId);
    router.push({
      pathname: '/(tabs)/(home)',
      params: { videoId },
    });
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderVideoItem = ({ item }: { item: HashtagVideo }) => {
    const thumbnailUrl = item.muxThumbnailUrl || item.thumbnailUrl;
    const viewsDisplay = formatCount(item.viewsCount);

    return (
      <TouchableOpacity
        style={styles.videoItem}
        onPress={() => handleVideoPress(item.id)}
      >
        <Image
          source={resolveImageSource(thumbnailUrl)}
          style={styles.thumbnail}
        />
        <View style={styles.videoOverlay}>
          <View style={styles.videoStats}>
            <IconSymbol
              ios_icon_name="play.fill"
              android_material_icon_name="play-arrow"
              size={16}
              color={colors.text}
            />
            <Text style={styles.videoStatsText}>{viewsDisplay}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    if (!hashtag) return null;

    const usageCount = hashtag.usageCount || hashtag.usage_count || 0;
    const usageDisplay = formatCount(usageCount);
    const isFollowing = hashtag.isFollowing || false;

    return (
      <View style={styles.header}>
        <View style={styles.hashtagIcon}>
          <Text style={styles.hashtagIconText}>#</Text>
        </View>
        
        <Text style={styles.hashtagName}>#{hashtag.name}</Text>
        
        <Text style={styles.hashtagStats}>
          {usageDisplay} videos
        </Text>

        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followButtonActive]}
          onPress={handleFollowToggle}
        >
          <IconSymbol
            ios_icon_name={isFollowing ? 'checkmark' : 'plus'}
            android_material_icon_name={isFollowing ? 'check' : 'add'}
            size={20}
            color={isFollowing ? colors.purple : colors.text}
          />
          <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !hashtag) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            title: `#${tag}`,
            headerShown: true,
            headerStyle: { backgroundColor: colors.dark },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: `#${tag}`,
          headerShown: true,
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.purple}
            colors={[colors.purple]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={colors.purple} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <IconSymbol
                ios_icon_name="number"
                android_material_icon_name="tag"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No videos yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to use #{tag}
              </Text>
            </View>
          ) : null
        }
      />

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
    backgroundColor: colors.dark,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  hashtagIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hashtagIconText: {
    color: colors.text,
    fontSize: 48,
    fontWeight: '700',
  },
  hashtagName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  hashtagStats: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 20,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.coral,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  followButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 2,
    borderColor: colors.purple,
  },
  followButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: colors.purple,
  },
  videoItem: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.5,
    margin: 1,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 8,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatsText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
});
