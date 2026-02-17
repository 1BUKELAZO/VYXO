import { app } from '../index.js';

export function registerAuthRoutes(app: any) {
  // Endpoint de login
  app.post('/api/auth/login', async (request: any, reply: any) => {
    try {
      const { email, password } = request.body;
      
      // Usar Better Auth interno del framework
      const result = await app.auth.signIn.email({
        email,
        password
      });
      
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: 'Login failed' });
    }
  });

  // Endpoint de registro
  app.post('/api/auth/register', async (request: any, reply: any) => {
    try {
      const { email, password, name } = request.body;
      
      const result = await app.auth.signUp.email({
        email,
        password,
        name
      });
      
      return reply.send(result);
    } catch (error) {
      return reply.status(400).send({ error: 'Registration failed' });
    }
  });

  // Endpoint de sesión actual
  app.get('/api/auth/session', async (request: any, reply: any) => {
    try {
      const session = await app.auth.getSession(request);
      return reply.send(session);
    } catch (error) {
      return reply.status(401).send({ error: 'No session' });
    }
  });
}