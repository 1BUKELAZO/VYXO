
-- =====================================================
-- VYXO VIDEO SYSTEM - SUPABASE SQL MIGRATION
-- =====================================================
-- This migration extends the video system with:
-- - Enhanced video metadata (duration, permissions, views)
-- - Music/soundtrack integration
-- - Precise view tracking
-- - Storage buckets and RLS policies
-- - Automatic profile video count synchronization
-- =====================================================

-- =====================================================
-- 1. EXTEND EXISTING VIDEOS TABLE
-- =====================================================
-- Add new columns to support enhanced video features
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_duets BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS music_id UUID REFERENCES musics(id),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =====================================================
-- 2. CREATE MUSICS TABLE
-- =====================================================
-- Stores audio tracks that can be attached to videos
CREATE TABLE IF NOT EXISTS musics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  cover_url TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER,
  is_trending BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for trending music queries
CREATE INDEX IF NOT EXISTS idx_musics_trending 
ON musics(is_trending, usage_count DESC) 
WHERE is_trending = true;

-- Create index for music search
CREATE INDEX IF NOT EXISTS idx_musics_title 
ON musics(title);

-- =====================================================
-- 3. CREATE VIDEO_VIEWS TABLE
-- =====================================================
-- Tracks unique video views per user for accurate counting
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Create indexes for efficient view queries
CREATE INDEX IF NOT EXISTS idx_video_views_video_id 
ON video_views(video_id);

CREATE INDEX IF NOT EXISTS idx_video_views_user_id 
ON video_views(user_id);

CREATE INDEX IF NOT EXISTS idx_video_views_created_at 
ON video_views(created_at DESC);

-- =====================================================
-- 4. STORAGE BUCKETS SETUP
-- =====================================================
-- NOTE: Storage buckets must be created via Supabase Dashboard or CLI
-- This section documents the required bucket configuration

-- BUCKET: 'videos'
-- - Public: true (for public video viewing)
-- - File size limit: 100MB
-- - Allowed MIME types: video/mp4, video/quicktime, video/x-msvideo
-- - Path structure: {user_id}/{video_id}.mp4

-- BUCKET: 'thumbnails'
-- - Public: true (for public thumbnail viewing)
-- - File size limit: 5MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp
-- - Path structure: {user_id}/{video_id}_thumb.jpg

-- =====================================================
-- 5. ROW LEVEL SECURITY POLICIES - VIDEOS BUCKET
-- =====================================================

-- Policy: Public can view all videos
CREATE POLICY "Videos are publicly viewable" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'videos');

-- Policy: Authenticated users can upload videos to their own folder
CREATE POLICY "Authenticated users can upload videos" ON storage.objects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    bucket_id = 'videos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own videos
CREATE POLICY "Users can update own videos" ON storage.objects
  FOR UPDATE 
  TO authenticated 
  USING (
    bucket_id = 'videos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own videos
CREATE POLICY "Users can delete own videos" ON storage.objects
  FOR DELETE 
  TO authenticated 
  USING (
    bucket_id = 'videos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- 6. ROW LEVEL SECURITY POLICIES - THUMBNAILS BUCKET
-- =====================================================

-- Policy: Public can view all thumbnails
CREATE POLICY "Thumbnails are publicly viewable" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'thumbnails');

-- Policy: Authenticated users can upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'thumbnails');

-- Policy: Users can update their own thumbnails
CREATE POLICY "Users can update own thumbnails" ON storage.objects
  FOR UPDATE 
  TO authenticated 
  USING (
    bucket_id = 'thumbnails' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails" ON storage.objects
  FOR DELETE 
  TO authenticated 
  USING (
    bucket_id = 'thumbnails' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- 7. FUNCTION: INCREMENT VIDEO COUNT ON PROFILE
-- =====================================================
-- Automatically increments videos_count when a video is created
CREATE OR REPLACE FUNCTION increment_video_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET videos_count = videos_count + 1 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGER: AFTER VIDEO INSERT
-- =====================================================
-- Calls increment_video_count after a new video is inserted
DROP TRIGGER IF EXISTS after_video_insert ON videos;
CREATE TRIGGER after_video_insert
  AFTER INSERT ON videos
  FOR EACH ROW 
  EXECUTE FUNCTION increment_video_count();

-- =====================================================
-- 9. FUNCTION: DECREMENT VIDEO COUNT ON PROFILE
-- =====================================================
-- Automatically decrements videos_count when a video is deleted
CREATE OR REPLACE FUNCTION decrement_video_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET videos_count = videos_count - 1 
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. TRIGGER: AFTER VIDEO DELETE
-- =====================================================
-- Calls decrement_video_count after a video is deleted
DROP TRIGGER IF EXISTS after_video_delete ON videos;
CREATE TRIGGER after_video_delete
  AFTER DELETE ON videos
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_video_count();

-- =====================================================
-- 11. FUNCTION: UPDATE MUSIC USAGE COUNT
-- =====================================================
-- Automatically updates music usage_count when attached to videos
CREATE OR REPLACE FUNCTION update_music_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment count for new music
  IF NEW.music_id IS NOT NULL THEN
    UPDATE musics 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.music_id;
  END IF;
  
  -- Decrement count for old music (on update)
  IF TG_OP = 'UPDATE' AND OLD.music_id IS NOT NULL AND OLD.music_id != NEW.music_id THEN
    UPDATE musics 
    SET usage_count = usage_count - 1 
    WHERE id = OLD.music_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. TRIGGER: AFTER VIDEO MUSIC UPDATE
-- =====================================================
-- Calls update_music_usage_count when video music changes
DROP TRIGGER IF EXISTS after_video_music_change ON videos;
CREATE TRIGGER after_video_music_change
  AFTER INSERT OR UPDATE OF music_id ON videos
  FOR EACH ROW 
  EXECUTE FUNCTION update_music_usage_count();

-- =====================================================
-- 13. FUNCTION: DECREMENT MUSIC COUNT ON DELETE
-- =====================================================
-- Decrements music usage_count when video is deleted
CREATE OR REPLACE FUNCTION decrement_music_usage_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.music_id IS NOT NULL THEN
    UPDATE musics 
    SET usage_count = usage_count - 1 
    WHERE id = OLD.music_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. TRIGGER: AFTER VIDEO DELETE (MUSIC COUNT)
-- =====================================================
DROP TRIGGER IF EXISTS after_video_delete_music ON videos;
CREATE TRIGGER after_video_delete_music
  AFTER DELETE ON videos
  FOR EACH ROW 
  EXECUTE FUNCTION decrement_music_usage_on_delete();

-- =====================================================
-- 15. FUNCTION: AUTO-UPDATE UPDATED_AT TIMESTAMP
-- =====================================================
-- Automatically updates updated_at column on video changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 16. TRIGGER: BEFORE VIDEO UPDATE
-- =====================================================
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 17. ROW LEVEL SECURITY POLICIES - VIDEOS TABLE
-- =====================================================

-- Enable RLS on videos table
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view videos
CREATE POLICY "Videos are publicly viewable" ON videos
  FOR SELECT 
  USING (true);

-- Policy: Authenticated users can create videos
CREATE POLICY "Authenticated users can create videos" ON videos
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own videos
CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own videos
CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE 
  TO authenticated 
  USING (auth.uid()::text = user_id);

-- =====================================================
-- 18. ROW LEVEL SECURITY POLICIES - MUSICS TABLE
-- =====================================================

-- Enable RLS on musics table
ALTER TABLE musics ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view music
CREATE POLICY "Music is publicly viewable" ON musics
  FOR SELECT 
  USING (true);

-- Policy: Only admins can create music (adjust as needed)
-- For now, allow authenticated users to create music
CREATE POLICY "Authenticated users can create music" ON musics
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- =====================================================
-- 19. ROW LEVEL SECURITY POLICIES - VIDEO_VIEWS TABLE
-- =====================================================

-- Enable RLS on video_views table
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own view records
CREATE POLICY "Users can view own view records" ON video_views
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Policy: Authenticated users can create view records
CREATE POLICY "Authenticated users can create view records" ON video_views
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 20. HELPER FUNCTION: RECORD VIDEO VIEW
-- =====================================================
-- Function to safely record a video view (handles duplicates)
CREATE OR REPLACE FUNCTION record_video_view(
  p_video_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  -- Try to insert view record
  INSERT INTO video_views (video_id, user_id)
  VALUES (p_video_id, p_user_id)
  ON CONFLICT (video_id, user_id) DO NOTHING
  RETURNING true INTO v_inserted;
  
  -- If inserted, increment views_count on video
  IF v_inserted THEN
    UPDATE videos 
    SET views_count = views_count + 1 
    WHERE id = p_video_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Create storage buckets 'videos' and 'thumbnails' in Supabase Dashboard
-- 2. Configure bucket settings (public access, file size limits)
-- 3. Test video upload and view tracking functionality
-- 4. Verify RLS policies are working correctly
-- =====================================================
