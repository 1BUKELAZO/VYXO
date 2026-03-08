import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Handler para POST /api/webhooks/mux
async function muxWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const event = request.body as any;
    
    console.log('========================================');
    console.log('🎥 Mux webhook received:', event.type);
    console.log('========================================');

    // Responder inmediatamente a Mux
    reply.code(200).send({ received: true });

    // Procesar según el tipo de evento
    switch (event.type) {
      case 'video.asset.ready': {
        const assetId = event.object?.id;
        const playbackId = event.data?.playback_ids?.[0]?.id;
        const duration = event.data?.duration;
        
        console.log('✅ Processing video.asset.ready:', { assetId, playbackId, duration });

        if (!assetId || !playbackId) {
          console.error('❌ Missing assetId or playbackId');
          return;
        }

        const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&height=1138&fit_mode=smartcrop&time=1`;
        const gifUrl = `https://image.mux.com/${playbackId}/animated.gif?width=320&height=569&fps=15`;

        // Buscar video por mux_asset_id
        const { data: video, error: findError } = await supabase
          .from('videos')
          .select('id')
          .eq('mux_asset_id', assetId)
          .single();

        if (video) {
          // Actualizar por asset_id
          const { error: updateError } = await supabase
            .from('videos')
            .update({
              status: 'ready',
              mux_playback_id: playbackId,
              video_url: videoUrl,
              thumbnail_url: thumbnailUrl,
              mux_thumbnail_url: thumbnailUrl,
              gif_url: gifUrl,
              master_playlist_url: videoUrl,
              duration: Math.round(duration || 0),
              updated_at: new Date().toISOString()
            })
            .eq('id', video.id);

          if (updateError) {
            console.error('❌ Error updating video:', updateError);
          } else {
            console.log('✅ Video updated successfully:', video.id);
          }
        } else {
          // Fallback: buscar por upload_id
          console.log('⚠️ Video not found by asset_id, trying upload_id...');
          
          const { data: videoByUpload, error: uploadError } = await supabase
            .from('videos')
            .select('id')
            .eq('mux_upload_id', assetId)
            .single();

          if (videoByUpload) {
            const { error: updateError } = await supabase
              .from('videos')
              .update({
                status: 'ready',
                mux_playback_id: playbackId,
                mux_asset_id: assetId,
                video_url: videoUrl,
                thumbnail_url: thumbnailUrl,
                mux_thumbnail_url: thumbnailUrl,
                gif_url: gifUrl,
                master_playlist_url: videoUrl,
                duration: Math.round(duration || 0),
                updated_at: new Date().toISOString()
              })
              .eq('id', videoByUpload.id);

            if (updateError) {
              console.error('❌ Error updating video by upload_id:', updateError);
            } else {
              console.log('✅ Video updated successfully by upload_id:', videoByUpload.id);
            }
          } else {
            console.error('❌ Video not found in database:', assetId);
          }
        }
        break;
      }

      case 'video.upload.asset_created': {
        const uploadId = event.object?.id;
        const assetId = event.data?.asset_id;
        
        console.log('📝 Asset created from upload:', { uploadId, assetId });

        if (!uploadId || !assetId) {
          console.error('❌ Missing uploadId or assetId');
          return;
        }

        const { error } = await supabase
          .from('videos')
          .update({ 
            mux_asset_id: assetId,
            updated_at: new Date().toISOString()
          })
          .eq('mux_upload_id', uploadId);

        if (error) {
          console.error('❌ Error updating asset_id:', error);
        } else {
          console.log('✅ Asset ID updated for upload:', uploadId);
        }
        break;
      }

      default:
        console.log('ℹ️ Unhandled webhook type:', event.type);
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Ya respondimos 200 arriba, solo logueamos el error
  }
}

// Handler para GET /api/webhooks/mux (verificación)
async function muxWebhookGetHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.send({ 
    status: 'Webhook endpoint active',
    timestamp: new Date().toISOString(),
    url: '/api/webhooks/mux'
  });
}

// Función para registrar rutas
export async function registerWebhookRoutes(app: any) {
  const { fastify } = app;
  
  // POST /api/webhooks/mux
  fastify.post('/api/webhooks/mux', muxWebhookHandler);
  
  // GET /api/webhooks/mux (para verificar que está vivo)
  fastify.get('/api/webhooks/mux', muxWebhookGetHandler);
  
  console.log('✅ Webhook routes registered');
}