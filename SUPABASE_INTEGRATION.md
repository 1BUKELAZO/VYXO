
# Supabase Integration for VYXO

This document explains how to use the Supabase integration in the VYXO app.

## 📦 Installation

The following packages have been installed:
- `@supabase/supabase-js` - Official Supabase JavaScript client
- `@react-native-async-storage/async-storage` - Required for session persistence
- `react-native-url-polyfill` - Required for URL parsing in React Native

## 🔧 Configuration

### Environment Variables

The Supabase credentials are configured in `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://mlrdmavdnfofkqueqmra.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### Supabase Client

The Supabase client is initialized in `lib/supabaseClient.ts`:

```typescript
import { supabase } from '@/lib/supabaseClient';
```

## 🔐 Authentication

### Using Supabase Auth Context

Wrap your app with `SupabaseAuthProvider` (optional, if you want to use Supabase auth instead of Better Auth):

```typescript
import { SupabaseAuthProvider, useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

// In your component
const { user, signInWithEmail, signUpWithEmail, signOut } = useSupabaseAuth();
```

### Authentication Methods

```typescript
// Sign in with email/password
await signInWithEmail('user@example.com', 'password123');

// Sign up with email/password
await signUpWithEmail('user@example.com', 'password123', { name: 'John Doe' });

// Sign in with OAuth (Google, Apple, GitHub)
await signInWithOAuth('google');

// Sign out
await signOut();
```

## 📊 Database Hooks

### useVideos Hook

Fetch and manage videos:

```typescript
import { useVideos } from '@/utils/hooks/useVideos';

const { videos, loading, error, createVideo, updateVideo, deleteVideo } = useVideos();

// Create a video
await createVideo({
  user_id: userId,
  video_url: 'https://...',
  thumbnail_url: 'https://...',
  caption: 'My video',
  likes_count: 0,
  comments_count: 0,
  shares_count: 0,
});

// Update a video
await updateVideo(videoId, { caption: 'Updated caption' });

// Delete a video
await deleteVideo(videoId);
```

### useUsers Hook

Fetch and manage user profiles:

```typescript
import { useUsers } from '@/utils/hooks/useUsers';

const { users, loading, getUserProfile, updateUserProfile, searchUsers } = useUsers();

// Get a user profile
const { data: profile } = await getUserProfile(userId);

// Update user profile
await updateUserProfile(userId, { bio: 'New bio' });

// Search users
const { data: results } = await searchUsers('john');
```

### useInteractions Hook

Manage likes, comments, and follows:

```typescript
import { useInteractions } from '@/utils/hooks/useInteractions';

const { likes, comments, likeVideo, unlikeVideo, createComment, followUser } = useInteractions(videoId);

// Like a video
await likeVideo(videoId, userId);

// Unlike a video
await unlikeVideo(videoId, userId);

// Create a comment
await createComment(videoId, userId, 'Great video!');

// Follow a user
await followUser(followerId, followingId);
```

## 📁 Storage Functions

Upload and manage files in Supabase Storage:

```typescript
import { uploadVideo, uploadImage, deleteFile } from '@/utils/supabaseStorage';

// Upload a video
const videoUrl = await uploadVideo(videoFile, userId);

// Upload an image (avatar, thumbnail, or cover)
const avatarUrl = await uploadImage(imageFile, userId, 'avatars');
const thumbnailUrl = await uploadImage(imageFile, userId, 'thumbnails');

// Delete a file
await deleteFile('videos/user123/video.mp4');
```

## 🔄 Real-time Subscriptions

The `useVideos` hook automatically subscribes to real-time updates:

```typescript
// Videos will automatically update when changes occur in the database
const { videos } = useVideos();
```

## 📝 Database Schema

The integration expects the following tables in Supabase:

### videos
- `id` (uuid, primary key)
- `user_id` (text)
- `video_url` (text)
- `thumbnail_url` (text)
- `caption` (text)
- `music_name` (text, optional)
- `likes_count` (integer)
- `comments_count` (integer)
- `shares_count` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp, optional)

### user_profiles
- `id` (uuid, primary key)
- `username` (text)
- `name` (text, optional)
- `avatar_url` (text, optional)
- `bio` (text, optional)
- `followers_count` (integer)
- `following_count` (integer)
- `likes_count` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp, optional)

### likes
- `id` (uuid, primary key)
- `user_id` (text)
- `video_id` (uuid, foreign key to videos)
- `created_at` (timestamp)

### comments
- `id` (uuid, primary key)
- `user_id` (text)
- `video_id` (uuid, foreign key to videos)
- `content` (text)
- `likes_count` (integer)
- `replies_count` (integer)
- `parent_id` (uuid, optional, foreign key to comments)
- `created_at` (timestamp)
- `updated_at` (timestamp, optional)

### follows
- `id` (uuid, primary key)
- `follower_id` (text)
- `following_id` (text)
- `created_at` (timestamp)

## 🪣 Storage Buckets

Create a bucket named `vyxo-media` in Supabase Storage with the following structure:

```
vyxo-media/
├── videos/
│   └── {userId}/
│       └── {timestamp}.mp4
├── thumbnails/
│   └── {userId}/
│       └── {timestamp}.jpg
├── avatars/
│   └── {userId}/
│       └── {timestamp}.jpg
└── covers/
    └── {userId}/
        └── {timestamp}.jpg
```

## 🔒 Security

### Row Level Security (RLS)

Make sure to enable RLS on all tables and create appropriate policies:

```sql
-- Example: Allow users to read all videos
CREATE POLICY "Videos are viewable by everyone"
ON videos FOR SELECT
USING (true);

-- Example: Allow users to insert their own videos
CREATE POLICY "Users can insert their own videos"
ON videos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Example: Allow users to update their own videos
CREATE POLICY "Users can update their own videos"
ON videos FOR UPDATE
USING (auth.uid() = user_id);
```

## 🚀 Usage Example

See `components/SupabaseExample.tsx` for a complete example of how to use all the Supabase features.

## 🔄 Migrating from Better Auth to Supabase Auth

If you want to use Supabase Auth instead of Better Auth:

1. Replace `AuthProvider` with `SupabaseAuthProvider` in `app/_layout.tsx`
2. Replace `useAuth` with `useSupabaseAuth` in your components
3. Update authentication flows to use Supabase auth methods

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
