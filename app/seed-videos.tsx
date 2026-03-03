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
import Toast from '@/components/ui/Toast';
import { IconSymbol } from '@/components/IconSymbol';

// FIX: Definir la URL base directamente para evitar problemas con API_URL
// El backend está en Render y el endpoint /seed es PÚBLICO
const BACKEND_URL = 'https://vyxo-backend.onrender.com';

interface SeedResponse {
  success: boolean;
  message: string;
  videos?: number;
}

export default function SeedVideosScreen() {
  const [loading, setLoading] = useState(false);
  const [seededCount, setSeededCount] = useState<number | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSeedVideos = async () => {
    console.log('[Seed] Starting seed process...');
    setLoading(true);
    
    try {
      // FIX: Usar URL completa correcta - endpoint PÚBLICO /api/seed
      const url = `${BACKEND_URL}/api/seed`;
      console.log('[Seed] Calling endpoint:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({}),
      });

      console.log('[Seed] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Seed] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: SeedResponse = await response.json();
      console.log('[Seed] Success response:', data);
      
      if (data.success) {
        setSeededCount(data.videos || 3);
        showToast(data.message, 'success');
      } else {
        showToast(data.message || 'Failed to seed videos', 'error');
      }
    } catch (error) {
      console.error('[Seed] Error:', error);
      showToast(`Error: ${error instanceof Error ? error.message : 'Network request failed'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToHome = () => {
    console.log('[Seed] Navigating to home');
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

        {seededCount !== null && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>✅ Successfully Created {seededCount} Videos!</Text>
            
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
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 16,
    textAlign: 'center',
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