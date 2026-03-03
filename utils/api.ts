// utils/api.ts - REEMPLAZAR TODO EL ARCHIVO CON ESTO
import * as SecureStore from 'expo-secure-store';

// 🔧 FIX: URL base SIN el /api al final y SIN espacios
const API_URL = 'https://vyxo-backend.onrender.com';

// 🔧 NUEVO: Exportar BACKEND_URL para hooks como useMuxUpload
export const BACKEND_URL = 'https://vyxo-backend.onrender.com';

// Token storage keys
const ACCESS_TOKEN_KEY = 'vyxo_access_token';
const REFRESH_TOKEN_KEY = 'vyxo_refresh_token';

// Interfaces
interface Tokens {
  accessToken: string | null;
  refreshToken: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string;
  emailVerified?: boolean;
}

// Guardar tokens en SecureStore
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    console.log('✅ Tokens guardados en SecureStore');
  } catch (error) {
    console.error('❌ Error guardando tokens:', error);
    throw error;
  }
}

// Obtener tokens de SecureStore
export async function getTokens(): Promise<Tokens> {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('❌ Error leyendo tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
}

// Limpiar tokens (logout)
export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    console.log('✅ Tokens eliminados');
  } catch (error) {
    console.error('❌ Error eliminando tokens:', error);
  }
}

// Login
export async function login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  // Guardar tokens
  await saveTokens(data.accessToken, data.refreshToken);

  return data;
}

// Register
export async function register(name: string, email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  // Guardar tokens
  await saveTokens(data.accessToken, data.refreshToken);

  return data;
}

// Obtener perfil del usuario
export async function getProfile(): Promise<User> {
  const { accessToken } = await getTokens();

  if (!accessToken) {
    throw new Error('No access token');
  }

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    // Token expirado, intentar refresh
    const newToken = await refreshAccessToken();
    
    const retryResponse = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!retryResponse.ok) {
      throw new Error('Failed to fetch profile after refresh');
    }

    return retryResponse.json();
  }

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}

// Refresh token
export async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = await getTokens();

  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    await clearTokens();
    throw new Error('Session expired');
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
  return data.accessToken;
}

// Logout
export async function logout(): Promise<void> {
  const { refreshToken } = await getTokens();

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      console.log('Logout request failed, clearing locally anyway');
    }
  }

  await clearTokens();
}

// 🔧 Función helper para construir URLs correctamente
function buildUrl(endpoint: string): string {
  // Si es URL completa, usar tal cual
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // Si el endpoint ya empieza con /api/, usarlo directamente con API_URL
  if (endpoint.startsWith('/api/')) {
    return `${API_URL}${endpoint}`;
  }
  
  // Si el endpoint empieza con / pero no tiene /api/, agregar /api
  if (endpoint.startsWith('/')) {
    return `${API_URL}/api${endpoint}`;
  }
  
  // Si no empieza con /, agregar /api/
  return `${API_URL}/api/${endpoint}`;
}

// API call autenticada (para usar en otros servicios)
export async function authenticatedApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const { accessToken } = await getTokens();

  if (!accessToken) {
    throw new Error('Authentication token not found. Please sign in.');
  }

  const url = buildUrl(endpoint);
  
  console.log(`🌐 API Call: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Intentar refresh y reintentar
    const newToken = await refreshAccessToken();
    
    const retryResponse = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!retryResponse.ok) {
      const error = await retryResponse.json();
      throw new Error(error.message || 'Request failed after refresh');
    }

    return retryResponse.json();
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Verificar si hay sesión activa
export async function isAuthenticated(): Promise<boolean> {
  const { accessToken } = await getTokens();
  return !!accessToken;
}

// ============================================================
// FUNCIONES ADICIONALES PARA COMPATIBILIDAD CON COMPONENTES
// ============================================================

/**
 * GET request helper
 */
export const apiGet = async <T = any>(endpoint: string): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "GET" });
};

/**
 * POST request helper
 */
export const apiPost = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * PUT request helper
 */
export const apiPut = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * PATCH request helper
 */
export const apiPatch = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * DELETE request helper
 */
export const apiDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return authenticatedApiCall(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated GET request
 */
export const authenticatedGet = async <T = any>(endpoint: string): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "GET" });
};

/**
 * Authenticated POST request
 */
export const authenticatedPost = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated PUT request
 */
export const authenticatedPut = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated PATCH request
 */
export const authenticatedPatch = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated DELETE request
 */
export const authenticatedDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return authenticatedApiCall(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

/**
 * Public GET request (no authentication required)
 * 🔧 NUEVO: Para endpoints públicos como el feed
 */
export const publicGet = async <T = any>(endpoint: string): Promise<T> => {
  const url = buildUrl(endpoint);
  
  console.log(`🌐 Public API Call: ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

// ============================================================
// NUEVAS FUNCIONES PARA HOOKS
// ============================================================

/**
 * Get bearer token for API calls
 * Used by hooks like useMuxUpload
 */
export async function getBearerToken(): Promise<string | null> {
  const { accessToken } = await getTokens();
  return accessToken;
}