
# 🚀 VYXO Subscriptions - Quick Reference Guide

## TL;DR

The subscription system is **fully integrated** and **ready to use**. Users can subscribe to creators, manage subscriptions, and creators earn 80% of revenue.

---

## 🎯 Quick Start

### For Users (Subscribing)

1. **Find a creator** → Tap their profile
2. **Tap "Subscribe"** → Select a tier
3. **Pay with Stripe** → Enter card details
4. **Done!** → You're now subscribed

### For Creators (Earning)

1. **Get approved** for Creator Fund (10k+ followers)
2. **Default tiers** are created automatically:
   - Fan: $2.99/month
   - Super Fan: $9.99/month
   - VIP: $24.99/month
3. **Earn 80%** of subscription revenue
4. **Track earnings** in Creator Dashboard (coming soon)

---

## 📡 API Endpoints (Quick Reference)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/subscriptions/tiers/:creatorId` | GET | No | Get creator's tiers |
| `/api/subscriptions/user-status/:creatorId` | GET | Yes | Check subscription status |
| `/api/subscriptions/create-checkout-session` | POST | Yes | Create Stripe checkout |
| `/api/subscriptions/cancel/:subscriptionId` | POST | Yes | Cancel subscription |
| `/api/subscriptions/reactivate/:subscriptionId` | POST | Yes | Reactivate subscription |
| `/api/subscriptions/manage` | GET | Yes | Get all subscriptions |
| `/api/subscriptions/check-access/:creatorId` | GET | Yes | Check access |
| `/api/subscriptions/tiers` | POST | Yes | Create tier (creators) |
| `/api/subscriptions/tiers/:tierId` | PUT | Yes | Update tier (creators) |

---

## 🎨 UI Components

### SubscribeButton
```tsx
import SubscribeButton from '@/components/SubscribeButton';

<SubscribeButton
  creatorId="user-id-here"
  onSubscribeSuccess={() => console.log('Subscribed!')}
/>
```

**Shows:**
- "Subscribe" button if not subscribed
- "Subscribed" badge if active
- "Canceling" badge if pending cancellation

---

### Manage Subscriptions Screen
```tsx
// Navigate to manage subscriptions
router.push('/subscription/manage');
```

**Shows:**
- List of all active subscriptions
- Cancel/reactivate buttons
- Subscription details (tier, price, renewal date)

---

## 🔧 Custom Hook

### useSubscriptions
```tsx
import { useSubscriptions } from '@/hooks/useSubscriptions';

const {
  tiers,                      // Array of tiers
  userSubscription,           // Current subscription (or null)
  isLoading,                  // Loading state
  error,                      // Error message
  createSubscriptionCheckout, // Create checkout
  cancelSubscription,         // Cancel subscription
  reactivateSubscription,     // Reactivate subscription
  fetchActiveSubscriptions,   // Get all subscriptions
  checkAccess,                // Check access
} = useSubscriptions(creatorId);
```

---

## 💰 Revenue Split

- **Creator:** 80%
- **Platform:** 20%

**Example:**
- User pays $2.99/month
- Creator earns $2.39/month
- Platform earns $0.60/month

---

## 🎨 Colors

- **Purple** (#8B5CF6): Subscribe button, badges
- **Coral** (#FF6B6B): Cancel button, warnings
- **Turquoise** (#00D9FF): Success, active status
- **Dark** (#0F0F0F): Background

---

## 🧪 Test Cards (Stripe)

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0341` | Declined |
| `4000 0000 0000 9995` | Insufficient funds |

**Expiry:** Any future date (e.g., 12/34)
**CVC:** Any 3 digits (e.g., 123)
**ZIP:** Any 5 digits (e.g., 12345)

---

## 🐛 Common Issues

### Subscribe button not showing
- Check if viewing own profile (hidden)
- Check if creator has tiers
- Check console for errors

### Stripe checkout not opening
- Check internet connection
- Verify Stripe keys configured
- Try different browser

### Subscription not appearing
- Wait 1-2 minutes for webhook
- Pull down to refresh
- Check Stripe dashboard

---

## 📝 Quick Commands

### Check Backend Logs
```bash
get_backend_logs
```

### Check Frontend Logs
```bash
read_frontend_logs
```

### Test Subscription Flow
1. Sign in: `test@vyxo.com` / `Test123!`
2. Find creator profile
3. Tap "Subscribe"
4. Select tier
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Verify in Manage Subscriptions

---

## 🚀 Next Steps

### Phase 1: Exclusive Content
- Add "subscribers only" flag to videos
- Filter content for non-subscribers
- Show lock icon on exclusive videos

### Phase 2: Subscriber Badges
- Add badges to comments
- Add badges to live chat
- Different colors per tier

### Phase 3: Notifications
- Push notifications for new content
- Email notifications for events
- In-app notification center

---

## 📞 Support

**Issues?**
- Check console logs
- Check backend logs
- Verify Stripe webhook events
- Check database records

**Questions?**
- Review full documentation: `SUBSCRIPTIONS_INTEGRATION_FINAL.md`
- Check API reference: `SUBSCRIPTIONS_SYSTEM_COMPLETE.md`
- Contact support team

---

**Status:** ✅ COMPLETE
**Version:** 1.0.0
**Last Updated:** 2026-02-12
