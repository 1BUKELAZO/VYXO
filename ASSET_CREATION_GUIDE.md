
# VYXO - Asset Creation Guide

## 🎨 Design Specifications

### Brand Colors
```
Primary Purple:   #8B5CF6
Secondary Coral:  #FF6B6B
Accent Turquoise: #00D9FF
Background Dark:  #0F0F0F
```

---

## 📱 App Icon (icon.png)

### Specifications
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Color Space**: sRGB
- **File Size**: < 1MB

### Design Guidelines
1. **Logo**: VYXO wordmark or symbol in Purple (#8B5CF6)
2. **Background**: Solid Dark (#0F0F0F)
3. **Padding**: 10% margin from edges (safe area)
4. **Style**: Modern, bold, recognizable at small sizes
5. **No Text**: Avoid small text (won't be readable at 60x60)

### Design Tips
- Keep it simple and bold
- Test at multiple sizes (60x60, 120x120, 180x180)
- Ensure it stands out on both light and dark backgrounds
- Avoid gradients (they don't scale well)
- Use vector graphics for crisp edges

### Tools
- **Figma**: Free, web-based
- **Adobe Illustrator**: Professional vector editor
- **Canva**: Easy template-based design
- **Sketch**: Mac-only design tool

### Export Settings
```
Format: PNG
Size: 1024x1024
Color Profile: sRGB
Transparency: Yes
Compression: None
```

---

## 🤖 Adaptive Icon (Android) (adaptive-icon.png)

### Specifications
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Safe Area**: 66% circle (684x684 pixels centered)
- **Background**: #0F0F0F (configured in app.json)

### Design Guidelines
1. **Foreground Layer**: VYXO logo centered
2. **Safe Area**: Keep all important elements within 66% circle
3. **Padding**: 15% margin from safe area edge
4. **Test**: Preview with different mask shapes (circle, squircle, rounded square)

### Android Mask Shapes
- Circle (Google Pixel)
- Squircle (Samsung)
- Rounded Square (OnePlus)
- Teardrop (some manufacturers)

### Design Template
```
1024x1024 canvas
├── Outer area (1024x1024) - may be cropped
├── Safe area (684x684 circle) - always visible
└── Logo (512x512) - centered
```

### Export Settings
```
Format: PNG
Size: 1024x1024
Color Profile: sRGB
Transparency: Yes (foreground only)
Background: Transparent
```

---

## 🌊 Splash Screen (splash.png)

### Specifications
- **Size**: 1284x2778 pixels (iPhone 14 Pro Max)
- **Format**: PNG
- **Aspect Ratio**: 9:19.5
- **Background**: #0F0F0F (configured in app.json)

### Design Guidelines
1. **Logo**: VYXO logo centered
2. **Logo Size**: 400x400 pixels (approximately)
3. **Background**: Solid Dark (#0F0F0F)
4. **Resize Mode**: contain (logo won't be cropped)
5. **Safe Area**: Keep logo within center 50% of screen

### Multi-Device Support
The splash screen will be automatically resized for:
- iPhone (various sizes)
- iPad
- Android phones (various aspect ratios)
- Android tablets

### Design Tips
- Keep logo centered and simple
- Avoid text (may be cut off on some devices)
- Test on various aspect ratios
- Use solid background color
- Logo should be recognizable instantly

### Export Settings
```
Format: PNG
Size: 1284x2778
Color Profile: sRGB
Background: #0F0F0F
Compression: Medium
```

---

## 🔔 Notification Icon (notification-icon.png)

### Specifications
- **Size**: 96x96 pixels
- **Format**: PNG with transparency
- **Style**: Silhouette (white on transparent)
- **Android Only**: iOS uses app icon

### Design Guidelines
1. **Silhouette**: Simple white shape on transparent background
2. **No Colors**: Android will tint it automatically
3. **No Gradients**: Flat design only
4. **Simple**: Recognizable at small sizes
5. **Padding**: 8px margin from edges

### Design Tips
- Use simplified version of logo
- Test on dark and light notification backgrounds
- Avoid fine details (won't be visible)
- Keep it iconic and recognizable

### Export Settings
```
Format: PNG
Size: 96x96
Color Profile: sRGB
Transparency: Yes
Colors: White (#FFFFFF) on transparent
```

---

## 🌐 Favicon (favicon.png)

### Specifications
- **Size**: 48x48 pixels
- **Format**: PNG
- **Web Only**: For PWA and web version

### Design Guidelines
1. **Logo**: Simplified VYXO logo
2. **Colors**: Purple (#8B5CF6) on Dark (#0F0F0F)
3. **Simple**: Recognizable at tiny sizes
4. **Square**: No rounded corners

### Export Settings
```
Format: PNG
Size: 48x48
Color Profile: sRGB
Transparency: Optional
```

---

## 📸 Screenshot Guidelines

### iOS Screenshot Sizes

#### 6.7" Display (iPhone 14 Pro Max) - REQUIRED
- **Size**: 1290x2796 pixels
- **Devices**: iPhone 14 Pro Max, 15 Pro Max

#### 6.5" Display (iPhone 11 Pro Max) - REQUIRED
- **Size**: 1242x2688 pixels
- **Devices**: iPhone 11 Pro Max, XS Max

#### 5.5" Display (iPhone 8 Plus) - REQUIRED
- **Size**: 1242x2208 pixels
- **Devices**: iPhone 8 Plus, 7 Plus, 6s Plus

### Android Screenshot Sizes

#### Phone - REQUIRED
- **Minimum**: 1080x1920 pixels
- **Maximum**: 7680x4320 pixels
- **Recommended**: 1080x1920 or 1440x2560

#### 7" Tablet - OPTIONAL
- **Size**: 1200x1920 pixels

#### 10" Tablet - OPTIONAL
- **Size**: 1600x2560 pixels

### Screenshot Content (5-10 images)

#### 1. Home Feed (Hero Screenshot)
- Vertical video player
- UI overlay (like, comment, share buttons)
- Caption and username visible
- Engaging video thumbnail
- **Caption**: "Discover endless entertainment"

#### 2. Discover Page
- Search bar at top
- Trending hashtags grid
- Popular videos
- Category filters
- **Caption**: "Explore trending content"

#### 3. Camera/Create
- Camera interface
- Filter carousel at bottom
- Recording timer
- Flip camera button
- **Caption**: "Create amazing videos"

#### 4. Profile
- User avatar and stats
- Video grid (3 columns)
- Follow button
- Bio and links
- **Caption**: "Build your audience"

#### 5. Live Streaming (Optional)
- Live video player
- Viewer count
- Live chat
- Gift animations
- **Caption**: "Go live with your fans"

#### 6. Comments
- Comment list
- Video reply button
- Like counts
- User avatars
- **Caption**: "Engage with community"

#### 7. Creator Dashboard (Optional)
- Analytics charts
- Earnings summary
- Video performance
- Follower growth
- **Caption**: "Track your success"

#### 8. Monetization (Optional)
- Gift picker
- Coin packages
- Subscription tiers
- Creator Fund info
- **Caption**: "Earn from your content"

### Screenshot Design Tips

1. **Use Real Content**: Show actual app interface, not mockups
2. **Add Captions**: Short, compelling text overlay
3. **Highlight Features**: Circle or arrow to key features
4. **Show Diversity**: Various content types and creators
5. **Status Bar**: Include realistic status bar (time, battery, signal)
6. **Localization**: Create versions for different languages
7. **Consistency**: Use same device frame for all screenshots
8. **Quality**: High resolution, no pixelation
9. **Branding**: Subtle VYXO branding in corner
10. **Call to Action**: Encourage download in captions

### Screenshot Tools

#### Capture Screenshots
- **iOS**: Xcode Simulator (Cmd+S)
- **Android**: Android Studio Emulator
- **Physical Device**: Take screenshots directly

#### Design Tools
- **Figma**: Free, web-based, templates available
- **Sketch**: Mac-only, professional
- **Adobe XD**: Cross-platform
- **Canva**: Easy templates
- **Screenshot.rocks**: Automated device frames

#### Device Frames
- **Figma**: Device mockup plugins
- **Mockuphone**: Free device frames
- **Smartmockups**: Automated mockups
- **Placeit**: Template-based mockups

### Screenshot Checklist

- [ ] All required sizes created
- [ ] High resolution (no pixelation)
- [ ] Realistic content (no lorem ipsum)
- [ ] Captions are clear and compelling
- [ ] Features are highlighted
- [ ] Consistent branding
- [ ] Status bar looks realistic
- [ ] No personal information visible
- [ ] Localized for target markets
- [ ] Tested on actual store listing

---

## 🎬 App Preview Video (Optional but Recommended)

### iOS App Preview
- **Length**: 15-30 seconds
- **Format**: MP4 or MOV
- **Resolution**: Match screenshot sizes
- **Orientation**: Portrait
- **File Size**: < 500MB

### Android Promo Video
- **Length**: 30-120 seconds
- **Format**: YouTube video URL
- **Orientation**: Landscape or Portrait
- **Quality**: 1080p minimum

### Video Content
1. **Opening**: VYXO logo animation (2s)
2. **Feature 1**: Discover feed (5s)
3. **Feature 2**: Create video (5s)
4. **Feature 3**: Engage with community (5s)
5. **Feature 4**: Monetization (5s)
6. **Closing**: Call to action + logo (3s)

### Video Tips
- Show actual app usage
- Add upbeat background music
- Include text overlays
- Keep it fast-paced
- End with clear call to action
- No voiceover needed (auto-muted)

---

## 🛠️ Asset Generation Workflow

### Step 1: Design in Vector
1. Create master design in Figma/Illustrator
2. Use brand colors consistently
3. Design at highest resolution (1024x1024 for icons)
4. Keep layers organized

### Step 2: Export Assets
1. Export icon.png (1024x1024)
2. Export adaptive-icon.png (1024x1024)
3. Export splash.png (1284x2778)
4. Export notification-icon.png (96x96)
5. Export favicon.png (48x48)

### Step 3: Optimize
1. Compress PNG files (TinyPNG, ImageOptim)
2. Verify file sizes (< 1MB for icons)
3. Check color profiles (sRGB)
4. Test transparency

### Step 4: Place in Project
```
assets/
├── icon.png
├── adaptive-icon.png
├── splash.png
├── notification-icon.png
└── favicon.png
```

### Step 5: Test
1. Run `expo start` and check splash screen
2. Build preview app and check icon
3. Test on physical devices
4. Verify all sizes look correct

---

## ✅ Asset Checklist

### Required Assets
- [ ] icon.png (1024x1024)
- [ ] adaptive-icon.png (1024x1024)
- [ ] splash.png (1284x2778)
- [ ] notification-icon.png (96x96)
- [ ] favicon.png (48x48)

### iOS Screenshots (5-10 per size)
- [ ] 6.7" Display (1290x2796) - iPhone 14 Pro Max
- [ ] 6.5" Display (1242x2688) - iPhone 11 Pro Max
- [ ] 5.5" Display (1242x2208) - iPhone 8 Plus

### Android Screenshots (2-8 per size)
- [ ] Phone (1080x1920 minimum)
- [ ] 7" Tablet (1200x1920) - Optional
- [ ] 10" Tablet (1600x2560) - Optional

### Optional Assets
- [ ] App Preview Video (iOS)
- [ ] Promo Video (Android - YouTube URL)
- [ ] Feature Graphic (Android - 1024x500)

---

## 🎨 Design Resources

### Free Design Tools
- **Figma**: https://figma.com (web-based, free)
- **Canva**: https://canva.com (templates, free tier)
- **GIMP**: https://gimp.org (Photoshop alternative)
- **Inkscape**: https://inkscape.org (Illustrator alternative)

### Icon Design Inspiration
- **Dribbble**: https://dribbble.com/tags/app-icon
- **Behance**: https://behance.net/search/projects?search=app%20icon
- **App Icon Generator**: https://appicon.co

### Screenshot Templates
- **Figma Community**: Search "app store screenshots"
- **Sketch App Sources**: Free templates
- **Canva**: App screenshot templates

### Stock Assets
- **Unsplash**: Free high-quality photos
- **Pexels**: Free stock photos and videos
- **Flaticon**: Free icons (with attribution)

---

## 📞 Need Help?

If you need professional design services:
- **Fiverr**: Affordable freelance designers
- **99designs**: Design contests
- **Upwork**: Professional designers
- **Dribbble**: Hire top designers

For questions: support@vyxo.app

---

**Ready to create your assets? Start with the app icon and work your way through the checklist! 🎨**
