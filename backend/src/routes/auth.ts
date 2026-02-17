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

      // Generar UUID manualmente
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const userId = generateUUID();

      // Crear usuario con ID manual
      const [newUser] = await app.db
        .insert(user)
        .values({
          id: userId,
          email,
          password,
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