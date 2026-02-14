
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Dimensions,
  Modal as RNModal,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useMuxUpload, VideoMetadata, VideoFile } from '@/hooks/useMuxUpload';
import { saveHashtags } from '@/hooks/useHashtags';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from '@/components/ui/Toast';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';

const { width, height } = Dimensions.get('window');

interface VideoEditorProps {
  videoUri: string;
  onComplete?: () => void;
}

type UploadStage = 'editing' | 'uploading' | 'processing' | 'complete' | 'error';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  videoContainer: {
    width: '100%',
    height: height * 0.7,
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  captionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: '#999999',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  characterCountLimit: {
    color: colors.coral,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  toggleDescription: {
    color: '#999999',
    fontSize: 12,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.purple,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    backgroundColor: colors.dark,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    minWidth: 300,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.turquoise,
    borderRadius: 4,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  modalButton: {
    backgroundColor: colors.purple,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    color: colors.coral,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
  },
  errorButtonPrimary: {
    backgroundColor: colors.purple,
  },
  errorButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  replyIndicatorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  replyIndicatorText: {
    color: colors.purple,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default function VideoEditor({ videoUri, onComplete }: VideoEditorProps) {
  const params = useLocalSearchParams<{
    replyToVideoId?: string;
    replyToUsername?: string;
    duetWithId?: string;
    isDuet?: string;
    isStitch?: string;
    duetLayout?: string;
  }>();
  
  const isReplyMode = !!params.replyToVideoId;
  const replyToUsername = params.replyToUsername || 'user';
  
  const isDuetMode = !!params.duetWithId;
  const duetWithId = params.duetWithId;
  const isDuet = params.isDuet === 'true';
  const isStitch = params.isStitch === 'true';
  const duetLayout = (params.duetLayout as 'side' | 'top-bottom') || 'side';
  
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    return () => {
      player.release();
    };
  }, [player]);

  const { uploadVideo, cancelUpload, retryUpload, state } = useMuxUpload();

  const [caption, setCaption] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuets, setAllowDuets] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [uploadStage, setUploadStage] = useState<UploadStage>('editing');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (state.status === 'uploading' || state.status === 'creating_upload') {
      setUploadStage('uploading');
    } else if (state.status === 'processing') {
      setUploadStage('processing');
    } else if (state.status === 'ready') {
      setUploadStage('complete');
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          router.replace({
            pathname: '/(tabs)/(home)',
            params: { refresh: 'true' },
          });
        }
      }, 2000);
    } else if (state.status === 'error') {
      setUploadStage('error');
    }
  }, [state.status, state.error, onComplete]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    const hashtags = matches ? matches.map((tag) => tag.slice(1).toLowerCase()) : [];
    return Array.from(new Set(hashtags));
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@[\w\u00C0-\u017F]+/g;
    const matches = text.match(mentionRegex);
    const mentions = matches ? matches.map((mention) => mention.slice(1)) : [];
    return mentions;
  };

  const handlePost = async () => {
    console.log('User tapped Post button');

    if (caption.length > 150) {
      showToast('El caption no puede superar los 150 caracteres', 'error');
      return;
    }

    try {
      const hashtags = extractHashtags(caption);
      const mentions = extractMentions(caption);

      const metadata: VideoMetadata & {
        duetWithId?: string;
        isDuet?: boolean;
        isStitch?: boolean;
        duetLayout?: 'side' | 'top-bottom';
      } = {
        caption,
        hashtags,
        mentions,
        allowComments,
        allowDuet: allowDuets,
        allowStitch,
        visibility: 'public',
        ...(isDuetMode && {
          duetWithId,
          isDuet,
          isStitch,
          duetLayout,
        }),
      };

      const file: VideoFile = {
        uri: videoUri,
        type: 'video/mp4',
        size: 0,
      };

      console.log('Uploading video with metadata:', metadata);

      const videoId = await uploadVideo(file, metadata);
      
      if (isReplyMode && videoId && params.replyToVideoId) {
        console.log('Linking video reply:', videoId, 'to parent:', params.replyToVideoId);
        try {
          const response = await authenticatedPost(
            `/api/videos/${params.replyToVideoId}/reply`,
            { replyVideoId: videoId }
          );
          console.log('Video reply linked successfully:', response);
        } catch (replyError) {
          console.error('Failed to link video reply:', replyError);
          showToast('Video subido pero no se pudo vincular como respuesta', 'error');
        }
      }
      
      if (hashtags.length > 0 && videoId) {
        console.log('Saving hashtags for video:', videoId, hashtags);
        try {
          await saveHashtags(videoId, hashtags);
        } catch (hashtagError) {
          console.error('Failed to save hashtags, but video uploaded:', hashtagError);
        }
      }
    } catch (error) {
      console.error('Error posting video:', error);
      showToast('Error al publicar el video', 'error');
    }
  };

  const handleCancelUpload = () => {
    console.log('User cancelled upload');
    cancelUpload();
    setUploadStage('editing');
  };

  const handleBack = () => {
    if (uploadStage === 'uploading' || uploadStage === 'processing') {
      showToast('Cancelando subida...', 'info');
      cancelUpload();
    }
    router.back();
  };

  const captionLength = caption.length;
  const captionLimitReached = captionLength > 150;

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleBack}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isReplyMode && (
            <View style={styles.replyIndicatorBanner}>
              <IconSymbol
                ios_icon_name="arrowshape.turn.up.left"
                android_material_icon_name="reply"
                size={18}
                color={colors.purple}
              />
              <Text style={styles.replyIndicatorText}>
                Replying to @{replyToUsername}
              </Text>
            </View>
          )}
          
          {isDuetMode && (
            <View style={styles.replyIndicatorBanner}>
              <IconSymbol
                ios_icon_name="person.2"
                android_material_icon_name="group"
                size={18}
                color={colors.turquoise}
              />
              <Text style={[styles.replyIndicatorText, { color: colors.turquoise }]}>
                {isDuet ? 'Duet' : 'Stitch'} • {duetLayout === 'side' ? 'Side by Side' : 'Top & Bottom'}
              </Text>
            </View>
          )}
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Caption</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Escribe un caption... #hashtags @menciones"
              placeholderTextColor="#666666"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={150}
            />
            <Text
              style={[
                styles.characterCount,
                captionLimitReached && styles.characterCountLimit,
              ]}
            >
              {captionLength} / 150
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuración</Text>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Permitir comentarios</Text>
                <Text style={styles.toggleDescription}>
                  Los usuarios pueden comentar en tu video
                </Text>
              </View>
              <Switch
                value={allowComments}
                onValueChange={setAllowComments}
                trackColor={{ false: '#3e3e3e', true: colors.purple }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Permitir duetos</Text>
                <Text style={styles.toggleDescription}>
                  Los usuarios pueden hacer duetos con tu video
                </Text>
              </View>
              <Switch
                value={allowDuets}
                onValueChange={setAllowDuets}
                trackColor={{ false: '#3e3e3e', true: colors.purple }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Permitir stitch</Text>
                <Text style={styles.toggleDescription}>
                  Los usuarios pueden hacer stitch con tu video
                </Text>
              </View>
              <Switch
                value={allowStitch}
                onValueChange={setAllowStitch}
                trackColor={{ false: '#3e3e3e', true: colors.purple }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleBack}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handlePost}
              disabled={captionLimitReached}
            >
              <Text style={styles.buttonText}>Publicar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <RNModal
        visible={uploadStage === 'uploading' || uploadStage === 'processing'}
        transparent
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {uploadStage === 'uploading' ? 'Subiendo video...' : 'Procesando video...'}
            </Text>
            <Text style={styles.modalMessage}>
              {uploadStage === 'uploading'
                ? 'Tu video se está subiendo a VYXO'
                : 'Mux está procesando tu video'}
            </Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${state.progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{state.progress}%</Text>
            </View>

            {uploadStage === 'uploading' && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleCancelUpload}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </RNModal>

      <RNModal
        visible={uploadStage === 'complete'}
        transparent
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={styles.modalContent}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={64}
              color={colors.turquoise}
            />
            <Text style={[styles.modalTitle, { marginTop: 16 }]}>
              ¡Video publicado!
            </Text>
            <Text style={styles.modalMessage}>
              Tu video se está procesando y estará disponible pronto
            </Text>
          </View>
        </View>
      </RNModal>

      <RNModal
        visible={uploadStage === 'error'}
        transparent
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.errorContainer}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="error"
                size={64}
                color={colors.coral}
                style={styles.errorIcon}
              />
              <Text style={styles.errorTitle}>Error al subir video</Text>
              <Text style={styles.errorMessage}>
                {state.error || 'Ocurrió un error al subir tu video'}
              </Text>

              <View style={styles.errorButtons}>
                <TouchableOpacity
                  style={[styles.errorButton, styles.errorButtonSecondary]}
                  onPress={() => {
                    setUploadStage('editing');
                    router.back();
                  }}
                >
                  <Text style={styles.modalButtonText}>Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.errorButton, styles.errorButtonPrimary]}
                  onPress={() => {
                    setUploadStage('editing');
                    retryUpload();
                  }}
                >
                  <Text style={styles.modalButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </RNModal>

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
