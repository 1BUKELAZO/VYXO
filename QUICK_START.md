
# 🚀 Quick Start Guide

Get up and running with the VYXO app in 5 minutes!

## ⚡ Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Or a physical device with Expo Go app

## 📦 Installation

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm start

# 3. Choose your platform
# Press 'i' for iOS
# Press 'a' for Android
# Press 'w' for Web
```

## 🔐 First Time Setup

### 1. Create a Test Account

When the app opens:

1. Tap **"Don't have an account? Sign Up"**
2. Enter your details:
   - **Email**: `test@vyxo.com`
   - **Password**: `Test123!`
   - **Name**: `Test User`
3. Tap **"Sign Up"**
4. You'll be automatically signed in!

### 2. Or Use Existing Test Account

1. Tap **"Sign In"**
2. Enter credentials:
   - **Email**: `test@vyxo.com`
   - **Password**: `Test123!`
3. Tap **"Sign In"**

## 🎯 Quick Tour

### Home Feed (Main Screen)

- **Swipe up/down** to browse videos
- **Double-tap** video to like
- **Tap heart icon** to like/unlike
- **Tap comment icon** to view comments
- **Tap share icon** to share

### Comments

- **Tap comment icon** on any video
- **Type your comment** in the input box
- **Tap send** to post
- **Tap reply** to reply to a comment
- **Tap heart** to like a comment
- **Long press** to delete your own comment

### Messages

- **Tap messages icon** in tab bar
- **Tap conversation** to open chat
- **Type message** and tap send
- **Messages sync** automatically

### Notifications

- **Tap bell icon** in tab bar
- **View all notifications** (likes, comments, follows)
- **Tap notification** to navigate to content
- **Tap "Mark all read"** to clear unread

### Discover

- **Tap search icon** in tab bar
- **Type in search bar** to search
- **Switch tabs** to search users, videos, hashtags, sounds
- **Browse trending** hashtags and sounds

### Profile

- **Tap profile icon** in tab bar
- **View your stats** (followers, following, likes)
- **Tap "Edit Profile"** to edit (coming soon)
- **Tap "Sign Out"** to sign out

### Live Streaming

- **Tap "Go Live"** button (if available)
- **Enter stream title**
- **Tap "Go Live"** to start
- **Chat with viewers** in real-time

## 🎬 Try These Features

### 1. Like a Video (30 seconds)

1. Open the app
2. Sign in with test account
3. Double-tap any video
4. See the heart animation
5. Like count increases!

### 2. Post a Comment (1 minute)

1. Tap comment icon on any video
2. Type: "Great video! 🔥"
3. Tap send
4. Your comment appears immediately!

### 3. Send a Message (1 minute)

1. Tap messages icon
2. Tap any conversation
3. Type: "Hello!"
4. Tap send
5. Message appears instantly!

### 4. Search for Content (1 minute)

1. Tap search icon
2. Type: "dance"
3. Switch to "Videos" tab
4. See search results!

### 5. Start a Live Stream (2 minutes)

1. Tap "Go Live" button
2. Enter title: "My First Stream"
3. Tap "Go Live"
4. You're now live!
5. Send a chat message

## 🐛 Common Issues

### "Backend URL not configured"

**Fix:**
```bash
# Restart with cache clear
npm start -- --clear
```

### "Authentication token not found"

**Fix:**
1. Sign out completely
2. Sign in again
3. Token will be saved

### Videos not loading

**Fix:**
- Check internet connection
- Wait a few seconds
- Mock videos will show if feed is empty

### OAuth not working

**Fix:**
- **Web**: Allow popups in browser
- **iOS**: Rebuild app with `npm run ios`
- **Android**: Rebuild app with `npm run android`

## 📱 Platform-Specific

### iOS

```bash
# Run on iOS Simulator
npm run ios

# Run on physical device
# 1. Open Expo Go app on iPhone
# 2. Scan QR code from terminal
```

### Android

```bash
# Run on Android Emulator
npm run android

# Run on physical device
# 1. Open Expo Go app on Android
# 2. Scan QR code from terminal
```

### Web

```bash
# Run in browser
npm run web

# Or press 'w' after npm start
```

## 🎨 Customization

### Change Theme Colors

Edit `constants/Colors.ts`:

```typescript
export const colors = {
  primary: '#8B5CF6',    // Purple
  secondary: '#FF6B6B',  // Red
  accent: '#4ECDC4',     // Teal
  // ... more colors
};
```

### Change App Name

Edit `app.json`:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug"
  }
}
```

## 📚 Learn More

### Documentation

- **API Integration**: `API_INTEGRATION_REFERENCE.md`
- **Full Details**: `BACKEND_INTEGRATION_COMPLETE.md`
- **Test Accounts**: `DEMO_CREDENTIALS.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Checklist**: `INTEGRATION_CHECKLIST.md`

### Key Files

- **API Client**: `utils/api.ts`
- **Auth Client**: `lib/auth.ts`
- **Auth Context**: `contexts/AuthContext.tsx`
- **Home Screen**: `app/(tabs)/(home)/index.tsx`
- **Comments**: `app/comments/[videoId].tsx`
- **Messages**: `app/messages/`
- **Profile**: `app/(tabs)/profile.tsx`

## 🎯 Next Steps

### For Developers

1. ✅ Explore the codebase
2. ✅ Read the API integration guide
3. ✅ Test all features
4. ✅ Check console logs
5. ✅ Try on all platforms

### For Users

1. ✅ Create an account
2. ✅ Browse videos
3. ✅ Like and comment
4. ✅ Send messages
5. ✅ Search for content
6. ✅ Start a live stream

## 💡 Pro Tips

### Development

- **Hot Reload**: Press `r` in terminal to reload
- **Clear Cache**: Press `Shift+r` to clear cache and reload
- **DevTools**: Press `Cmd+D` (iOS) or `Cmd+M` (Android) for dev menu
- **Console**: Use `console.log('[DEBUG]', data)` for debugging

### Testing

- **Multiple Accounts**: Create multiple test accounts to test messaging
- **Different Platforms**: Test on iOS, Android, and Web
- **Network Conditions**: Test with slow/offline network
- **Edge Cases**: Test with empty data, long text, etc.

### Performance

- **Optimize Images**: Use optimized images for better performance
- **Lazy Loading**: Videos load on demand
- **Debouncing**: Search is debounced for better performance
- **Caching**: Data is cached where appropriate

## 🎉 You're Ready!

You now have a fully functional social video app with:

- ✅ User authentication
- ✅ Video feed
- ✅ Comments
- ✅ Direct messaging
- ✅ Notifications
- ✅ Search
- ✅ Live streaming
- ✅ User profiles

**Start building amazing features!** 🚀

---

## 📞 Need Help?

- **Troubleshooting**: See `TROUBLESHOOTING.md`
- **API Reference**: See `API_INTEGRATION_REFERENCE.md`
- **Test Accounts**: See `DEMO_CREDENTIALS.md`

**Happy coding!** 🎨
