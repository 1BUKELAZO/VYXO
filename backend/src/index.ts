import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import { sql } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';

// Route imports
import { registerVideoRoutes } from './routes/videos.js';
import { registerUserRoutes } from './routes/users.js';
import { registerCommentRoutes } from './routes/comments.js';
import { registerMessageRoutes } from './routes/messages.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerLiveRoutes } from './routes/live.js';
import { registerReportRoutes } from './routes/reports.js';
import { registerBlockRoutes } from './routes/blocks.js';
import { registerMuxRoutes } from './routes/mux.js';
import { registerSoundRoutes } from './routes/sounds.js';
import { registerFeedRoutes } from './routes/feed.js';
import { registerHashtagRoutes } from './routes/hashtags.js';
import { registerVideoReplyRoutes } from './routes/video-replies.js';
import { registerDuetRoutes } from './routes/duets.js';
import { registerCreatorRoutes } from './routes/creator.js';
import { registerGiftRoutes } from './routes/gifts.js';
import { registerSubscriptionRoutes } from './routes/subscriptions.js';
import { registerAdRoutes } from './routes/ads.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerAuthRoutes } from './routes/auth.js';

// Database setup
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set');
}

const client = postgres(connectionString);
const db = drizzle(client, { schema: { ...appSchema, ...authSchema } });

// Fastify instance
const fastify = Fastify({
  logger: true
});

// DEBUG: Verificar JWT_SECRET al iniciar
console.log('🔐 JWT_SECRET check:', {
  hasSecret: !!process.env.JWT_SECRET,
  secretLength: process.env.JWT_SECRET?.length,
  secretPreview: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'NOT SET'
});

// Export for route files
export const app = {
  fastify,
  db,
  logger: fastify.log,
  requireAuth: () => async (request: any, reply: any) => {
    try {
      // DEBUG: Log del token recibido
      const authHeader = request.headers.authorization;
      console.log('🔍 AUTH DEBUG - Header:', {
        hasAuthHeader: !!authHeader,
        headerLength: authHeader?.length,
        headerPreview: authHeader ? authHeader.substring(0, 50) + '...' : 'NONE'
      });
      
      await request.jwtVerify();
      
      // DEBUG: Log si la verificación fue exitosa
      console.log('✅ AUTH DEBUG - Token verificado:', {
        userId: request.user?.userId,
        email: request.user?.email
      });
      
      return { user: request.user };
    } catch (err: any) {
      // DEBUG: Log detallado del error
      console.error('❌ AUTH DEBUG - Error verificando token:', {
        errorMessage: err.message,
        errorCode: err.code,
        errorStatusCode: err.statusCode
      });
      
      reply.code(401).send({ error: 'Unauthorized' });
      return null;
    }
  },
  withAuth: () => {},
  withStorage: () => {}
};

export type App = typeof app;

// ============================================
// CREAR TABLAS NECESARIAS
// ============================================

async function createTables() {
  console.log('🔄 Creando tablas necesarias...');
  
  try {
    // 1. Crear tabla user (PRIMERA - sin dependencias)
    // CORREGIDO: email_verified es boolean, no timestamp
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "email_verified" boolean DEFAULT false NOT NULL,
        "image" text,
        "password" text,
        "role" text DEFAULT 'user' NOT NULL,
        "is_banned" boolean DEFAULT false NOT NULL,
        "banned_at" timestamp with time zone,
        "banned_by" text REFERENCES "user"("id") ON DELETE set null,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Tabla user creada');

    // 2. Crear tabla session
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY,
        "expires_at" timestamp NOT NULL,
        "token" text NOT NULL UNIQUE,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade
      )
    `);
    console.log('✅ Tabla session creada');

    // 3. Crear tabla account
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "access_token_expires_at" timestamp,
        "refresh_token_expires_at" timestamp,
        "scope" text,
        "password" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp NOT NULL
      )
    `);
    console.log('✅ Tabla account creada');

    // 4. Crear tabla verification
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Tabla verification creada');

    // 5. Crear tabla refresh_token
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "refresh_token" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
        "token" text NOT NULL UNIQUE,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "revoked_at" timestamp
      )
    `);
    console.log('✅ Tabla refresh_token creada');

    // 6. Crear tabla videos
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "videos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "video_url" text NOT NULL,
        "thumbnail_url" text,
        "caption" text,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
        "duration" integer,
        "status" text DEFAULT 'processing',
        "likes_count" integer DEFAULT 0,
        "comments_count" integer DEFAULT 0,
        "shares_count" integer DEFAULT 0,
        "views_count" integer DEFAULT 0,
        "allow_comments" boolean DEFAULT true,
        "allow_duets" boolean DEFAULT true,
        "allow_stitches" boolean DEFAULT true,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Tabla videos creada');

    // 7. Crear tabla gifts
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "gifts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "icon" text NOT NULL,
        "price_coins" integer NOT NULL,
        "value_coins" integer NOT NULL,
        "animation_url" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Tabla gifts creada');

    // 8. Crear tabla coin_packages (CORREGIDO - agregada stripe_price_id)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "coin_packages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "coins" integer NOT NULL,
        "price_usd" numeric(10, 2) NOT NULL,
        "stripe_price_id" text,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Tabla coin_packages creada');

    console.log('✅ Todas las tablas creadas exitosamente');
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
}

// Seed initial data
async function seedInitialData() {
  try {
    // Verificar si gifts ya tiene datos
    const existingGifts = await db.select().from(appSchema.gifts).limit(1);
    if (existingGifts.length === 0) {
      await db.insert(appSchema.gifts).values([
        { name: 'Rose', icon: '🌹', priceCoins: 10, valueCoins: 7 },
        { name: 'Rocket', icon: '🚀', priceCoins: 100, valueCoins: 70 },
        { name: 'Diamond', icon: '💎', priceCoins: 1000, valueCoins: 700 },
        { name: 'Crown', icon: '👑', priceCoins: 5000, valueCoins: 3500 },
      ]);
      console.log('✅ Gifts seeded');
    }

    // Verificar si coin_packages ya tiene datos
    const existingPackages = await db.select().from(appSchema.coinPackages).limit(1);
    if (existingPackages.length === 0) {
      await db.insert(appSchema.coinPackages).values([
        { name: 'Starter Pack', coins: 100, priceUsd: '0.99', isActive: true },
        { name: 'Popular Pack', coins: 500, priceUsd: '4.99', isActive: true },
        { name: 'Value Pack', coins: 1000, priceUsd: '9.99', isActive: true },
        { name: 'Premium Pack', coins: 5000, priceUsd: '49.99', isActive: true },
      ]);
      console.log('✅ Coin packages seeded');
    }
  } catch (error) {
    console.warn('⚠️  Error en seeding:', error);
  }
}

// Main startup function
async function start() {
  // PASO 1: Crear tablas primero
  await createTables();

  // PASO 2: Registrar plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  await fastify.register(multipart);
  await fastify.register(websocket);
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'VYXO API',
        description: 'VYXO Backend API',
        version: '1.0.0'
      }
    }
  });

  // JWT setup
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  });

  // Auth decorator
  fastify.decorate("authenticate", async function(request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // PASO 3: Inicializar auth y rutas
  app.withAuth();
  registerAuthRoutes(app);
  app.withStorage();

  // Register all routes
  registerVideoRoutes(app);
  registerUserRoutes(app);
  registerCommentRoutes(app);
  registerMessageRoutes(app);
  registerNotificationRoutes(app);
  registerSearchRoutes(app);
  registerLiveRoutes(app);
  registerReportRoutes(app);
  registerBlockRoutes(app);
  registerMuxRoutes(app);
  registerSoundRoutes(app);
  registerFeedRoutes(app);
  registerHashtagRoutes(app);
  registerVideoReplyRoutes(app);
  registerDuetRoutes(app);
  registerCreatorRoutes(app);
  registerGiftRoutes(app);
  registerSubscriptionRoutes(app);
  registerAdRoutes(app);
  registerAnalyticsRoutes(app);
  registerAdminRoutes(app);

  // PASO 4: Seed endpoint
  fastify.post('/api/seed', async (request, reply) => {
    try {
      const [firstUser] = await db
        .select({ id: authSchema.user.id })
        .from(authSchema.user)
        .limit(1);

      if (!firstUser) {
        return reply.code(400).send({
          success: false,
          error: 'No users found. Please register a user first.'
        });
      }

      const userId = firstUser.id;

      const existingVideos = await db
        .select({ count: sql<number>`count(*)` })
        .from(appSchema.videos)
        .where(sql`${appSchema.videos.userId} = ${userId}`);

      if (existingVideos[0]?.count > 0) {
        return {
          success: true,
          message: 'Videos already exist',
          videos: existingVideos[0].count,
        };
      }

      const sampleVideos = [
        {
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
          caption: 'Amazing nature documentary 🌿 #nature #wildlife',
          userId,
          duration: 30,
          status: 'ready',
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          allowComments: true,
          allowDuets: true,
          allowStitches: true,
        },
        {
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
          caption: 'Creative animation showcase ✨ #animation #art',
          userId,
          duration: 25,
          status: 'ready',
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          allowComments: true,
          allowDuets: true,
          allowStitches: true,
        },
        {
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400',
          caption: 'Epic adventure compilation 🎬 #adventure #travel',
          userId,
          duration: 20,
          status: 'ready',
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          viewsCount: 0,
          allowComments: true,
          allowDuets: true,
          allowStitches: true,
        },
      ];

      const insertedVideos = await db
        .insert(appSchema.videos)
        .values(sampleVideos)
        .returning();

      return {
        success: true,
        message: 'Sample videos created',
        videos: insertedVideos.length,
      };
    } catch (error) {
      console.error('Seed error:', error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // PASO 5: Seed initial data
  await seedInitialData();

  // PASO 6: Start server
  const port = parseInt(process.env.PORT || '10000');
  const host = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    console.log(`🚀 Server listening on ${host}:${port}`);
  } catch (err) {
    console.error('Server error:', err);
    process.exit(1);
  }
}

// Start the application
start();