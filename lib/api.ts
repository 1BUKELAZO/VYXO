import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://vyxo-backend.onrender.com/api';

// Token keys
const ACCESS_TOKEN_KEY = 'vyxo_access_token';
const REFRESH_TOKEN_KEY = 'vyxo_refresh_token';

// Interfaces
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string;
  emailVerified?: boolean;
}

// Guardar tokens
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    console.log('✅ Tokens guardados');
  } catch (error) {
    console.error('❌ Error guardando tokens:', error);
    throw error;
  }
}

// Obtener tokens
export async function getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  try {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    console.log('🔑 getTokens - accessToken exists:', !!accessToken);
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('❌ Error leyendo tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
}

// Limpiar tokens
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
  console.log('🔐 Login - calling:', `${API_URL}/auth/login`);
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  console.log('🔐 Login - response status:', response.status);

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Login failed');
  }

  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

// Register
export async function register(name: string, email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  console.log('📝 Register - calling:', `${API_URL}/auth/register`);
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  console.log('📝 Register - response status:', response.status);

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Registration failed');
  }

  await saveTokens(data.accessToken, data.refreshToken);
  return data;
}

// Get Profile
export async function getProfile(): Promise<User> {
  const { accessToken } = await getTokens();
  
  console.log('👤 getProfile - token exists:', !!accessToken);
  
  if (!accessToken) {
    throw new Error('No access token');
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  console.log('👤 getProfile - response status:', response.status);

  if (response.status === 401) {
    console.log('🔄 Token expired, refreshing...');
    const newToken = await refreshAccessToken();
    
    // Retry with new token
    const retryResponse = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('👤 getProfile retry - response status:', retryResponse.status);
    
    if (!retryResponse.ok) {
      const errorText = await retryResponse.text();
      console.error('👤 getProfile retry - error:', errorText);
      throw new Error('Failed to get profile after refresh');
    }
    
    return retryResponse.json();
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('👤 getProfile - error:', errorText);
    throw new Error('Failed to get profile');
  }
  
  return response.json();
}

// Refresh Token
export async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = await getTokens();
  
  console.log('🔄 refreshAccessToken - refreshToken exists:', !!refreshToken);
  
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  
  console.log('🔄 refreshAccessToken - response status:', response.status);

  const data = await response.json();
  
  if (!response.ok) {
    console.error('🔄 refreshAccessToken - error:', data);
    await clearTokens();
    throw new Error(data.message || data.error || 'Session expired');
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
  console.log('🔄 refreshAccessToken - new token saved');
  return data.accessToken;
}

// Logout
export async function logout(): Promise<void> {
  const { refreshToken } = await getTokens();

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
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

// API call autenticada
export async function authenticatedApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const { accessToken } = await getTokens();

  if (!accessToken) {
    throw new Error('Authentication token not found. Please sign in.');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
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
// FUNCIONES ADICIONALES PARA COMPATIBILIDAD
// ============================================================

export const apiGet = async <T = any>(endpoint: string): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "GET" });
};

export const apiPost = async <T = any>(endpoint: string, data: any): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "POST", body: JSON.stringify(data) });
};

export const apiPut = async <T = any>(endpoint: string, data: any): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "PUT", body: JSON.stringify(data) });
};

export const apiPatch = async <T = any>(endpoint: string, data: any): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "PATCH", body: JSON.stringify(data) });
};

export const apiDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "DELETE", body: JSON.stringify(data) });
};

export const authenticatedGet = async <T = any>(endpoint: string): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "GET" });
};

export const authenticatedPost = async <T = any>(endpoint: string, data: any): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "POST", body: JSON.stringify(data) });
};

export const authenticatedPut = async <T = any>(endpoint: string, data: any): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "PUT", body: JSON.stringify(data) });
};

export const authenticatedPatch = async <T = any>(endpoint: string, data: any): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "PATCH", body: JSON.stringify(data) });
};

export const authenticatedDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return authenticatedApiCall(endpoint, { method: "DELETE", body: JSON.stringify(data) });
};