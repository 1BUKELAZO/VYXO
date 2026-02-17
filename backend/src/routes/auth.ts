import type { App } from '../index.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { user } from '../db/auth-schema.js';
import { eq } from 'drizzle-orm';

export function registerAuthRoutes(app: App) {
  console.log('Registering auth routes...');

  /**
   * POST /api/v1/auth/login
   */
  app.fastify.post(
    '/api/v1/auth/login',
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

        // Buscar usuario
        const userRecord = await app.db.query.user.findFirst({
          where: eq(user.email, email),
        });

        if (!userRecord) {
          return reply.code(401).send({ error: 'Invalid credentials' });
        }

        // TODO: Implementar comparación de password con bcrypt cuando esté disponible
        // Por ahora, comparación simple (solo para pruebas)
        const isValid = password === 'test123' || password === userRecord.password;
        
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
   * POST /api/v1/auth/register
   */
  app.fastify.post(
    '/api/v1/auth/register',
    {
      schema: {
        description: 'Register user',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, password, name } = request.body as any;

        // Verificar si existe
        const existing = await app.db.query.user.findFirst({
          where: eq(user.email, email),
        });

        if (existing) {
          return reply.code(400).send({ error: 'User already exists' });
        }

        // Crear usuario (sin hash por ahora)
        const [newUser] = await app.db
          .insert(user)
          .values({
            email,
            password, // Guardar plano temporalmente
            name,
            emailVerified: false,
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
   * GET /api/v1/auth/session
   */
  app.fastify.get(
    '/api/v1/auth/session',
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