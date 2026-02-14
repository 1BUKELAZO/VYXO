
# VYXO Video System - Supabase Migration Guide

## Overview
This migration extends the VYXO video system with enhanced features including:
- Video metadata (duration, permissions, views)
- Music/soundtrack integration
- Precise view tracking
- Storage buckets for videos and thumbnails
- Automatic profile synchronization

## Files
- `vyxo-video-system.sql` - Complete SQL migration script

## Installation Steps

### 1. Execute SQL Migration
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `vyxo-video-system.sql`
4. Execute the script

### 2. Create Storage Buckets

#### Videos Bucket
1. Go to Storage → Create Bucket
2. Name: `videos`
3. Settings:
   - Public: ✅ Yes
   - File size limit: 100MB
   - Allowed MIME types: `video/mp4`, `video/quicktime`, `video/x-msvideo`

#### Thumbnails Bucket
1. Go to Storage → Create Bucket
2. Name: `thumbnails`
3. Settings:
   - Public: ✅ Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### 3. Verify Installation

Run these queries to verify the migration:

```sql
-- Check videos table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'videos'
ORDER BY ordinal_position;

-- Check musics table exists
SELECT COUNT(*) FROM musics;

-- Check video_views table exists
SELECT COUNT(*) FROM video_views;

-- Check triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('videos', 'musics', 'video_views');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('videos', 'musics', 'video_views')
ORDER BY tablename, policyname;
```

## Database Schema

### Videos Table (Extended)
```sql
videos (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- NEW COLUMNS:
  duration INTEGER NOT NULL DEFAULT 0,
  allow_comments BOOLEAN DEFAULT true,
  allow_duets BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  music_id UUID REFERENCES musics(id),
  thumbnail_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

### Musics Table (New)
```sql
musics (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  cover_url TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER,
  is_trending BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### Video Views Table (New)
```sql
video_views (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_id, user_id)
)
```

## Automatic Features

### 1. Profile Video Count Synchronization
- When a video is created → `profiles.videos_count` increments
- When a video is deleted → `profiles.videos_count` decrements
- Handled by database triggers automatically

### 2. Music Usage Tracking
- When a video uses music → `musics.usage_count` increments
- When video music changes → old music decrements, new music increments
- When video is deleted → music usage_count decrements

### 3. View Tracking
- Use `record_video_view(video_id, user_id)` function to record views
- Prevents duplicate views (one view per user per video)
- Automatically updates `videos.views_count`

### 4. Updated Timestamp
- `videos.updated_at` automatically updates on any video modification

## Usage Examples

### Record a Video View
```sql
SELECT record_video_view(
  'video-uuid-here'::UUID,
  auth.uid()
);
```

### Get Trending Music
```sql
SELECT * FROM musics
WHERE is_trending = true
ORDER BY usage_count DESC
LIMIT 10;
```

### Get Video with Music Info
```sql
SELECT 
  v.*,
  m.title as music_title,
  m.artist as music_artist,
  m.audio_url as music_url
FROM videos v
LEFT JOIN musics m ON v.music_id = m.id
WHERE v.id = 'video-uuid-here';
```

### Get User's Video Stats
```sql
SELECT 
  COUNT(*) as total_videos,
  SUM(views_count) as total_views,
  SUM(likes_count) as total_likes,
  AVG(duration) as avg_duration
FROM videos
WHERE user_id = 'user-id-here';
```

## Security

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

**Videos:**
- ✅ Public read access
- ✅ Authenticated users can create
- ✅ Users can only update/delete their own videos

**Musics:**
- ✅ Public read access
- ✅ Authenticated users can create (adjust for admin-only if needed)

**Video Views:**
- ✅ Users can only view their own view records
- ✅ Users can only create views for themselves

**Storage:**
- ✅ Public read access for videos and thumbnails
- ✅ Users can only upload to their own folder
- ✅ Users can only delete their own files

## Troubleshooting

### Issue: Triggers not firing
```sql
-- Check if triggers exist
SELECT * FROM pg_trigger WHERE tgname LIKE '%video%';

-- Manually test trigger functions
SELECT increment_video_count();
```

### Issue: RLS blocking operations
```sql
-- Temporarily disable RLS for testing (NOT for production)
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
```

### Issue: Storage policies not working
1. Verify buckets are created and public
2. Check policy names don't conflict with existing policies
3. Test with authenticated user token

## Next Steps

1. ✅ Execute SQL migration
2. ✅ Create storage buckets
3. ✅ Verify installation
4. 🔄 Update frontend to use new fields
5. 🔄 Implement video upload with thumbnails
6. 🔄 Add music selection UI
7. 🔄 Implement view tracking
8. 🔄 Test all features end-to-end

## Support

For issues or questions:
1. Check Supabase logs in Dashboard
2. Verify RLS policies are correct
3. Test with SQL Editor before implementing in app
4. Review storage bucket settings
