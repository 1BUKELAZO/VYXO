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

        // DEBUG: Logs para diagnóstico del token
        const now = Date.now();
        console.log('DEBUG LOGIN - Timestamp generado:', now);
        console.log('DEBUG LOGIN - Fecha:', new Date(now).toISOString());

        const token = Buffer.from(`${userRecord.id}:${now}`).toString('base64');
        
        console.log('DEBUG LOGIN - Token:', token);

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
   * GET /api/auth/me
   * Get current user profile
   * Requires authentication
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
        // Obtener token del header manualmente
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token no proporcionado' });
        }

        const token = authHeader.substring(7);
        
        // Decodificar token (base64)
        try {
          const decoded = Buffer.from(token, 'base64').toString('utf-8');
          const [userId, timestamp] = decoded.split(':');
          
          if (!userId || !timestamp) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido' });
          }

          // DEBUG: Logs para diagnóstico
          const tokenTime = parseInt(timestamp);
          const now = Date.now();
          const twentyFourHours = 24 * 60 * 60 * 1000; // 24 horas en milisegundos (86,400,000 ms)
          
          console.log('DEBUG VALIDATE - Token recibido:', token);
          console.log('DEBUG VALIDATE - Decodificado:', decoded);
          console.log('DEBUG VALIDATE - TokenTime:', tokenTime);
          console.log('DEBUG VALIDATE - TokenTime (fecha):', new Date(tokenTime).toISOString());
          console.log('DEBUG VALIDATE - Now:', now);
          console.log('DEBUG VALIDATE - Now (fecha):', new Date(now).toISOString());
          console.log('DEBUG VALIDATE - Diferencia (ms):', now - tokenTime);
          console.log('DEBUG VALIDATE - Diferencia (min):', (now - tokenTime) / 1000 / 60);
          console.log('DEBUG VALIDATE - ¿Expirado?:', now - tokenTime > twentyFourHours);

          // Verificar si el token expiró (24 horas para pruebas)
          if (now - tokenTime > twentyFourHours) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Token expirado' });
          }

          // Buscar usuario
          const userRecord = await app.db.query.user.findFirst({
            where: eq(user.id, userId),
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
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido' });
        }
      } catch (error) {
        app.logger.error({ err: error }, 'Get profile error');
        throw error;
      }
    }
  );

  /**
   * PUT /api/auth/profile
   * Update current user profile
   * Requires authentication
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
        // Obtener token del header manualmente
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token no proporcionado' });
        }

        const token = authHeader.substring(7);
        
        // Decodificar token (base64)
        let userId: string;
        try {
          const decoded = Buffer.from(token, 'base64').toString('utf-8');
          const [id, timestamp] = decoded.split(':');
          
          if (!id || !timestamp) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido' });
          }

          // Verificar si el token expiró (24 horas para pruebas)
          const tokenTime = parseInt(timestamp);
          const now = Date.now();
          const twentyFourHours = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
          
          if (now - tokenTime > twentyFourHours) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Token expirado' });
          }
          
          userId = id;
        } catch (error) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido' });
        }

        const { name, image } = request.body as { name?: string; image?: string };

        // Validar y sanitizar nombre si se proporciona
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

        // Preparar datos de actualización
        const updateData: any = {
          updatedAt: new Date(),
        };
        
        if (sanitizedName !== undefined) updateData.name = sanitizedName;
        if (image !== undefined) updateData.image = image;

        // Si no hay nada que actualizar
        if (Object.keys(updateData).length === 1) { // Solo updatedAt
          return reply.code(400).send({ 
            error: 'No data provided',
            message: 'Please provide name or image to update'
          });
        }

        const [updatedUser] = await app.db
          .update(user)
          .set(updateData)
          .where(eq(user.id, userId))
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