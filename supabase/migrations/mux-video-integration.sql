
-- =====================================================
-- VYXO - MUX VIDEO INTEGRATION
-- =====================================================
-- This migration adds Mux-specific fields to the videos table
-- for professional video streaming with HLS adaptive bitrate
-- =====================================================

-- Add Mux-specific columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS mux_asset_id TEXT,
ADD COLUMN IF NOT EXISTS mux_playback_id TEXT,
ADD COLUMN IF NOT EXISTS mux_upload_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploading',
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS aspect_ratio TEXT,
ADD COLUMN IF NOT EXISTS max_resolution TEXT,
ADD COLUMN IF NOT EXISTS master_playlist_url TEXT,
ADD COLUMN IF NOT EXISTS mux_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON videos(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_playback_id ON videos(mux_playback_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_upload_id ON videos(mux_upload_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- Add comments for documentation
COMMENT ON COLUMN videos.mux_asset_id IS 'Mux asset ID for video streaming';
COMMENT ON COLUMN videos.mux_playback_id IS 'Mux playback ID for HLS streaming';
COMMENT ON COLUMN videos.mux_upload_id IS 'Mux upload ID for tracking uploads';
COMMENT ON COLUMN videos.status IS 'Video processing status: uploading, processing, ready, error';
COMMENT ON COLUMN videos.duration IS 'Video duration in seconds';
COMMENT ON COLUMN videos.aspect_ratio IS 'Video aspect ratio (e.g., 9:16, 16:9)';
COMMENT ON COLUMN videos.max_resolution IS 'Maximum video resolution (e.g., 1080p, 720p, 4k)';
COMMENT ON COLUMN videos.master_playlist_url IS 'HLS master playlist URL for adaptive streaming';
COMMENT ON COLUMN videos.mux_thumbnail_url IS 'Mux-generated thumbnail URL';
COMMENT ON COLUMN videos.gif_url IS 'Mux-generated animated GIF preview URL';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Set up Mux account: https://dashboard.mux.com
-- 2. Get API credentials: https://dashboard.mux.com/settings/access-tokens
-- 3. Configure environment variables in backend:
--    - MUX_TOKEN_ID
--    - MUX_TOKEN_SECRET
--    - MUX_WEBHOOK_SECRET
-- 4. Set up webhook endpoint in Mux dashboard
-- 5. Test video upload and playback
-- =====================================================
