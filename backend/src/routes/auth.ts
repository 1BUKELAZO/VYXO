// Better Auth is handled natively by @specific-dev/framework
// Endpoints available at /api/auth/* automatically
// No manual routes needed

export function registerAuthRoutes(app: any) {
  // Better Auth is already initialized by app.withAuth() in index.ts
  // Endpoints:
  // - POST /api/auth/sign-in/email
  // - POST /api/auth/sign-up/email  
  // - GET  /api/auth/session
  // - POST /api/auth/sign-out
  console.log('Better Auth native endpoints ready at /api/auth/*');
}