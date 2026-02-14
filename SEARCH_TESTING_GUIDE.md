
# 🧪 VYXO Search - Testing Guide

## 🎯 Testing Checklist

Use this guide to thoroughly test the search functionality before deployment.

---

## 1️⃣ Search Screen Tests

### Basic Search
- [ ] Navigate to Discover screen
- [ ] Tap the search bar
- [ ] Verify navigation to `/search`
- [ ] Verify input field is auto-focused
- [ ] Type a query (e.g., "john")
- [ ] Verify suggestions appear after 300ms
- [ ] Verify suggestions include users, hashtags, sounds
- [ ] Press Enter or tap a suggestion
- [ ] Verify search results appear

### Search Input
- [ ] Type in search field
- [ ] Verify clear button (X) appears
- [ ] Tap clear button
- [ ] Verify input is cleared
- [ ] Verify suggestions disappear
- [ ] Tap Cancel button
- [ ] Verify navigation back to previous screen

### Tabs
- [ ] Perform a search
- [ ] Verify "Users" tab is selected by default
- [ ] Tap "Videos" tab
- [ ] Verify tab switches and results update
- [ ] Verify pagination resets when switching tabs
- [ ] Switch back to "Users" tab
- [ ] Verify results update again

### Recent Searches
- [ ] Open search screen (no query)
- [ ] Verify "Recent Searches" section appears (if any exist)
- [ ] Perform a search
- [ ] Go back and reopen search
- [ ] Verify search was saved to recent searches
- [ ] Tap a recent search
- [ ] Verify search is performed
- [ ] Tap X button on a recent search
- [ ] Verify search is removed
- [ ] Tap "Clear All"
- [ ] Verify all recent searches are removed

### Empty States
- [ ] Open search screen (no recent searches)
- [ ] Verify "Search VYXO" empty state appears
- [ ] Search for gibberish (e.g., "xyzabc123")
- [ ] Verify "No results found" empty state appears
- [ ] Verify suggestion to try something else

---

## 2️⃣ Search Results Tests

### User Results
- [ ] Search for a common name (e.g., "john")
- [ ] Select "Users" tab
- [ ] Verify user results appear
- [ ] Verify each result shows:
  - [ ] Avatar (or placeholder with initial)
  - [ ] Username with @ prefix
  - [ ] "Tap to view profile" text
  - [ ] Follow button
- [ ] Tap a user result
- [ ] Verify navigation to user profile
- [ ] Go back and tap Follow button
- [ ] Verify button changes to "Following"
- [ ] Tap again to unfollow
- [ ] Verify button changes back to "Follow"

### Video Results
- [ ] Search for a keyword (e.g., "dance")
- [ ] Select "Videos" tab
- [ ] Verify video results appear in 2-column grid
- [ ] Verify each result shows:
  - [ ] Thumbnail image
  - [ ] Caption (max 2 lines)
  - [ ] Username with @ prefix
- [ ] Tap a video result
- [ ] Verify navigation to video player
- [ ] Verify video plays

### Infinite Scroll
- [ ] Perform a search with many results
- [ ] Scroll down to bottom of list
- [ ] Verify loading indicator appears at bottom
- [ ] Verify more results load automatically
- [ ] Continue scrolling
- [ ] Verify pagination continues until no more results
- [ ] Verify loading indicator disappears when done

### Loading States
- [ ] Perform a search
- [ ] Verify skeleton loaders appear while loading
- [ ] Verify skeletons match result type (users vs videos)
- [ ] Wait for results to load
- [ ] Verify skeletons are replaced with actual results

---

## 3️⃣ Discover Screen Tests

### Search Bar
- [ ] Open Discover screen
- [ ] Verify search bar is visible at top
- [ ] Verify placeholder text: "Search users, videos, sounds..."
- [ ] Tap search bar
- [ ] Verify navigation to `/search`

### Tabs
- [ ] Verify "For You" and "Trending" tabs are visible
- [ ] Tap "For You" tab
- [ ] Verify placeholder message appears
- [ ] Tap "Trending" tab
- [ ] Verify trending content loads

### Trending Hashtags
- [ ] Select "Trending" tab
- [ ] Verify "Trending Hashtags" section appears
- [ ] Verify hashtags are displayed in grid
- [ ] Verify each hashtag shows:
  - [ ] Hashtag name with # prefix
  - [ ] Usage count (formatted: 1.2M, 5.3K, etc.)
- [ ] Tap a hashtag
- [ ] Verify navigation to search with hashtag query
- [ ] Verify "Videos" tab is selected
- [ ] Verify search results for hashtag appear

### Popular Sounds
- [ ] Select "Trending" tab
- [ ] Verify "Popular Sounds" section appears
- [ ] Verify sounds are displayed in vertical list
- [ ] Verify each sound shows:
  - [ ] Music note icon
  - [ ] Sound title
  - [ ] Artist name
  - [ ] Usage count
- [ ] Tap a sound
- [ ] Verify navigation to sound page

### Loading States
- [ ] Open Discover screen
- [ ] Verify loading indicator appears while fetching
- [ ] Wait for content to load
- [ ] Verify loading indicator disappears
- [ ] Verify trending content appears

---

## 4️⃣ Search Suggestions Tests

### User Suggestions
- [ ] Open search screen
- [ ] Type at least 2 characters (e.g., "jo")
- [ ] Wait 300ms for suggestions
- [ ] Verify user suggestions appear
- [ ] Verify each suggestion shows:
  - [ ] Person icon
  - [ ] Username with @ prefix
- [ ] Tap a user suggestion
- [ ] Verify navigation to user profile

### Hashtag Suggestions
- [ ] Open search screen
- [ ] Type at least 2 characters (e.g., "vi")
- [ ] Wait 300ms for suggestions
- [ ] Verify hashtag suggestions appear
- [ ] Verify each suggestion shows:
  - [ ] Hashtag icon
  - [ ] Hashtag name with # prefix
  - [ ] Usage count
- [ ] Tap a hashtag suggestion
- [ ] Verify search is performed with hashtag
- [ ] Verify "Videos" tab is selected

### Sound Suggestions
- [ ] Open search screen
- [ ] Type at least 2 characters (e.g., "or")
- [ ] Wait 300ms for suggestions
- [ ] Verify sound suggestions appear
- [ ] Verify each suggestion shows:
  - [ ] Music note icon
  - [ ] Sound title
  - [ ] Artist name
- [ ] Tap a sound suggestion
- [ ] Verify navigation to sound page

### Debouncing
- [ ] Open search screen
- [ ] Type quickly without pausing (e.g., "testing")
- [ ] Verify suggestions don't appear until 300ms after last keystroke
- [ ] Verify only one API call is made (check console logs)

---

## 5️⃣ Deep Linking Tests

### URL Query Parameters
- [ ] Navigate to `/search?q=dance`
- [ ] Verify search is performed automatically
- [ ] Verify "dance" appears in search input
- [ ] Verify results are displayed

### Hashtag Deep Links
- [ ] Navigate to `/search?q=%23viral`
- [ ] Verify search is performed with "#viral"
- [ ] Verify "Videos" tab is selected
- [ ] Verify results are displayed

---

## 6️⃣ Error Handling Tests

### Network Errors
- [ ] Turn off internet connection
- [ ] Perform a search
- [ ] Verify error toast appears: "Failed to search"
- [ ] Verify empty results (not crash)
- [ ] Turn on internet connection
- [ ] Perform search again
- [ ] Verify results appear

### Authentication Errors
- [ ] Sign out of the app
- [ ] Try to access search screen
- [ ] Verify redirect to login screen (or 401 error handling)
- [ ] Sign in
- [ ] Verify search works again

### Invalid Queries
- [ ] Search for special characters (e.g., "!@#$%")
- [ ] Verify no crash
- [ ] Verify empty results or error message
- [ ] Search for very long query (100+ characters)
- [ ] Verify query is handled gracefully

---

## 7️⃣ Performance Tests

### Response Time
- [ ] Perform a search
- [ ] Measure time from input to results
- [ ] Verify results appear within 1-2 seconds
- [ ] Check console logs for API response times

### Pagination Performance
- [ ] Perform a search with many results
- [ ] Scroll quickly to bottom
- [ ] Verify smooth scrolling (no lag)
- [ ] Verify pagination loads quickly

### Memory Usage
- [ ] Perform multiple searches
- [ ] Switch between tabs multiple times
- [ ] Scroll through many results
- [ ] Verify no memory leaks (check dev tools)
- [ ] Verify app doesn't slow down

---

## 8️⃣ Cross-Platform Tests

### iOS
- [ ] Test all features on iOS simulator
- [ ] Test on physical iOS device
- [ ] Verify icons display correctly (SF Symbols)
- [ ] Verify keyboard behavior
- [ ] Verify safe area insets

### Android
- [ ] Test all features on Android emulator
- [ ] Test on physical Android device
- [ ] Verify icons display correctly (Material Icons)
- [ ] Verify keyboard behavior
- [ ] Verify edge-to-edge layout

### Web
- [ ] Test all features on web browser
- [ ] Verify responsive layout
- [ ] Verify keyboard shortcuts work
- [ ] Verify mouse interactions
- [ ] Verify no console errors

---

## 9️⃣ Accessibility Tests

### Screen Reader
- [ ] Enable screen reader (VoiceOver/TalkBack)
- [ ] Navigate through search screen
- [ ] Verify all elements are announced
- [ ] Verify buttons are labeled correctly

### Keyboard Navigation
- [ ] Use Tab key to navigate
- [ ] Verify focus indicators are visible
- [ ] Verify Enter key submits search
- [ ] Verify Escape key closes search

### Color Contrast
- [ ] Verify text is readable on all backgrounds
- [ ] Verify icons are visible
- [ ] Verify focus states are clear

---

## 🔟 Edge Cases

### Empty Results
- [ ] Search for non-existent user
- [ ] Verify "No results found" message
- [ ] Search for non-existent video
- [ ] Verify "No results found" message

### Single Result
- [ ] Search for unique username
- [ ] Verify single result displays correctly
- [ ] Verify no pagination issues

### Special Characters
- [ ] Search with emojis (e.g., "😀")
- [ ] Search with accents (e.g., "café")
- [ ] Search with spaces (e.g., "john doe")
- [ ] Verify all queries are handled correctly

### Long Content
- [ ] Search for user with very long username
- [ ] Verify text truncates with ellipsis
- [ ] Search for video with very long caption
- [ ] Verify text truncates correctly

---

## 📊 Test Results Template

Use this template to record your test results:

```
Date: ___________
Tester: ___________
Platform: [ ] iOS  [ ] Android  [ ] Web
Device: ___________

Search Screen: [ ] Pass  [ ] Fail
Search Results: [ ] Pass  [ ] Fail
Discover Screen: [ ] Pass  [ ] Fail
Search Suggestions: [ ] Pass  [ ] Fail
Deep Linking: [ ] Pass  [ ] Fail
Error Handling: [ ] Pass  [ ] Fail
Performance: [ ] Pass  [ ] Fail
Cross-Platform: [ ] Pass  [ ] Fail
Accessibility: [ ] Pass  [ ] Fail
Edge Cases: [ ] Pass  [ ] Fail

Issues Found:
1. ___________
2. ___________
3. ___________

Notes:
___________
___________
___________
```

---

## 🐛 Common Issues & Solutions

### Issue: Suggestions not appearing
**Solution:** Check minimum character count (2) and debounce delay (300ms)

### Issue: Pagination not working
**Solution:** Verify `nextCursor` is passed correctly and `hasMore` is true

### Issue: Recent searches not saving
**Solution:** Check AsyncStorage permissions and key name

### Issue: Images not loading
**Solution:** Verify image URLs are valid and HTTPS

### Issue: Follow button not working
**Solution:** Check authentication token and API endpoint

### Issue: Navigation not working
**Solution:** Verify router paths and parameters are correct

---

## ✅ Final Checklist

Before marking the search feature as complete:

- [ ] All search screen tests pass
- [ ] All search results tests pass
- [ ] All discover screen tests pass
- [ ] All search suggestions tests pass
- [ ] All deep linking tests pass
- [ ] All error handling tests pass
- [ ] All performance tests pass
- [ ] All cross-platform tests pass
- [ ] All accessibility tests pass
- [ ] All edge cases handled
- [ ] No console errors
- [ ] No memory leaks
- [ ] Code is documented
- [ ] API endpoints are correct
- [ ] Authentication works
- [ ] Ready for production

---

## 🎉 Testing Complete!

Once all tests pass, the search feature is ready for deployment. Great work! 🚀

**Next Steps:**
1. Deploy to staging environment
2. Perform user acceptance testing (UAT)
3. Gather feedback
4. Fix any issues
5. Deploy to production
6. Monitor analytics and error logs
