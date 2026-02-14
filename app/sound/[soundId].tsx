
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
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '@/components/ui/Toast';
import { authenticatedGet } from '@/utils/api';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = (width - 45) / 3;

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
  created_by?: string;
  is_original: boolean;
  created_at: string;
}

interface Video {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  video_url: string;
  thumbnail_url?: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function SoundDetailScreen() {
  const params = useLocalSearchParams();
  const soundId = params.soundId as string;

  const [sound, setSound] = useState<Sound | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log('Toast:', message);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchSoundDetails = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[API] Fetching sound details:', soundId);
      // TODO: Backend Integration - GET /api/sounds/:id → { id, title, artistName, duration, fileUrl, waveformUrl, usageCount, trendingScore, category, createdBy, isOriginal, createdAt }
      const response = await authenticatedGet<Sound>(`/api/sounds/${soundId}`);
      console.log('[API] Fetched sound details:', response.title);
      setSound(response);
    } catch (error) {
      console.error('[API] Error fetching sound details:', error);
      showToast('Failed to load sound details', 'error');
    } finally {
      setLoading(false);
    }
  }, [soundId]);

  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      console.log('[API] Fetching videos for sound:', soundId);
      // TODO: Backend Integration - GET /api/sounds/:id/videos → [{ id, userId, username, avatarUrl, videoUrl, thumbnailUrl, caption, likesCount, commentsCount, createdAt }]
      const response = await authenticatedGet<Video[]>(`/api/sounds/${soundId}/videos?limit=30`);
      console.log('[API] Fetched videos:', response.length);
      setVideos(response);
    } catch (error) {
      console.error('[API] Error fetching videos:', error);
      showToast('Failed to load videos', 'error');
    } finally {
      setLoadingVideos(false);
    }
  }, [soundId]);

  useEffect(() => {
    fetchSoundDetails();
    fetchVideos();
  }, [fetchSoundDetails, fetchVideos]);

  const togglePlaySound = async () => {
    console.log('User tapped play/pause sound');

    if (playingSound) {
      if (isPlaying) {
        await playingSound.pauseAsync();
        setIsPlaying(false);
      } else {
        await playingSound.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    if (!sound) return;

    try {
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: sound.file_url },
        { shouldPlay: true }
      );
      
      setPlayingSound(audioSound);
      setIsPlaying(true);

      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      showToast('Failed to play sound', 'error');
    }
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const minsStr = String(mins).padStart(2, '0');
    const secsStr = String(secs).padStart(2, '0');
    return `${minsStr}:${secsStr}`;
  };

  const renderVideoItem = ({ item }: { item: Video }) => {
    const likesText = formatCount(item.likes_count);

    return (
      <TouchableOpacity
        style={styles.videoThumbnail}
        onPress={() => {
          console.log('User tapped video:', item.id);
          // Navigate to video player
          router.push(`/(tabs)/(home)/?videoId=${item.id}`);
        }}
      >
        <Image
          source={resolveImageSource(item.thumbnail_url)}
          style={styles.thumbnailImage}
        />
        <View style={styles.videoOverlay}>
          <IconSymbol
            ios_icon_name="play.fill"
            android_material_icon_name="play-arrow"
            size={20}
            color={colors.text}
          />
          <Text style={styles.videoLikes}>{likesText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Sound',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading sound...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sound) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Sound',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Sound not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const usageText = formatCount(sound.usage_count);
  const durationText = formatDuration(sound.duration);
  const artistText = sound.artist_name || 'Original Sound';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: sound.title,
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

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={renderVideoItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Sound Info Card */}
            <View style={styles.soundCard}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlaySound}
              >
                <IconSymbol
                  ios_icon_name={isPlaying ? 'pause.fill' : 'play.fill'}
                  android_material_icon_name={isPlaying ? 'pause' : 'play-arrow'}
                  size={32}
                  color={colors.text}
                />
              </TouchableOpacity>

              <View style={styles.soundInfo}>
                <Text style={styles.soundTitle}>{sound.title}</Text>
                <Text style={styles.soundArtist}>{artistText}</Text>
                <View style={styles.soundMeta}>
                  <Text style={styles.soundMetaText}>{durationText}</Text>
                  <Text style={styles.soundMetaText}>•</Text>
                  <Text style={styles.soundMetaText}>{usageText} videos</Text>
                </View>
              </View>
            </View>

            {/* Use Sound Button */}
            <TouchableOpacity
              style={styles.useSoundButton}
              onPress={() => {
                console.log('User tapped Use Sound button');
                router.push('/camera');
                showToast('Sound selected! Start recording', 'success');
              }}
            >
              <IconSymbol
                ios_icon_name="video.fill"
                android_material_icon_name="videocam"
                size={20}
                color={colors.text}
              />
              <Text style={styles.useSoundButtonText}>Use this sound</Text>
            </TouchableOpacity>

            {/* Videos Header */}
            <Text style={styles.videosHeader}>Videos with this sound</Text>
          </View>
        }
        ListEmptyComponent={
          loadingVideos ? (
            <View style={styles.loadingVideosContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyVideosContainer}>
              <Text style={styles.emptyText}>No videos yet</Text>
            </View>
          )
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
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
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
    padding: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 15,
  },
  soundCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    marginBottom: 16,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  soundTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  soundArtist: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  soundMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  soundMetaText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  useSoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 24,
  },
  useSoundButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  videosHeader: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  videoThumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.5,
    margin: 2.5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoLikes: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingVideosContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyVideosContainer: {
    padding: 40,
    alignItems: 'center',
  },
});
