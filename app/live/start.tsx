
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '@/components/ui/Toast';
import { authenticatedPost } from '@/utils/api';

export default function StartLiveScreen() {
  const [title, setTitle] = useState('');
  const [starting, setStarting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleStartLive = async () => {
    if (!title.trim()) {
      showToast('Please enter a title for your stream', 'error');
      return;
    }

    setStarting(true);
    try {
      console.log('[API] Starting live stream with title:', title);
      const response = await authenticatedPost<{ streamId: string; streamUrl: string }>(
        '/api/live/start',
        { title }
      );
      console.log('[API] Live stream started:', response.streamId);
      
      showToast('Live stream started!', 'success');
      setTimeout(() => {
        router.replace(`/live/${response.streamId}`);
      }, 500);
    } catch (error) {
      console.error('[API] Error starting live stream:', error);
      showToast('Failed to start live stream', 'error');
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Go Live',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name="video.fill"
            android_material_icon_name="videocam"
            size={80}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>Start Your Live Stream</Text>
        <Text style={styles.subtitle}>
          Share your moments with your followers in real-time
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Stream Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What&apos;s happening?"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            autoFocus
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        <TouchableOpacity
          style={[styles.goLiveButton, (!title.trim() || starting) && styles.goLiveButtonDisabled]}
          onPress={handleStartLive}
          disabled={!title.trim() || starting}
        >
          {starting ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="video.fill"
                android_material_icon_name="videocam"
                size={24}
                color={colors.text}
              />
              <Text style={styles.goLiveButtonText}>Go Live</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for a great stream:</Text>
          <View style={styles.tip}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.tipText}>Make sure you have a stable internet connection</Text>
          </View>
          <View style={styles.tip}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.tipText}>Find good lighting for better video quality</Text>
          </View>
          <View style={styles.tip}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.tipText}>Engage with your viewers in the chat</Text>
          </View>
        </View>
      </View>

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
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  goLiveButton: {
    backgroundColor: colors.secondary,
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  goLiveButtonDisabled: {
    opacity: 0.5,
  },
  goLiveButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  tipsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
  },
  tipsTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
