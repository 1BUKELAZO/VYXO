import { createApplication } from "@specific-dev/framework";
import { sql } from "drizzle-orm";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
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

// Merge app and auth schemas
const schema = { ...appSchema, ...authSchema };

// Create application with combined schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// 🚀 VERIFICACIÓN DE COLUMNA PASSWORD ANTES DE INICIAR AUTH
async function ensurePasswordColumn() {
  try {
    console.log('🔍 Verificando columna password en tabla user...');
    
    const result = await app.db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      AND column_name = 'password'
      AND table_schema = 'public'
    `);
    
    if (result.rows.length === 0) {
      console.log('⚠️  Columna password no encontrada. Ejecutando ALTER TABLE...');
      await app.db.execute(sql`
        ALTER TABLE "user" 
        ADD COLUMN IF NOT EXISTS "password" text
      `);
      console.log('✅ Columna password creada exitosamente');
    } else {
      console.log('✅ Columna password ya existe');
    }
  } catch (error) {
    console.error('❌ Error al verificar/crear columna password:', error);
    // No lanzamos error para no bloquear el inicio
  }
}

// 🚀 VERIFICACIÓN DE TABLA REFRESH_TOKEN
async function ensureRefreshTokenTable() {
  try {
    console.log('🔍 Verificando tabla refresh_token...');
    
    const result = await app.db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'refresh_token' 
      AND table_schema = 'public'
    `);
    
    if (result.rows.length === 0) {
      console.log('⚠️  Tabla refresh_token no encontrada. Creando...');
      
      await app.db.execute(sql`
        CREATE TABLE IF NOT EXISTS "refresh_token" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
          "token" text NOT NULL UNIQUE,
          "expires_at" timestamp NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "revoked_at" timestamp
        )
      `);
      
      console.log('✅ Tabla refresh_token creada exitosamente');
    } else {
      console.log('✅ Tabla refresh_token ya existe');
    }
  } catch (error) {
    console.error('❌ Error al crear tabla refresh_token:', error);
    // No lanzamos error para no bloquear el inicio
  }
}

// Ejecutar verificaciones antes de inicializar auth
await ensurePasswordColumn();
await ensureRefreshTokenTable();

// Initialize authentication
app.withAuth();
registerAuthRoutes(app);

// Initialize storage
app.withStorage();

// Register route modules
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

// 🚀 PUBLIC SEED ENDPOINT - No authentication required
app.fastify.post(
  '/api/seed',
  {
    schema: {
      description: 'Seed sample data for testing (public endpoint)',
      tags: ['seed'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            videos: { type: 'number' },
            liveStreams: { type: 'number' },
          },
        },
      },
    },
  },
  async (request, reply) => {
    app.logger.info('Public seed endpoint called');

    try {
      // Get first available user to associate with seeded data
      const [firstUser] = await app.db
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

      // Sample videos
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

      // Insert videos
      const insertedVideos = await app.db
        .insert(appSchema.videos)
        .values(sampleVideos)
        .returning();

      // Sample live streams
      const sampleStreams = [
        {
          userId,
          title: 'Live Gaming Session',
          description: 'Playing the latest games live!',
          status: 'active',
          streamKey: 'stream-key-1',
          viewerCount: 0,
        },
        {
          userId,
          title: 'Q&A with Fans',
          description: 'Ask me anything!',
          status: 'active',
          streamKey: 'stream-key-2',
          viewerCount: 0,
        },
      ];

      // Insert live streams
      const insertedStreams = await app.db
        .insert(appSchema.liveStreams)
        .values(sampleStreams)
        .returning();

      app.logger.info(
        { 
          videos: insertedVideos.length, 
          streams: insertedStreams.length 
        }, 
        'Sample data seeded successfully'
      );

      return {
        success: true,
        message: 'Sample data created successfully',
        videos: insertedVideos.length,
        liveStreams: insertedStreams.length,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to seed sample data');
      throw error;
    }
  }
);

// Seed initial gifts and coin packages if needed
async function seedInitialData() {
  try {
    const existingGifts = await app.db.select().from(schema.gifts).limit(1);
    if (existingGifts.length === 0) {
      await app.db.insert(schema.gifts).values([
        {
          name: 'Rose',
          icon: '🌹',
          priceCoins: 10,
          valueCoins: 7,
        },
        {
          name: 'Rocket',
          icon: '🚀',
          priceCoins: 100,
          valueCoins: 70,
        },
        {
          name: 'Diamond',
          icon: '💎',
          priceCoins: 1000,
          valueCoins: 700,
        },
        {
          name: 'Crown',
          icon: '👑',
          priceCoins: 5000,
          valueCoins: 3500,
        },
      ]);
      app.logger.info('Gifts seeded');
    }

    const existingPackages = await app.db.select().from(schema.coinPackages).limit(1);
    if (existingPackages.length === 0) {
      await app.db.insert(schema.coinPackages).values([
        {
          name: 'Starter Pack',
          coins: 100,
          priceUsd: '0.99',
          isActive: true,
        },
        {
          name: 'Popular Pack',
          coins: 500,
          priceUsd: '4.99',
          isActive: true,
        },
        {
          name: 'Value Pack',
          coins: 1000,
          priceUsd: '9.99',
          isActive: true,
        },
        {
          name: 'Premium Pack',
          coins: 5000,
          priceUsd: '49.99',
          isActive: true,
        },
      ]);
      app.logger.info('Coin packages seeded');
    }
  } catch (error) {
    app.logger.warn({ err: error }, 'Failed to seed initial data');
  }
}

await seedInitialData();

await app.run();
app.logger.info('Application running');