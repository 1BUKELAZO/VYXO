
# VYXO - App Store & Play Store Launch Guide

## 📱 Brand Colors
- **Purple**: #8B5CF6 (Primary)
- **Coral**: #FF6B6B (Secondary)
- **Turquoise**: #00D9FF (Accent)
- **Dark**: #0F0F0F (Background)

---

## 🎨 Required Assets

### 1. App Icon (icon.png)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Design**: VYXO logo in Purple (#8B5CF6) on Dark (#0F0F0F) background
- **Location**: `./assets/icon.png`
- **Notes**: Must be square, no rounded corners (iOS/Android handle this automatically)

### 2. Adaptive Icon (Android) (adaptive-icon.png)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Design**: VYXO logo centered, safe area within 66% circle
- **Location**: `./assets/adaptive-icon.png`
- **Background Color**: #0F0F0F (configured in app.json)

### 3. Splash Screen (splash.png)
- **Size**: 1284x2778 pixels (iPhone 14 Pro Max resolution)
- **Format**: PNG
- **Design**: VYXO logo centered on Dark (#0F0F0F) background
- **Location**: `./assets/splash.png`
- **Resize Mode**: contain (configured in app.json)

### 4. Notification Icon (notification-icon.png)
- **Size**: 96x96 pixels
- **Format**: PNG with transparency
- **Design**: Simple VYXO logo silhouette (white/transparent)
- **Location**: `./assets/notification-icon.png`

### 5. Favicon (Web) (favicon.png)
- **Size**: 48x48 pixels
- **Format**: PNG
- **Design**: VYXO logo
- **Location**: `./assets/favicon.png`

---

## 📸 App Store Screenshots

### iOS Screenshots (Required Sizes)
1. **6.7" Display (iPhone 14 Pro Max)**: 1290x2796 pixels
2. **6.5" Display (iPhone 11 Pro Max)**: 1242x2688 pixels
3. **5.5" Display (iPhone 8 Plus)**: 1242x2208 pixels

### Android Screenshots (Required Sizes)
1. **Phone**: 1080x1920 pixels minimum
2. **7" Tablet**: 1200x1920 pixels
3. **10" Tablet**: 1600x2560 pixels

### Recommended Screenshots (5-10 images)
1. **Home Feed**: Vertical video player with UI overlay
2. **Discover**: Search and trending hashtags
3. **Create**: Camera interface with filters
4. **Profile**: User profile with video grid
5. **Live Streaming**: Live stream interface (optional)
6. **Comments**: Comment section with interactions
7. **Gifts/Tips**: Creator monetization features

---

## 🚀 EAS Build Commands

### Setup EAS CLI
```bash
npm install -g eas-cli
eas login
eas init
```

### Development Builds
```bash
# iOS Simulator
eas build --profile development --platform ios

# Android APK
eas build --profile development --platform android
```

### Preview Builds (Internal Testing)
```bash
# iOS (TestFlight)
eas build --profile preview --platform ios

# Android APK
eas build --profile preview --platform android
```

### Production Builds
```bash
# iOS (App Store)
eas build --profile production --platform ios

# Android AAB (Play Store)
eas build --profile production --platform android

# Both platforms
eas build --profile production --platform all
```

### Submit to Stores
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

---

## 📋 Pre-Launch Checklist

### Legal & Compliance
- [ ] **Privacy Policy URL**: https://vyxo.app/privacy
- [ ] **Terms of Service URL**: https://vyxo.app/terms
- [ ] **Support Email**: support@vyxo.app
- [ ] **COPPA Compliance**: Age gate for users under 13
- [ ] **GDPR Compliance**: Data deletion requests
- [ ] **Content Moderation**: Reporting system implemented

### App Store Connect (iOS)
- [ ] Create App Store Connect account
- [ ] Create new app with bundle ID: `com.vyxo.app`
- [ ] Upload app icon (1024x1024)
- [ ] Upload screenshots (5-10 per device size)
- [ ] Write app description (4000 characters max)
- [ ] Add keywords (100 characters max)
- [ ] Select category: Photo & Video
- [ ] Set age rating (17+ recommended for social media)
- [ ] Configure in-app purchases (coins, subscriptions)
- [ ] Set pricing (Free with in-app purchases)
- [ ] Add promotional text
- [ ] Configure TestFlight for beta testing

### Google Play Console (Android)
- [ ] Create Google Play Console account
- [ ] Create new app with package name: `com.vyxo.app`
- [ ] Upload app icon (512x512)
- [ ] Upload feature graphic (1024x500)
- [ ] Upload screenshots (2-8 per device type)
- [ ] Write short description (80 characters)
- [ ] Write full description (4000 characters)
- [ ] Select category: Video Players & Editors
- [ ] Set content rating (Teen/Mature 17+)
- [ ] Configure in-app products (coins, subscriptions)
- [ ] Set pricing (Free with in-app purchases)
- [ ] Add promotional video (YouTube URL)
- [ ] Configure internal testing track

### Technical Requirements
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Test all permissions (camera, microphone, photos)
- [ ] Test video recording and upload
- [ ] Test authentication (email, Google, Apple)
- [ ] Test in-app purchases (sandbox mode)
- [ ] Test push notifications
- [ ] Test deep linking
- [ ] Performance testing (video playback, scrolling)
- [ ] Crash reporting configured (Sentry/Crashlytics)

### Backend & Infrastructure
- [ ] Production backend URL configured
- [ ] Database backups enabled
- [ ] CDN configured for video delivery
- [ ] Rate limiting enabled
- [ ] Content moderation API integrated
- [ ] Analytics tracking (Mixpanel/Amplitude)
- [ ] Error monitoring (Sentry)
- [ ] Server scaling configured

---

## 📝 App Store Listing Content

### App Name
**VYXO - Short Video Social**

### Subtitle (iOS) / Short Description (Android)
Create, share, and discover short videos

### Description

**Discover the next generation of short-form video entertainment with VYXO!**

VYXO is where creativity meets community. Record, edit, and share captivating short videos with millions of users worldwide. Whether you're a content creator, entertainer, or just love watching amazing videos, VYXO is your stage.

**KEY FEATURES:**

📹 **Create Amazing Videos**
- Record videos up to 3 minutes
- Professional editing tools
- Beauty filters and effects
- Speed controls (0.3x - 3x)
- Duet and Stitch with other creators
- Add music from our vast library

🔥 **Discover Trending Content**
- Personalized For You feed
- Trending hashtags and challenges
- Search for creators and videos
- Follow your favorite creators
- Explore by category

💬 **Engage with Community**
- Like, comment, and share videos
- Video replies to comments
- Direct messaging
- Live streaming
- Gift coins to your favorite creators

💰 **Creator Monetization**
- Join the Creator Fund
- Receive gifts from fans
- Subscription tiers for exclusive content
- Brand partnerships and ads
- Detailed analytics dashboard

🎯 **Advanced Features**
- AI-powered content recommendations
- Real-time notifications
- Profile customization
- Video analytics
- Content moderation tools

**WHY VYXO?**

✨ Express yourself with powerful creative tools
🌟 Build your audience and grow your brand
💎 Monetize your content and earn real money
🚀 Join a vibrant community of creators
🎨 Stand out with unique filters and effects

**DOWNLOAD VYXO TODAY** and start your journey as a content creator!

---

**Privacy & Safety**
VYXO is committed to user safety and privacy. We provide robust content moderation, reporting tools, and privacy controls to ensure a safe environment for all users.

Privacy Policy: https://vyxo.app/privacy
Terms of Service: https://vyxo.app/terms
Support: support@vyxo.app

### Keywords (iOS - 100 characters max)
video,social,tiktok,short,creator,viral,trending,entertainment,music,dance

### Category
- **Primary**: Photo & Video
- **Secondary**: Social Networking

### Age Rating
- **iOS**: 17+ (Frequent/Intense Mature/Suggestive Themes)
- **Android**: Teen or Mature 17+ (depends on content policy)

### Promotional Text (iOS - 170 characters)
🎉 New: Live streaming, creator subscriptions, and enhanced video editing tools! Join millions creating and sharing amazing content on VYXO.

---

## 🧪 TestFlight / Internal Testing

### iOS TestFlight Setup
1. Build with `eas build --profile preview --platform ios`
2. Upload to App Store Connect
3. Configure TestFlight
4. Add internal testers (up to 100)
5. Add external testers (up to 10,000)
6. Collect feedback before production release

### Android Internal Testing
1. Build with `eas build --profile preview --platform android`
2. Upload to Google Play Console
3. Create internal testing track
4. Add testers via email list
5. Share testing link
6. Collect feedback before production release

---

## 🔧 Configuration Notes

### app.json
- **name**: "VYXO" (display name)
- **slug**: "vyxo" (URL-friendly identifier)
- **version**: "1.0.0" (semantic versioning)
- **bundleIdentifier**: "com.vyxo.app" (iOS)
- **package**: "com.vyxo.app" (Android)
- **buildNumber**: "1.0.0" (iOS)
- **versionCode**: 1 (Android)

### eas.json
- **development**: Simulator builds for testing
- **preview**: Internal testing builds (TestFlight/Internal Track)
- **production**: Store submission builds (IPA/AAB)

### Environment Variables
Update `extra.eas.projectId` in app.json after running `eas init`:
```json
"extra": {
  "eas": {
    "projectId": "your-actual-project-id"
  }
}
```

---

## 📞 Support & Resources

### Required URLs
- **Website**: https://vyxo.app
- **Privacy Policy**: https://vyxo.app/privacy
- **Terms of Service**: https://vyxo.app/terms
- **Support Email**: support@vyxo.app
- **Marketing URL**: https://vyxo.app

### Developer Resources
- **Expo Documentation**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/
- **App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console

---

## 🎯 Launch Timeline

### Week 1-2: Asset Preparation
- Design and create all required assets
- Take screenshots on various devices
- Write store listing content
- Set up legal pages (privacy, terms)

### Week 3: Internal Testing
- Build preview versions
- Distribute to internal testers
- Collect and fix bugs
- Performance optimization

### Week 4: Beta Testing
- TestFlight (iOS) and Internal Track (Android)
- Invite external beta testers
- Gather feedback
- Final bug fixes

### Week 5: Store Submission
- Build production versions
- Submit to App Store and Play Store
- Wait for review (1-7 days typically)
- Respond to any review feedback

### Week 6: Launch
- Apps approved and live
- Marketing campaign launch
- Monitor analytics and crash reports
- Respond to user reviews
- Plan first update

---

## ✅ Final Verification

Before submitting to stores, verify:

1. **All assets are in place** (icon, splash, screenshots)
2. **Legal pages are live** (privacy, terms)
3. **Support email is active** (support@vyxo.app)
4. **App builds successfully** on both platforms
5. **All features work** on physical devices
6. **Permissions are properly requested** and explained
7. **In-app purchases are configured** (if applicable)
8. **Analytics and crash reporting** are working
9. **Backend is production-ready** and scaled
10. **Content moderation** is active

---

## 🚨 Common Rejection Reasons

### iOS App Store
- Missing privacy policy
- Incomplete app functionality
- Crashes or bugs
- Misleading screenshots
- Inappropriate content
- Missing age rating
- In-app purchase issues

### Google Play Store
- Incomplete store listing
- Missing content rating
- Privacy policy issues
- Permissions not justified
- Crashes on test devices
- Inappropriate content
- Misleading metadata

---

## 📈 Post-Launch

### Week 1
- Monitor crash reports daily
- Respond to user reviews
- Track key metrics (DAU, retention)
- Fix critical bugs immediately

### Week 2-4
- Analyze user feedback
- Plan feature updates
- Optimize performance
- Improve onboarding

### Month 2+
- Regular updates (every 2-4 weeks)
- New features based on feedback
- Marketing campaigns
- Community building

---

**Good luck with your VYXO launch! 🚀**

For questions or support, contact: support@vyxo.app
