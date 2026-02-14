
# 🧪 Video Upload Testing Guide

## Quick Start

### 1. Sign In
```bash
# If you don't have an account:
1. Open the app
2. Tap "Sign Up"
3. Enter email and password
4. Tap "Sign Up" button

# If you already have an account:
1. Open the app
2. Enter your email and password
3. Tap "Sign In" button
```

### 2. Test Video Upload (Fastest Method)
```bash
1. Tap the camera icon in the bottom tab bar
2. Tap the gallery icon (bottom left corner)
3. Select any video from your gallery
4. Wait for the video editor to load
5. Tap "Post" button (no need to edit anything)
6. Watch the upload progress
7. After upload, you'll be redirected to home feed
8. Your video should appear in the feed
```

### 3. Test Video Recording
```bash
1. Tap the camera icon in the bottom tab bar
2. Grant camera and microphone permissions if prompted
3. Tap the red record button
4. Record for at least 3 seconds
5. Tap the record button again to stop
6. Wait for the video editor to load
7. Tap "Post" button
8. Watch the upload progress
9. Your video should appear in the home feed
```

### 4. Test Video Editing Features
```bash
# Trim Video
1. In the video editor, use the trim adjustment buttons
2. Tap "-1s Start" or "+1s Start" to adjust start point
3. Tap "-1s End" or "+1s End" to adjust end point
4. The trim time display should update (e.g., "00:03 - 00:15")

# Add Caption
1. Tap the caption input field
2. Type a description (max 150 characters)
3. Watch the character counter update (e.g., "25/150")

# Toggle Settings
1. Toggle "Allow comments" on/off
2. Toggle "Allow duets" on/off
3. The switches should turn purple when active

# Preview Video
1. Tap anywhere on the video preview
2. Video should pause/play
3. Tap the back button (X) to cancel and return to camera
```

## Test Scenarios

### ✅ Happy Path: Successful Upload
**Expected Result**: Video uploads successfully and appears in feed

```bash
1. Sign in to the app
2. Go to camera screen
3. Select a video from gallery (or record new one)
4. Add caption: "Test video upload"
5. Set trim points: 0s - 10s
6. Enable both toggles
7. Tap "Post" button
8. Upload modal should appear
9. Progress bar should fill from 0% to 100%
10. Modal should close automatically
11. App should navigate to home feed
12. Your video should appear at the top of the feed
```

### ❌ Error Path: Video Too Short
**Expected Result**: Error message displayed

```bash
1. Sign in to the app
2. Go to camera screen
3. Record a video for only 1-2 seconds
4. Video editor should open
5. Try to post the video
6. Error toast should appear: "El video debe durar al menos 3 segundos"
```

### ❌ Error Path: Not Signed In
**Expected Result**: Redirected to sign in screen

```bash
1. Sign out if you're signed in
2. Try to access the camera screen
3. You should be redirected to the sign in screen
```

### ⚠️ Edge Case: Cancel Upload
**Expected Result**: Upload cancelled, modal closed

```bash
1. Sign in to the app
2. Go to camera screen
3. Select a large video from gallery
4. Tap "Post" button
5. While upload is in progress (before 50%), tap "Cancel"
6. Upload should stop
7. Modal should close
8. Toast should show: "Subida cancelada"
```

## Verification Checklist

After testing, verify the following:

### Video Editor UI
- [ ] Video preview displays correctly
- [ ] Play/pause works on tap
- [ ] Back button (X) returns to camera
- [ ] Trim slider displays correctly
- [ ] Trim time updates when adjusting
- [ ] Caption input accepts text
- [ ] Character counter updates (0/150)
- [ ] Toggles switch on/off
- [ ] Post button is visible and clickable

### Upload Flow
- [ ] Upload modal appears when posting
- [ ] Progress bar fills from 0% to 100%
- [ ] Stage text changes: "Uploading..." → "Processing..." → "Publishing..."
- [ ] Cancel button appears during upload stage
- [ ] Cancel button disappears during processing stage
- [ ] Modal closes automatically on success
- [ ] App navigates to home feed on success

### Home Feed
- [ ] New video appears in feed after upload
- [ ] Video plays automatically when scrolled into view
- [ ] Video metadata displays correctly (username, caption, etc.)
- [ ] Like, comment, share buttons work
- [ ] Video can be paused by tapping

### Error Handling
- [ ] Error toast appears for videos < 3 seconds
- [ ] Error toast appears for videos > 60 seconds
- [ ] Error toast appears for files > 100MB
- [ ] Error toast appears if not signed in
- [ ] Error toast appears if upload fails

## Common Issues and Solutions

### Issue: Video editor doesn't open after recording
**Solution**: Check console logs for errors. Ensure video was recorded successfully.

### Issue: Upload progress stuck at 0%
**Solution**: Check internet connection. Verify backend URL is correct in app.json.

### Issue: Upload fails with 401 error
**Solution**: Sign out and sign in again to refresh authentication token.

### Issue: Video doesn't appear in feed after upload
**Solution**: Pull down to refresh the feed, or navigate away and back to home tab.

### Issue: Thumbnail not generated
**Solution**: Try a different video format (MP4 recommended). Check console logs for errors.

### Issue: Video duration not detected
**Solution**: Wait a few seconds for duration to load. If still not detected, default 60s max will be used.

## Performance Testing

### Upload Speed Test
```bash
1. Select a 10MB video
2. Note the time when you tap "Post"
3. Note the time when upload completes
4. Expected: ~10-30 seconds depending on connection
```

### Large File Test
```bash
1. Select a video close to 100MB
2. Tap "Post"
3. Upload should work but may take 1-2 minutes
4. Progress bar should update smoothly
```

### Multiple Uploads Test
```bash
1. Upload a video
2. Immediately go back to camera
3. Upload another video
4. Both videos should appear in feed
5. No conflicts or errors should occur
```

## Debug Mode

To enable detailed logging:

1. Open the app
2. Check the console/terminal for logs
3. Look for messages starting with:
   - `[API]` - API calls and responses
   - `User tapped` - User interactions
   - `Video` - Video-related operations
   - `Upload` - Upload progress and status

Example logs you should see:
```
[API] Calling: https://...app.specular.dev/api/videos/upload POST
User tapped Post button
Video duration: 15
Generating thumbnail for video: file://...
Thumbnail generated: file://...
Uploading to backend...
[API] Success: { success: true, videoId: "...", ... }
Video uploaded successfully
```

## Success Criteria

The video upload feature is working correctly if:

1. ✅ You can record a video from camera
2. ✅ You can select a video from gallery
3. ✅ Video editor opens with the selected video
4. ✅ You can trim the video
5. ✅ You can add a caption
6. ✅ You can toggle settings
7. ✅ Upload progress is displayed
8. ✅ Video appears in home feed after upload
9. ✅ Video plays correctly in the feed
10. ✅ All interactions (like, comment, share) work

---

**Happy Testing! 🎉**

If you encounter any issues not covered in this guide, check the console logs and refer to VIDEO_UPLOAD_INTEGRATION_COMPLETE.md for technical details.
