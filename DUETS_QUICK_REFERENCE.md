
# 🎭 Duets & Stitches - Quick Reference

## 🚀 Quick Start

### Navigate to Duet Creation
```typescript
import { router } from 'expo-router';

router.push({
  pathname: '/duet/[videoId]',
  params: { videoId: 'video-uuid' },
});
```

### Use Duets Hook
```typescript
import { useDuets } from '@/hooks/useDuets';

const { getDuets, getDuetsCount, createDuet, loading, error } = useDuets();

// Fetch duets
const duets = await getDuets('video-uuid');

// Get count
const count = await getDuetsCount('video-uuid');
```

### Add DuetButton to UI
```typescript
import DuetButton from '@/components/DuetButton';

<DuetButton
  videoId={video.id}
  allowDuets={video.allowDuets}
  duetsCount={video.duetsCount}
/>
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos/:videoId` | GET | Get video with duet metadata |
| `/api/videos/:videoId/duets` | GET | List all duets of a video |
| `/api/videos/:videoId/duets-count` | GET | Get duet count |
| `/api/videos/upload` | POST | Upload video with duet metadata |

---

## 🎨 Components

### DuetButton
```typescript
<DuetButton
  videoId="uuid"
  allowDuets={true}
  duetsCount={42}
  onPress={() => {}}  // Optional custom handler
/>
```

### DuetPlayer
```typescript
<DuetPlayer
  originalVideoUrl="https://..."
  userVideoUrl="https://..."  // Optional
  layout="side"  // or "top-bottom"
  isRecording={false}
  onVideoEnd={() => {}}  // For stitch mode
/>
```

---

## 🔧 Video Metadata

### Duet Fields in Video Object
```typescript
interface Video {
  // Duet permissions
  allowDuets?: boolean;
  allowStitches?: boolean;
  
  // Duet metadata (if this is a duet)
  duetWithId?: string;
  isDuet?: boolean;
  isStitch?: boolean;
  duetLayout?: 'side' | 'top-bottom';
  
  // Duet info
  duetsCount?: number;
  duetWithUsername?: string;
  duetWithAvatarUrl?: string;
}
```

### Upload with Duet Metadata
```typescript
await uploadVideo(file, {
  caption: 'My duet!',
  hashtags: ['duet'],
  mentions: [],
  allowComments: true,
  allowDuet: true,
  allowStitch: true,
  visibility: 'public',
  // Duet metadata
  duetWithId: 'original-video-uuid',
  isDuet: true,
  isStitch: false,
  duetLayout: 'side',
});
```

---

## 🎯 Common Patterns

### Check if Video Allows Duets
```typescript
const canDuet = video.allowDuets || video.allowStitches;

if (canDuet) {
  // Show DuetButton
}
```

### Display Duet Indicator
```typescript
const isDuetVideo = video.isDuet || video.isStitch;
const duetText = isDuetVideo && video.duetWithUsername 
  ? `${video.isDuet ? 'Duet' : 'Stitch'} with @${video.duetWithUsername}` 
  : '';

{isDuetVideo && (
  <View style={styles.duetBadge}>
    <Text>{duetText}</Text>
  </View>
)}
```

### Format Duet Count
```typescript
const formatCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

const duetsDisplay = formatCount(video.duetsCount || 0);
```

---

## 🎨 VYXO Brand Colors

```typescript
const colors = {
  purple: '#8B5CF6',    // Primary actions
  coral: '#FF6B6B',     // Recording, alerts
  turquoise: '#00D9FF', // Duet indicators
  dark: '#0F0F0F',      // Background
};
```

---

## 🧪 Testing

### Test Duet Creation Flow
1. Navigate to duet screen
2. Select mode (Duet/Stitch)
3. Choose layout (Side/Top-Bottom)
4. Record video
5. Preview
6. Proceed to editor
7. Upload

### Test API Integration
```typescript
// Test fetching duets
const duets = await getDuets('video-uuid');
console.log('Duets:', duets);

// Test fetching count
const count = await getDuetsCount('video-uuid');
console.log('Count:', count);

// Test upload
const videoId = await uploadVideo(file, metadata);
console.log('Uploaded:', videoId);
```

---

## 🐛 Common Issues

### Issue: DuetButton not showing
**Solution:** Check if `video.allowDuets` or `video.allowStitches` is true

### Issue: Duet count not updating
**Solution:** Call `getDuetsCount()` to fetch latest count from API

### Issue: Camera permission denied
**Solution:** Request permission using `useCameraPermissions()` hook

### Issue: Video not playing in DuetPlayer
**Solution:** Check if `videoUrl` or `masterPlaylistUrl` is valid

---

## 📚 Resources

- **Full Documentation:** `DUETS_STITCHES_INTEGRATION_COMPLETE.md`
- **API Reference:** OpenAPI spec in backend
- **Components:** `components/DuetButton.tsx`, `components/DuetPlayer.tsx`
- **Hooks:** `hooks/useDuets.ts`
- **Screens:** `app/duet/[videoId].tsx`

---

**Happy Coding! 🎭✨**
