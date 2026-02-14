
# VYXO - Mux Video Streaming Integration Guide

## Overview
VYXO now uses **Mux** for professional video streaming with HLS adaptive bitrate, automatic transcoding, and thumbnail generation.

## Architecture

### Video Upload Flow
1. **Frontend**: User selects/records video
2. **Backend**: Creates Mux direct upload URL via `POST /api/mux/create-upload`
3. **Frontend**: Uploads video directly to Mux (bypassing backend for large files)
4. **Backend**: Creates video record with `mux_upload_id` and `status='uploading'`
5. **Mux**: Processes video and sends webhooks to `POST /api/mux/webhook`
6. **Backend**: Updates video record with playback URLs when `video.asset.ready`
7. **Frontend**: Polls or subscribes to video status, displays when `status='ready'`

### Video Playback Flow
1. **Frontend**: Fetches video feed from `GET /api/videos/feed`
2. **Backend**: Returns videos with `master_playlist_url` (HLS)
3. **Frontend**: Uses `expo-video` to play HLS stream: `https://stream.mux.com/{playback_id}.m3u8`
4. **Adaptive Bitrate**: Mux automatically adjusts quality based on network conditions

## Database Schema

### Videos Table (Extended)
```sql
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_asset_id TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_upload_id TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploading';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS aspect_ratio TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS max_resolution TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS master_playlist_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS gif_url TEXT;
```

**Status Values:**
- `uploading` - Video is being uploaded to Mux
- `processing` - Mux is transcoding the video
- `ready` - Video is ready for playback
- `error` - Processing failed

## API Endpoints

### 1. Create Mux Upload URL
**Endpoint:** `POST /api/mux/create-upload`  
**Auth:** Required (Bearer token)  
**Request Body:**
```json
{
  "corsOrigin": "*"
}
```
**Response:**
```json
{
  "uploadUrl": "https://storage.googleapis.com/video-storage-us-east-1/...",
  "uploadId": "abcd1234",
  "assetId": "xyz5678"
}
```

### 2. Mux Webhook Handler
**Endpoint:** `POST /api/mux/webhook`  
**Auth:** None (public, signature verified)  
**Headers:**
- `Mux-Signature` - Webhook signature for verification

**Webhook Events:**
- `video.upload.asset_created` - Asset created from upload
- `video.asset.ready` - Video processing complete
- `video.asset.errored` - Processing failed

**Example Payload:**
```json
{
  "type": "video.asset.ready",
  "data": {
    "id": "asset_id_here",
    "status": "ready",
    "playback_ids": [
      {
        "id": "playback_id_here",
        "policy": "public"
      }
    ],
    "duration": 15.5,
    "aspect_ratio": "9:16",
    "max_stored_resolution": "1080p"
  }
}
```

### 3. Get Video Playback Info
**Endpoint:** `GET /api/mux/playback/:videoId`  
**Auth:** Required  
**Response:**
```json
{
  "playbackId": "abc123",
  "playbackUrl": "https://stream.mux.com/abc123.m3u8",
  "thumbnailUrl": "https://image.mux.com/abc123/thumbnail.jpg",
  "gifUrl": "https://image.mux.com/abc123/animated.gif",
  "status": "ready",
  "duration": 15
}
```

### 4. Upload Video (Updated)
**Endpoint:** `POST /api/videos/upload`  
**Auth:** Required  
**Request Body:**
```json
{
  "muxUploadId": "upload_id_from_step_1",
  "muxAssetId": "asset_id_from_step_1",
  "caption": "Check out this video!",
  "allowComments": true,
  "allowDuets": true,
  "trimStart": 0,
  "trimEnd": 15
}
```

## Frontend Integration

### useVideoUpload Hook
The `hooks/useVideoUpload.ts` hook handles the complete Mux upload flow:

```typescript
const { uploadVideo, status, progress } = useVideoUpload(videoUri);

// Upload with metadata
await uploadVideo({
  caption: 'My video',
  allowComments: true,
  allowDuets: true,
  trimStart: 0,
  trimEnd: 15,
});

// Status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
// Progress: 0-100
```

### Video Playback
Videos are played using `expo-video` with HLS URLs:

```typescript
const playbackUrl = video.videoUrl; // https://stream.mux.com/{playback_id}.m3u8
const player = useVideoPlayer(playbackUrl, (player) => {
  player.loop = true;
  player.muted = false;
});
```

## Mux Configuration

### 1. Create Mux Account
1. Go to https://mux.com and sign up
2. Create a new environment (e.g., "VYXO Production")

### 2. Get API Credentials
1. Navigate to **Settings > Access Tokens**
2. Click **Generate new token**
3. Select permissions:
   - ✅ Mux Video (Read + Write)
   - ✅ Mux Data (Read)
4. Copy `Token ID` and `Token Secret`
5. Add to `.env`:
   ```
   MUX_TOKEN_ID=your_token_id
   MUX_TOKEN_SECRET=your_token_secret
   ```

### 3. Configure Webhooks
1. Navigate to **Settings > Webhooks**
2. Click **Create new webhook**
3. Enter webhook URL: `https://your-backend.com/api/mux/webhook`
4. Select events:
   - ✅ `video.upload.asset_created`
   - ✅ `video.asset.ready`
   - ✅ `video.asset.errored`
5. Copy **Webhook Signing Secret**
6. Add to `.env`:
   ```
   MUX_WEBHOOK_SECRET=your_webhook_secret
   ```

### 4. Playback Policies
Mux supports two playback policies:
- **Public** (default) - Anyone with the URL can play
- **Signed** - Requires JWT token (for private videos)

VYXO uses **public** playback by default. For private videos, implement signed URLs using `GET /api/mux/playback/:videoId`.

## URL Formats

### HLS Playback
```
https://stream.mux.com/{playback_id}.m3u8
```

### Thumbnails
```
https://image.mux.com/{playback_id}/thumbnail.jpg?width=640&height=1138&fit_mode=smartcrop&time=1
```

**Parameters:**
- `width` - Thumbnail width (px)
- `height` - Thumbnail height (px)
- `fit_mode` - `smartcrop`, `preserve`, `crop`
- `time` - Timestamp in seconds (default: 0)

### Animated GIFs
```
https://image.mux.com/{playback_id}/animated.gif?width=320&height=569&fps=15
```

**Parameters:**
- `width` - GIF width (px)
- `height` - GIF height (px)
- `fps` - Frames per second (1-30)

## Testing

### 1. Test Upload Flow
```bash
# 1. Create upload URL
curl -X POST http://localhost:3000/api/mux/create-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"corsOrigin": "*"}'

# 2. Upload video to Mux
curl -X PUT "UPLOAD_URL_FROM_STEP_1" \
  -H "Content-Type: video/mp4" \
  --data-binary @test-video.mp4

# 3. Create video record
curl -X POST http://localhost:3000/api/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "muxUploadId": "UPLOAD_ID_FROM_STEP_1",
    "muxAssetId": "ASSET_ID_FROM_STEP_1",
    "caption": "Test video"
  }'
```

### 2. Test Webhook (Local Development)
Use **ngrok** to expose your local backend:
```bash
ngrok http 3000
```

Then configure Mux webhook URL to: `https://your-ngrok-url.ngrok.io/api/mux/webhook`

### 3. Monitor Processing
Check video status in Mux Dashboard:
1. Go to **Video > Assets**
2. Find your asset by ID
3. Check **Status**, **Playback IDs**, **Duration**, etc.

## Troubleshooting

### Video Stuck in "uploading" Status
- **Cause:** Webhook not received or signature verification failed
- **Fix:** Check webhook logs in Mux Dashboard, verify `MUX_WEBHOOK_SECRET`

### Video Playback Fails
- **Cause:** Invalid playback ID or video not ready
- **Fix:** Check `status='ready'` in database, verify `master_playlist_url`

### Upload Fails with CORS Error
- **Cause:** CORS origin mismatch
- **Fix:** Set correct `corsOrigin` in `POST /api/mux/create-upload` (e.g., `https://your-app.com`)

### Webhook Signature Verification Fails
- **Cause:** Incorrect `MUX_WEBHOOK_SECRET`
- **Fix:** Copy exact secret from Mux Dashboard > Settings > Webhooks

## Performance Optimization

### 1. Adaptive Bitrate Streaming
Mux automatically creates multiple renditions (1080p, 720p, 480p, 360p) and serves the best quality based on:
- Network speed
- Device capabilities
- Screen size

### 2. Thumbnail Caching
Cache thumbnail URLs in your database to avoid regenerating them:
```typescript
const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&height=1138&fit_mode=smartcrop&time=1`;
```

### 3. Preload Videos
Preload the next video in the feed for smooth scrolling:
```typescript
const nextVideo = videos[currentIndex + 1];
if (nextVideo) {
  // Preload next video player
}
```

## Cost Estimation

Mux pricing (as of 2024):
- **Encoding:** $0.005 per minute
- **Storage:** $0.01 per GB per month
- **Streaming:** $0.01 per GB delivered

**Example:** 1000 videos (15s each, 1080p):
- Encoding: 1000 × 0.25 min × $0.005 = **$1.25**
- Storage: ~50 GB × $0.01 = **$0.50/month**
- Streaming: 10,000 views × 50 MB × $0.01/GB = **$5.00**

**Total:** ~$6.75 for 1000 videos + 10,000 views

## Next Steps

1. ✅ Set up Mux account and get API credentials
2. ✅ Configure webhooks with your backend URL
3. ✅ Test upload flow with a sample video
4. ✅ Verify webhook events are received
5. ✅ Test video playback in the app
6. 🔄 Implement real-time status updates (optional)
7. 🔄 Add signed playback for private videos (optional)
8. 🔄 Implement video analytics with Mux Data (optional)

## Support

- **Mux Documentation:** https://docs.mux.com
- **Mux Support:** support@mux.com
- **VYXO Issues:** [GitHub Issues](https://github.com/your-repo/issues)
