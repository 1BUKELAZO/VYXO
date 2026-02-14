
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Camera, CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { IconSymbol } from '@/components/IconSymbol';
import DuetPlayer from '@/components/DuetPlayer';
import Toast from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import { colors } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoDetails {
  id: string;
  videoUrl: string;
  masterPlaylistUrl?: string;
  caption: string;
  username: string;
  allowDuets: boolean;
  allowStitches: boolean;
  duration: number;
}

type DuetMode = 'duet' | 'stitch';
type DuetLayout = 'side' | 'top-bottom';
type RecordingState = 'idle' | 'recording' | 'recorded' | 'processing';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.dark,
  },
  errorTitle: {
    color: colors.coral,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: colors.purple,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  errorButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 4,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  modeButtonActive: {
    backgroundColor: colors.purple,
  },
  modeButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  layoutSelector: {
    position: 'absolute',
    top: 120,
    right: 20,
    gap: 12,
    zIndex: 10,
  },
  layoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  layoutButtonActive: {
    borderColor: colors.turquoise,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.text,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.coral,
  },
  recordButtonRecording: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: colors.coral,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text,
  },
  recordingText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  previewControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    zIndex: 10,
  },
  previewButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  previewButtonPrimary: {
    backgroundColor: colors.purple,
  },
  previewButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  previewButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

export default function DuetScreen() {
  const params = useLocalSearchParams<{ videoId: string }>();
  const videoId = params.videoId;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [duetMode, setDuetMode] = useState<DuetMode>('duet');
  const [duetLayout, setDuetLayout] = useState<DuetLayout>('side');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('front');

  // Refs
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch video details
  useEffect(() => {
    const fetchVideoDetails = async () => {
      if (!videoId) {
        setError('No video ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('[DuetScreen] Fetching video details:', videoId);
        const data = await authenticatedGet<VideoDetails>(`/api/videos/${videoId}`);
        
        console.log('[DuetScreen] Video details:', data);

        if (!data.allowDuets && !data.allowStitches) {
          setError('This video does not allow duets or stitches');
          setLoading(false);
          return;
        }

        setVideoDetails(data);
        
        // Set default mode based on what's allowed
        if (!data.allowDuets && data.allowStitches) {
          setDuetMode('stitch');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('[DuetScreen] Error fetching video:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video');
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [videoId]);

  // Request camera permissions
  useEffect(() => {
    if (!permission) return;
    
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleBack = () => {
    if (recordingState === 'recording') {
      showToast('Stop recording first', 'error');
      return;
    }
    router.back();
  };

  const handleFlipCamera = () => {
    setCameraType((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleModeChange = (mode: DuetMode) => {
    if (recordingState !== 'idle') return;
    
    if (mode === 'duet' && !videoDetails?.allowDuets) {
      showToast('Duets not allowed for this video', 'error');
      return;
    }
    
    if (mode === 'stitch' && !videoDetails?.allowStitches) {
      showToast('Stitches not allowed for this video', 'error');
      return;
    }
    
    setDuetMode(mode);
  };

  const handleLayoutChange = (layout: DuetLayout) => {
    if (recordingState !== 'idle') return;
    setDuetLayout(layout);
  };

  const startRecording = async () => {
    if (!cameraRef.current || !videoDetails) return;

    try {
      console.log('[DuetScreen] Starting recording...');
      setRecordingState('recording');
      setRecordingDuration(0);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          
          // Auto-stop at video duration (for duet) or 5 seconds (for stitch)
          const maxDuration = duetMode === 'stitch' ? 5 : videoDetails.duration;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          
          return newDuration;
        });
      }, 1000);

      // Start camera recording
      const video = await cameraRef.current.recordAsync({
        maxDuration: duetMode === 'stitch' ? 5 : videoDetails.duration,
      });

      console.log('[DuetScreen] Recording completed:', video.uri);
      setRecordedVideoUri(video.uri);
      setRecordingState('recorded');
    } catch (err) {
      console.error('[DuetScreen] Recording error:', err);
      showToast('Failed to record video', 'error');
      setRecordingState('idle');
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current) return;

    try {
      console.log('[DuetScreen] Stopping recording...');
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      await cameraRef.current.stopRecording();
    } catch (err) {
      console.error('[DuetScreen] Stop recording error:', err);
    }
  };

  const handleRecordButton = () => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();
    }
  };

  const handleRetake = () => {
    setRecordedVideoUri(null);
    setRecordingState('idle');
    setRecordingDuration(0);
  };

  const handleNext = () => {
    if (!recordedVideoUri || !videoDetails) return;

    console.log('[DuetScreen] Proceeding to editor with duet metadata');
    
    // Navigate to video editor with duet metadata
    router.push({
      pathname: '/video-editor',
      params: {
        videoUri: recordedVideoUri,
        duetWithId: videoId,
        isDuet: duetMode === 'duet' ? 'true' : 'false',
        isStitch: duetMode === 'stitch' ? 'true' : 'false',
        duetLayout: duetLayout,
      },
    });
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  // Error state
  if (error || !videoDetails) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="error"
          size={64}
          color={colors.coral}
        />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error || 'Failed to load video'}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Permission not granted
  if (!permission?.granted) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <IconSymbol
          ios_icon_name="camera"
          android_material_icon_name="camera"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.errorTitle}>Camera Permission Required</Text>
        <Text style={styles.errorMessage}>
          We need camera access to record your duet
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={requestPermission}>
          <Text style={styles.errorButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const videoSource = videoDetails.masterPlaylistUrl || videoDetails.videoUrl;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Duet Player (shows original video + camera/recorded video) */}
      {recordingState === 'recorded' && recordedVideoUri ? (
        <DuetPlayer
          originalVideoUrl={videoSource}
          userVideoUrl={recordedVideoUri}
          layout={duetLayout}
          isRecording={false}
        />
      ) : (
        <View style={styles.cameraContainer}>
          {/* Original video in background */}
          <DuetPlayer
            originalVideoUrl={videoSource}
            layout={duetLayout}
            isRecording={recordingState === 'recording'}
          />

          {/* Camera overlay */}
          <View
            style={[
              StyleSheet.absoluteFill,
              duetLayout === 'side'
                ? { left: SCREEN_WIDTH / 2 }
                : { top: SCREEN_HEIGHT / 2 },
            ]}
          >
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
            />
          </View>
        </View>
      )}

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleBack}>
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        {recordingState === 'idle' && (
          <View style={styles.modeSelector}>
            {videoDetails.allowDuets && (
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  duetMode === 'duet' && styles.modeButtonActive,
                ]}
                onPress={() => handleModeChange('duet')}
              >
                <Text style={styles.modeButtonText}>Duet</Text>
              </TouchableOpacity>
            )}
            {videoDetails.allowStitches && (
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  duetMode === 'stitch' && styles.modeButtonActive,
                ]}
                onPress={() => handleModeChange('stitch')}
              >
                <Text style={styles.modeButtonText}>Stitch</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {recordingState === 'idle' && (
          <TouchableOpacity style={styles.controlButton} onPress={handleFlipCamera}>
            <IconSymbol
              ios_icon_name="arrow.triangle.2.circlepath.camera"
              android_material_icon_name="flip-camera-ios"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Layout Selector */}
      {recordingState === 'idle' && duetMode === 'duet' && (
        <View style={styles.layoutSelector}>
          <TouchableOpacity
            style={[
              styles.layoutButton,
              duetLayout === 'side' && styles.layoutButtonActive,
            ]}
            onPress={() => handleLayoutChange('side')}
          >
            <IconSymbol
              ios_icon_name="rectangle.split.2x1"
              android_material_icon_name="view-column"
              size={24}
              color={duetLayout === 'side' ? colors.turquoise : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.layoutButton,
              duetLayout === 'top-bottom' && styles.layoutButtonActive,
            ]}
            onPress={() => handleLayoutChange('top-bottom')}
          >
            <IconSymbol
              ios_icon_name="rectangle.split.1x2"
              android_material_icon_name="view-agenda"
              size={24}
              color={duetLayout === 'top-bottom' ? colors.turquoise : colors.text}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Recording Indicator */}
      {recordingState === 'recording' && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            {recordingDuration}s / {duetMode === 'stitch' ? 5 : videoDetails.duration}s
          </Text>
        </View>
      )}

      {/* Info Text */}
      {recordingState === 'idle' && (
        <Text style={styles.infoText}>
          {duetMode === 'duet'
            ? 'Record your video alongside the original'
            : 'Record your response after 5s of the original'}
        </Text>
      )}

      {/* Bottom Controls */}
      {recordingState !== 'recorded' && (
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleRecordButton}
            disabled={recordingState === 'processing'}
          >
            <View
              style={
                recordingState === 'recording'
                  ? styles.recordButtonRecording
                  : styles.recordButtonInner
              }
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Preview Controls */}
      {recordingState === 'recorded' && (
        <View style={styles.previewControls}>
          <TouchableOpacity
            style={[styles.previewButton, styles.previewButtonSecondary]}
            onPress={handleRetake}
          >
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.previewButton, styles.previewButtonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.previewButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}
