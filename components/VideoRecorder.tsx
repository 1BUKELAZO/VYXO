
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

const DEFAULT_MIN_DURATION = 3; // 3 seconds
const DEFAULT_MAX_DURATION = 60; // 60 seconds
const LONG_PRESS_DURATION = 200; // 200ms to start recording

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  replyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  replyBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  recordButtonContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.coral,
  },
  recordButtonRecording: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.coral,
  },
  progressRing: {
    position: 'absolute',
    width: 100,
    height: 100,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
});

export default function VideoRecorder() {
  const params = useLocalSearchParams<{
    replyToVideoId?: string;
    replyToUsername?: string;
    minDuration?: string;
    maxDuration?: string;
  }>();
  
  // Parse duration parameters for video replies
  const MIN_RECORDING_DURATION = params.minDuration 
    ? parseInt(params.minDuration, 10) 
    : DEFAULT_MIN_DURATION;
  const MAX_RECORDING_DURATION = params.maxDuration 
    ? parseInt(params.maxDuration, 10) 
    : DEFAULT_MAX_DURATION;
  
  const isReplyMode = !!params.replyToVideoId;
  const replyToUsername = params.replyToUsername || 'user';
  
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request permissions on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleFlash = () => {
    setFlash((current) => (current === 'off' ? 'on' : 'off'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    router.back();
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      console.log('Starting video recording...');
      setIsRecording(true);
      setRecordingDuration(0);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start recording
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_RECORDING_DURATION,
      });

      console.log('Video recorded:', video);

      // Check minimum duration
      if (recordingDuration < MIN_RECORDING_DURATION) {
        showToast(`El video debe durar al menos ${MIN_RECORDING_DURATION} segundos`, 'error');
        return;
      }

      // Navigate to editor with video URI and reply params
      if (video?.uri) {
        router.push({
          pathname: '/video-editor',
          params: { 
            videoUri: video.uri,
            replyToVideoId: params.replyToVideoId,
            replyToUsername: params.replyToUsername,
          },
        });
      }
    } catch (error) {
      console.error('Error recording video:', error);
      showToast('Error al grabar el video', 'error');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      console.log('Stopping video recording...');
      await cameraRef.current.stopRecording();
      setIsRecording(false);

      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error stopping recording:', error);
      showToast('Error al detener la grabación', 'error');
    }
  };

  const handlePressIn = () => {
    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      startRecording();

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          
          // Auto-stop at max duration
          if (newDuration >= MAX_RECORDING_DURATION) {
            stopRecording();
          }
          
          return newDuration;
        });
      }, 1000);
    }, LONG_PRESS_DURATION);

    // Haptic feedback on press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    // Clear long press timer if not started
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const minsPadded = String(mins).padStart(2, '0');
    const secsPadded = String(secs).padStart(2, '0');
    return `${minsPadded}:${secsPadded}`;
  };

  // Calculate progress for ring
  const progressPercentage = (recordingDuration / MAX_RECORDING_DURATION) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#FFFFFF', textAlign: 'center', marginTop: 100 }}>
          Solicitando permisos de cámara...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#FFFFFF', textAlign: 'center', marginTop: 100, marginBottom: 20 }}>
          Necesitamos acceso a tu cámara para grabar videos
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: colors.purple,
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderRadius: 25,
            alignSelf: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            Permitir acceso
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const timerDisplay = formatTime(recordingDuration);
  const maxTimeDisplay = formatTime(MAX_RECORDING_DURATION);

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        mode="video"
      >
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {isReplyMode ? (
              <View style={styles.replyBadge}>
                <IconSymbol
                  ios_icon_name="arrowshape.turn.up.left"
                  android_material_icon_name="reply"
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.replyBadgeText}>
                  Reply to @{replyToUsername}
                </Text>
              </View>
            ) : (
              <View style={styles.timer}>
                <Text style={styles.timerText}>
                  {timerDisplay} / {maxTimeDisplay}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
                <IconSymbol
                  ios_icon_name={flash === 'on' ? 'bolt.fill' : 'bolt.slash'}
                  android_material_icon_name={flash === 'on' ? 'flash-on' : 'flash-off'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                <IconSymbol
                  ios_icon_name="arrow.triangle.2.circlepath.camera"
                  android_material_icon_name="flip-camera-android"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.recordButtonContainer}>
              {/* Progress Ring */}
              {isRecording && (
                <Svg style={styles.progressRing}>
                  <Circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={colors.turquoise}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin="50, 50"
                  />
                </Svg>
              )}

              {/* Record Button */}
              <Animated.View
                style={[
                  styles.recordButton,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={[
                    isRecording ? styles.recordButtonRecording : styles.recordButtonInner,
                  ]}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  activeOpacity={0.8}
                />
              </Animated.View>
            </View>

            <Text style={styles.instructionText}>
              {isRecording
                ? 'Suelta para detener'
                : 'Mantén presionado para grabar'}
            </Text>
          </View>
        </View>
      </CameraView>

      {/* Toast */}
      <View style={styles.toastContainer}>
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onHide={() => setToastVisible(false)}
        />
      </View>
    </View>
  );
}
