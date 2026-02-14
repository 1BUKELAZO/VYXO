
# 🚀 VYXO Quick Reference Guide

## 📱 Start the App

```bash
npm start
```

Then press:
- `w` - Open in web browser
- `i` - Open in iOS simulator
- `a` - Open in Android emulator

---

## 🔐 Test Credentials

```
Email: test@vyxo.com
Password: Test123!
```

---

## 🎯 Key Files

### API Integration
- `utils/api.ts` - Centralized API client
- `contexts/AuthContext.tsx` - Authentication context
- `lib/auth.ts` - Better Auth client

### Screens
- `app/(tabs)/(home)/index.tsx` - Video feed
- `app/comments/[videoId].tsx` - Comments
- `app/(tabs)/profile.tsx` - Profile
- `app/discover.tsx` - Search & discovery
- `app/notifications.tsx` - Notifications
- `app/messages/index.tsx` - Messages list
- `app/messages/[conversationId].tsx` - Chat

### Components
- `components/ui/Modal.tsx` - Custom modal
- `components/ui/Toast.tsx` - Toast notifications
- `components/FloatingTabBar.tsx` - Tab bar

---

## 🔌 API Usage

### Making API Calls

```typescript
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';

// GET request
const videos = await authenticatedGet<Video[]>('/api/videos/feed');

// POST request
const response = await authenticatedPost('/api/videos/123/like', {});

// DELETE request
const response = await authenticatedDelete('/api/videos/123/like');
```

### Error Handling

```typescript
try {
  const data = await authenticatedGet('/api/endpoint');
  // Success
} catch (error) {
  console.error('[API] Error:', error);
  showToast('Failed to load data', 'error');
}
```

---

## 🎨 UI Patterns

### Show Toast

```typescript
const [toastVisible, setToastVisible] = useState(false);
const [toastMessage, setToastMessage] = useState('');
const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  setToastMessage(message);
  setToastType(type);
  setToastVisible(true);
};

// In JSX
<Toast
  visible={toastVisible}
  message={toastMessage}
  type={toastType}
  onHide={() => setToastVisible(false)}
/>
```

### Show Modal

```typescript
const [modalVisible, setModalVisible] = useState(false);

// In JSX
<Modal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  title="Confirm"
  message="Are you sure?"
  type="confirm"
  onConfirm={handleConfirm}
/>
```

---

## 🔄 Common Patterns

### Optimistic Updates

```typescript
const handleLike = async () => {
  // Save previous state
  const previousLiked = isLiked;
  const previousCount = likesCount;
  
  // Update UI immediately
  setIsLiked(!isLiked);
  setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
  
  try {
    // Make API call
    const response = await authenticatedPost('/api/videos/123/like', {});
    // Update with server response
    setLikesCount(response.likesCount);
  } catch (error) {
    // Revert on error
    setIsLiked(previousLiked);
    setLikesCount(previousCount);
  }
};
```

### Loading States

```typescript
const [loading, setLoading] = useState(true);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await authenticatedGet('/api/endpoint');
    setData(data);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// In JSX
{loading ? (
  <ActivityIndicator size="large" color={colors.primary} />
) : (
  <DataComponent data={data} />
)}
```

---

## 🎯 Video Feed

### Play/Pause Video

```typescript
const [isPlaying, setIsPlaying] = useState(true);

const togglePlayPause = () => {
  if (isPlaying) {
    player.pause();
    setIsPlaying(false);
  } else {
    player.play();
    setIsPlaying(true);
  }
};

// In JSX
<Pressable onPress={togglePlayPause}>
  <VideoView player={player} />
</Pressable>
```

### Like Video

```typescript
const handleLike = async () => {
  try {
    if (isLiked) {
      await authenticatedDelete(`/api/videos/${videoId}/like`);
    } else {
      await authenticatedPost(`/api/videos/${videoId}/like`, {});
    }
  } catch (error) {
    console.error(error);
  }
};
```

### Share Video

```typescript
import { Share } from 'react-native';

const handleShare = async () => {
  try {
    await Share.share({
      message: `Check out this video on VYXO!\n\nhttps://vyxo.app/video/${videoId}`,
      url: `https://vyxo.app/video/${videoId}`,
    });
  } catch (error) {
    console.error(error);
  }
};
```

---

## 🔐 Authentication

### Sign In

```typescript
const { signInWithEmail } = useAuth();

const handleSignIn = async () => {
  try {
    await signInWithEmail(email, password);
    router.replace('/');
  } catch (error) {
    console.error(error);
  }
};
```

### Sign Out

```typescript
const { signOut } = useAuth();

const handleSignOut = async () => {
  try {
    await signOut();
    router.replace('/auth');
  } catch (error) {
    console.error(error);
  }
};
```

### Check Auth State

```typescript
const { user, loading } = useAuth();

if (loading) {
  return <LoadingScreen />;
}

if (!user) {
  return <Redirect href="/auth" />;
}

return <AppContent />;
```

---

## 🎨 Styling

### Colors

```typescript
import { colors } from '@/styles/commonStyles';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background, // #0F0F0F
  },
  text: {
    color: colors.text, // #FFFFFF
  },
  button: {
    backgroundColor: colors.primary, // #8B5CF6
  },
  card: {
    backgroundColor: colors.card, // #1A1A1A
  },
});
```

---

## 🐛 Debugging

### Console Logs

All API calls are logged:
```
[API] Calling: https://backend.com/api/videos/feed GET
[API] Success: { videos: [...] }
```

### Check Backend URL

```typescript
import { BACKEND_URL } from '@/utils/api';
console.log('Backend URL:', BACKEND_URL);
```

### Check Auth Token

```typescript
import { getBearerToken } from '@/utils/api';
const token = await getBearerToken();
console.log('Token:', token);
```

---

## 📊 Performance Tips

1. **Use Optimistic Updates** - Update UI immediately, revert on error
2. **Lazy Load** - Load data only when needed
3. **Debounce Search** - Wait 500ms before searching
4. **Cache Data** - Store frequently accessed data
5. **Efficient Rendering** - Use `FlatList` for long lists

---

## ✅ Checklist Before Deployment

- [ ] Test all features
- [ ] Check error handling
- [ ] Verify loading states
- [ ] Test on iOS, Android, Web
- [ ] Check console for errors
- [ ] Verify API calls
- [ ] Test authentication flow
- [ ] Check session persistence
- [ ] Test offline behavior
- [ ] Verify deep linking

---

---

## 🎯 Ads System

### Create Ad Campaign

```typescript
import { useAds } from '@/hooks/useAds';

const { createAdCampaign } = useAds();

const handleCreateCampaign = async () => {
  try {
    await createAdCampaign({
      name: 'Summer Sale 2024',
      budget: 500.00,
      creative_url: 'https://example.com/video.mp4',
      cta_text: 'Shop Now',
      cta_url: 'https://example.com/sale',
      target_audience: {
        age_range: '18-24',
        interests: ['fashion', 'tech'],
        locations: ['New York', 'Los Angeles']
      }
    });
    showToast('Campaign created!', 'success');
  } catch (error) {
    showToast('Failed to create campaign', 'error');
  }
};
```

### View Campaign Analytics

```typescript
const { fetchCampaignAnalytics } = useAds();

const loadAnalytics = async (campaignId: string) => {
  try {
    const analytics = await fetchCampaignAnalytics(campaignId);
    // analytics = { impressions, clicks, ctr, spent, conversions }
    console.log('CTR:', analytics.ctr);
  } catch (error) {
    console.error(error);
  }
};
```

### Update Campaign Status

```typescript
const { updateCampaignStatus } = useAds();

const pauseCampaign = async (campaignId: string) => {
  try {
    await updateCampaignStatus(campaignId, 'paused');
    showToast('Campaign paused', 'success');
  } catch (error) {
    showToast('Failed to pause campaign', 'error');
  }
};
```

### Display Ad in Feed

Ads are automatically injected by `useFeedAlgorithm`:

```typescript
const { feedItems } = useFeedAlgorithm({ type: 'foryou' });

// feedItems contains both videos and ads
// Ads appear every 5 videos automatically

// Render feed item
const renderItem = ({ item }: { item: FeedItem }) => {
  if ('type' in item && item.type === 'ad') {
    return <AdCard ad={item} isFocused={isFocused} />;
  }
  return <VideoItem video={item} />;
};
```

### Record Ad Click

```typescript
const { recordAdClick } = useAds();

const handleAdClick = async (impressionId: string) => {
  try {
    await recordAdClick(impressionId);
    // Click recorded in analytics
  } catch (error) {
    console.error(error);
  }
};
```

### Navigate to Ads Dashboard

```typescript
import { router } from 'expo-router';

// View all campaigns
router.push('/ads/dashboard');

// Create new campaign
router.push('/ads/create');
```

---

## 💬 Direct Messaging

### Start a Conversation

```typescript
// From user profile
<TouchableOpacity
  onPress={() => router.push(`/messages/${userId}`)}
>
  <Text>Mensaje</Text>
</TouchableOpacity>
```

### Send a Message

```typescript
import { useMessages } from '@/hooks/useMessages';

const { sendMessage } = useMessages(currentUserId, conversationId);

const handleSend = async (content: string) => {
  try {
    await sendMessage(recipientId, content);
  } catch (error) {
    console.error(error);
  }
};
```

### Get Conversations

```typescript
const { conversations, loading, fetchConversations } = useMessages(currentUserId);

useEffect(() => {
  fetchConversations();
}, []);

// In JSX
{conversations.map((conv) => (
  <ChatListItem
    key={conv.id}
    conversation={conv}
    onPress={() => router.push(`/messages/${conv.id}`)}
  />
))}
```

### Get Messages

```typescript
const { messages, loading, fetchMessages } = useMessages(currentUserId, conversationId);

useEffect(() => {
  fetchMessages(conversationId);
}, [conversationId]);

// In JSX
<FlatList
  data={messages}
  renderItem={({ item }) => (
    <ChatMessage
      message={item}
      isCurrentUser={item.senderId === currentUserId}
    />
  )}
/>
```

### Mark as Read

```typescript
const { markConversationAsRead } = useMessages(currentUserId, conversationId);

useEffect(() => {
  markConversationAsRead(conversationId);
}, [conversationId]);
```

### Real-time Updates

```typescript
// Polling every 5 seconds
useEffect(() => {
  if (!conversationId) return;
  
  const interval = setInterval(() => {
    fetchMessages(conversationId);
  }, 5000);
  
  return () => clearInterval(interval);
}, [conversationId]);
```

---

## 🎉 You're Ready!

Everything is set up and working. Just run `npm start` and start testing!

For detailed testing scenarios, see `DEMO_CREDENTIALS.md`.
For integration status, see `BACKEND_INTEGRATION_COMPLETE.md`.
For completion summary, see `INTEGRATION_COMPLETE.md`.
