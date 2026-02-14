-- Drop music_name column from videos table if it exists
ALTER TABLE "videos" DROP COLUMN IF EXISTS "music_name";
