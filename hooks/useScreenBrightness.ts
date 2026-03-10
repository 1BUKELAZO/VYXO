// hooks/useScreenBrightness.ts
import { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

/**
 * Hook para mantener la pantalla activa y brillante durante la reproducción de video
 * Usa expo-keep-awake (ya incluido en Expo) para prevenir que el sistema reduzca el brillo
 */
export const useScreenBrightness = (tag: string = 'video-player') => {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isActiveRef = useRef(false);

  useEffect(() => {
    // Solo aplicar en Android (en iOS el brillo se maneja diferente)
    if (Platform.OS !== 'android') return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Si la app vuelve a primer plano, reactivar keep-awake
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isActiveRef.current
      ) {
        try {
          activateKeepAwake(tag);
        } catch (e) {
          // Silenciar error si ya está activo
        }
      }
      
      // Si la app va a background, desactivar keep-awake
      if (nextAppState.match(/inactive|background/) && isActiveRef.current) {
        try {
          deactivateKeepAwake(tag);
        } catch (e) {
          // Silenciar error
        }
      }
      
      appStateRef.current = nextAppState;
    };

    // Activar keep-awake al montar
    isActiveRef.current = true;
    try {
      activateKeepAwake(tag);
    } catch (e) {
      console.log('KeepAwake already active');
    }

    // Suscribirse a cambios de estado de la app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isActiveRef.current = false;
      try {
        deactivateKeepAwake(tag);
      } catch (e) {
        // Silenciar error si no estaba activo
      }
      subscription.remove();
    };
  }, [tag]);
};