
# 🔍 VYXO Search API - Quick Reference

## 📡 API Endpoints

### 1. Search Users
```typescript
GET /api/search/users?q={query}&cursor={cursor}&limit={limit}

// Example
const results = await authenticatedGet<{
  results: Array<{
    id: string;
    username: string;
    avatar: string;
    followersCount: number;
    isFollowing: boolean;
  }>;
  nextCursor: string;
  hasMore: boolean;
}>('/api/search/users?q=john');
```

### 2. Search Videos
```typescript
GET /api/search/videos?q={query}&cursor={cursor}&limit={limit}

// Example
const results = await authenticatedGet<{
  results: Array<{
    id: string;
    caption: string;
    thumbnailUrl: string;
    viewsCount: number;
    duration: number;
    likesCount: number;
  }>;
  nextCursor: string;
  hasMore: boolean;
}>('/api/search/videos?q=dance');
```

### 3. Search Suggestions
```typescript
GET /api/search/suggestions?q={query}

// Example
const suggestions = await authenticatedGet<{
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
}>('/api/search/suggestions?q=jo');
```

### 4. Trending Content
```typescript
GET /api/search/trending

// Example
const trending = await authenticatedGet<{
  hashtags: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
  sounds: Array<{
    id: string;
    title: string;
    artistName: string;
    usageCount: number;
  }>;
}>('/api/search/trending');
```

---

## 🎯 Usage Examples

### Basic Search
```typescript
import { authenticatedGet } from '@/utils/api';

// Search for users
const searchUsers = async (query: string) => {
  try {
    const response = await authenticatedGet(
      `/api/search/users?q=${encodeURIComponent(query)}`
    );
    console.log('Users found:', response.results.length);
    return response.results;
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
};
```

### Pagination
```typescript
// Load more results
const loadMore = async (query: string, cursor: string) => {
  const response = await authenticatedGet(
    `/api/search/videos?q=${encodeURIComponent(query)}&cursor=${encodeURIComponent(cursor)}`
  );
  
  if (response.hasMore) {
    console.log('More results available');
    console.log('Next cursor:', response.nextCursor);
  }
  
  return response;
};
```

### Debounced Suggestions
```typescript
import debounce from 'lodash.debounce';

const fetchSuggestions = async (query: string) => {
  if (query.length < 2) return;
  
  const suggestions = await authenticatedGet(
    `/api/search/suggestions?q=${encodeURIComponent(query)}`
  );
  
  return suggestions;
};

// Debounce to avoid excessive API calls
const debouncedFetch = debounce(fetchSuggestions, 300);
```

---

## 🔧 Helper Functions

### Format Count
```typescript
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// Usage
formatCount(1234567); // "1.2M"
formatCount(5678);    // "5.7K"
formatCount(123);     // "123"
```

### Recent Searches (AsyncStorage)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = '@vyxo_recent_searches';
const MAX_RECENT_SEARCHES = 10;

// Save search
const saveRecentSearch = async (query: string) => {
  const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
  const searches = stored ? JSON.parse(stored) : [];
  
  const updated = [
    query,
    ...searches.filter((s: string) => s !== query)
  ].slice(0, MAX_RECENT_SEARCHES);
  
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
};

// Load searches
const loadRecentSearches = async (): Promise<string[]> => {
  const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Clear search
const clearRecentSearch = async (query: string) => {
  const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
  const searches = stored ? JSON.parse(stored) : [];
  const updated = searches.filter((s: string) => s !== query);
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
};
```

---

## 🎨 UI Components

### Search Input
```tsx
<View style={styles.searchContainer}>
  <IconSymbol
    ios_icon_name="magnifyingglass"
    android_material_icon_name="search"
    size={20}
    color={colors.textSecondary}
  />
  <TextInput
    style={styles.searchInput}
    placeholder="Search users, videos..."
    placeholderTextColor={colors.textSecondary}
    value={searchQuery}
    onChangeText={handleSearchChange}
    autoFocus
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
```

### Tabs
```tsx
<View style={styles.tabsContainer}>
  <TouchableOpacity
    style={[styles.tab, activeTab === 'users' && styles.activeTab]}
    onPress={() => setActiveTab('users')}
  >
    <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
      Users
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
    onPress={() => setActiveTab('videos')}
  >
    <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
      Videos
    </Text>
  </TouchableOpacity>
</View>
```

### Loading Skeleton
```tsx
const renderLoadingSkeleton = () => (
  <View style={styles.container}>
    {Array.from({ length: 5 }).map((_, i) => (
      <View key={i} style={styles.userItem}>
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
```

---

## 🚀 Navigation

### Navigate to Search
```typescript
import { router } from 'expo-router';

// Basic navigation
router.push('/search');

// With query parameter
router.push(`/search?q=${encodeURIComponent('dance')}`);

// With hashtag
router.push(`/search?q=${encodeURIComponent('#viral')}`);
```

### Navigate from Results
```typescript
// Navigate to user profile
router.push(`/profile/${userId}`);

// Navigate to video
router.push(`/(tabs)/(home)?videoId=${videoId}`);

// Navigate to sound
router.push(`/sound/${soundId}`);
```

---

## 🔐 Authentication

All search endpoints require authentication. The `authenticatedGet` helper automatically includes the Bearer token:

```typescript
import { authenticatedGet } from '@/utils/api';

// This automatically includes:
// Authorization: Bearer <token>
const results = await authenticatedGet('/api/search/users?q=john');
```

If the user is not authenticated, the API will return a 401 error, and the app should redirect to the login screen.

---

## 📊 Response Types

### TypeScript Interfaces
```typescript
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

interface PaginatedResponse<T> {
  results: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

---

## 🎯 Best Practices

1. **Always encode query parameters**
   ```typescript
   `/api/search/users?q=${encodeURIComponent(query)}`
   ```

2. **Use debouncing for suggestions**
   ```typescript
   const debouncedFetch = debounce(fetchSuggestions, 300);
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     const results = await authenticatedGet('/api/search/users?q=john');
   } catch (error) {
     console.error('Search failed:', error);
     showToast('Failed to search', 'error');
   }
   ```

4. **Reset pagination when changing tabs**
   ```typescript
   const handleTabChange = (tab: SearchTab) => {
     setActiveTab(tab);
     setNextCursor(null);
     setHasMore(false);
     performSearch(searchQuery, tab);
   };
   ```

5. **Save searches after successful results**
   ```typescript
   if (results.length > 0) {
     await saveRecentSearch(query);
   }
   ```

---

## 🐛 Troubleshooting

### No Results
- Check if query is properly encoded
- Verify authentication token is valid
- Check API response in console logs

### Pagination Not Working
- Ensure `nextCursor` is passed correctly
- Check `hasMore` flag before loading more
- Verify `onEndReached` threshold (0.5 recommended)

### Suggestions Not Appearing
- Minimum 2 characters required
- Check debounce delay (300ms)
- Verify API endpoint is correct

### Recent Searches Not Saving
- Check AsyncStorage permissions
- Verify key name matches: `@vyxo_recent_searches`
- Check JSON parsing/stringifying

---

## 📚 Related Files

- `app/search.tsx` - Main search screen
- `app/(tabs)/discover.tsx` - Discover screen with trending
- `components/SearchResults.tsx` - Search results component
- `utils/api.ts` - API helper functions
- `styles/commonStyles.ts` - Color scheme and styles

---

## 🎉 Quick Start

```typescript
// 1. Import the API helper
import { authenticatedGet } from '@/utils/api';

// 2. Perform a search
const results = await authenticatedGet('/api/search/users?q=john');

// 3. Display results
results.results.forEach(user => {
  console.log(user.username, user.followersCount);
});

// 4. Load more if available
if (results.hasMore) {
  const more = await authenticatedGet(
    `/api/search/users?q=john&cursor=${results.nextCursor}`
  );
}
```

That's it! You're ready to use the VYXO search API. 🚀
