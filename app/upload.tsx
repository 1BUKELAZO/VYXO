// app/upload.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useVideoUpload, VideoInfo } from '@/hooks/useVideoUpload';
import { useMuxUpload, VideoMetadata } from '@/hooks/useMuxUpload';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

export default function UploadScreen() {
  // Hooks
  const { 
    state: pickState, 
    pickFromGallery, 
    generateThumbnail 
  } = useVideoUpload();
  
  const { 
    uploadVideo, 
    cancelUpload, 
    state: uploadState 
  } = useMuxUpload();

  // Local state
  const [selectedVideo, setSelectedVideo] = useState<VideoInfo | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'creating_upload' || uploadState.status === 'processing';

  const handlePickVideo = async () => {
    const video = await pickFromGallery();
    if (video) {
      setSelectedVideo(video);
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) {
      Alert.alert('Error', 'Por favor selecciona un video primero');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción para el video');
      return;
    }

    // Parse hashtags
    const hashtagArray = hashtags
      .split(/[\s,]+/)
      .map(tag => tag.trim().replace(/^#/, ''))
      .filter(tag => tag.length > 0);

    const metadata: VideoMetadata = {
      caption: caption.trim(),
      hashtags: hashtagArray,
      mentions: [],
      allowComments,
      allowDuet,
      allowStitch,
      visibility,
    };

    const videoFile = {
      uri: selectedVideo.uri,
      type: 'video/mp4',
      size: selectedVideo.size,
    };

    try {
      const videoId = await uploadVideo(videoFile, metadata);
      
      Alert.alert(
        '¡Éxito!',
        'Tu video se ha subido correctamente y está siendo procesado.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset state
              setSelectedVideo(null);
              setCaption('');
              setHashtags('');
              router.push('/(tabs)');
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.message || 'No se pudo subir el video. Intenta de nuevo.'
      );
    }
  };

  const handleCancel = () => {
    if (isUploading) {
      cancelUpload();
    } else {
      router.back();
    }
  };

  // Render uploading state
  if (isUploading) {
    return (
      <View style={styles.container}>
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={colors.coral} />
          <Text style={styles.uploadingTitle}>
            {uploadState.status === 'creating_upload' && 'Preparando subida...'}
            {uploadState.status === 'uploading' && 'Subiendo video...'}
            {uploadState.status === 'processing' && 'Procesando video...'}
          </Text>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${uploadState.progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{uploadState.progress}%</Text>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon="close"
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo Video</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Video Selector */}
        <TouchableOpacity 
          style={styles.videoSelector} 
          onPress={handlePickVideo}
        >
          {selectedVideo ? (
            <View style={styles.videoPreview}>
              {selectedVideo.thumbnailUri ? (
                <Image 
                  source={{ uri: selectedVideo.thumbnailUri }} 
                  style={styles.thumbnail}
                />
              ) : (
                <IconSymbol
                  ios_icon_name="video.fill"
                  android_material_icon="videocam"
                  size={48}
                  color={colors.coral}
                />
              )}
              <View style={styles.videoOverlay}>
                <Text style={styles.videoDuration}>
                  {Math.floor(selectedVideo.duration)}s
                </Text>
              </View>
              <Text style={styles.changeVideo}>Cambiar video</Text>
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <IconSymbol
                ios_icon_name="plus.circle"
                android_material_icon="add-circle"
                size={48}
                color={colors.textTertiary}
              />
              <Text style={styles.placeholderText}>Seleccionar video</Text>
              <Text style={styles.placeholderSubtext}>Duración: 3-60 segundos</Text>
            </View>
          )}
        </TouchableOpacity>

        {pickState.error && (
          <Text style={styles.errorText}>{pickState.error}</Text>
        )}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={caption}
              onChangeText={setCaption}
              placeholder="Describe tu video..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Hashtags (separados por espacios)</Text>
            <TextInput
              style={styles.input}
              value={hashtags}
              onChangeText={setHashtags}
              placeholder="#comedia #baile #tutorial"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Privacy Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacidad</Text>
            <View style={styles.privacyOptions}>
              {(['public', 'friends', 'private'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.privacyOption,
                    visibility === option && styles.privacyOptionActive
                  ]}
                  onPress={() => setVisibility(option)}
                >
                  <Text style={[
                    styles.privacyOptionText,
                    visibility === option && styles.privacyOptionTextActive
                  ]}>
                    {option === 'public' ? 'Público' : option === 'friends' ? 'Amigos' : 'Privado'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Opciones</Text>
            
            <View style={styles.option}>
              <Text style={styles.optionText}>Permitir comentarios</Text>
              <TouchableOpacity 
                style={[styles.toggle, allowComments && styles.toggleActive]}
                onPress={() => setAllowComments(!allowComments)}
              >
                <View style={[styles.toggleKnob, allowComments && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.option}>
              <Text style={styles.optionText}>Permitir duetos</Text>
              <TouchableOpacity 
                style={[styles.toggle, allowDuet && styles.toggleActive]}
                onPress={() => setAllowDuet(!allowDuet)}
              >
                <View style={[styles.toggleKnob, allowDuet && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.option}>
              <Text style={styles.optionText}>Permitir stitches</Text>
              <TouchableOpacity 
                style={[styles.toggle, allowStitch && styles.toggleActive]}
                onPress={() => setAllowStitch(!allowStitch)}
              >
                <View style={[styles.toggleKnob, allowStitch && styles.toggleKnobActive]} />
              </TouchableOpacity>
            </View>
          </View>

          {uploadState.error && (
            <Text style={styles.errorText}>{uploadState.error}</Text>
          )}

          {/* Upload Button */}
          <TouchableOpacity
            style={[
              styles.uploadButton,
              (!selectedVideo || !caption.trim()) && styles.uploadButtonDisabled
            ]}
            onPress={handleUpload}
            disabled={!selectedVideo || !caption.trim() || isUploading}
          >
            <Text style={styles.uploadButtonText}>Publicar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  videoSelector: {
    width: '100%',
    height: 200,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textTertiary,
    marginTop: 12,
    fontSize: 16,
  },
  placeholderSubtext: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 12,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoDuration: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  changeVideo: {
    color: colors.coral,
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  privacyOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  privacyOptionActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  privacyOptionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  privacyOptionTextActive: {
    color: '#FFFFFF',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: colors.border,
    borderRadius: 14,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.coral,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: colors.coral,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  uploadButtonDisabled: {
    backgroundColor: colors.border,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  uploadingTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.coral,
    borderRadius: 4,
  },
  progressText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  cancelButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
});