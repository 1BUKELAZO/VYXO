
# 🚀 VYXO Quick Start Guide

## 🎯 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the App
```bash
npm start
```

### Step 3: Sign In
Use the demo credentials:
```
Email: demo@vyxo.com
Password: demo123
```

---

## 🎬 What to Try First

### 1. Browse the Video Feed (Home Tab)
- Scroll through videos
- Double-tap to like
- Tap comment icon to comment
- Tap share icon to share
- Tap profile avatar to view user profile

### 2. Upload Your First Video (Create Tab)
**Option A: Record Video**
1. Tap "Record Video"
2. Long-press the coral button to record (3-60 seconds)
3. Release to stop
4. Add a caption (e.g., "My first VYXO video! #vyxo")
5. Tap "Publicar" (Post)
6. Watch the upload progress
7. Your video appears in the feed!

**Option B: Upload from Gallery**
1. Tap "Upload Video"
2. Select a video (3-60 seconds, max 100MB)
3. Add a caption
4. Tap "Publicar" (Post)

### 3. Explore Sounds (Discover Tab)
1. Search for sounds
2. Tap a sound to preview
3. Tap "Use this sound" to record with it

### 4. View Your Profile (Profile Tab)
1. See your stats (followers, following, likes)
2. Tap "Followers" or "Following" to view lists
3. Tap "Seed Test Videos" to create sample videos
4. Tap "Sign Out" when done

---

## 🎨 VYXO Features

### Video Recording
- **Long-press to record** (minimum 3 seconds, maximum 60 seconds)
- **Progress ring** shows recording progress
- **Timer** displays current time / max time
- **Flash toggle** for low-light recording
- **Camera flip** to switch between front/back
- **Haptic feedback** on all interactions

### Video Editor
- **Caption input** with character counter (max 150 chars)
- **Hashtag extraction** (e.g., #vyxo)
- **Mention extraction** (e.g., @user)
- **Allow comments** toggle
- **Allow duets** toggle
- **Allow stitch** toggle
- **Upload progress** modal with percentage
- **Success/error** handling with retry

### Social Features
- **Like videos** (double-tap or button)
- **Comment** on videos
- **Reply** to comments
- **Share** videos (native share sheet)
- **Save** videos (bookmark)
- **Follow/unfollow** users
- **View followers/following** lists
- **Block/unblock** users

### Discovery
- **Search** users, videos, hashtags, sounds
- **Trending** hashtags and sounds
- **Browse** by category

### Messaging
- **Direct messages** to other users
- **Conversations** list
- **Read receipts**

### Notifications
- **Activity feed** (likes, comments, follows, mentions)
- **Mark as read** (individual or all)

### Live Streaming
- **Go live** (start streaming)
- **Watch live** (join active streams)
- **Live chat** (real-time messaging)

---

## 🎨 VYXO Brand Colors

- **Purple** (#8B5CF6) - Primary actions, Post button
- **Coral** (#FF6B6B) - Record button, errors
- **Turquoise** (#00D9FF) - Progress, success
- **Dark** (#0F0F0F) - Background

---

## 🐛 Troubleshooting

### "Backend URL not configured"
**Solution:** The backend URL is already configured in `app.json`. Rebuild the app:
```bash
npm start -- --clear
```

### "Authentication token not found"
**Solution:** Sign out and sign in again.

### "Video upload failed"
**Solution:** 
1. Check video duration (3-60 seconds)
2. Check video size (max 100MB)
3. Ensure you're signed in
4. Check network connection

### "Mux not configured"
**Solution:** The backend needs Mux environment variables. Contact the backend administrator.

---

## 📱 Platform Support

### iOS
- Native camera with CameraView
- SF Symbols for icons
- Haptic feedback
- Smooth animations

### Android
- Material icons
- Same camera functionality
- Haptic feedback support
- Consistent UI/UX

### Web
- Camera access via browser
- Fallback icons
- Responsive design
- OAuth popup flows

---

## 🎯 Demo Scenarios

### Scenario 1: New User Experience
1. Sign up with a new account
2. Browse the empty feed
3. Tap "Seed Test Videos" to create sample videos
4. Refresh the feed to see your videos

### Scenario 2: Social Interaction
1. Sign in with demo account
2. Browse video feed
3. Like a video (double-tap)
4. Comment on a video
5. Follow the video creator
6. View their profile

### Scenario 3: Video Upload
1. Tap Create tab
2. Record a video (long-press for 5 seconds)
3. Add caption: "Testing VYXO! #test"
4. Enable all toggles (comments, duets, stitch)
5. Tap Post
6. Watch upload progress
7. See your video in the feed

### Scenario 4: Sound Discovery
1. Tap Discover tab
2. Search for "trending"
3. Tap a sound to preview
4. Tap "Use this sound"
5. Record a video with the sound

---

## 🔗 Useful Links

- **Backend URL:** https://2zrr473wqw4kppdhxncb65tkzxvzqnk3.app.specular.dev
- **API Docs:** See OpenAPI spec in backend
- **Better Auth:** https://better-auth.com
- **Mux:** https://docs.mux.com
- **Expo:** https://docs.expo.dev

---

## 🎉 Have Fun!

VYXO is a fully functional TikTok-like app with:
- ✅ Video recording and upload
- ✅ Social interactions (likes, comments, follows)
- ✅ Sound discovery
- ✅ Live streaming
- ✅ Direct messaging
- ✅ Notifications

**Start creating and sharing videos now!** 🎬✨

---

## 📞 Support

If you encounter any issues:
1. Check the console logs (look for `[API]` prefix)
2. Verify you're signed in
3. Check network connection
4. Try signing out and back in
5. Clear app cache: `npm start -- --clear`

**Happy Creating! 🚀**
