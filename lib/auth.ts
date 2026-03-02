import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL = "https://vyxo-backend.onrender.com/api";

// Nuevas claves (compatibles con lib/api.ts)
export const ACCESS_TOKEN_KEY = 'vyxo_access_token';
export const REFRESH_TOKEN_KEY = 'vyxo_refresh_token';

// Clave vieja (para compatibilidad temporal)
export const BEARER_TOKEN_KEY = "vyxo_bearer_token";

// Helper para obtener access token (usado por utils/api.ts)
export async function getBearerToken(): Promise<string | null> {
  // Primero intentar nueva clave
  if (Platform.OS === "web") {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(BEARER_TOKEN_KEY);
  } else {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY) || await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
  }
}

// Helper para guardar token (compatibilidad)
export async function setBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(BEARER_TOKEN_KEY, token); // Compatibilidad vieja
  } else {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token); // Compatibilidad vieja
  }
}

// Limpiar todos los tokens
export async function clearAuthTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

// Re-exportar funciones de lib/api.ts para compatibilidad
export { API_URL };