
# 👤 Demo User Guide

## Quick Demo Account

For testing purposes, you can create a demo account or use these test credentials:

### Option 1: Create Your Own Account
```
1. Open the app
2. Tap "Sign Up"
3. Email: your-email@example.com
4. Password: YourSecurePassword123!
5. Tap "Sign Up"
```

### Option 2: Use Test Account (if available)
```
Email: demo@vyxo.app
Password: Demo123!
```

**Note**: If the test account doesn't exist, create it using Option 1.

## Quick Test Commands

### 1. Seed Test Videos (Fastest Way to Test)
```bash
# This creates 3 sample videos instantly without uploading
1. Sign in to the app
2. Go to Profile tab
3. Tap "Seed Test Videos"
4. Tap "Generate Sample Videos"
5. Wait 2-3 seconds
6. Tap "Go to Home Feed"
7. You should see 3 videos in your feed
```

### 2. Upload Your First Video
```bash
# Quick upload from gallery
1. Sign in to the app
2. Tap camera icon (bottom tab bar)
3. Tap gallery icon (bottom left)
4. Select any video
5. Tap "Post" (skip editing)
6. Wait for upload to complete
7. Your video appears in feed
```

### 3. Test All Features
```bash
# Complete feature test
1. Sign in
2. Seed test videos (see command 1)
3. Go to home feed
4. Tap on a video to view
5. Double-tap to like
6. Tap comment icon to add comment
7. Tap share icon to share
8. Tap profile icon to view user profile
9. Tap camera icon to record new video
10. Upload your own video (see command 2)
```

## Feature Checklist

Use this checklist to test all features:

### Authentication
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign in with Google (web only)
- [ ] Sign in with Apple (iOS only)
- [ ] Sign out
- [ ] Session persists after app reload

### Video Feed
- [ ] View video feed
- [ ] Videos autoplay when scrolled into view
- [ ] Tap to pause/play video
- [ ] Double-tap to like video
- [ ] Like button works
- [ ] Comment button opens comments screen
- [ ] Share button works
- [ ] Profile button opens user profile
- [ ] Follow button works (if not following)
- [ ] Scroll through multiple videos

### Video Upload
- [ ] Record video from camera
- [ ] Select video from gallery
- [ ] Video editor opens with selected video
- [ ] Trim video with slider
- [ ] Add caption
- [ ] Toggle "Allow comments"
- [ ] Toggle "Allow duets"
- [ ] Post video
- [ ] Upload progress displays
- [ ] Video appears in feed after upload

### Comments
- [ ] View comments on a video
- [ ] Add a comment
- [ ] Like a comment
- [ ] Reply to a comment
- [ ] Delete your own comment

### User Profile
- [ ] View your own profile
- [ ] View other user's profile
- [ ] Follow/unfollow users
- [ ] View user's videos
- [ ] View followers list
- [ ] View following list

### Search & Discover
- [ ] Search for users
- [ ] Search for videos
- [ ] Search for hashtags
- [ ] View trending hashtags
- [ ] View trending sounds

### Notifications
- [ ] Receive like notifications
- [ ] Receive comment notifications
- [ ] Receive follow notifications
- [ ] Mark notification as read
- [ ] Mark all notifications as read

### Messages
- [ ] View conversations
- [ ] Send a message
- [ ] Receive a message
- [ ] Mark message as read

### Settings
- [ ] Report a video
- [ ] Report a user
- [ ] Block a user
- [ ] Unblock a user

## Sample Test Data

### Sample Captions
```
"Just testing the new video upload feature! 🎥"
"My first VYXO video! #vyxo #firstpost"
"Check out this cool video I made 🔥"
"Testing trim feature - this is a 10 second clip"
"Hello VYXO community! 👋"
```

### Sample Comments
```
"Great video! 🔥"
"Love this! ❤️"
"Amazing content!"
"Keep it up! 👍"
"This is so cool!"
```

### Sample Hashtags
```
#vyxo
#firstpost
#testvideo
#newfeature
#videoeditor
```

## Troubleshooting

### Can't Sign In
```
1. Check your email and password
2. Try signing up if you don't have an account
3. Check console logs for error messages
4. Verify backend URL in app.json
```

### Can't Upload Video
```
1. Verify you're signed in
2. Check internet connection
3. Ensure video is 3-60 seconds long
4. Ensure video is less than 100MB
5. Try a different video format (MP4 recommended)
```

### Video Not Appearing in Feed
```
1. Pull down to refresh the feed
2. Navigate away and back to home tab
3. Check if upload completed successfully
4. Try seeding test videos to verify feed works
```

### Camera Not Working
```
1. Grant camera permissions in device settings
2. Grant microphone permissions in device settings
3. Restart the app
4. Try selecting from gallery instead
```

## Performance Tips

### For Best Upload Speed
- Use Wi-Fi instead of cellular data
- Keep videos under 30 seconds
- Use MP4 format
- Compress videos before upload (optional)

### For Best Playback
- Ensure good internet connection
- Close other apps to free up memory
- Restart app if videos lag
- Clear app cache if needed

## Demo Flow (5 Minutes)

Here's a complete demo flow you can follow:

```bash
⏱️ Minute 1: Sign Up
1. Open app
2. Tap "Sign Up"
3. Enter email: demo@test.com
4. Enter password: Demo123!
5. Tap "Sign Up"

⏱️ Minute 2: Seed Videos
1. Go to Profile tab
2. Tap "Seed Test Videos"
3. Tap "Generate Sample Videos"
4. Wait for success message
5. Tap "Go to Home Feed"

⏱️ Minute 3: Explore Feed
1. Scroll through videos
2. Double-tap to like a video
3. Tap comment icon
4. Add comment: "Great video!"
5. Go back to feed

⏱️ Minute 4: Upload Video
1. Tap camera icon
2. Tap gallery icon
3. Select a video
4. Add caption: "My first video!"
5. Tap "Post"
6. Wait for upload

⏱️ Minute 5: Verify Upload
1. Video appears in feed
2. Tap on your video
3. Verify it plays correctly
4. Check caption displays
5. Test like/comment buttons
```

## Success Metrics

After testing, you should be able to:

1. ✅ Sign up and sign in successfully
2. ✅ See videos in the feed
3. ✅ Like and comment on videos
4. ✅ Upload your own video
5. ✅ See your uploaded video in the feed
6. ✅ Navigate between all tabs
7. ✅ View user profiles
8. ✅ Follow/unfollow users
9. ✅ Search for content
10. ✅ Receive notifications

---

**Congratulations! You're now ready to use VYXO! 🎉**

For technical details, see VIDEO_UPLOAD_INTEGRATION_COMPLETE.md
For testing guide, see VIDEO_UPLOAD_TESTING_GUIDE.md
