
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
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useHashtags, Hashtag, HashtagVideo } from '@/hooks/useHashtags';
import Toast from '@/components/ui/Toast';

const { width } = Dimensions.get('window');
const PREVIEW_SIZE = (width - 48) / 3; // 3 preview videos with gaps

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface HashtagWithVideos extends Hashtag {
  previewVideos?: HashtagVideo[];
}

export default function TrendingHashtagsScreen() {
  const { getTrendingHashtags, getHashtagVideos, loading, error } = useHashtags();
  
  const [hashtags, setHashtags] = useState<HashtagWithVideos[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

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

  const fetchTrendingHashtags = async () => {
    console.log('Fetching trending hashtags');
    
    const trending = await getTrendingHashtags(20);
    
    // Fetch preview videos for each hashtag (first 3)
    const hashtagsWithVideos = await Promise.all(
      trending.map(async (hashtag) => {
        const result = await getHashtagVideos(hashtag.name, undefined, 3);
        return {
          ...hashtag,
          previewVideos: result.videos,
        };
      })
    );
    
    setHashtags(hashtagsWithVideos);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrendingHashtags();
    setRefreshing(false);
  }, []);

  const handleHashtagPress = (hashtagName: string) => {
    console.log('User tapped hashtag, navigating to:', hashtagName);
    router.push(`/hashtag/${hashtagName}`);
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

  const renderHashtagItem = ({ item, index }: { item: HashtagWithVideos; index: number }) => {
    const usageCount = item.usageCount || item.usage_count || 0;
    const usageDisplay = formatCount(usageCount);
    const rank = index + 1;

    return (
      <TouchableOpacity
        style={styles.hashtagItem}
        onPress={() => handleHashtagPress(item.name)}
      >
        <View style={styles.hashtagHeader}>
          <View style={styles.hashtagInfo}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rank}</Text>
            </View>
            <View style={styles.hashtagTextContainer}>
              <Text style={styles.hashtagName}>#{item.name}</Text>
              <Text style={styles.hashtagStats}>{usageDisplay} videos</Text>
            </View>
          </View>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron-right"
            size={24}
            color={colors.textSecondary}
          />
        </View>

        {/* Preview Videos */}
        {item.previewVideos && item.previewVideos.length > 0 && (
          <View style={styles.previewContainer}>
            {item.previewVideos.slice(0, 3).map((video, videoIndex) => {
              const thumbnailUrl = video.muxThumbnailUrl || video.thumbnailUrl;
              return (
                <Image
                  key={videoIndex}
                  source={resolveImageSource(thumbnailUrl)}
                  style={styles.previewThumbnail}
                />
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && hashtags.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Trending Hashtags',
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
          title: 'Trending Hashtags',
          headerShown: true,
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <FlatList
        data={hashtags}
        renderItem={renderHashtagItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.purple}
            colors={[colors.purple]}
          />
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
              <Text style={styles.emptyTitle}>No trending hashtags</Text>
              <Text style={styles.emptySubtitle}>
                Start creating videos with hashtags!
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
    padding: 16,
  },
  hashtagItem: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  hashtagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hashtagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  hashtagTextContainer: {
    flex: 1,
  },
  hashtagName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  hashtagStats: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  previewContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  previewThumbnail: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE * 1.5,
    borderRadius: 8,
    backgroundColor: colors.dark,
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
