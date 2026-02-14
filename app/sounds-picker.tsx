
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '@/components/ui/Toast';
import { authenticatedGet } from '@/utils/api';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

interface Sound {
  id: string;
  title: string;
  artist_name?: string;
  duration: number;
  file_url: string;
  waveform_url?: string;
  usage_count: number;
  trending_score: number;
  category: string;
  is_original: boolean;
  created_at: string;
}

export default function SoundsPickerScreen() {
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingSounds, setTrendingSounds] = useState<Sound[]>([]);
  const [searchResults, setSearchResults] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(null);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log('Toast:', message);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchTrendingSounds = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[API] Fetching trending sounds');
      // TODO: Backend Integration - GET /api/sounds/trending → [{ id, title, artistName, duration, fileUrl, waveformUrl, usageCount, trendingScore, category, isOriginal, createdAt }]
      const response = await authenticatedGet<Sound[]>('/api/sounds/trending?limit=20');
      console.log('[API] Fetched trending sounds:', response.length);
      setTrendingSounds(response);
    } catch (error) {
      console.error('[API] Error fetching trending sounds:', error);
      showToast('Failed to load trending sounds', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchSounds = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      console.log('[API] Searching sounds:', query);
      // TODO: Backend Integration - GET /api/sounds/search?q={query} → [{ id, title, artistName, duration, fileUrl, waveformUrl, usageCount, category, isOriginal }]
      const response = await authenticatedGet<Sound[]>(
        `/api/sounds/search?q=${encodeURIComponent(query)}&limit=20`
      );
      console.log('[API] Search results:', response.length);
      setSearchResults(response);
    } catch (error) {
      console.error('[API] Error searching sounds:', error);
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingSounds();
  }, [fetchTrendingSounds]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const debounce = setTimeout(() => {
        searchSounds(searchQuery);
      }, 500);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchSounds]);

  const playSound = async (sound: Sound) => {
    console.log('User tapped play sound:', sound.title);
    
    // Stop currently playing sound
    if (playingSound) {
      await playingSound.stopAsync();
      await playingSound.unloadAsync();
      setPlayingSound(null);
      setPlayingSoundId(null);
    }

    // If clicking the same sound, just stop it
    if (playingSoundId === sound.id) {
      return;
    }

    try {
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: sound.file_url },
        { shouldPlay: true }
      );
      
      setPlayingSound(audioSound);
      setPlayingSoundId(sound.id);

      // Auto-stop when finished
      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingSound(null);
          setPlayingSoundId(null);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      showToast('Failed to play sound', 'error');
    }
  };

  const selectSound = (sound: Sound) => {
    console.log('User selected sound:', sound.title);
    setSelectedSoundId(sound.id);
    
    // Save selected sound to localStorage for VideoEditor to pick up
    try {
      localStorage.setItem('selectedSound', JSON.stringify({
        id: sound.id,
        title: sound.title,
        artist_name: sound.artist_name,
      }));
    } catch (error) {
      console.error('Error saving selected sound:', error);
    }
    
    // Navigate back with sound data
    router.back();
    showToast(`Selected: ${sound.title}`, 'success');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const minsStr = String(mins).padStart(2, '0');
    const secsStr = String(secs).padStart(2, '0');
    return `${minsStr}:${secsStr}`;
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

  const renderSoundItem = ({ item }: { item: Sound }) => {
    const isPlaying = playingSoundId === item.id;
    const isSelected = selectedSoundId === item.id;
    const durationText = formatDuration(item.duration);
    const usageText = formatCount(item.usage_count);
    const artistText = item.artist_name || 'Original Sound';

    return (
      <TouchableOpacity
        style={[styles.soundItem, isSelected && styles.soundItemSelected]}
        onPress={() => selectSound(item)}
      >
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => playSound(item)}
        >
          <IconSymbol
            ios_icon_name={isPlaying ? 'pause.fill' : 'play.fill'}
            android_material_icon_name={isPlaying ? 'pause' : 'play-arrow'}
            size={24}
            color={isPlaying ? colors.primary : colors.text}
          />
        </TouchableOpacity>

        <View style={styles.soundInfo}>
          <Text style={styles.soundTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.soundArtist} numberOfLines={1}>
            {artistText}
          </Text>
          <View style={styles.soundMeta}>
            <Text style={styles.soundDuration}>{durationText}</Text>
            <Text style={styles.soundUsage}>{usageText} videos</Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.checkIcon}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={24}
              color={colors.primary}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const displaySounds = searchQuery.length > 0 ? searchResults : trendingSounds;
  const isLoading = searchQuery.length > 0 ? searching : loading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Add Sound',
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
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/sounds-upload')} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

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
            placeholder="Search sounds..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
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
      </View>

      {/* Sounds List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading sounds...</Text>
        </View>
      ) : displaySounds.length > 0 ? (
        <FlatList
          data={displaySounds}
          keyExtractor={(item) => item.id}
          renderItem={renderSoundItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="music.note"
            android_material_icon_name="music-note"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>
            {searchQuery.length > 0 ? 'No sounds found' : 'No trending sounds available'}
          </Text>
        </View>
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
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  soundItemSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundInfo: {
    flex: 1,
    gap: 4,
  },
  soundTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  soundArtist: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  soundMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  soundDuration: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  soundUsage: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  checkIcon: {
    marginLeft: 8,
  },
});
