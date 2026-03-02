import { sql } from 'drizzle-orm';
import { app } from '../index.js';

async function migrateRefreshToken() {
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
    throw error;
  }
}

migrateRefreshToken();