
# API Integration Reference

This document provides a quick reference for how the backend API is integrated into the VYXO app.

## 🔧 API Client Setup

### Base Configuration (`utils/api.ts`)

```typescript
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';

// All API calls automatically:
// 1. Read backend URL from app.json
// 2. Inject Bearer token from storage
// 3. Handle errors gracefully
// 4. Log requests and responses
```

### Authentication (`lib/auth.ts`)

```typescript
import { authClient } from '@/lib/auth';

// Better Auth client with:
// - Email/password authentication
// - Google OAuth (web popup)
// - Apple OAuth (native deep linking)
// - Automatic token management
```

## 📚 API Usage Examples

### 1. Fetching Data (GET)

```typescript
// Simple GET request
const videos = await authenticatedGet<Video[]>('/api/videos/feed');

// GET with query parameters
const results = await authenticatedGet<SearchResult[]>(
  `/api/search?q=${encodeURIComponent(query)}&type=${type}`
);
```

### 2. Creating Data (POST)

```typescript
// POST with body
const comment = await authenticatedPost('/api/videos/:videoId/comments', {
  content: 'Great video!',
  parentCommentId: null, // optional
});

// POST without body (like action)
const response = await authenticatedPost('/api/videos/:id/like', {});
```

### 3. Updating Data (PUT)

```typescript
// Mark notification as read
await authenticatedPut('/api/notifications/:id/read', {});

// Mark all notifications as read
await authenticatedPut('/api/notifications/read-all', {});
```

### 4. Deleting Data (DELETE)

```typescript
// Unlike a video
await authenticatedDelete('/api/videos/:id/like');

// Delete a comment
await authenticatedDelete('/api/comments/:id');
```

## 🎯 Common Patterns

### Pattern 1: Optimistic Updates

```typescript
const handleLike = async (videoId: string) => {
  // 1. Update UI immediately
  setIsLiked(true);
  setLikesCount(prev => prev + 1);
  
  try {
    // 2. Send request to backend
    const response = await authenticatedPost(`/api/videos/${videoId}/like`, {});
    
    // 3. Update with real data
    setLikesCount(response.likesCount);
  } catch (error) {
    // 4. Revert on error
    setIsLiked(false);
    setLikesCount(prev => prev - 1);
    showToast('Failed to like video', 'error');
  }
};
```

### Pattern 2: Loading States

```typescript
const [loading, setLoading] = useState(true);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await authenticatedGet('/api/endpoint');
    setData(data);
  } catch (error) {
    showToast('Failed to load data', 'error');
  } finally {
    setLoading(false);
  }
};

// In render:
{loading ? <ActivityIndicator /> : <DataView data={data} />}
```

### Pattern 3: Error Handling

```typescript
try {
  const response = await authenticatedPost('/api/endpoint', data);
  showToast('Success!', 'success');
} catch (error) {
  console.error('[API] Error:', error);
  showToast('Operation failed', 'error');
}
```

### Pattern 4: Polling for Updates

```typescript
useEffect(() => {
  fetchData();
  
  // Poll every 3 seconds
  const interval = setInterval(fetchData, 3000);
  
  return () => clearInterval(interval);
}, []);
```

## 🔐 Authentication Flow

### Sign In

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { signInWithEmail } = useAuth();

await signInWithEmail('user@example.com', 'password123');
// Token is automatically stored and used in all API calls
```

### Sign Out

```typescript
const { signOut } = useAuth();

await signOut();
// Token is cleared from storage
// User is redirected to auth screen
```

### Check Session

```typescript
const { user, loading } = useAuth();

if (loading) return <LoadingScreen />;
if (!user) return <AuthScreen />;
return <AppContent />;
```

## 📱 Screen-Specific Integrations

### Home Feed (`app/(tabs)/(home)/index.tsx`)

```typescript
// Fetch videos
const videos = await authenticatedGet<Video[]>('/api/videos/feed');

// Like video
await authenticatedPost(`/api/videos/${videoId}/like`, {});

// Unlike video
await authenticatedDelete(`/api/videos/${videoId}/like`);

// Share video
await authenticatedPost(`/api/videos/${videoId}/share`, {});
```

### Comments (`app/comments/[videoId].tsx`)

```typescript
// Fetch comments
const comments = await authenticatedGet<Comment[]>(`/api/videos/${videoId}/comments`);

// Post comment
await authenticatedPost(`/api/videos/${videoId}/comments`, {
  content: 'Nice video!',
  parentCommentId: null, // or parent comment ID for replies
});

// Like comment
await authenticatedPost(`/api/comments/${commentId}/like`, {});

// Delete comment
await authenticatedDelete(`/api/comments/${commentId}`);
```

### Messages (`app/messages/`)

```typescript
// Fetch conversations
const conversations = await authenticatedGet<Conversation[]>('/api/conversations');

// Fetch messages
const messages = await authenticatedGet<Message[]>(`/api/conversations/${conversationId}/messages`);

// Send message
await authenticatedPost(`/api/conversations/${userId}/messages`, {
  content: 'Hello!',
});

// Mark as read
await authenticatedPut(`/api/messages/${messageId}/read`, {});
```

### Notifications (`app/notifications.tsx`)

```typescript
// Fetch notifications
const notifications = await authenticatedGet<Notification[]>('/api/notifications');

// Mark as read
await authenticatedPut(`/api/notifications/${notificationId}/read`, {});

// Mark all as read
await authenticatedPut('/api/notifications/read-all', {});
```

### Discover (`app/discover.tsx`)

```typescript
// Search
const results = await authenticatedGet<SearchResult[]>(
  `/api/search?q=${encodeURIComponent(query)}&type=${type}`
);

// Trending hashtags
const hashtags = await authenticatedGet<Hashtag[]>('/api/trending/hashtags');

// Popular sounds
const sounds = await authenticatedGet<Sound[]>('/api/trending/sounds');
```

### Live Streaming (`app/live/`)

```typescript
// Start stream
const { streamId, streamUrl } = await authenticatedPost('/api/live/start', {
  title: 'My Live Stream',
});

// Get stream info
const stream = await authenticatedGet<StreamInfo>(`/api/live/${streamId}`);

// Send chat message
await authenticatedPost(`/api/live/${streamId}/chat`, {
  message: 'Hello everyone!',
});

// Get chat messages
const messages = await authenticatedGet<ChatMessage[]>(`/api/live/${streamId}/chat`);
```

### Profile (`app/(tabs)/profile.tsx`)

```typescript
// Fetch user profile
const profile = await authenticatedGet<UserProfile>(`/api/users/${userId}`);
```

## 🛠️ Debugging

### Enable Detailed Logging

All API calls are automatically logged with the `[API]` prefix:

```
[API] Calling: https://backend.com/api/videos/feed GET
[API] Fetch options: {...}
[API] Success: {...}
```

### Check Token

```typescript
import { getBearerToken } from '@/utils/api';

const token = await getBearerToken();
console.log('Current token:', token);
```

### Verify Backend URL

```typescript
import { BACKEND_URL, isBackendConfigured } from '@/utils/api';

console.log('Backend URL:', BACKEND_URL);
console.log('Is configured:', isBackendConfigured());
```

## ⚠️ Common Issues

### Issue: 401 Unauthorized

**Cause**: Token is missing or expired

**Solution**:
1. Check if user is signed in: `const { user } = useAuth()`
2. Try signing out and back in
3. Check token in storage: `await getBearerToken()`

### Issue: Network Error

**Cause**: Backend is down or network is unavailable

**Solution**:
1. Check internet connectivity
2. Verify backend URL in `app.json`
3. Check backend deployment status

### Issue: CORS Error (Web)

**Cause**: Backend doesn't allow requests from web origin

**Solution**:
1. Ensure backend has CORS enabled
2. Check `credentials: 'include'` in fetch options
3. Verify backend accepts the web origin

## 📖 TypeScript Types

### Video

```typescript
interface Video {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  musicName: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  createdAt: string;
}
```

### Comment

```typescript
interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  content: string;
  likesCount: number;
  isLiked: boolean;
  repliesCount: number;
  createdAt: string;
  replies?: Comment[];
}
```

### Message

```typescript
interface Message {
  id: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}
```

### Notification

```typescript
interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  actor: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  video?: {
    id: string;
    thumbnailUrl: string;
  };
  isRead: boolean;
  createdAt: string;
}
```

## 🎉 Best Practices

1. **Always use the API wrapper** - Never use raw `fetch()` in components
2. **Handle errors gracefully** - Show user-friendly error messages
3. **Use optimistic updates** - Update UI immediately, revert on error
4. **Show loading states** - Use `ActivityIndicator` during async operations
5. **Log API calls** - Use `console.log('[API] ...')` for debugging
6. **Type your responses** - Use TypeScript interfaces for type safety
7. **Clean up subscriptions** - Clear intervals and listeners in `useEffect` cleanup
8. **Use Toast for feedback** - Show success/error messages to users
9. **Avoid Alert.alert()** - Use custom Modal component for web compatibility
10. **Test on all platforms** - Verify functionality on iOS, Android, and Web

---

**Happy Coding! 🚀**
