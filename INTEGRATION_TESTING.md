
# VYXO Backend Integration - Testing Guide

## 🎯 Integration Summary

The VYXO app has been successfully integrated with the backend API at:
**https://2zrr473wqw4kppdhxncb65tkzxvzqnk3.app.specular.dev**

### ✅ Completed Integrations

1. **Authentication System**
   - Email/Password authentication (Sign Up & Sign In)
   - Google OAuth
   - Apple OAuth (iOS only)
   - Session persistence across app reloads
   - Automatic token refresh

2. **Video Feed**
   - GET `/api/videos/feed` - Fetches personalized video feed
   - Like/Unlike functionality with optimistic updates
   - POST `/api/videos/:id/like` - Like a video
   - DELETE `/api/videos/:id/like` - Unlike a video

3. **User Profile**
   - GET `/api/users/:id` - Fetches user profile data
   - Displays followers, following, and likes count
   - Sign out functionality

4. **UI/UX Improvements**
   - Custom Modal component (web-compatible, no Alert.alert)
   - Toast notifications for non-blocking feedback
   - VYXO brand colors throughout the app
   - Loading states for all API calls
   - Error handling with user-friendly messages

---

## 🧪 Testing Instructions

### Step 1: Create a Test Account

1. **Open the app** - You should see the Sign In screen
2. **Click "Don't have an account? Sign Up"**
3. **Enter test credentials:**
   - Email: `test@vyxo.com`
   - Password: `Test123!`
   - Name: `Test User` (optional)
4. **Click "Sign Up"**
5. You should see a success modal and be redirected to the home screen

### Step 2: Test Sign In Flow

1. **Sign out** from the profile screen
2. **Sign in again** with the same credentials
3. Verify that you're redirected to the home screen
4. **Reload the page/app** - You should remain signed in (session persistence)

### Step 3: Test Video Feed

1. Navigate to the **Home** tab
2. You should see the video feed loading
3. If there are videos in the database:
   - Videos should play automatically
   - Swipe up/down to navigate between videos
4. If no videos exist:
   - Mock videos will be displayed as fallback
   - This is expected for a new deployment

### Step 4: Test Like Functionality

1. On any video, **tap the heart icon**
2. The heart should turn red and the count should increase
3. **Tap again** to unlike
4. The heart should turn white and the count should decrease
5. **Double-tap the video** to like it quickly
6. A large heart animation should appear

### Step 5: Test Profile Screen

1. Navigate to the **Profile** tab
2. You should see:
   - Your display name and username
   - Followers count (initially 0)
   - Following count (initially 0)
   - Likes count (initially 0)
3. These counts will update as you interact with the app

### Step 6: Test OAuth (Optional)

**For Google OAuth:**
1. Click "Continue with Google"
2. A popup should open (on web) or redirect (on mobile)
3. Sign in with your Google account
4. You should be redirected back and signed in

**For Apple OAuth (iOS only):**
1. Click "Continue with Apple"
2. Follow the Apple sign-in flow
3. You should be redirected back and signed in

---

## 🔍 API Endpoints Verification

### Authentication Endpoints
- ✅ POST `/api/auth/sign-up/email` - Sign up with email
- ✅ POST `/api/auth/sign-in/email` - Sign in with email
- ✅ GET `/api/auth/session` - Get current session
- ✅ POST `/api/auth/sign-out` - Sign out

### Video Endpoints
- ✅ GET `/api/videos/feed` - Get video feed (requires auth)
- ✅ POST `/api/videos/:id/like` - Like a video (requires auth)
- ✅ DELETE `/api/videos/:id/like` - Unlike a video (requires auth)

### User Endpoints
- ✅ GET `/api/users/:id` - Get user profile (requires auth)
- ⏳ POST `/api/users/:id/follow` - Follow user (not yet implemented in UI)
- ⏳ DELETE `/api/users/:id/follow` - Unfollow user (not yet implemented in UI)

---

## 🐛 Troubleshooting

### Issue: "Backend URL not configured"
**Solution:** The backend URL is already configured in `app.json`. If you see this error, rebuild the app.

### Issue: "Authentication token not found"
**Solution:** Sign out and sign in again. The token should be stored in SecureStore (native) or localStorage (web).

### Issue: Videos not loading
**Solution:** 
1. Check if videos exist in the database
2. If no videos, mock videos will be displayed
3. Check the console for API errors

### Issue: OAuth popup blocked
**Solution:** Allow popups in your browser settings for the app domain.

### Issue: Session not persisting
**Solution:** 
1. Check browser cookies/localStorage (web)
2. Check SecureStore (native)
3. The app automatically refreshes the session every 5 minutes

---

## 📝 Sample Test User Credentials

For testing purposes, you can create multiple accounts:

**User 1:**
- Email: `alice@vyxo.com`
- Password: `Alice123!`

**User 2:**
- Email: `bob@vyxo.com`
- Password: `Bob123!`

**User 3:**
- Email: `charlie@vyxo.com`
- Password: `Charlie123!`

---

## 🎨 UI Components

### Custom Modal
- Used for confirmations and alerts
- Web-compatible (no Alert.alert)
- Types: `info`, `success`, `error`, `confirm`

### Toast Notifications
- Non-blocking feedback
- Auto-dismisses after 3 seconds
- Types: `success`, `error`, `info`

---

## 🔐 Security Notes

1. **Bearer Tokens:** All authenticated requests include a Bearer token in the Authorization header
2. **Secure Storage:** Tokens are stored in SecureStore (native) or localStorage (web)
3. **Session Refresh:** Sessions are automatically refreshed every 5 minutes
4. **CORS:** The backend should allow requests from the app domain

---

## 📊 Expected API Responses

### GET /api/videos/feed
```json
[
  {
    "id": "uuid",
    "userId": "user-id",
    "username": "creator1",
    "avatarUrl": "https://...",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "caption": "Check out this video!",
    "musicName": "Original Sound",
    "likesCount": 123,
    "commentsCount": 45,
    "sharesCount": 12,
    "isLiked": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/videos/:id/like
```json
{
  "success": true,
  "likesCount": 124
}
```

### GET /api/users/:id
```json
{
  "id": "user-id",
  "username": "testuser",
  "name": "Test User",
  "avatarUrl": "https://...",
  "bio": "Hello world!",
  "followersCount": 10,
  "followingCount": 5,
  "likesCount": 100,
  "isFollowing": false
}
```

---

## ✨ Next Steps

1. **Test all flows** using the instructions above
2. **Create test data** in the database (videos, users, follows)
3. **Test edge cases** (no internet, invalid tokens, etc.)
4. **Monitor console logs** for any errors
5. **Report any issues** with detailed error messages

---

## 🎉 Success Criteria

- ✅ User can sign up and sign in
- ✅ Session persists across reloads
- ✅ Video feed loads successfully
- ✅ Like/unlike functionality works
- ✅ Profile data displays correctly
- ✅ No Alert.alert() calls (web-compatible)
- ✅ All API calls use the central utils/api.ts wrapper
- ✅ Error handling with user-friendly messages
- ✅ Loading states for all async operations

---

**Happy Testing! 🚀**
