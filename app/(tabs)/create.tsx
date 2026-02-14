
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import Toast from '@/components/ui/Toast';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 400,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    color: '#999999',
    fontSize: 14,
  },
  chevron: {
    marginLeft: 8,
  },
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
});

export default function CreateScreen() {
  const { pickFromGallery, recordFromCamera } = useVideoUpload();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleRecord = async () => {
    console.log('User tapped Record Video');
    
    const hasPermission = await recordFromCamera();
    
    if (hasPermission) {
      router.push('/camera');
    } else {
      showToast('Se requieren permisos de cámara', 'error');
    }
  };

  const handleUpload = async () => {
    console.log('User tapped Upload Video');
    
    const videoInfo = await pickFromGallery();
    
    if (videoInfo) {
      console.log('Video selected from gallery:', videoInfo);
      
      router.push({
        pathname: '/video-editor',
        params: { videoUri: videoInfo.uri },
      });
    }
  };

  const handleLive = () => {
    console.log('User tapped Go Live');
    router.push('/live/start');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Crear contenido</Text>

        <View style={styles.optionsContainer}>
          {/* Record Video */}
          <TouchableOpacity style={styles.optionButton} onPress={handleRecord}>
            <View style={[styles.optionIconContainer, { backgroundColor: colors.coral }]}>
              <IconSymbol
                ios_icon_name="video.fill"
                android_material_icon_name="videocam"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Grabar video</Text>
              <Text style={styles.optionDescription}>
                Graba un video de 3-60 segundos
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color="#666666"
              style={styles.chevron}
            />
          </TouchableOpacity>

          {/* Upload Video */}
          <TouchableOpacity style={styles.optionButton} onPress={handleUpload}>
            <View style={[styles.optionIconContainer, { backgroundColor: colors.purple }]}>
              <IconSymbol
                ios_icon_name="photo.on.rectangle"
                android_material_icon_name="photo-library"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Subir video</Text>
              <Text style={styles.optionDescription}>
                Selecciona un video de tu galería
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color="#666666"
              style={styles.chevron}
            />
          </TouchableOpacity>

          {/* Go Live - NOW ACTIVE */}
          <TouchableOpacity style={styles.optionButton} onPress={handleLive}>
            <View style={[styles.optionIconContainer, { backgroundColor: colors.turquoise }]}>
              <IconSymbol
                ios_icon_name="antenna.radiowaves.left.and.right"
                android_material_icon_name="sensors"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Transmitir en vivo</Text>
              <Text style={styles.optionDescription}>
                Inicia una transmisión en vivo
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color="#666666"
              style={styles.chevron}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast */}
      <View style={styles.toastContainer}>
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onHide={() => setToastVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}
