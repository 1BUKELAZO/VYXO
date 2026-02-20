import crypto from 'crypto';

// Secrets (en producción deben ser variables de entorno)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'vyxo-access-secret-key-2026';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'vyxo-refresh-secret-key-2026';

// Configuración
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutos
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 días

// Interfaces
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// Función para crear JWT manualmente
export function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresIn: string): string {
  const now = Math.floor(Date.now() / 1000); // segundos
  
  // Parsear expiración
  const exp = now + parseExpiration(expiresIn);
  
  const fullPayload = {
    ...payload,
    iat: now,
    exp
  };
  
  // Header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // Codificar partes
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  // Crear firma
  const signature = createSignature(encodedHeader, encodedPayload, secret);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Función para verificar JWT
export function verifyJWT(token: string, secret: string): JWTPayload | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }
    
    // Verificar firma
    const expectedSignature = createSignature(encodedHeader, encodedPayload, secret);
    if (!timingSafeCompare(signature, expectedSignature)) {
      return null;
    }
    
    // Decodificar payload
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Verificar expiración
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Token expirado
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

// Crear Access Token
export function createAccessToken(userId: string, email: string, role: string): string {
  return createJWT(
    { userId, email, role, type: 'access' },
    ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRES_IN
  );
}

// Crear Refresh Token
export function createRefreshToken(userId: string, email: string, role: string): string {
  return createJWT(
    { userId, email, role, type: 'refresh' },
    REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRES_IN
  );
}

// Verificar Access Token
export function verifyAccessToken(token: string): JWTPayload | null {
  const payload = verifyJWT(token, ACCESS_TOKEN_SECRET);
  if (!payload || payload.type !== 'access') return null;
  return payload;
}

// Verificar Refresh Token
export function verifyRefreshToken(token: string): JWTPayload | null {
  const payload = verifyJWT(token, REFRESH_TOKEN_SECRET);
  if (!payload || payload.type !== 'refresh') return null;
  return payload;
}

// Helpers
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  // Agregar padding si es necesario
  const padding = 4 - (str.length % 4);
  if (padding !== 4) {
    str += '='.repeat(padding);
  }
  
  return Buffer.from(
    str.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('utf-8');
}

function createSignature(header: string, payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function parseExpiration(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 minutos
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 900;
  }
}

// Comparación segura contra timing attacks
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}