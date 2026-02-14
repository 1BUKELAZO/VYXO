
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import Toast from '@/components/ui/Toast';
import SearchResults from '@/components/SearchResults';
import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from 'lodash.debounce';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';

const RECENT_SEARCHES_KEY = '@vyxo_recent_searches';
const MAX_RECENT_SEARCHES = 10;

type SearchTab = 'users' | 'videos';

interface SearchResult {
  id: string;
  type: 'user' | 'video';
  username?: string;
  avatarUrl?: string;
  caption?: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

interface SearchSuggestion {
  users: Array<{
    id: string;
    username: string;
    avatar: string;
  }>;
  hashtags: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
  sounds: Array<{
    id: string;
    title: string;
    artistName: string;
  }>;
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('users');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  
  const inputRef = useRef<TextInput>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
    // Auto-focus the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Handle query parameter from URL
  useEffect(() => {
    if (params.q) {
      const query = decodeURIComponent(params.q);
      console.log('Search query from URL:', query);
      setSearchQuery(query);
      // Determine tab based on query (hashtags = videos)
      const tab = query.startsWith('#') ? 'videos' : 'users';
      setActiveTab(tab);
      performSearch(query, tab);
    }
  }, [params.q]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const searches = JSON.parse(stored);
        setRecentSearches(searches);
        console.log('Loaded recent searches:', searches);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return;
      }

      // Remove duplicates and add to front
      const updatedSearches = [
        trimmedQuery,
        ...recentSearches.filter((s) => s !== trimmedQuery),
      ].slice(0, MAX_RECENT_SEARCHES);

      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches);
      console.log('Saved recent search:', trimmedQuery);
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const clearRecentSearch = async (search: string) => {
    try {
      const updatedSearches = recentSearches.filter((s) => s !== search);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches);
      console.log('Cleared recent search:', search);
    } catch (error) {
      console.error('Error clearing recent search:', error);
    }
  };

  const clearAllRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
      console.log('Cleared all recent searches');
    } catch (error) {
      console.error('Error clearing all recent searches:', error);
    }
  };

  const performSearch = async (query: string, tab: SearchTab, cursor?: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setHasSearched(false);
      setNextCursor(null);
      setHasMore(false);
      return;
    }

    console.log('Performing search:', trimmedQuery, 'tab:', tab, 'cursor:', cursor);
    
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setHasSearched(true);
    }

    try {
      // Use correct API endpoints based on tab
      let endpoint = tab === 'users' 
        ? `/api/search/users?q=${encodeURIComponent(trimmedQuery)}`
        : `/api/search/videos?q=${encodeURIComponent(trimmedQuery)}`;
      
      // Add cursor for pagination
      if (cursor) {
        endpoint += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const response = await authenticatedGet<any>(endpoint);
      
      // API returns { results: [], nextCursor: string, hasMore: boolean }
      const results = response.results || [];
      console.log('Search results received:', results.length);

      // Transform results to common format
      const transformedResults: SearchResult[] = results.map((result: any) => {
        if (tab === 'users') {
          return {
            id: result.id,
            type: 'user' as const,
            username: result.username,
            avatarUrl: result.avatar, // API uses 'avatar' not 'avatarUrl'
          };
        } else {
          return {
            id: result.id,
            type: 'video' as const,
            caption: result.caption,
            thumbnailUrl: result.thumbnailUrl,
            username: result.username,
            createdAt: result.createdAt,
          };
        }
      });

      // Append or replace results based on cursor
      if (cursor) {
        setSearchResults((prev) => [...prev, ...transformedResults]);
      } else {
        setSearchResults(transformedResults);
        await saveRecentSearch(trimmedQuery);
      }

      // Update pagination state
      setNextCursor(response.nextCursor || null);
      setHasMore(response.hasMore || false);
    } catch (error) {
      console.error('Error performing search:', error);
      showToast('Failed to search', 'error');
      if (!cursor) {
        setSearchResults([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more results
  const loadMoreResults = () => {
    if (!loadingMore && hasMore && nextCursor) {
      console.log('Loading more results with cursor:', nextCursor);
      performSearch(searchQuery, activeTab, nextCursor);
    }
  };

  // Fetch search suggestions
  const fetchSuggestions = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSuggestions(null);
      setShowSuggestions(false);
      return;
    }

    try {
      const suggestionsData = await authenticatedGet<SearchSuggestion>(
        `/api/search/suggestions?q=${encodeURIComponent(trimmedQuery)}`
      );
      setSuggestions(suggestionsData);
      setShowSuggestions(true);
      console.log('Suggestions fetched:', suggestionsData);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions(null);
      setShowSuggestions(false);
    }
  };

  // Debounced suggestions function
  const debouncedSuggestions = useCallback(
    debounce((query: string) => {
      fetchSuggestions(query);
    }, 300),
    []
  );

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string, tab: SearchTab) => {
      performSearch(query, tab);
    }, 300),
    []
  );

  // Handle search query change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Show suggestions while typing, but don't perform full search yet
    if (text.trim().length >= 2) {
      debouncedSuggestions(text);
      setHasSearched(false);
    } else {
      setSuggestions(null);
      setShowSuggestions(false);
      setHasSearched(false);
      setSearchResults([]);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    // Reset pagination when changing tabs
    setNextCursor(null);
    setHasMore(false);
    if (searchQuery.trim()) {
      performSearch(searchQuery, tab);
    }
  };

  // Handle recent search tap
  const handleRecentSearchTap = (search: string) => {
    console.log('Recent search tapped:', search);
    setSearchQuery(search);
    setShowSuggestions(false);
    performSearch(search, activeTab);
  };

  // Handle suggestion tap
  const handleSuggestionTap = (text: string) => {
    console.log('Suggestion tapped:', text);
    setSearchQuery(text);
    setShowSuggestions(false);
    performSearch(text, activeTab);
  };

  const handleClose = () => {
    console.log('Closing search screen');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with Search Input */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search users, videos..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => performSearch(searchQuery, activeTab)}
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
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Show suggestions, recent searches, or search results */}
      {showSuggestions && suggestions ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Suggestions */}
          {suggestions.users && suggestions.users.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionTitle}>Users</Text>
              {suggestions.users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.suggestionItem}
                  onPress={() => {
                    router.push(`/profile/${user.id}`);
                    setShowSuggestions(false);
                  }}
                >
                  <IconSymbol
                    ios_icon_name="person.circle"
                    android_material_icon_name="account-circle"
                    size={20}
                    color={colors.purple}
                  />
                  <Text style={styles.suggestionText}>@{user.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Hashtag Suggestions */}
          {suggestions.hashtags && suggestions.hashtags.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionTitle}>Hashtags</Text>
              {suggestions.hashtags.map((hashtag) => (
                <TouchableOpacity
                  key={hashtag.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionTap(`#${hashtag.name}`)}
                >
                  <IconSymbol
                    ios_icon_name="number"
                    android_material_icon_name="tag"
                    size={20}
                    color={colors.coral}
                  />
                  <Text style={styles.suggestionText}>#{hashtag.name}</Text>
                  <Text style={styles.suggestionCount}>
                    {hashtag.usageCount} videos
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Sound Suggestions */}
          {suggestions.sounds && suggestions.sounds.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionTitle}>Sounds</Text>
              {suggestions.sounds.map((sound) => (
                <TouchableOpacity
                  key={sound.id}
                  style={styles.suggestionItem}
                  onPress={() => {
                    router.push(`/sound/${sound.id}`);
                    setShowSuggestions(false);
                  }}
                >
                  <IconSymbol
                    ios_icon_name="music.note"
                    android_material_icon_name="music-note"
                    size={20}
                    color={colors.turquoise}
                  />
                  <View style={styles.soundSuggestionInfo}>
                    <Text style={styles.suggestionText}>{sound.title}</Text>
                    <Text style={styles.suggestionArtist}>{sound.artistName}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : !hasSearched && searchQuery.trim() === '' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearAllRecentSearches}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((search, index) => (
                <View key={index} style={styles.recentItem}>
                  <TouchableOpacity
                    style={styles.recentItemContent}
                    onPress={() => handleRecentSearchTap(search)}
                  >
                    <IconSymbol
                      ios_icon_name="clock"
                      android_material_icon_name="access-time"
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

          {/* Empty State */}
          {recentSearches.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={64}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyTitle}>Search VYXO</Text>
              <Text style={styles.emptySubtitle}>
                Find users, videos, and more
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'users' && styles.activeTab]}
              onPress={() => handleTabChange('users')}
            >
              <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
                Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
              onPress={() => handleTabChange('videos')}
            >
              <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
                Videos
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Results */}
          <SearchResults
            query={searchQuery}
            activeTab={activeTab}
            results={searchResults}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMoreResults}
          />
        </>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  closeButton: {
    paddingHorizontal: 8,
  },
  closeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  clearAllText: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  recentItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentSearchText: {
    color: colors.text,
    fontSize: 16,
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
  suggestionsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  suggestionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  suggestionText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  suggestionCount: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  suggestionArtist: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  soundSuggestionInfo: {
    flex: 1,
  },
});
