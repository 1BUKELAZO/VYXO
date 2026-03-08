import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// POST /api/webhooks/mux - Recibe notificaciones de Mux
router.post('/mux', async (req, res) => {
  try {
    const event = req.body;
    
    console.log('========================================');
    console.log('🎥 Mux webhook received:', event.type);
    console.log('========================================');

    // Responder inmediatamente a Mux
    res.status(200).json({ received: true });

    // Procesar según el tipo de evento
    switch (event.type) {
      case 'video.asset.ready': {
        const assetId = event.object?.id;
        const playbackId = event.data?.playback_ids?.[0]?.id;
        const duration = event.data?.duration;
        
        console.log('✅ Video ready:', { assetId, playbackId, duration });

        if (!assetId || !playbackId) {
          console.error('❌ Missing assetId or playbackId');
          return;
        }

        const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
        const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&height=1138&fit_mode=smartcrop&time=1`;
        const gifUrl = `https://image.mux.com/${playbackId}/animated.gif?width=320&height=569&fps=15`;

        // Buscar y actualizar video
        const { data: video } = await supabase
          .from('videos')
          .select('id')
          .eq('mux_asset_id', assetId)
          .single();

        if (video) {
          await supabase
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
          
          console.log('✅ Video updated:', video.id);
        } else {
          // Fallback: buscar por upload_id
          await supabase
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
            .eq('mux_upload_id', assetId);
          
          console.log('✅ Video updated by upload_id');
        }
        break;
      }

      case 'video.upload.asset_created': {
        const uploadId = event.object?.id;
        const assetId = event.data?.asset_id;
        
        console.log('📝 Asset created:', { uploadId, assetId });

        await supabase
          .from('videos')
          .update({ 
            mux_asset_id: assetId,
            updated_at: new Date().toISOString()
          })
          .eq('mux_upload_id', uploadId);
        break;
      }

      default:
        console.log('ℹ️ Unhandled event:', event.type);
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(200).json({ error: 'Processed with errors' });
  }
});

// GET /api/webhooks/mux - Verificar que está vivo
router.get('/mux', (req, res) => {
  res.json({ status: 'Webhook endpoint active', timestamp: new Date().toISOString() });
});

export default router;