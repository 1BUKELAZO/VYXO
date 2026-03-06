import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL, getBearerToken } from '@/utils/api';
// ✅ CORREGIDO: Usar API legacy de expo-file-system
import * as FileSystem from 'expo-file-system/legacy';

// Upload state interface
export interface UploadState {
  status: 'idle' | 'creating_upload' | 'uploading' | 'processing' | 'ready' | 'error';
  progress: number; // 0-100
  muxUploadId: string | null;
  videoId: string | null;
  error: string | null;
}

// Video metadata interface
export interface VideoMetadata {
  caption: string;
  hashtags: string[];
  mentions: string[];
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  visibility: 'public' | 'friends' | 'private';
  soundId?: string; // Optional sound ID for the video
  duetWithId?: string; // Original video ID for duets/stitches
  isDuet?: boolean; // Is this a duet?
  isStitch?: boolean; // Is this a stitch?
  duetLayout?: 'side' | 'top-bottom'; // Layout for duets
}

// File interface
export interface VideoFile {
  uri: string;
  type: string;
  size: number;
}

// Hook return interface
export interface UseMuxUploadReturn {
  uploadVideo: (file: VideoFile, metadata: VideoMetadata) => Promise<string>;
  cancelUpload: () => void;
  retryUpload: () => void;
  state: UploadState;
}

/**
 * Custom hook for Mux video upload functionality in VYXO
 * Handles direct upload to Mux, progress tracking, and video record creation
 * 
 * Workflow:
 * 1. Call backend to create Mux direct upload URL
 * 2. Upload video file directly to Mux with progress tracking
 * 3. Create video record in backend database
 * 4. Mux webhooks will update video status to 'processing' then 'ready'
 */
export function useMuxUpload(): UseMuxUploadReturn {
  const { user } = useAuth();
  
  // State
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    muxUploadId: null,
    videoId: null,
    error: null,
  });

  // Refs for retry functionality
  const lastFileRef = useRef<VideoFile | null>(null);
  const lastMetadataRef = useRef<VideoMetadata | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<UploadState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Upload video to Mux
   * Returns the created video ID
   */
  const uploadVideo = useCallback(async (
    file: VideoFile,
    metadata: VideoMetadata
  ): Promise<string> => {
    console.log('User initiated Mux video upload:', { file, metadata });

    // Validate user authentication
    if (!user) {
      const errorMsg = 'Debes iniciar sesión para subir videos';
      console.error(errorMsg);
      updateState({
        status: 'error',
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }

    // Validate file
    if (!file.uri) {
      const errorMsg = 'No se proporcionó un archivo de video válido';
      console.error(errorMsg);
      updateState({
        status: 'error',
        error: errorMsg,
      });
      throw new Error(errorMsg);
    }

    // Store for retry
    lastFileRef.current = file;
    lastMetadataRef.current = metadata;

    try {
      // Reset state
      updateState({
        status: 'creating_upload',
        progress: 0,
        muxUploadId: null,
        videoId: null,
        error: null,
      });

      // Get bearer token with better error handling
      const token = await getBearerToken();
      console.log('Token obtained:', token ? 'YES (length: ' + token.length + ')' : 'NO');
      
      if (!token) {
        throw new Error('No se encontró el token de autenticación. Por favor, cierra sesión y vuelve a iniciar sesión.');
      }

      // Step 1: Create Mux direct upload URL
      console.log('Step 1: Creating Mux upload URL...');
      console.log('Calling backend endpoint:', `${BACKEND_URL}/api/mux/create-upload`);
      updateState({ progress: 5 });

      const createUploadResponse = await fetch(`${BACKEND_URL}/api/mux/create-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          corsOrigin: '*',
        }),
      });

      console.log('Mux create-upload response status:', createUploadResponse.status);

      if (!createUploadResponse.ok) {
        let errorMessage = 'Error al crear la URL de subida de Mux';
        
        try {
          const errorData = await createUploadResponse.json();
          console.error('Mux create-upload error response:', errorData);
          
          // Check for specific error messages
          if (errorData.error) {
            if (errorData.error.includes('not configured')) {
              errorMessage = 'Mux no está configurado. Por favor, configura las variables de entorno MUX_TOKEN_ID, MUX_TOKEN_SECRET y MUX_WEBHOOK_SECRET en el backend.';
            } else if (errorData.error === 'Unauthorized' || createUploadResponse.status === 401) {
              errorMessage = 'Sesión expirada. Por favor, cierra sesión y vuelve a iniciar sesión.';
            } else {
              errorMessage = errorData.error;
            }
          }
        } catch (parseError) {
          const errorText = await createUploadResponse.text();
          console.error('Failed to parse error response:', errorText);
        }
        
        throw new Error(errorMessage);
      }

      const uploadData = await createUploadResponse.json();
      console.log('Mux upload URL created successfully:', { 
        uploadId: uploadData.uploadId, 
        assetId: uploadData.assetId || 'NOT_YET_AVAILABLE' // ← DEBUG: Mostrar si llega o no
      });

      const { uploadUrl, uploadId, assetId } = uploadData;

      // ✅ CORREGIDO: Solo validar uploadUrl y uploadId (assetId es opcional inicialmente)
      if (!uploadUrl || !uploadId) {
        console.error('Invalid response from create-upload:', uploadData);
        throw new Error('Respuesta inválida del servidor al crear la URL de subida');
      }

      updateState({
        status: 'uploading',
        progress: 10,
        muxUploadId: uploadId,
      });

      // Step 2: Upload video file directly to Mux
      console.log('Step 2: Uploadging video to Mux...');
      console.log('Upload URL:', uploadUrl);

      // Use expo-file-system uploadAsync for better progress tracking
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, file.uri, {
        httpMethod: 'PUT',
        uploadType: 0, // 0 = BINARY_CONTENT
        headers: {
          'Content-Type': file.type || 'video/mp4',
        },
      });

      console.log('Mux upload result status:', uploadResult.status);

      if (uploadResult.status !== 200) {
        throw new Error(`Error al subir el video a Mux: ${uploadResult.status}`);
      }

      console.log('Video uploaded to Mux successfully');

      updateState({
        status: 'processing',
        progress: 85,
      });

      // Step 3: Create video record in backend
      console.log('Step 3: Creating video record in backend...');

      // ✅ CORREGIDO: Usar uploadId como fallback si assetId no está disponible
      const muxAssetId = assetId || uploadId;

      const createVideoResponse = await fetch(`${BACKEND_URL}/api/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          muxUploadId: uploadId,
          muxAssetId: muxAssetId, // ← Usar fallback si assetId es null
          caption: metadata.caption,
          hashtags: metadata.hashtags,
          mentions: metadata.mentions,
          allowComments: metadata.allowComments,
          allowDuet: metadata.allowDuet,
          allowStitch: metadata.allowStitch,
          visibility: metadata.visibility,
          soundId: metadata.soundId,
          duetWithId: metadata.duetWithId,
          isDuet: metadata.isDuet,
          isStitch: metadata.isStitch,
          duetLayout: metadata.duetLayout,
        }),
      });

      console.log('Create video record response status:', createVideoResponse.status);

      if (!createVideoResponse.ok) {
        const errorText = await createVideoResponse.text();
        console.error('Failed to create video record:', createVideoResponse.status, errorText);
        throw new Error('Error al crear el registro del video');
      }

      const videoData = await createVideoResponse.json();
      const createdVideoId = videoData.id || videoData.videoId;
      console.log('Video record created successfully:', videoData);

      updateState({
        status: 'ready',
        progress: 100,
        videoId: createdVideoId,
      });

      console.log('Video upload complete - Mux will process the video');
      
      // Clear refs
      lastFileRef.current = null;
      lastMetadataRef.current = null;
      xhrRef.current = null;

      return createdVideoId;
    } catch (err) {
      console.error('Error uploading video to Mux:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al subir el video';
      
      updateState({
        status: 'error',
        error: errorMessage,
      });

      throw err;
    }
  }, [user, updateState]);

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    console.log('User cancelled Mux upload');

    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }

    updateState({
      status: 'idle',
      progress: 0,
      muxUploadId: null,
      videoId: null,
      error: 'Subida cancelada',
    });

    // Clear refs
    lastFileRef.current = null;
    lastMetadataRef.current = null;
  }, [updateState]);

  /**
   * Retry last failed upload
   */
  const retryUpload = useCallback(async () => {
    console.log('User retrying Mux upload');

    if (!lastFileRef.current || !lastMetadataRef.current) {
      console.error('No previous upload to retry');
      updateState({
        status: 'error',
        error: 'No hay subida previa para reintentar',
      });
      return;
    }

    try {
      await uploadVideo(lastFileRef.current, lastMetadataRef.current);
    } catch (err) {
      console.error('Retry upload failed:', err);
    }
  }, [uploadVideo, updateState]);

  return {
    uploadVideo,
    cancelUpload,
    retryUpload,
    state,
  };
}