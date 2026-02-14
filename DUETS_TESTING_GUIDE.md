
# 🧪 Duets & Stitches - Testing Guide

## 📋 Pre-Testing Checklist

Before testing, ensure:
- ✅ Backend is running at `https://2zrr473wqw4kppdhxncb65tkzxvzqnk3.app.specular.dev`
- ✅ You have a test account with authentication token
- ✅ Camera permissions are granted on device/simulator
- ✅ At least one video exists that allows duets/stitches

---

## 🎯 Test Scenarios

### 1. **Duet Creation Flow** (Critical Path)

#### Test Case 1.1: Navigate to Duet Screen
**Steps:**
1. Open app and navigate to home feed
2. Find a video with DuetButton visible
3. Tap the DuetButton

**Expected Result:**
- ✅ Navigates to `/duet/[videoId]` screen
- ✅ Shows loading indicator while fetching video details
- ✅ Original video starts playing

**Pass/Fail:** ___

---

#### Test Case 1.2: Select Duet Mode
**Steps:**
1. On duet screen, tap "Duet" mode button
2. Observe the layout selector appears
3. Tap "Stitch" mode button
4. Observe the layout selector disappears

**Expected Result:**
- ✅ Mode selector highlights active mode (purple background)
- ✅ Layout selector only visible in Duet mode
- ✅ Info text updates based on mode

**Pass/Fail:** ___

---

#### Test Case 1.3: Change Layout
**Steps:**
1. Select "Duet" mode
2. Tap side-by-side layout button
3. Observe video layout changes
4. Tap top-bottom layout button
5. Observe video layout changes

**Expected Result:**
- ✅ Active layout button has turquoise border
- ✅ Video splits horizontally for side-by-side
- ✅ Video splits vertically for top-bottom
- ✅ Camera preview adjusts to layout

**Pass/Fail:** ___

---

#### Test Case 1.4: Record Duet
**Steps:**
1. Select "Duet" mode and "Side" layout
2. Tap the red record button
3. Wait for recording to complete (or tap to stop)
4. Observe the preview

**Expected Result:**
- ✅ Recording indicator appears with timer
- ✅ Original video plays in loop during recording
- ✅ Recording stops at max duration
- ✅ Preview shows both videos side-by-side
- ✅ "Retake" and "Next" buttons appear

**Pass/Fail:** ___

---

#### Test Case 1.5: Record Stitch
**Steps:**
1. Select "Stitch" mode
2. Tap the red record button
3. Wait for 5 seconds
4. Observe the preview

**Expected Result:**
- ✅ Recording stops after 5 seconds
- ✅ Preview shows original video (5s) then user video
- ✅ "Retake" and "Next" buttons appear

**Pass/Fail:** ___

---

#### Test Case 1.6: Retake Video
**Steps:**
1. Record a duet
2. Tap "Retake" button
3. Record again

**Expected Result:**
- ✅ Returns to recording screen
- ✅ Previous recording is discarded
- ✅ Can record again

**Pass/Fail:** ___

---

#### Test Case 1.7: Proceed to Editor
**Steps:**
1. Record a duet
2. Tap "Next" button
3. Observe video editor screen

**Expected Result:**
- ✅ Navigates to video editor
- ✅ Duet indicator banner shows "Duet • Side by Side" or "Stitch"
- ✅ Video preview plays correctly
- ✅ Can add caption and settings

**Pass/Fail:** ___

---

### 2. **Video Upload with Duet Metadata**

#### Test Case 2.1: Upload Duet Video
**Steps:**
1. Complete duet recording and proceed to editor
2. Add caption "My first duet! #duet"
3. Tap "Publicar" button
4. Wait for upload to complete

**Expected Result:**
- ✅ Upload progress shows (0-100%)
- ✅ Success modal appears
- ✅ Navigates back to home feed
- ✅ New duet video appears in feed

**Pass/Fail:** ___

---

#### Test Case 2.2: Verify Duet Metadata
**Steps:**
1. After uploading duet, find it in feed
2. Observe the duet indicator badge
3. Check if "Duet with @username" is displayed

**Expected Result:**
- ✅ Duet badge shows with turquoise background
- ✅ Shows "Duet with @originalUsername"
- ✅ Original user's avatar is visible (if available)

**Pass/Fail:** ___

---

### 3. **DuetButton Integration**

#### Test Case 3.1: DuetButton Visibility
**Steps:**
1. Navigate to home feed
2. Scroll through videos
3. Observe which videos show DuetButton

**Expected Result:**
- ✅ DuetButton appears on videos with `allowDuets: true` or `allowStitches: true`
- ✅ DuetButton does NOT appear on videos with both disabled
- ✅ Button shows duet count if > 0

**Pass/Fail:** ___

---

#### Test Case 3.2: DuetButton Count
**Steps:**
1. Find a video with duets
2. Observe the count on DuetButton
3. Create a new duet for that video
4. Return to feed and check count

**Expected Result:**
- ✅ Count displays correctly (e.g., "42" or "1.2K")
- ✅ Count updates after creating new duet
- ✅ Count fetches from API on mount

**Pass/Fail:** ___

---

#### Test Case 3.3: DuetButton Disabled State
**Steps:**
1. Find a video with `allowDuets: false` and `allowStitches: false`
2. Observe DuetButton (should not be visible)
3. Try to tap it (if visible)

**Expected Result:**
- ✅ Button is not visible or is disabled
- ✅ Tapping does nothing
- ✅ Button appears grayed out if disabled

**Pass/Fail:** ___

---

### 4. **API Integration**

#### Test Case 4.1: Fetch Video Details
**Steps:**
1. Open duet screen for a video
2. Check console logs for API call
3. Verify response includes duet metadata

**Expected Result:**
- ✅ API call to `/api/videos/:videoId`
- ✅ Response includes `allowDuets`, `allowStitches`, `duetsCount`
- ✅ No errors in console

**Pass/Fail:** ___

---

#### Test Case 4.2: Fetch Duets List
**Steps:**
1. Call `getDuets('video-uuid')` in console
2. Observe response

**Expected Result:**
- ✅ API call to `/api/videos/:videoId/duets`
- ✅ Returns array of duet videos
- ✅ Each duet has `isDuet`, `isStitch`, `duetLayout` fields

**Pass/Fail:** ___

---

#### Test Case 4.3: Fetch Duets Count
**Steps:**
1. Call `getDuetsCount('video-uuid')` in console
2. Observe response

**Expected Result:**
- ✅ API call to `/api/videos/:videoId/duets-count`
- ✅ Returns `{ count: number }`
- ✅ Count matches DuetButton display

**Pass/Fail:** ___

---

#### Test Case 4.4: Upload with Duet Metadata
**Steps:**
1. Record and upload a duet
2. Check network tab for upload request
3. Verify request body includes duet fields

**Expected Result:**
- ✅ POST to `/api/videos/upload`
- ✅ Request includes `duetWithId`, `isDuet`, `isStitch`, `duetLayout`
- ✅ Response includes video ID

**Pass/Fail:** ___

---

### 5. **Error Handling**

#### Test Case 5.1: Camera Permission Denied
**Steps:**
1. Deny camera permission
2. Navigate to duet screen
3. Observe error state

**Expected Result:**
- ✅ Shows "Camera Permission Required" screen
- ✅ "Grant Permission" button appears
- ✅ Tapping button requests permission

**Pass/Fail:** ___

---

#### Test Case 5.2: Video Not Found
**Steps:**
1. Navigate to duet screen with invalid video ID
2. Observe error state

**Expected Result:**
- ✅ Shows error message
- ✅ "Go Back" button appears
- ✅ No crash or blank screen

**Pass/Fail:** ___

---

#### Test Case 5.3: Network Error
**Steps:**
1. Disable network connection
2. Try to fetch duets count
3. Observe error handling

**Expected Result:**
- ✅ Error message appears
- ✅ App doesn't crash
- ✅ Can retry when network is restored

**Pass/Fail:** ___

---

#### Test Case 5.4: Upload Failure
**Steps:**
1. Record a duet
2. Simulate upload failure (disconnect network mid-upload)
3. Observe error modal

**Expected Result:**
- ✅ Error modal appears with message
- ✅ "Retry" button available
- ✅ "Go Back" button available
- ✅ Can retry upload

**Pass/Fail:** ___

---

### 6. **UI/UX Testing**

#### Test Case 6.1: Duet Indicator Badge
**Steps:**
1. Find a duet video in feed
2. Observe the duet indicator badge

**Expected Result:**
- ✅ Badge has turquoise background
- ✅ Shows "Duet with @username" or "Stitch with @username"
- ✅ Icon is visible (person.2)
- ✅ Badge is positioned correctly

**Pass/Fail:** ___

---

#### Test Case 6.2: Recording Timer
**Steps:**
1. Start recording a duet
2. Observe the timer

**Expected Result:**
- ✅ Timer shows "0s / 15s" (or max duration)
- ✅ Timer updates every second
- ✅ Timer has red background
- ✅ Recording dot animates

**Pass/Fail:** ___

---

#### Test Case 6.3: Layout Selector Icons
**Steps:**
1. On duet screen, observe layout selector
2. Tap each layout button

**Expected Result:**
- ✅ Icons clearly represent layouts
- ✅ Active button has turquoise border
- ✅ Inactive buttons are grayed out
- ✅ Haptic feedback on tap

**Pass/Fail:** ___

---

#### Test Case 6.4: Video Editor Duet Banner
**Steps:**
1. Record a duet and proceed to editor
2. Observe the duet indicator banner

**Expected Result:**
- ✅ Banner shows at top of editor
- ✅ Shows "Duet • Side by Side" or "Stitch"
- ✅ Icon is visible
- ✅ Banner has correct color (turquoise)

**Pass/Fail:** ___

---

## 🎯 Performance Testing

### Test Case P.1: Video Loading Speed
**Steps:**
1. Navigate to duet screen
2. Measure time to load original video

**Expected Result:**
- ✅ Video loads within 2 seconds
- ✅ No lag or stuttering
- ✅ Smooth playback

**Pass/Fail:** ___

---

### Test Case P.2: Recording Performance
**Steps:**
1. Record a 15-second duet
2. Observe frame rate and quality

**Expected Result:**
- ✅ No dropped frames
- ✅ Audio syncs with video
- ✅ No lag during recording

**Pass/Fail:** ___

---

### Test Case P.3: Upload Speed
**Steps:**
1. Upload a duet video
2. Measure upload time

**Expected Result:**
- ✅ Upload completes within reasonable time
- ✅ Progress bar updates smoothly
- ✅ No timeout errors

**Pass/Fail:** ___

---

## 📊 Test Summary

| Category | Total Tests | Passed | Failed | Notes |
|----------|-------------|--------|--------|-------|
| Duet Creation | 7 | ___ | ___ | ___ |
| Video Upload | 2 | ___ | ___ | ___ |
| DuetButton | 3 | ___ | ___ | ___ |
| API Integration | 4 | ___ | ___ | ___ |
| Error Handling | 4 | ___ | ___ | ___ |
| UI/UX | 4 | ___ | ___ | ___ |
| Performance | 3 | ___ | ___ | ___ |
| **TOTAL** | **27** | ___ | ___ | ___ |

---

## 🐛 Bug Report Template

If you find a bug, use this template:

```
**Bug Title:** [Short description]

**Severity:** [Critical / High / Medium / Low]

**Test Case:** [Test case number]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Logs:**
[Attach screenshots or console logs]

**Device/Platform:**
- Device: [iPhone 14 / Android Pixel 7]
- OS Version: [iOS 17 / Android 13]
- App Version: [1.0.0]

**Additional Notes:**
[Any other relevant information]
```

---

## ✅ Sign-Off

**Tester Name:** _______________

**Date:** _______________

**Overall Status:** [ ] PASS  [ ] FAIL  [ ] NEEDS REVIEW

**Comments:**
_______________________________________________
_______________________________________________
_______________________________________________

---

**Happy Testing! 🧪✨**
