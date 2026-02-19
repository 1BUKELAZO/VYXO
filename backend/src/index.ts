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

// Ejecutar verificación antes de inicializar auth
await ensurePasswordColumn();

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