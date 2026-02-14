
# 🚀 MUX INTEGRATION - QUICK REFERENCE

## 📦 Installation

```bash
npm install @mux/mux-player-react
```

## 🔑 Environment Variables

```bash
# Backend .env
MUX_TOKEN_ID=your_token_id
MUX_TOKEN_SECRET=your_token_secret
MUX_WEBHOOK_SECRET=your_webhook_secret
```

## 🎬 Upload Video

```tsx
import { useMuxUpload } from '@/hooks/useMuxUpload';

const { uploadVideo, state } = useMuxUpload();

await uploadVideo(
  { uri: videoUri, type: 'video/mp4', size: 0 },
  {
    caption: 'My video',
    hashtags: ['vyxo'],
    mentions: [],
    allowComments: true,
    allowDuet: true,
    allowStitch: true,
    visibility: 'public',
  }
);

// state.status: 'idle' | 'creating_upload' | 'uploading' | 'processing' | 'ready' | 'error'
// state.progress: 0-100
```

## 📺 Display Video

```tsx
import MuxPlayer from '@mux/mux-player-react/lazy';

const useMuxPlayer = !!video.muxPlaybackId && video.status === 'ready';

{useMuxPlayer ? (
  <MuxPlayer
    playbackId={video.muxPlaybackId}
    streamType="on-demand"
    autoPlay
    loop
    muted={false}
    controls={false}
    poster={video.muxThumbnailUrl}
    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
  />
) : (
  <VideoView player={player} style={{ width: '100%', height: '100%' }} />
)}
```

## 🔌 API Endpoints

### Create Upload
```
POST /api/mux/create-upload
→ { uploadUrl, uploadId, assetId }
```

### Upload Video
```
POST /api/videos/upload
Body: { muxUploadId, muxAssetId, caption, ... }
→ { videoId, status: 'uploading' }
```

### Get Feed
```
GET /api/videos/feed
→ [{ id, videoUrl, muxPlaybackId, status, ... }]
```

## 🎨 Video Status

| Status | Display |
|--------|---------|
| `uploading` | Processing spinner |
| `processing` | Processing spinner |
| `ready` | Mux Player (HLS) |
| `error` | Error message |

## 🌐 Mux URLs

```
HLS Playlist: https://stream.mux.com/{playbackId}.m3u8
Thumbnail: https://image.mux.com/{playbackId}/thumbnail.jpg
GIF: https://image.mux.com/{playbackId}/animated.gif
```

## 🐛 Debug

```bash
# Check backend logs
grep "Mux" backend/logs/*.log

# Check Mux dashboard
https://dashboard.mux.com/video/uploads
```

## ✅ Checklist

- [ ] Environment variables set
- [ ] Video uploads successfully
- [ ] Webhook received (check logs)
- [ ] Video plays with Mux Player
- [ ] Fallback works if Mux fails
