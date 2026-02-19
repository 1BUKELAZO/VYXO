import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { user } from '../db/auth-schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { isValidEmail, isValidPassword, sanitizeString, isValidLength } from '../utils/validation.js';

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
              token: { type: 'string' },
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

        // Validar email
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

        // Comparar contraseña usando bcrypt
        const isValid = await bcrypt.compare(password, userRecord.password);
        
        if (!isValid) {
          return reply.code(401).send({ error: 'Invalid credentials' });
        }

        const token = Buffer.from(`${userRecord.id}:${Date.now()}`).toString('base64');

        return {
          token,
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

        // Validar email
        if (!isValidEmail(email)) {
          return reply.code(400).send({ 
            error: 'Invalid email format',
            message: 'Please provide a valid email address (e.g., user@example.com)'
          });
        }

        // Validar password (mínimo 8 caracteres, al menos 1 letra y 1 número)
        if (!isValidPassword(password)) {
          return reply.code(400).send({ 
            error: 'Invalid password',
            message: 'Password must be at least 8 characters long and contain at least one letter and one number'
          });
        }

        // Validar y sanitizar nombre (2-50 caracteres)
        if (!isValidLength(name, 2, 50)) {
          return reply.code(400).send({ 
            error: 'Invalid name',
            message: 'Name must be between 2 and 50 characters'
          });
        }
        name = sanitizeString(name.trim());

        // Convertir email a lowercase para consistencia
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

        // Hashear la contraseña antes de guardar
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

        return {
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