
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Toast from '@/components/ui/Toast';
import { IconSymbol } from '@/components/IconSymbol';

interface SeedResponse {
  success: boolean;
  message: string;
  videos: {
    id: string;
    video_url: string;
    thumbnail_url: string;
    caption: string;
  }[];
}

export default function SeedVideosScreen() {
  const [loading, setLoading] = useState(false);
  const [seededVideos, setSeededVideos] = useState<SeedResponse['videos'] | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSeedVideos = async () => {
    console.log('User tapped Seed Videos button');
    setLoading(true);
    try {
      const response = await authenticatedPost<SeedResponse>('/api/videos/seed', {});
      console.log('Seed videos response:', response);
      
      if (response.success) {
        setSeededVideos(response.videos);
        showToast(response.message, 'success');
      } else {
        showToast('Failed to seed videos', 'error');
      }
    } catch (error) {
      console.error('Error seeding videos:', error);
      showToast('Error seeding videos. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToHome = () => {
    console.log('User tapped Go to Home button');
    router.push('/(tabs)/(home)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Seed Test Videos',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="video.fill"
            android_material_icon_name="movie"
            size={64}
            color={colors.primary}
          />
          <Text style={styles.title}>Seed Test Videos</Text>
          <Text style={styles.description}>
            Generate 3 sample videos in the database for testing the comments feature.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSeedVideos}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color={colors.background}
              />
              <Text style={styles.buttonText}>Generate Sample Videos</Text>
            </>
          )}
        </TouchableOpacity>

        {seededVideos && seededVideos.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>✅ Successfully Created:</Text>
            {seededVideos.map((video, index) => {
              const videoNumber = index + 1;
              return (
                <View key={video.id} style={styles.videoCard}>
                  <View style={styles.videoHeader}>
                    <IconSymbol
                      ios_icon_name="video.fill"
                      android_material_icon_name="movie"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.videoNumber}>Video {videoNumber}</Text>
                  </View>
                  <Text style={styles.videoCaption}>{video.caption}</Text>
                  <Text style={styles.videoId}>ID: {video.id}</Text>
                </View>
              );
            })}

            <TouchableOpacity style={styles.homeButton} onPress={handleGoToHome}>
              <IconSymbol
                ios_icon_name="house.fill"
                android_material_icon_name="home"
                size={24}
                color={colors.background}
              />
              <Text style={styles.homeButtonText}>Go to Home Feed</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={20}
            color={colors.textSecondary}
          />
          <Text style={styles.infoText}>
            This will create 3 videos with your user ID. You can then test the comments feature on these videos.
          </Text>
        </View>
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
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 16,
  },
  videoCard: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  videoNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  videoCaption: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  videoId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  homeButton: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  homeButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
