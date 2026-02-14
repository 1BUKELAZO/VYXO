
# 🔧 Troubleshooting Guide

This guide helps you diagnose and fix common issues with the VYXO app backend integration.

## 🚨 Common Issues

### 1. "Backend URL not configured" Error

**Symptoms:**
- Error message: "Backend URL not configured. Please rebuild the app."
- API calls fail immediately

**Cause:**
- `backendUrl` not set in `app.json`
- App not rebuilt after configuration change

**Solution:**
```bash
# 1. Check app.json
cat app.json | grep backendUrl

# 2. Verify the URL is set
# Should show: "backendUrl": "https://..."

# 3. Rebuild the app
npm start -- --clear

# 4. Restart the dev server
# Press 'r' in terminal or Cmd+R in app
```

---

### 2. "Authentication token not found" Error

**Symptoms:**
- Error message: "Authentication token not found. Please sign in."
- Redirected to auth screen repeatedly
- API calls return 401

**Cause:**
- User not signed in
- Token expired or cleared
- Token not synced between Better Auth and API layer

**Solution:**
```bash
# 1. Sign out completely
# Tap "Sign Out" in profile

# 2. Clear app data (if needed)
# iOS: Delete app and reinstall
# Android: Clear app data in settings
# Web: Clear localStorage in DevTools

# 3. Sign in again
# Use test account from DEMO_CREDENTIALS.md

# 4. Check token in console
# Should see: [API] Calling: ... with Authorization header
```

**Debug:**
```typescript
// Add this to any screen to check token
import { getBearerToken } from '@/utils/api';

useEffect(() => {
  const checkToken = async () => {
    const token = await getBearerToken();
    console.log('Current token:', token ? 'EXISTS' : 'MISSING');
  };
  checkToken();
}, []);
```

---

### 3. Videos Not Loading

**Symptoms:**
- Empty feed or loading forever
- Error: "Failed to load videos"

**Cause:**
- No videos in database
- Backend API down
- Network error

**Solution:**
```bash
# 1. Check backend status
curl https://2zrr473wqw4kppdhxncb65tkzxvzqnk3.app.specular.dev/api/videos/feed

# 2. Check network in DevTools
# Look for failed requests

# 3. Check console logs
# Should see: [API] Fetching videos from feed

# 4. If no videos exist, mock data will be shown
# This is expected behavior
```

---

### 4. OAuth Not Working

**Symptoms:**
- Google/Apple sign in fails
- Popup doesn't open (Web)
- Deep link doesn't work (Native)

**Cause:**
- OAuth not configured in backend
- Popup blocked by browser
- Deep linking not set up

**Solution:**

**For Web (Google OAuth):**
```bash
# 1. Check if popup is blocked
# Look for popup blocker icon in browser

# 2. Allow popups for the site
# Click the icon and allow

# 3. Try again
# Click "Continue with Google"

# 4. Check console for errors
# Should see: OAuth popup opened
```

**For iOS (Apple OAuth):**
```bash
# 1. Check URL scheme in app.json
# Should have: "scheme": "vyxo"

# 2. Rebuild the app
npm run ios

# 3. Check deep link handling
# Should see: Deep link received in console
```

---

### 5. Session Not Persisting

**Symptoms:**
- Signed out after reload
- Have to sign in every time
- Token not saved

**Cause:**
- SecureStore/localStorage not working
- Token not being saved
- Token cleared on reload

**Solution:**
```bash
# 1. Check storage permissions
# iOS: Check app permissions in Settings
# Android: Check app permissions in Settings
# Web: Check if localStorage is enabled

# 2. Check token save in console
# Should see: Token saved to storage

# 3. Check token load on mount
# Should see: [API] Calling: ... with Authorization header

# 4. Try signing in again
# Token should persist after reload
```

**Debug:**
```typescript
// Add this to AuthContext to debug token storage
import { getBearerToken, setBearerToken } from '@/lib/auth';

// After sign in
const token = await getBearerToken();
console.log('Token after sign in:', token ? 'SAVED' : 'NOT SAVED');

// On app mount
const token = await getBearerToken();
console.log('Token on mount:', token ? 'EXISTS' : 'MISSING');
```

---

### 6. API Calls Failing with 401

**Symptoms:**
- All API calls return 401 Unauthorized
- Signed in but can't access data

**Cause:**
- Token not being sent in requests
- Token format incorrect
- Token expired

**Solution:**
```bash
# 1. Check if token is being sent
# Look in Network tab for Authorization header
# Should be: Authorization: Bearer <token>

# 2. Check token format
# Should be a long string, not empty

# 3. Sign out and sign in again
# This will refresh the token

# 4. Check backend logs
# Verify token is valid on backend
```

**Debug:**
```typescript
// Add this to utils/api.ts to debug token
export const apiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getBearerToken();
  console.log('Token being sent:', token ? token.substring(0, 20) + '...' : 'NONE');
  
  // ... rest of the function
};
```

---

### 7. Comments Not Loading

**Symptoms:**
- Comments screen empty
- Error: "Failed to load comments"

**Cause:**
- No comments for video
- Video ID incorrect
- Backend error

**Solution:**
```bash
# 1. Check video ID in URL
# Should be: /comments/[videoId]

# 2. Check API call in console
# Should see: [API] Fetching comments for video: <id>

# 3. Check backend response
# Look in Network tab for response

# 4. If no comments, try posting one
# Should see: Comment posted!
```

---

### 8. Messages Not Sending

**Symptoms:**
- Message doesn't appear
- Error: "Failed to send message"
- Message stuck in "sending" state

**Cause:**
- Network error
- Backend error
- Conversation ID incorrect

**Solution:**
```bash
# 1. Check network connection
# Verify internet is working

# 2. Check API call in console
# Should see: [API] Sending message: <content>

# 3. Check backend response
# Look in Network tab for error

# 4. Try sending again
# Message should appear immediately (optimistic)
```

---

### 9. Search Not Working

**Symptoms:**
- No search results
- Search doesn't trigger
- Results don't update

**Cause:**
- Debounce delay (500ms)
- No results for query
- Backend error

**Solution:**
```bash
# 1. Wait 500ms after typing
# Search is debounced for performance

# 2. Check API call in console
# Should see: [API] Searching for: <query>

# 3. Try different search terms
# Some queries may have no results

# 4. Check search type
# Make sure correct type is selected (users, videos, etc.)
```

---

### 10. Live Stream Not Starting

**Symptoms:**
- Error: "Failed to start live stream"
- Stream doesn't start
- Stuck on loading

**Cause:**
- Backend error
- Title too long
- Network error

**Solution:**
```bash
# 1. Check title length
# Must be <= 100 characters

# 2. Check API call in console
# Should see: [API] Starting live stream with title: <title>

# 3. Check backend response
# Look in Network tab for error

# 4. Try again with shorter title
# Should navigate to stream screen
```

---

## 🔍 Debugging Tools

### Console Logs

All API calls are logged with the `[API]` prefix:

```
[API] Calling: https://backend.com/api/videos/feed GET
[API] Fetch options: { method: 'GET', headers: {...} }
[API] Success: { data: [...] }
```

**Enable verbose logging:**
```typescript
// In utils/api.ts, add more logs
console.log('[API] Request body:', JSON.stringify(body));
console.log('[API] Response status:', response.status);
console.log('[API] Response headers:', response.headers);
```

### Network Tab

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for API calls
5. Check request/response

**React Native Debugger:**
1. Open React Native Debugger
2. Go to Network tab
3. Look for API calls
4. Check request/response

### Storage Inspection

**Web (localStorage):**
```javascript
// In browser console
localStorage.getItem('vyxo_bearer_token')
```

**Native (SecureStore):**
```typescript
// In app code
import * as SecureStore from 'expo-secure-store';

const token = await SecureStore.getItemAsync('vyxo_bearer_token');
console.log('Token:', token);
```

### Backend Health Check

```bash
# Check if backend is up
curl https://2zrr473wqw4kppdhxncb65tkzxvzqnk3.app.specular.dev/api/videos/feed

# Should return JSON response
# If error, backend is down
```

---

## 🛠️ Advanced Debugging

### Enable React Native Debugger

```bash
# 1. Install React Native Debugger
brew install --cask react-native-debugger

# 2. Start the app
npm start

# 3. Open debugger
# Press Cmd+D (iOS) or Cmd+M (Android)
# Select "Debug"

# 4. Open React Native Debugger
# Should connect automatically
```

### Enable Network Logging

```typescript
// In utils/api.ts
export const apiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const url = `${BACKEND_URL}${endpoint}`;
  
  console.log('=== API CALL START ===');
  console.log('URL:', url);
  console.log('Method:', options?.method || 'GET');
  console.log('Headers:', options?.headers);
  console.log('Body:', options?.body);
  
  const response = await fetch(url, options);
  
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  console.log('=== API CALL END ===');
  
  // ... rest of the function
};
```

### Check Better Auth Session

```typescript
// In any component
import { authClient } from '@/lib/auth';

useEffect(() => {
  const checkSession = async () => {
    const session = await authClient.getSession();
    console.log('Better Auth Session:', session);
  };
  checkSession();
}, []);
```

---

## 📞 Getting Help

### Before Asking for Help

1. ✅ Check this troubleshooting guide
2. ✅ Check console logs for errors
3. ✅ Check Network tab for failed requests
4. ✅ Try signing out and back in
5. ✅ Try clearing app data
6. ✅ Try on different platform (iOS/Android/Web)

### Information to Provide

When reporting an issue, include:

1. **Platform**: iOS / Android / Web
2. **Error Message**: Exact error text
3. **Console Logs**: Relevant logs from console
4. **Network Logs**: Failed requests from Network tab
5. **Steps to Reproduce**: How to trigger the issue
6. **Expected Behavior**: What should happen
7. **Actual Behavior**: What actually happens

### Example Issue Report

```
**Platform**: iOS 17.0
**Error**: "Failed to load videos"

**Console Logs**:
[API] Calling: https://backend.com/api/videos/feed GET
[API] Error response: 500 - Internal Server Error

**Network Logs**:
GET /api/videos/feed
Status: 500
Response: { error: "Database connection failed" }

**Steps to Reproduce**:
1. Sign in with test@vyxo.com
2. Navigate to home screen
3. Wait for videos to load
4. Error appears

**Expected**: Videos should load
**Actual**: Error message shown
```

---

## ✅ Quick Fixes

### Reset Everything

```bash
# 1. Stop the app
# Press Ctrl+C in terminal

# 2. Clear cache
npm start -- --clear

# 3. Delete app (if needed)
# iOS: Long press app icon > Delete
# Android: Settings > Apps > VYXO > Uninstall
# Web: Clear browser cache

# 4. Reinstall
npm run ios
# or
npm run android
# or
npm run web

# 5. Sign in again
# Use test account from DEMO_CREDENTIALS.md
```

### Force Token Refresh

```typescript
// In AuthContext
const forceRefresh = async () => {
  await clearAuthTokens();
  await fetchUser();
};

// Call this function to force refresh
```

### Clear All Data

```typescript
// In AuthContext
const clearAllData = async () => {
  await signOut();
  await clearAuthTokens();
  // Clear any other local data
};
```

---

## 🎯 Prevention

### Best Practices

1. **Always check console logs** before reporting issues
2. **Test on multiple platforms** to isolate platform-specific issues
3. **Use test accounts** from DEMO_CREDENTIALS.md
4. **Keep app updated** with latest code
5. **Clear cache** when switching branches
6. **Sign out before testing** auth flows
7. **Check network connection** before testing API calls

### Monitoring

Add monitoring to catch issues early:

```typescript
// In utils/api.ts
export const apiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, options);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[API] ${endpoint} took ${duration}ms`);
    
    if (duration > 3000) {
      console.warn(`[API] Slow request: ${endpoint} (${duration}ms)`);
    }
    
    return response;
  } catch (error) {
    console.error(`[API] Request failed: ${endpoint}`, error);
    throw error;
  }
};
```

---

**Need more help?** Check the other documentation files:
- `API_INTEGRATION_REFERENCE.md` - API usage guide
- `DEMO_CREDENTIALS.md` - Test accounts
- `BACKEND_INTEGRATION_COMPLETE.md` - Full integration details
