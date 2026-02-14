
# VYXO Ads System - Quick Reference

## For Advertisers

### Create a Campaign
```typescript
// Navigate to create screen
router.push('/ads/create');

// Fill form:
// - Campaign Name: "Summer Sale 2024"
// - Budget: 1000.00
// - Creative URL: https://example.com/video.mp4
// - CTA Text: "Shop Now"
// - CTA URL: https://example.com/shop
// - Age Range: 18-24
// - Interests: fashion, travel
// - Locations: New York, Los Angeles
```

### View Dashboard
```typescript
router.push('/ads/dashboard');
```

### Campaign Metrics
- **Impressions**: Number of times ad was shown
- **Clicks**: Number of times CTA was clicked
- **CTR**: Click-through rate (clicks / impressions * 100)
- **Spent**: Amount spent so far
- **Budget**: Total campaign budget
- **Conversions**: Tracked conversions (if implemented)

## For Developers

### Ad Injection in Feed
```typescript
// In useFeedAlgorithm.ts
const injectAds = async (videoList: Video[], currentHistory: string[]) => {
  const items: FeedItem[] = [];
  
  for (let i = 0; i < videoList.length; i++) {
    items.push(videoList[i]);
    
    // Inject ad every 5 videos
    if ((i + 1) % 5 === 0 && i < videoList.length - 1) {
      const ad = await authenticatedPost('/api/ads/feed', { 
        videoHistory: [...currentHistory, ...videoList.slice(0, i + 1).map(v => v.id)] 
      });
      
      if (ad) {
        const impressionResult = await authenticatedPost('/api/ads/impressions', {
          campaignId: ad.campaignId
        });
        
        items.push({
          id: `ad-${ad.campaignId}-${Date.now()}`,
          type: 'ad',
          ...ad,
          impressionId: impressionResult.impressionId,
        });
      }
    }
  }
  
  return items;
};
```

### Display Ad in Feed
```typescript
// In index.tsx
const renderFeedItem = ({ item, index }: { item: FeedItem; index: number }) => {
  if ('type' in item && item.type === 'ad') {
    return (
      <AdCard
        ad={item}
        isFocused={index === currentIndex}
        onSkip={handleAdSkip}
        onAdClick={handleAdClick}
      />
    );
  }
  
  return <VideoItem video={item} isActive={index === currentIndex} />;
};
```

### Record Ad Click
```typescript
const handleAdClick = async (impressionId: string) => {
  await recordAdClick(impressionId);
};
```

## API Endpoints

### Campaign CRUD
```typescript
// Get campaigns
GET /api/ads/campaigns
Response: AdCampaign[]

// Create campaign
POST /api/ads/campaigns
Body: {
  name: string,
  budget: number,
  creative_url: string,
  cta_text: string,
  cta_url: string,
  target_audience: {
    age_range: string,
    interests: string[],
    locations: string[]
  }
}
Response: AdCampaign

// Update campaign
PUT /api/ads/campaigns/:id
Body: Partial<AdCampaign>
Response: AdCampaign

// Delete campaign
DELETE /api/ads/campaigns/:id
Response: { success: true }
```

### Ad Serving
```typescript
// Get ad for feed
POST /api/ads/feed
Body: { videoHistory: string[] }
Response: AdCreative | null

// Record impression
POST /api/ads/impressions
Body: { campaignId: string, videoId?: string }
Response: { impressionId: string }

// Record click
POST /api/ads/impressions/:impressionId/click
Body: {}
Response: { success: true }
```

### Analytics
```typescript
// Get campaign analytics
GET /api/ads/campaigns/:id/analytics
Response: {
  impressions: number,
  clicks: number,
  ctr: number,
  spent: number,
  conversions: number
}
```

## Types

```typescript
interface AdCampaign {
  id: string;
  advertiser_id: string;
  name: string;
  budget: number;
  spent: number;
  status: 'active' | 'paused' | 'completed';
  target_audience: {
    age_range: string;
    interests: string[];
    locations: string[];
  };
  creative_url: string;
  cta_text: string;
  cta_url: string;
  created_at: string;
}

interface AdCreative {
  campaignId: string;
  creative_url: string;
  cta_text: string;
  cta_url: string;
  type: 'in-feed' | 'brand-takeover';
}

interface AdItem extends AdCreative {
  id: string;
  type: 'ad';
  impressionId?: string;
}

type FeedItem = Video | AdItem;
```

## Targeting Logic

### Age Range
- 18-24
- 25-34
- 35-44
- 45+

### Interests
Based on hashtags user follows:
- User follows #fashion → matches campaign with "fashion" interest
- User follows #travel → matches campaign with "travel" interest

### Locations
Based on user's location:
- User in "New York" → matches campaign targeting "New York"

### CPM Calculation
```typescript
let cpm = 5; // Base CPM
if (hasAgeTargeting) cpm += 5;
if (hasLocationTargeting) cpm += 5;
if (hasInterestTargeting) cpm += 5;
// Max CPM: $20
```

## Frequency Cap

**Rule**: Maximum 1 ad every 5 organic videos

**Implementation**:
1. Backend receives `videoHistory` array
2. Checks last 5 videos for any ads
3. If ad found in last 5, returns `null`
4. Otherwise, returns eligible ad

## Creator Fund Revenue Share

**50% of ad revenue goes to Creator Fund**

When ad impression is recorded:
```sql
-- Record in creator_earnings table
INSERT INTO creator_earnings (user_id, amount, source)
VALUES (video_creator_id, cpm_amount * 0.5, 'ads');
```

## Testing Checklist

- [ ] Create ad campaign
- [ ] View campaign in dashboard
- [ ] Scroll feed, verify ad appears every 5 videos
- [ ] Verify "Promoted" label
- [ ] Wait 5 seconds, verify skip button
- [ ] Click skip, verify moves to next video
- [ ] Click CTA, verify URL opens
- [ ] Check dashboard, verify impressions count
- [ ] Click CTA again, verify clicks count
- [ ] Verify CTR calculation
- [ ] Verify budget tracking

## Common Issues

### Ad not showing in feed
- Check campaign status is "active"
- Check budget not exceeded (spent < budget)
- Check frequency cap (no ad in last 5 videos)
- Check targeting matches user profile

### Skip button not appearing
- Wait full 5 seconds
- Check countdown timer is working

### CTA not opening URL
- Verify URL is valid (starts with http:// or https://)
- Check Linking.canOpenURL returns true

### Analytics not updating
- Check impressions/clicks are being recorded
- Verify backend endpoints are working
- Check database for ad_impressions records
