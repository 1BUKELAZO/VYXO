
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/contexts/AuthContext';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_DURATION = 3; // 3 seconds
const MAX_DURATION = 60; // 60 seconds

export interface VideoUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export interface VideoInfo {
  uri: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  thumbnailUri?: string;
}

export function useVideoUpload() {
  const { user } = useAuth();
  const [state, setState] = useState<VideoUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  /**
   * Pick video from gallery
   * Validates duration (3-60s) and size (max 100MB)
   */
  const pickFromGallery = useCallback(async (): Promise<VideoInfo | null> => {
    try {
      console.log('User picking video from gallery...');

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setState((prev) => ({
          ...prev,
          error: 'Se requieren permisos para acceder a la galería',
        }));
        return null;
      }

      // Launch picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: MAX_DURATION,
      });

      if (result.canceled) {
        console.log('User cancelled gallery picker');
        return null;
      }

      const video = result.assets[0];
      console.log('Video picked from gallery:', video);

      // Validate duration
      if (video.duration) {
        const durationInSeconds = video.duration / 1000;
        if (durationInSeconds < MIN_DURATION) {
          setState((prev) => ({
            ...prev,
            error: `El video debe durar al menos ${MIN_DURATION} segundos`,
          }));
          return null;
        }
        if (durationInSeconds > MAX_DURATION) {
          setState((prev) => ({
            ...prev,
            error: `El video no puede durar más de ${MAX_DURATION} segundos`,
          }));
          return null;
        }
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(video.uri);
      if (!fileInfo.exists) {
        setState((prev) => ({
          ...prev,
          error: 'El archivo de video no existe',
        }));
        return null;
      }

      // Validate size
      const fileSize = fileInfo.size || 0;
      if (fileSize > MAX_VIDEO_SIZE) {
        setState((prev) => ({
          ...prev,
          error: `El video no puede superar los ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`,
        }));
        return null;
      }

      // Generate thumbnail
      const thumbnailUri = await generateThumbnail(video.uri);

      return {
        uri: video.uri,
        duration: video.duration ? video.duration / 1000 : 0,
        width: video.width || 0,
        height: video.height || 0,
        size: fileSize,
        thumbnailUri,
      };
    } catch (error) {
      console.error('Error picking video from gallery:', error);
      setState((prev) => ({
        ...prev,
        error: 'Error al seleccionar el video',
      }));
      return null;
    }
  }, []);

  /**
   * Record video from camera
   * Returns video URI to be used with VideoRecorder component
   */
  const recordFromCamera = useCallback(async (): Promise<boolean> => {
    try {
      console.log('User requesting camera permissions...');

      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setState((prev) => ({
          ...prev,
          error: 'Se requieren permisos para acceder a la cámara',
        }));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      setState((prev) => ({
        ...prev,
        error: 'Error al solicitar permisos de cámara',
      }));
      return false;
    }
  }, []);

  /**
   * Compress video to 720p
   * Note: Video compression is handled by Mux on upload
   * This is a placeholder for future client-side compression if needed
   */
  const compressVideo = useCallback(async (videoUri: string): Promise<string> => {
    console.log('Video compression handled by Mux on upload');
    // Return original URI - Mux will handle compression
    return videoUri;
  }, []);

  /**
   * Generate thumbnail from video
   */
  const generateThumbnail = useCallback(async (videoUri: string): Promise<string | undefined> => {
    try {
      console.log('Generating thumbnail for video:', videoUri);

      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // 1 second into the video
        quality: 0.8,
      });

      console.log('Thumbnail generated:', uri);
      return uri;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return undefined;
    }
  }, []);

  /**
   * Upload video to Supabase Storage
   * Note: This is now handled by useMuxUpload hook
   * This function is kept for backward compatibility
   */
  const uploadToSupabase = useCallback(
    async (
      videoUri: string,
      thumbnailUri?: string,
      onProgress?: (progress: number) => void
    ): Promise<{ videoUrl: string; thumbnailUrl?: string } | null> => {
      console.log('Upload to Supabase is now handled by useMuxUpload hook');
      console.log('Please use useMuxUpload.uploadVideo() instead');
      
      setState((prev) => ({
        ...prev,
        error: 'Use useMuxUpload hook for video uploads',
      }));
      
      return null;
    },
    []
  );

  return {
    state,
    pickFromGallery,
    recordFromCamera,
    compressVideo,
    generateThumbnail,
    uploadToSupabase,
  };
}
