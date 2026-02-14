
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import Toast from '@/components/ui/Toast';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  FlatList,
  Dimensions,
  Image,
  ImageSourcePropType,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 48) / 2;

interface Hashtag {
  id: string;
  name: string;
  usageCount: number;
}

interface Sound {
  id: string;
  title: string;
  artistName: string;
  usageCount: number;
}

type TabType = 'forYou' | 'trending';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function DiscoverScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('trending');
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [popularSounds, setPopularSounds] = useState<Sound[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Use feed algorithm hook for trending videos
  const {
    videos: trendingVideos,
    loading: trendingLoading,
    refreshing: trendingRefreshing,
    hasMore: trendingHasMore,
    error: trendingError,
    refresh: refreshTrending,
    loadMore: loadMoreTrending,
  } = useFeedAlgorithm({
    type: 'trending',
    limit: 20,
    autoFetch: activeTab === 'trending',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchTrendingMetadata = useCallback(async () => {
    console.log('Fetching trending metadata (hashtags and sounds)');
    setMetadataLoading(true);
    try {
      const trendingData = await authenticatedGet<{
        hashtags: Hashtag[];
        sounds: Sound[];
      }>('/api/search/trending');

      console.log('Trending hashtags fetched:', trendingData.hashtags?.length || 0);
      console.log('Popular sounds fetched:', trendingData.sounds?.length || 0);

      setTrendingHashtags((trendingData.hashtags || []).slice(0, 10));
      setPopularSounds((trendingData.sounds || []).slice(0, 10));
    } catch (error) {
      console.error('Error fetching trending metadata:', error);
      showToast('Failed to load trending content', 'error');
    } finally {
      setMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingMetadata();
  }, [fetchTrendingMetadata]);

  useEffect(() => {
    if (trendingError) {
      showToast(trendingError, 'error');
    }
  }, [trendingError]);

  const handleSearchPress = () => {
    console.log('User tapped search bar, navigating to /search');
    router.push('/search');
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
    const countStr = count.toString();
    return countStr;
  };

  const renderTrendingBadge = (rank: number) => {
    if (rank > 3) return null;

    const badgeColors = {
      1: colors.coral,
      2: colors.purple,
      3: colors.turquoise,
    };

    const rankText = `#${rank}`;

    return (
      <View style={[styles.trendingBadge, { backgroundColor: badgeColors[rank as 1 | 2 | 3] }]}>
        <Text style={styles.trendingBadgeText}>{rankText}</Text>
      </View>
    );
  };

  const renderVideoItem = ({ item, index }: { item: any; index: number }) => {
    const thumbnailUrl = item.muxThumbnailUrl || item.thumbnailUrl;
    const viewsDisplay = formatCount(item.viewsCount || 0);
    const rank = item.rank || index + 1;

    return (
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => {
          console.log('Trending video tapped:', item.id);
          router.push({
            pathname: '/(tabs)/(home)',
            params: { videoId: item.id },
          });
        }}
      >
        <Image
          source={resolveImageSource(thumbnailUrl)}
          style={styles.videoThumbnail}
        />
        {renderTrendingBadge(rank)}
        <View style={styles.videoInfo}>
          <Text style={styles.videoCaption} numberOfLines={2}>
            {item.caption || 'No caption'}
          </Text>
          <View style={styles.videoStats}>
            <IconSymbol
              ios_icon_name="eye"
              android_material_icon_name="visibility"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.videoStatsText}>{viewsDisplay}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        style={styles.searchContainer}
        onPress={handleSearchPress}
        activeOpacity={0.7}
      >
        <IconSymbol
          ios_icon_name="magnifyingglass"
          android_material_icon_name="search"
          size={20}
          color={colors.textSecondary}
        />
        <Text style={styles.searchPlaceholder}>Search users, videos, sounds...</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
          onPress={() => setActiveTab('forYou')}
        >
          <Text style={[styles.tabText, activeTab === 'forYou' && styles.activeTabText]}>
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
          onPress={() => setActiveTab('trending')}
        >
          <Text style={[styles.tabText, activeTab === 'trending' && styles.activeTabText]}>
            Trending
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'forYou' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.tabContent}>
            <Text style={styles.placeholderTitle}>For You</Text>
            <Text style={styles.placeholderSubtitle}>
              Personalized content coming soon
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={trendingVideos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.videoRow}
          contentContainerStyle={styles.videoGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={trendingRefreshing}
              onRefresh={refreshTrending}
              tintColor={colors.purple}
              colors={[colors.purple]}
            />
          }
          onEndReached={() => {
            if (trendingHasMore && !trendingLoading) {
              console.log('Loading more trending videos');
              loadMoreTrending();
            }
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              {/* Trending Hashtags */}
              {!metadataLoading && trendingHashtags.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Trending Hashtags</Text>
                  <View style={styles.hashtagGrid}>
                    {trendingHashtags.map((hashtag, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.hashtagCard}
                        onPress={() => {
                          console.log('Hashtag tapped:', hashtag.name);
                          router.push(`/search?q=${encodeURIComponent('#' + hashtag.name)}`);
                        }}
                      >
                        <Text style={styles.hashtagName}>#{hashtag.name}</Text>
                        <Text style={styles.hashtagCount}>{formatCount(hashtag.usageCount)} videos</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Popular Sounds */}
              {!metadataLoading && popularSounds.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Popular Sounds</Text>
                  <View style={styles.soundsList}>
                    {popularSounds.slice(0, 5).map((sound, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.soundCard}
                        onPress={() => router.push(`/sound/${sound.id}`)}
                      >
                        <View style={styles.soundIcon}>
                          <IconSymbol
                            ios_icon_name="music.note"
                            android_material_icon_name="music-note"
                            size={24}
                            color={colors.purple}
                          />
                        </View>
                        <View style={styles.soundInfo}>
                          <Text style={styles.soundTitle} numberOfLines={1}>
                            {sound.title}
                          </Text>
                          <Text style={styles.soundArtist} numberOfLines={1}>
                            {sound.artistName || 'Unknown Artist'}
                          </Text>
                        </View>
                        <Text style={styles.soundCount}>{formatCount(sound.usageCount)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Trending Videos Header */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending Videos</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            !trendingLoading ? (
              <View style={styles.emptyContainer}>
                <IconSymbol
                  ios_icon_name="chart.line.uptrend.xyaxis"
                  android_material_icon_name="trending-up"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>No trending videos</Text>
                <Text style={styles.emptySubtitle}>Check back later for trending content</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            trendingLoading && trendingVideos.length > 0 ? (
              <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={colors.purple} />
              </View>
            ) : null
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  activeTab: {
    backgroundColor: colors.purple,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  placeholderTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  hashtagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  hashtagCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
  },
  hashtagName: {
    color: colors.purple,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  hashtagCount: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  soundsList: {
    gap: 12,
  },
  soundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  soundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.purple}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundInfo: {
    flex: 1,
  },
  soundTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  soundArtist: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  soundCount: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  videoGrid: {
    paddingBottom: 20,
  },
  videoRow: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 16,
  },
  videoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: THUMBNAIL_SIZE * 1.5,
    backgroundColor: colors.surface,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendingBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  videoInfo: {
    padding: 12,
  },
  videoCaption: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatsText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptyContainer: {
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
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
