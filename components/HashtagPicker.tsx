
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useHashtags, Hashtag } from '@/hooks/useHashtags';
import debounce from 'lodash.debounce';

interface HashtagPickerProps {
  selectedHashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  maxHashtags?: number;
}

/**
 * Component for selecting hashtags
 * Shows trending hashtags and allows searching
 */
export default function HashtagPicker({
  selectedHashtags,
  onHashtagsChange,
  maxHashtags = 10,
}: HashtagPickerProps) {
  const { getTrendingHashtags, searchHashtags, loading } = useHashtags();
  const [searchQuery, setSearchQuery] = useState('');
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Load trending hashtags on mount
  useEffect(() => {
    loadTrendingHashtags();
  }, []);

  const loadTrendingHashtags = async () => {
    const trending = await getTrendingHashtags(20);
    setHashtags(trending);
  };

  // Debounced search
  const debouncedSearch = debounce(async (query: string) => {
    if (query.trim()) {
      const results = await searchHashtags(query);
      setHashtags(results);
    } else {
      loadTrendingHashtags();
    }
  }, 300);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const toggleHashtag = (hashtagName: string) => {
    const isSelected = selectedHashtags.includes(hashtagName);
    
    if (isSelected) {
      // Remove hashtag
      onHashtagsChange(selectedHashtags.filter(h => h !== hashtagName));
    } else {
      // Add hashtag (if not at max)
      if (selectedHashtags.length < maxHashtags) {
        onHashtagsChange([...selectedHashtags, hashtagName]);
      }
    }
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

  const renderHashtagItem = ({ item }: { item: Hashtag }) => {
    const isSelected = selectedHashtags.includes(item.name);
    const usageCount = item.usageCount || item.usage_count || 0;
    const countDisplay = formatCount(usageCount);

    return (
      <TouchableOpacity
        style={[styles.hashtagItem, isSelected && styles.hashtagItemSelected]}
        onPress={() => toggleHashtag(item.name)}
      >
        <View style={styles.hashtagInfo}>
          <Text style={[styles.hashtagName, isSelected && styles.hashtagNameSelected]}>
            #{item.name}
          </Text>
          <Text style={styles.hashtagCount}>{countDisplay} videos</Text>
        </View>
        {isSelected && (
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={24}
            color={colors.purple}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Hashtags</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Selected Count */}
      <Text style={styles.selectedCount}>
        {selectedHashtags.length} / {maxHashtags} seleccionados
      </Text>

      {/* Search Input */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar hashtags..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              loadTrendingHashtags();
            }}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Hashtags List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.purple} />
        </View>
      ) : (
        <FlatList
          data={hashtags}
          renderItem={renderHashtagItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  listContent: {
    gap: 8,
  },
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  hashtagItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: colors.purple,
  },
  hashtagInfo: {
    gap: 2,
  },
  hashtagName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  hashtagNameSelected: {
    color: colors.purple,
  },
  hashtagCount: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});
