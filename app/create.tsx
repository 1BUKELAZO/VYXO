
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import Toast from '@/components/ui/Toast';

const { width, height } = Dimensions.get('window');

interface CreateOption {
  id: 'record' | 'upload' | 'live' | 'cancel';
  label: string;
  emoji: string;
  ios_icon_name: string;
  android_material_icon_name: string;
  iconColor: string;
  secondaryText?: string;
  disabled?: boolean;
}

export default function CreateScreen() {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(400);

  useEffect(() => {
    console.log('Create modal opened');
    // Animate in
    backdropOpacity.value = withTiming(1, { duration: 300 });
    sheetTranslateY.value = withSpring(0, {
      damping: 20,
      stiffness: 90,
    });
  }, [backdropOpacity, sheetTranslateY]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log('Toast:', message);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const closeModal = () => {
    console.log('Closing create modal');
    // Animate out
    backdropOpacity.value = withTiming(0, { duration: 200 });
    sheetTranslateY.value = withTiming(400, { duration: 200 }, () => {
      runOnJS(router.back)();
    });
  };

  const handleRecordVideo = () => {
    console.log('User tapped Record Video');
    closeModal();
    // Navigate to VideoRecorder component
    setTimeout(() => {
      router.push('/camera');
    }, 250);
  };

  const handleUploadFromGallery = async () => {
    console.log('User tapped Upload from Gallery');
    
    try {
      // Close modal first
      backdropOpacity.value = withTiming(0, { duration: 200 });
      sheetTranslateY.value = withTiming(400, { duration: 200 });

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Se requieren permisos para acceder a la galería', 'error');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        console.log('User cancelled video selection');
        // Reopen modal if cancelled
        setTimeout(() => {
          backdropOpacity.value = withTiming(1, { duration: 300 });
          sheetTranslateY.value = withSpring(0, {
            damping: 20,
            stiffness: 90,
          });
        }, 250);
        return;
      }

      const asset = result.assets[0];
      console.log('Video selected from gallery:', asset.uri);

      // Navigate to VideoEditor with the selected video
      router.replace({
        pathname: '/video-editor',
        params: { videoUri: asset.uri },
      });
    } catch (error) {
      console.error('Error picking video from gallery:', error);
      showToast('Error al seleccionar video', 'error');
      
      // Reopen modal on error
      setTimeout(() => {
        backdropOpacity.value = withTiming(1, { duration: 300 });
        sheetTranslateY.value = withSpring(0, {
          damping: 20,
          stiffness: 90,
        });
      }, 250);
    }
  };

  const handleGoLive = () => {
    console.log('User tapped Go Live (disabled)');
    showToast('Go Live feature coming soon!', 'info');
  };

  const handleCancel = () => {
    console.log('User tapped Cancel');
    closeModal();
  };

  const options: CreateOption[] = [
    {
      id: 'record',
      label: 'Record Video',
      emoji: '📹',
      ios_icon_name: 'video.fill',
      android_material_icon_name: 'videocam',
      iconColor: colors.secondary, // Coral #FF6B6B
      disabled: false,
    },
    {
      id: 'upload',
      label: 'Upload from Gallery',
      emoji: '🖼️',
      ios_icon_name: 'photo.fill',
      android_material_icon_name: 'image',
      iconColor: colors.primary, // Purple #8B5CF6
      disabled: false,
    },
    {
      id: 'live',
      label: 'Go Live',
      emoji: '🎵',
      ios_icon_name: 'dot.radiowaves.left.and.right',
      android_material_icon_name: 'radio',
      iconColor: '#666', // Gray (disabled)
      secondaryText: 'Coming soon',
      disabled: true,
    },
    {
      id: 'cancel',
      label: 'Cancel',
      emoji: '❌',
      ios_icon_name: 'xmark',
      android_material_icon_name: 'close',
      iconColor: colors.text, // White
      disabled: false,
    },
  ];

  const handleOptionPress = (option: CreateOption) => {
    if (option.disabled) {
      handleGoLive();
      return;
    }

    switch (option.id) {
      case 'record':
        handleRecordVideo();
        break;
      case 'upload':
        handleUploadFromGallery();
        break;
      case 'live':
        handleGoLive();
        break;
      case 'cancel':
        handleCancel();
        break;
      default:
        console.log('Unknown option:', option.id);
    }
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'fade',
        }}
      />

      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={closeModal}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        {/* Bottom Sheet */}
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Options */}
          {options.map((option, index) => {
            const isLastOption = index === options.length - 1;
            const showBorder = !isLastOption;

            return (
              <React.Fragment key={option.id}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    option.disabled && styles.optionDisabled,
                  ]}
                  onPress={() => handleOptionPress(option)}
                  activeOpacity={0.7}
                  disabled={option.disabled && option.id !== 'live'}
                >
                  {/* Icon */}
                  <View style={styles.optionIcon}>
                    <IconSymbol
                      ios_icon_name={option.ios_icon_name}
                      android_material_icon_name={option.android_material_icon_name}
                      size={28}
                      color={option.iconColor}
                    />
                  </View>

                  {/* Label and Secondary Text */}
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {option.secondaryText && (
                      <Text style={styles.optionSecondaryText}>
                        {option.secondaryText}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Border */}
                {showBorder && <View style={styles.optionBorder} />}
              </React.Fragment>
            );
          })}
        </Animated.View>
      </View>

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  sheet: {
    backgroundColor: colors.background, // Dark Carbon #0F0F0F
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Safe area padding
    paddingTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  optionSecondaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionBorder: {
    height: 1,
    backgroundColor: '#333',
    marginLeft: 76, // Align with text (44 icon + 16 margin + 16 padding)
  },
});
