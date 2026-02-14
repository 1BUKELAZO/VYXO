
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from '@/components/ui/Toast';
import { useLiveStream } from '@/hooks/useLiveStream';
import LiveChat from '@/components/LiveChat';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  mockVideo: {
    flex: 1,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockVideoText: {
    color: colors.textSecondary,
    fontSize: 18,
    marginTop: 16,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  streamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text,
  },
  liveText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 6,
  },
  viewerCountText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  streamerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streamerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  streamTitle: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: 16,
  },
});

export default function WatchLiveStreamScreen() {
  const { streamId } = useLocalSearchParams<{ streamId: string }>();
  const {
    stream,
    messages,
    loading,
    error,
    sendChatMessage,
    fetchStreamDetails,
    fetchChatMessages,
  } = useLiveStream(streamId);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error]);

  useEffect(() => {
    if (!streamId) return;

    const interval = setInterval(() => {
      fetchChatMessages();
      fetchStreamDetails();
    }, 3000);

    return () => clearInterval(interval);
  }, [streamId, fetchChatMessages, fetchStreamDetails]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendChatMessage(content);
      await fetchChatMessages();
    } catch (err) {
      showToast('Failed to send message', 'error');
    }
  };

  const formatViewerCount = (count: number): string => {
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

  const viewerCountText = stream ? formatViewerCount(stream.viewerCount) : '0';

  if (loading && !stream) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading stream...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Mock Video Stream Area */}
      <View style={styles.videoContainer}>
        <View style={styles.mockVideo}>
          <IconSymbol
            ios_icon_name="video.fill"
            android_material_icon_name="videocam"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.mockVideoText}>Live Stream</Text>
          <Text style={[styles.mockVideoText, { fontSize: 14, marginTop: 8 }]}>
            Mux Live Player would appear here
          </Text>
        </View>

        {/* Top Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={styles.topOverlay}
        >
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>

            <View style={styles.streamInfo}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <View style={styles.viewerCount}>
                <IconSymbol
                  ios_icon_name="eye.fill"
                  android_material_icon_name="visibility"
                  size={16}
                  color={colors.text}
                />
                <Text style={styles.viewerCountText}>{viewerCountText}</Text>
              </View>
            </View>
          </View>

          {stream && (
            <View style={styles.streamerInfo}>
              <View style={styles.streamerAvatar}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
              <View>
                <Text style={styles.streamerName}>{stream.username}</Text>
                <Text style={styles.streamTitle}>{stream.title}</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Chat Overlay */}
        <View style={styles.chatContainer}>
          <LiveChat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={loading}
          />
        </View>
      </View>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}
