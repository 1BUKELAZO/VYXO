# VYXO

A TikTok-style short video platform built with React Native + Expo 54.

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.

---

## 🚀 Features

### ✅ Implemented
- **Authentication System**
  - Email/Password sign up and sign in
  - Google OAuth (Web)
  - Apple OAuth (iOS)
  - Session persistence across reloads
  - Secure token storage (SecureStore/localStorage)

- **Video Feed**
  - For You algorithm (personalized recommendations)
  - Trending algorithm (engagement-based ranking)
  - Auto-play videos when visible
  - Pull-to-refresh
  - Infinite scroll with cursor-based pagination
  - View tracking (unique views per user)

- **Video Interactions**
  - Like/Unlike videos
  - Double-tap to like
  - Comment on videos
  - Share videos
  - Save videos
  - Follow/Unfollow users

- **User Profiles**
  - View profile stats (followers, following, likes)
  - View followers list
  - View following list
  - Follow/Unfollow from video feed
  - Real-time count updates

- **Discover**
  - Trending videos with badges (#1, #2, #3)
  - Trending hashtags
  - Popular sounds
  - Search functionality

- **Video Upload**
  - Record videos with camera
  - Upload from gallery
  - Mux video processing
  - Thumbnail generation
  - Video status tracking

---

## 🏗️ Architecture

### Frontend
- **Framework:** React Native + Expo 54
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **State Management:** React Hooks + Context API
- **Styling:** StyleSheet (React Native)
- **Video Player:** Expo Video + Mux Player
- **Authentication:** Better Auth (Expo client)

### Backend
- **API:** https://2zrr473wqw4kppdhxncb65tkzxvzqnk3.app.specular.dev
- **Framework:** Fastify (Node.js)
- **Database:** PostgreSQL (Supabase)
- **Video Processing:** Mux
- **Authentication:** Better Auth

---

## 📁 Project Structure

```
expo-project/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Tab navigation
│   │   ├── (home)/               # Home feed
│   │   │   └── index.tsx         # For You feed
│   │   ├── discover.tsx          # Trending feed
│   │   ├── inbox.tsx             # Messages
│   │   └── profile.tsx           # User profile
│   ├── auth.tsx                  # Authentication screen
│   ├── auth-callback.tsx         # OAuth callback handler
│   ├── auth-popup.tsx            # OAuth popup (web)
│   ├── camera.tsx                # Video recording
│   ├── comments/[videoId].tsx    # Comments screen
│   ├── profile/[userId].tsx      # User profile view
│   └── search.tsx                # Search screen
├── components/                   # Reusable components
│   ├── ui/                       # UI components
│   │   ├── Modal.tsx             # Custom modal
│   │   └── Toast.tsx             # Toast notifications
│   ├── VideoRecorder.tsx         # Camera component
│   ├── ShareSheet.tsx            # Share modal
│   └── ReportSheet.tsx           # Report modal
├── contexts/                     # React contexts
│   └── AuthContext.tsx           # Authentication context
├── hooks/                        # Custom hooks
│   ├── useFeedAlgorithm.ts       # Feed algorithm hook
│   ├── useFollows.ts             # Follow system hook
│   └── useMuxUpload.ts           # Mux upload hook
├── lib/                          # Libraries
│   └── auth.ts                   # Better Auth client
├── utils/                        # Utilities
│   └── api.ts                    # API wrapper
├── styles/                       # Styles
│   └── commonStyles.ts           # Common styles & colors
└── app.json                      # Expo configuration
```

---

## 🎨 Design System

### Colors
```typescript
purple: '#8B5CF6'      // Primary brand color
coral: '#FF6B6B'       // Secondary brand color
turquoise: '#00D9FF'   // Accent color
dark: '#0F0F0F'        // Background
```

### Typography
- **H1:** 32px, Bold
- **H2:** 24px, Bold
- **H3:** 20px, SemiBold
- **Body:** 16px, Regular
- **Caption:** 14px, Regular
- **Small:** 12px, Regular

---

## 🔧 Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

### Environment Variables
The backend URL is configured in `app.json`:
```json
{
  "expo": {
    "extra": {
      "backendUrl": "https://2zrr473wqw4kppdhxncb65tkzxvzqnk3.app.specular.dev"
    }
  }
}
```

---

## 🧪 Testing

### Demo Credentials
```
Email: test@vyxo.com
Password: Test123!
```

See [DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md) for comprehensive testing scenarios.

### Testing Checklist
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign in with Google OAuth (Web)
- [ ] Sign in with Apple OAuth (iOS)
- [ ] Session persists across reloads
- [ ] For You feed loads videos
- [ ] Trending feed loads videos
- [ ] Videos auto-play when visible
- [ ] Like/Unlike videos
- [ ] Follow/Unfollow users
- [ ] View tracking works
- [ ] Pull-to-refresh works
- [ ] Infinite scroll works
- [ ] Sign out works

---

## 📚 API Documentation

### Feed Endpoints
- `GET /api/feed/foryou` - Personalized feed
- `GET /api/feed/trending` - Trending videos
- `POST /api/videos/:videoId/view` - Track video view

### User Endpoints
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/followers` - Get followers list
- `GET /api/users/:id/following` - Get following list
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user

### Video Endpoints
- `GET /api/videos/feed` - Get video feed
- `POST /api/videos/:id/like` - Like video
- `DELETE /api/videos/:id/like` - Unlike video
- `POST /api/videos/:id/share` - Share video
- `POST /api/videos/upload` - Upload video

See the full API documentation in the OpenAPI spec.

---

## 🔐 Authentication

### How It Works
1. User signs in with email/password or OAuth
2. Backend returns a Bearer token
3. Token is stored in SecureStore (native) or localStorage (web)
4. Token is sent with every API request in the `Authorization` header
5. Session persists across app reloads

### OAuth Flow (Web)
1. User clicks "Continue with Google"
2. Popup window opens with OAuth provider
3. User authorizes the app
4. Popup sends token back to parent window
5. Token is stored and user is signed in

### OAuth Flow (Native)
1. User clicks "Continue with Google"
2. Deep link opens OAuth provider
3. User authorizes the app
4. Deep link redirects back to app
5. Token is stored and user is signed in

---

## 🎥 Feed Algorithm

### For You Algorithm
**Weights:**
- Followed users: 50%
- Trending global: 20%
- Recent (24h): 10%
- Random popular: 20%

**Exclusions:**
- Videos from blocked users
- Videos already viewed by user

### Trending Algorithm
**Score Calculation:**
```
score = (views_24h * 0.4) + (likes_24h * 0.3) + (shares_24h * 0.2) + (comments_24h * 0.1)
```

**Cache:** Results cached for 1 hour

---

## 🐛 Troubleshooting

### Empty Feed
- Check backend URL in `app.json`
- Verify authentication token
- Run seed endpoint to create test data
- Check console for API errors

### Views Not Tracking
- Verify 2-second threshold is met
- Check authentication token
- Check console for API errors
- Verify video ID is correct

### Authentication Issues
- Clear app data and try again
- Check backend URL is correct
- Verify OAuth credentials (if using OAuth)
- Check console for API errors

### Video Upload Issues
- Check camera permissions
- Verify Mux credentials
- Check console for upload errors
- Verify video file size (< 100MB)

---

## 📖 Documentation

- [DEMO_CREDENTIALS.md](./DEMO_CREDENTIALS.md) - Demo accounts and testing scenarios
- [API_INTEGRATION_REFERENCE.md](./API_INTEGRATION_REFERENCE.md) - API integration guide
- [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - Quick start guide

---

## 🚧 Known Limitations

1. **User Profile View:** No dedicated screen to view other users' profiles yet
2. **Follow Notifications:** Notifications created but not displayed in UI
3. **Follow Feed Filter:** Video feed doesn't filter by followed users yet
4. **Trending Score:** Calculated on-demand (could be pre-calculated)
5. **Personalization:** Basic algorithm (could be enhanced with ML)

---

## 🔮 Future Enhancements

1. **Advanced Personalization**
   - Machine learning recommendations
   - User interest categories
   - Watch time tracking
   - Skip/replay analysis

2. **Real-time Features**
   - WebSocket updates for trending videos
   - Live view counts
   - Real-time ranking changes

3. **Social Features**
   - Direct messaging
   - Group chats
   - Live streaming
   - Duets and stitches

4. **Content Discovery**
   - Category filters
   - Hashtag pages
   - Sound pages
   - Suggested users

5. **Analytics**
   - Creator dashboard
   - Video insights
   - Audience demographics
   - Engagement metrics

---

## 📄 License

This project is proprietary and confidential.

---

## 🙏 Acknowledgments

- Built with [Natively.dev](https://natively.dev)
- Video processing by [Mux](https://mux.com)
- Authentication by [Better Auth](https://better-auth.com)
- Database by [Supabase](https://supabase.com)

---

**Made with 💙 for creativity.**
