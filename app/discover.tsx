
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '@/components/ui/Toast';
import { authenticatedGet } from '@/utils/api';

const { width } = Dimensions.get('window');

interface Hashtag {
  id: string;
  name: string;
  usageCount: number;
  videoCount: number;
}

interface Sound {
  id: string;
  name: string;
  artistName: string;
  usageCount: number;
}

interface SearchResult {
  id: string;
  type: 'user' | 'video' | 'hashtag' | 'sound';
  username?: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  name?: string;
}

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [popularSounds, setPopularSounds] = useState<Sound[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchType, setSearchType] = useState<'users' | 'videos' | 'hashtags' | 'sounds'>('users');
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadRecentSearches = () => {
    // TODO: Backend Integration - Load from local storage
    setRecentSearches(['dance', 'comedy', 'music']);
  };

  const fetchTrendingHashtags = useCallback(async () => {
    try {
      console.log('[API] Fetching trending hashtags');
      const response = await authenticatedGet<Hashtag[]>('/api/trending/hashtags');
      console.log('[API] Fetched trending hashtags:', response.length);
      setTrendingHashtags(response);
    } catch (error) {
      console.error('[API] Error fetching trending hashtags:', error);
      showToast('Failed to load trending hashtags', 'error');
    }
  }, []);

  const fetchPopularSounds = useCallback(async () => {
    try {
      console.log('[API] Fetching popular sounds');
      const response = await authenticatedGet<Sound[]>('/api/trending/sounds');
      console.log('[API] Fetched popular sounds:', response.length);
      setPopularSounds(response);
    } catch (error) {
      console.error('[API] Error fetching popular sounds:', error);
      showToast('Failed to load popular sounds', 'error');
    }
  }, []);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      console.log('[API] Searching for:', searchQuery, 'Type:', searchType);
      const response = await authenticatedGet<SearchResult[]>(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`
      );
      console.log('[API] Search results:', response.length);
      setSearchResults(response);
    } catch (error) {
      console.error('[API] Error searching:', error);
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType]);

  useEffect(() => {
    fetchTrendingHashtags();
    fetchPopularSounds();
    loadRecentSearches();
  }, [fetchTrendingHashtags, fetchPopularSounds]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const debounce = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchType, performSearch]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      const updatedSearches = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
      setRecentSearches(updatedSearches);
      // TODO: Backend Integration - Save to local storage
    }
  };

  const clearRecentSearch = (search: string) => {
    setRecentSearches(recentSearches.filter(s => s !== search));
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      const millions = count / 1000000;
      return `${millions.toFixed(1)}M`;
    }
    if (count >= 1000) {
      const thousands = count / 1000;
      return `${thousands.toFixed(1)}K`;
    }
    return String(count);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Discover',
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
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users, videos, sounds..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Type Tabs */}
          {searchQuery.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.searchTabs}>
              {(['users', 'videos', 'hashtags', 'sounds'] as const).map((type) => {
                const isActive = searchType === type;
                const label = type.charAt(0).toUpperCase() + type.slice(1);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.searchTab, isActive && styles.searchTabActive]}
                    onPress={() => setSearchType(type)}
                  >
                    <Text style={[styles.searchTabText, isActive && styles.searchTabTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Search Results */}
        {searchQuery.length > 0 ? (
          <View style={styles.section}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.searchResultItem}
                    onPress={() => {
                      if (item.type === 'user') {
                        // Navigate to user profile (we'll create this screen)
                        console.log('Navigate to user profile:', item.id);
                        showToast('User profile view coming soon!', 'info');
                      }
                    }}
                  >
                    <View style={styles.searchResultAvatar}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={24}
                        color={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{item.username || item.name}</Text>
                      <Text style={styles.searchResultType}>{item.type}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={styles.emptyText}>No results found</Text>
            )}
          </View>
        ) : (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                {recentSearches.map((search, index) => (
                  <View key={index} style={styles.recentSearchItem}>
                    <TouchableOpacity
                      style={styles.recentSearchButton}
                      onPress={() => setSearchQuery(search)}
                    >
                      <IconSymbol
                        ios_icon_name="clock"
                        android_material_icon_name="history"
                        size={20}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.recentSearchText}>{search}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => clearRecentSearch(search)}>
                      <IconSymbol
                        ios_icon_name="xmark"
                        android_material_icon_name="close"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Trending Hashtags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trending Hashtags</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {trendingHashtags.map((hashtag) => {
                  const usageText = formatCount(hashtag.usageCount);
                  const videoText = formatCount(hashtag.videoCount);
                  return (
                    <TouchableOpacity key={hashtag.id} style={styles.hashtagCard}>
                      <Text style={styles.hashtagName}>#{hashtag.name}</Text>
                      <Text style={styles.hashtagStats}>{videoText} videos</Text>
                      <Text style={styles.hashtagViews}>{usageText} views</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Popular Sounds */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Sounds</Text>
              {popularSounds.map((sound) => {
                const usageText = formatCount(sound.usageCount);
                return (
                  <TouchableOpacity key={sound.id} style={styles.soundItem}>
                    <View style={styles.soundIcon}>
                      <IconSymbol
                        ios_icon_name="music.note"
                        android_material_icon_name="music-note"
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.soundInfo}>
                      <Text style={styles.soundName}>{sound.name}</Text>
                      <Text style={styles.soundArtist}>{sound.artistName}</Text>
                    </View>
                    <Text style={styles.soundUsage}>{usageText} videos</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

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
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  searchTabs: {
    marginTop: 15,
  },
  searchTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  searchTabActive: {
    backgroundColor: colors.primary,
  },
  searchTabText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  searchTabTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  loader: {
    marginVertical: 30,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 30,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultType: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  recentSearchText: {
    color: colors.text,
    fontSize: 16,
  },
  hashtagCard: {
    width: width * 0.4,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
  },
  hashtagName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  hashtagStats: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  hashtagViews: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  soundIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  soundArtist: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  soundUsage: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
