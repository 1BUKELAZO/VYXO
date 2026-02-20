import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { user, refreshToken } from '../db/auth-schema.js';
import { eq, and, isNull, gt } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { isValidEmail, isValidPassword, sanitizeString, isValidLength } from '../utils/validation.js';
import crypto from 'crypto';

// ============================================
// JWT UTILITIES (INLINE para evitar problemas de build)
// ============================================

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'vyxo-access-secret-key-2026';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'vyxo-refresh-secret-key-2026';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  const padding = 4 - (str.length % 4);
  if (padding !== 4) str += '='.repeat(padding);
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function createSignature(header: string, payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function parseExpiration(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
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

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresIn: string): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiration(expiresIn);
  const fullPayload = { ...payload, iat: now, exp };
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = createSignature(encodedHeader, encodedPayload, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJWT(token: string, secret: string): JWTPayload | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !signature) return null;
    const expectedSignature = createSignature(encodedHeader, encodedPayload, secret);
    if (!timingSafeCompare(signature, expectedSignature)) return null;
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function createAccessToken(userId: string, email: string, role: string): string {
  return createJWT({ userId, email, role, type: 'access' }, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN);
}

function createRefreshToken(userId: string, email: string, role: string): string {
  return createJWT({ userId, email, role, type: 'refresh' }, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN);
}

function verifyAccessToken(token: string): JWTPayload | null {
  const payload = verifyJWT(token, ACCESS_TOKEN_SECRET);
  return payload && payload.type === 'access' ? payload : null;
}

function verifyRefreshToken(token: string): JWTPayload | null {
  const payload = verifyJWT(token, REFRESH_TOKEN_SECRET);
  return payload && payload.type === 'refresh' ? payload : null;
}

// ============================================
// AUTH ROUTES
// ============================================

export function registerAuthRoutes(app: App) {
  console.log('Registering auth routes...');

  /**
   * POST /api/auth/login
   */
  app.fastify.post(
    '/api/auth/login',
    {
      schema: {
        description: 'Login user',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  image: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, password } = request.body as { email: string; password: string };

        if (!isValidEmail(email)) {
          return reply.code(400).send({ 
            error: 'Invalid email format',
            message: 'Please provide a valid email address'
          });
        }

        const userRecord = await app.db.query.user.findFirst({
          where: eq(user.email, email),
        });

        if (!userRecord) {
          return reply.code(401).send({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, userRecord.password);
        
        if (!isValid) {
          return reply.code(401).send({ error: 'Invalid credentials' });
        }

        const accessToken = createAccessToken(userRecord.id, userRecord.email, userRecord.role);
        const refreshTokenString = createRefreshToken(userRecord.id, userRecord.email, userRecord.role);

        const refreshExpiresAt = new Date();
        refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

        await app.db.insert(refreshToken).values({
          userId: userRecord.id,
          token: refreshTokenString,
          expiresAt: refreshExpiresAt,
        });

        return {
          accessToken,
          refreshToken: refreshTokenString,
          user: {
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.name,
            image: userRecord.image,
          },
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Login error');
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/register
   */
  app.fastify.post(
    '/api/auth/register',
    {
      schema: {
        description: 'Register user',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 1, maxLength: 50 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        let { email, password, name } = request.body as any;

        if (!isValidEmail(email)) {
          return reply.code(400).send({ 
            error: 'Invalid email format',
            message: 'Please provide a valid email address (e.g., user@example.com)'
          });
        }

        if (!isValidPassword(password)) {
          return reply.code(400).send({ 
            error: 'Invalid password',
            message: 'Password must be at least 8 characters long and contain at least one letter and one number'
          });
        }

        if (!isValidLength(name, 2, 50)) {
          return reply.code(400).send({ 
            error: 'Invalid name',
            message: 'Name must be between 2 and 50 characters'
          });
        }
        name = sanitizeString(name.trim());

        email = email.toLowerCase().trim();

        const existing = await app.db.query.user.findFirst({
          where: eq(user.email, email),
        });

        if (existing) {
          return reply.code(400).send({ error: 'User already exists' });
        }

        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        const userId = generateUUID();

        const hashedPassword = await bcrypt.hash(password, 10);

        const [newUser] = await app.db
          .insert(user)
          .values({
            id: userId,
            email,
            password: hashedPassword,
            name,
            emailVerified: false,
            role: 'user',
            isBanned: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const accessToken = createAccessToken(newUser.id, newUser.email, newUser.role);
        const refreshTokenString = createRefreshToken(newUser.id, newUser.email, newUser.role);

        const refreshExpiresAt = new Date();
        refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

        await app.db.insert(refreshToken).values({
          userId: newUser.id,
          token: refreshTokenString,
          expiresAt: refreshExpiresAt,
        });

        return {
          accessToken,
          refreshToken: refreshTokenString,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          },
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Register error');
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/refresh
   */
  app.fastify.post(
    '/api/auth/refresh',
    {
      schema: {
        description: 'Refresh access token',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { refreshToken: refreshTokenString } = request.body as { refreshToken: string };

        const payload = verifyRefreshToken(refreshTokenString);
        if (!payload) {
          return reply.code(401).send({ error: 'Invalid or expired refresh token' });
        }

        const storedToken = await app.db.query.refreshToken.findFirst({
          where: and(
            eq(refreshToken.token, refreshTokenString),
            isNull(refreshToken.revokedAt),
            gt(refreshToken.expiresAt, new Date())
          ),
        });

        if (!storedToken) {
          return reply.code(401).send({ error: 'Refresh token not found or revoked' });
        }

        const userRecord = await app.db.query.user.findFirst({
          where: eq(user.id, payload.userId),
        });

        if (!userRecord) {
          return reply.code(404).send({ error: 'User not found' });
        }

        const newAccessToken = createAccessToken(userRecord.id, userRecord.email, userRecord.role);

        return {
          accessToken: newAccessToken,
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Refresh token error');
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/logout
   */
  app.fastify.post(
    '/api/auth/logout',
    {
      schema: {
        description: 'Logout user and revoke refresh token',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { refreshToken: refreshTokenString } = request.body as { refreshToken: string };

        await app.db
          .update(refreshToken)
          .set({ revokedAt: new Date() })
          .where(eq(refreshToken.token, refreshTokenString));

        return { message: 'Logged out successfully' };
      } catch (error) {
        app.logger.error({ err: error }, 'Logout error');
        throw error;
      }
    }
  );

  /**
   * GET /api/auth/me
   */
  app.fastify.get(
    '/api/auth/me',
    {
      schema: {
        description: 'Get current user profile',
        tags: ['auth'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              image: { type: 'string' },
              role: { type: 'string' },
              emailVerified: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token no proporcionado' });
        }

        const token = authHeader.substring(7);
        
        const payload = verifyAccessToken(token);
        
        if (!payload) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido o expirado' });
        }

        const userRecord = await app.db.query.user.findFirst({
          where: eq(user.id, payload.userId),
        });

        if (!userRecord) {
          return reply.code(404).send({ error: 'User not found' });
        }

        return {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          image: userRecord.image,
          role: userRecord.role,
          emailVerified: userRecord.emailVerified,
          createdAt: userRecord.createdAt,
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Get profile error');
        throw error;
      }
    }
  );

  /**
   * PUT /api/auth/profile
   */
  app.fastify.put(
    '/api/auth/profile',
    {
      schema: {
        description: 'Update current user profile',
        tags: ['auth'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 50 },
            image: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              image: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token no proporcionado' });
        }

        const token = authHeader.substring(7);
        
        const payload = verifyAccessToken(token);
        
        if (!payload) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido o expirado' });
        }

        const { name, image } = request.body as { name?: string; image?: string };

        let sanitizedName: string | undefined;
        if (name !== undefined) {
          if (!isValidLength(name, 2, 50)) {
            return reply.code(400).send({ 
              error: 'Invalid name',
              message: 'Name must be between 2 and 50 characters'
            });
          }
          sanitizedName = sanitizeString(name.trim());
        }

        const updateData: any = {
          updatedAt: new Date(),
        };
        
        if (sanitizedName !== undefined) updateData.name = sanitizedName;
        if (image !== undefined) updateData.image = image;

        if (Object.keys(updateData).length === 1) {
          return reply.code(400).send({ 
            error: 'No data provided',
            message: 'Please provide name or image to update'
          });
        }

        const [updatedUser] = await app.db
          .update(user)
          .set(updateData)
          .where(eq(user.id, payload.userId))
          .returning();

        if (!updatedUser) {
          return reply.code(404).send({ error: 'User not found' });
        }

        return {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          image: updatedUser.image,
          updatedAt: updatedUser.updatedAt,
        };
      } catch (error) {
        app.logger.error({ err: error }, 'Update profile error');
        throw error;
      }
    }
  );

  /**
   * GET /api/auth/session
   */
  app.fastify.get(
    '/api/auth/session',
    {
      schema: {
        description: 'Get session',
        tags: ['auth'],
      },
    },
    async () => {
      return { user: null };
    }
  );

  console.log('Auth routes registered successfully');
}