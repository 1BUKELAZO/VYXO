import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { user, session, account, verification, refreshToken } from '../db/auth-schema.js';
import bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';

// Helper to generate tokens
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function registerAuthRoutes(app: App) {
  const { fastify, db, logger } = app;

  // ==========================================
  // POST /api/auth/register
  // ==========================================
  fastify.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password, name } = request.body as any;

      // Check if user exists
      const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);
      if (existingUser.length > 0) {
        return reply.code(400).send({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with explicit UUID
      const [newUser] = await db.insert(user).values({
        id: randomUUID(), // ← FIX: Generar UUID manualmente
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        emailVerified: false,
      }).returning();

      // Create session
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(session).values({
        id: randomUUID(), // ← FIX: Generar UUID manualmente
        userId: newUser.id,
        token,
        expiresAt,
      });

      // Generate JWT
      const jwtToken = await reply.jwtSign({
        userId: newUser.id,
        email: newUser.email,
      });

      logger.info({ userId: newUser.id }, 'User registered');

      return {
        token: jwtToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Registration error');
      throw error;
    }
  });

  // ==========================================
  // POST /api/auth/login
  // ==========================================
  fastify.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = request.body as any;

      // Find user
      const [existingUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
      if (!existingUser) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, existingUser.password || '');
      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Create session
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(session).values({
        id: randomUUID(), // ← FIX: Generar UUID manualmente
        userId: existingUser.id,
        token,
        expiresAt,
      });

      // Generate JWT
      const jwtToken = await reply.jwtSign({
        userId: existingUser.id,
        email: existingUser.email,
      });

      logger.info({ userId: existingUser.id }, 'User logged in');

      return {
        token: jwtToken,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Login error');
      throw error;
    }
  });

  // ==========================================
  // POST /api/auth/logout
  // ==========================================
  fastify.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        // Revoke session
        await db.update(session).set({ expiresAt: new Date() }).where(eq(session.token, token));
      }
      
      return { success: true };
    } catch (error) {
      logger.error({ err: error }, 'Logout error');
      throw error;
    }
  });

  // ==========================================
  // POST /api/auth/refresh
  // ==========================================
  fastify.post('/api/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken: token } = request.body as any;

      // Find refresh token
      const [existingToken] = await db
        .select()
        .from(refreshToken)
        .where(eq(refreshToken.token, token))
        .limit(1);

      if (!existingToken || existingToken.expiresAt < new Date() || existingToken.revokedAt) {
        return reply.code(401).send({ error: 'Invalid refresh token' });
      }

      // Get user
      const [existingUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, existingToken.userId))
        .limit(1);

      if (!existingUser) {
        return reply.code(401).send({ error: 'User not found' });
      }

      // Generate new JWT
      const jwtToken = await reply.jwtSign({
        userId: existingUser.id,
        email: existingUser.email,
      });

      logger.info({ userId: existingUser.id }, 'Token refreshed');

      return {
        token: jwtToken,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Refresh error');
      throw error;
    }
  });

  // ==========================================
  // GET /api/auth/me
  // ==========================================
  fastify.get('/api/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const { userId } = request.user as any;

      const [existingUser] = await db
        .select({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!existingUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return existingUser;
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
}