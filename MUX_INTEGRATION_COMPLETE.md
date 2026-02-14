
# ✅ MUX INTEGRATION COMPLETE - VYXO

## 🎯 Overview

VYXO now uses **Mux** for professional video streaming with HLS adaptive bitrate, automatic thumbnails, and async processing via webhooks.

---

## 🏗️ Architecture

### **Frontend → Backend → Mux Flow**

1. **User uploads video** via `VideoEditor.tsx`
2. **Frontend calls** `POST /api/mux/create-upload` to get signed URL
3. **Frontend uploads** video directly to Mux (bypassing backend for large files)
4. **Frontend creates** video record via `POST /api/videos/upload` with `muxUploadId` and `muxAssetId`
5. **Mux processes** video asynchronously
6. **Mux webhook** calls `POST /api/mux/webhook` when video is ready
7. **Backend updates** video status to `ready` and stores `muxPlaybackId`
8. **Frontend displays** video using Mux Player with HLS streaming

---

## 📁 Files Created/Modified

### **Backend**
- ✅ `backend/src/routes/mux.ts` - Mux API routes (create-upload, webhook, playback)
- ✅ `backend/src/db/schema.ts` - Added Mux fields to videos table

### **Frontend**
- ✅ `hooks/useMuxUpload.ts` - Custom hook for Mux upload workflow
- ✅ `components/VideoEditor.tsx` - Uses `useMuxUpload` hook
- ✅ `app/(tabs)/(home)/index.tsx` - Renders Mux Player when `muxPlaybackId` exists
- ✅ `app/(tabs)/(home)/index.ios.tsx` - iOS version with Mux Player

### **Dependencies**
- ✅ `@mux/mux-player-react` - Mux Player component for React

---

## 🗄️ Database Schema

### **Videos Table - Mux Fields**

```sql
ALTER TABLE videos ADD COLUMN IF NOT EXISTS 
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  mux_upload_id TEXT,
  status TEXT DEFAULT 'uploading', -- 'uploading', 'processing', 'ready', 'error'
  duration INTEGER, -- seconds
  aspect_ratio TEXT, -- '9:16', '16:9'
  max_resolution TEXT, -- '1080p', '720p', '4k'
  master_playlist_url TEXT, -- HLS master playlist
  mux_thumbnail_url TEXT, -- Mux-generated thumbnail
  gif_url TEXT; -- Animated GIF preview
```

---

## 🔌 API Endpoints

### **1. Create Mux Upload**
```
POST /api/mux/create-upload
Authorization: Bearer <token>
Body: { corsOrigin?: string }

Response:
{
  uploadUrl: string,    // Signed URL for direct upload
  uploadId: string,     // Mux upload ID
  assetId: string       // Mux asset ID
}
```

### **2. Mux Webhook Handler**
```
POST /api/mux/webhook
Headers: { mux-signature: <signature> }
Body: Mux webhook payload

Events handled:
- video.upload.asset_created → Update muxAssetId
- video.asset.ready → Update status, muxPlaybackId, thumbnails
- video.asset.errored → Update status to 'error'
```

### **3. Get Playback Info**
```
GET /api/mux/playback/:videoId
Authorization: Bearer <token>

Response:
{
  playbackId: string,
  playbackUrl: string,  // HLS URL
  thumbnailUrl: string,
  gifUrl: string,
  status: string,
  duration: number
}
```

### **4. Video Feed (Updated)**
```
GET /api/videos/feed
Authorization: Bearer <token>

Response includes Mux fields:
[{
  id: string,
  videoUrl: string,           // HLS URL if Mux ready, else storage URL
  muxPlaybackId?: string,
  muxThumbnailUrl?: string,
  status: string,             // 'uploading' | 'processing' | 'ready' | 'error'
  masterPlaylistUrl?: string,
  gifUrl?: string,
  ...
}]
```

---

## 🎬 Frontend Usage

### **Upload Video with Mux**

```tsx
import { useMuxUpload } from '@/hooks/useMuxUpload';

function VideoEditor({ videoUri }: { videoUri: string }) {
  const { uploadVideo, state } = useMuxUpload();

  const handlePost = async () => {
    const file = { uri: videoUri, type: 'video/mp4', size: 0 };
    const metadata = {
      caption: 'My video',
      hashtags: ['vyxo'],
      mentions: [],
      allowComments: true,
      allowDuet: true,
      allowStitch: true,
      visibility: 'public',
    };

    await uploadVideo(file, metadata);
  };

  return (
    <View>
      <Text>Upload Progress: {state.progress}%</Text>
      <Text>Status: {state.status}</Text>
      <Button onPress={handlePost} title="Post" />
    </View>
  );
}
```

### **Display Video with Mux Player**

```tsx
import MuxPlayer from '@mux/mux-player-react/lazy';
import { VideoView, useVideoPlayer } from 'expo-video';

function VideoItem({ video }: { video: Video }) {
  const useMuxPlayer = !!video.muxPlaybackId && video.status === 'ready';

  if (useMuxPlayer) {
    return (
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
    );
  }

  // Fallback to native video player
  const player = useVideoPlayer(video.videoUrl);
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} />;
}
```

---

## 🔐 Environment Variables

Add these to your backend `.env`:

```bash
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_mux_webhook_secret
```

**Get credentials from:** https://dashboard.mux.com/settings/access-tokens

---

## 🔄 Upload Workflow

### **Step-by-Step**

1. **User records/selects video** → `VideoRecorder.tsx` or gallery
2. **User edits video** → `VideoEditor.tsx` (caption, settings)
3. **User taps "Post"** → `useMuxUpload.uploadVideo()` is called
4. **Frontend requests upload URL** → `POST /api/mux/create-upload`
5. **Backend calls Mux API** → Creates direct upload, returns signed URL
6. **Frontend uploads video** → Direct to Mux (with progress tracking)
7. **Frontend creates DB record** → `POST /api/videos/upload` with `muxUploadId`, `muxAssetId`
8. **Video status: "uploading"** → Shows in feed with processing overlay
9. **Mux processes video** → Transcoding, HLS generation, thumbnails
10. **Mux sends webhook** → `POST /api/mux/webhook` (video.asset.ready)
11. **Backend updates video** → Status: "ready", adds `muxPlaybackId`, `masterPlaylistUrl`
12. **Frontend refreshes feed** → Video now plays with Mux Player (HLS streaming)

---

## 🎨 Video States

| Status | Description | Frontend Display |
|--------|-------------|------------------|
| `uploading` | Video being uploaded to Mux | Processing overlay with spinner |
| `processing` | Mux is transcoding video | Processing overlay with spinner |
| `ready` | Video ready for playback | Mux Player with HLS streaming |
| `error` | Upload/processing failed | Error message, retry option |

---

## 🌐 Mux Features

### **Adaptive Bitrate Streaming (HLS)**
- Automatically adjusts quality based on network speed
- Smooth playback on slow connections
- No buffering on fast connections

### **Automatic Thumbnails**
- Mux generates thumbnail at 1 second mark
- Available at: `https://image.mux.com/{playbackId}/thumbnail.jpg`
- Customizable: `?width=640&height=1138&fit_mode=smartcrop&time=1`

### **Animated GIF Previews**
- Mux generates animated GIF preview
- Available at: `https://image.mux.com/{playbackId}/animated.gif`
- Customizable: `?width=320&height=569&fps=15`

### **Webhook Events**
- `video.upload.asset_created` - Upload complete, asset created
- `video.asset.ready` - Video ready for playback
- `video.asset.errored` - Processing failed

---

## 🧪 Testing

### **1. Test Upload**
```bash
# Record a video in the app
# Tap "Post" in VideoEditor
# Check backend logs for:
#   - "Creating Mux upload URL"
#   - "Mux upload URL created successfully"
#   - "Video record created with Mux IDs"
```

### **2. Test Webhook**
```bash
# Wait for Mux to process video (30-60 seconds)
# Check backend logs for:
#   - "Mux webhook received"
#   - "Video ready and notification created"
```

### **3. Test Playback**
```bash
# Refresh video feed
# Video should play with Mux Player
# Check for HLS URL in network tab: https://stream.mux.com/{playbackId}.m3u8
```

---

## 🐛 Troubleshooting

### **Video stuck in "uploading" status**
- Check backend logs for Mux API errors
- Verify `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` are set
- Check Mux dashboard: https://dashboard.mux.com/video/uploads

### **Webhook not received**
- Verify `MUX_WEBHOOK_SECRET` is set
- Check webhook signature verification in logs
- Test webhook manually: https://dashboard.mux.com/settings/webhooks

### **Video not playing**
- Check if `muxPlaybackId` exists in video record
- Verify `status` is "ready"
- Check Mux Player console errors
- Fallback to native player if Mux fails

---

## 📊 Monitoring

### **Mux Dashboard**
- **Uploads:** https://dashboard.mux.com/video/uploads
- **Assets:** https://dashboard.mux.com/video/assets
- **Webhooks:** https://dashboard.mux.com/settings/webhooks
- **Usage:** https://dashboard.mux.com/usage

### **Backend Logs**
```bash
# Check Mux-related logs
grep "Mux" backend/logs/*.log

# Check webhook events
grep "webhook" backend/logs/*.log
```

---

## 🚀 Next Steps

### **Enhancements**
- [ ] Add video quality selector (720p, 1080p, 4k)
- [ ] Implement video analytics (views, watch time)
- [ ] Add live streaming with Mux Live
- [ ] Implement video DRM for premium content
- [ ] Add video chapters/markers

### **Optimizations**
- [ ] Preload next video in feed
- [ ] Cache Mux thumbnails locally
- [ ] Implement offline video downloads
- [ ] Add video compression before upload

---

## 📚 Resources

- **Mux Docs:** https://docs.mux.com
- **Mux Player React:** https://github.com/muxinc/elements/tree/main/packages/mux-player-react
- **Mux API Reference:** https://docs.mux.com/api-reference
- **Mux Webhooks:** https://docs.mux.com/guides/video/listen-for-webhooks

---

## ✅ Verification Checklist

- [x] Backend Mux routes created (`mux.ts`)
- [x] Database schema updated with Mux fields
- [x] Frontend upload hook created (`useMuxUpload.ts`)
- [x] VideoEditor uses Mux upload
- [x] VideoItem renders Mux Player
- [x] Video feed returns Mux fields
- [x] Webhook handler processes Mux events
- [x] Environment variables documented
- [x] Testing guide provided
- [x] Troubleshooting guide provided

---

## 🎉 Summary

VYXO now has **professional video streaming** powered by Mux:
- ✅ Direct upload to Mux (no backend bottleneck)
- ✅ HLS adaptive bitrate streaming
- ✅ Automatic thumbnails and GIF previews
- ✅ Async processing with webhooks
- ✅ Graceful fallback to native player
- ✅ Processing status indicators
- ✅ Full integration with existing video feed

**The app is ready for production video streaming!** 🚀
