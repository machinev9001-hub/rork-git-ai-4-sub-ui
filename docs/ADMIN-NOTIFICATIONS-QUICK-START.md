# Admin Notifications & Trial States - Quick Reference

## What Was Implemented

### 1. VAS Subscription Trial System
- **12-day free trial** for all VAS features on free accounts
- **Automatic state management** with 5 states:
  - INACTIVE → TRIAL_ACTIVE → PAYMENT_PENDING → ACTIVE → SUSPENDED
- **Instant access** to features during trial period
- **Auto-expiration detection** after 12 days

### 2. Admin Notification System
- **Centralized notification center** for admins
- **7 notification types** covering all subscription events
- **Priority-based sorting** (urgent, high, medium, low)
- **Read/unread tracking** with mark-as-read functionality
- **Auto-creation** on activation codes and VAS subscriptions

## Quick Start Guide

### For Admins

#### View Notifications
1. Go to Admin Panel
2. Click "Admin Notifications"
3. See all activation and subscription events
4. Filter by read/unread
5. Tap notification to mark as read

#### Monitor Subscriptions
- New activations appear as `ACTIVATION_CODE_REDEEMED`
- Trial starts appear as `VAS_SUBSCRIPTION_STARTED`
- Expirations appear as `VAS_TRIAL_EXPIRED`
- Activations appear as `VAS_SUBSCRIPTION_ACTIVATED`

### For Free Account Users

#### Start a Trial
1. Go to VAS Management (Settings → Value-Added Services)
2. Find desired feature
3. Click "Start 12-Day Trial"
4. Confirm trial start
5. Feature is immediately active!

#### What Happens
- Trial lasts 12 days
- Full access to feature during trial
- Admin is notified automatically
- After 12 days, payment required to continue
- Admin is notified of expiration

## Key Features

### Trial Lifecycle
```
User clicks "Start Trial"
  ↓
System creates subscription (TRIAL_ACTIVE)
  ↓
Admin notification sent (VAS_SUBSCRIPTION_STARTED)
  ↓
User has 12 days of access
  ↓
Trial expires (PAYMENT_PENDING)
  ↓
Admin notification sent (VAS_TRIAL_EXPIRED)
  ↓
User pays (ACTIVE) OR doesn't pay (SUSPENDED)
  ↓
Admin notification sent (VAS_SUBSCRIPTION_ACTIVATED or VAS_SUSPENDED)
```

### Admin Notifications Flow
```
Event occurs (activation/subscription/expiration)
  ↓
Notification created in adminNotifications collection
  ↓
Appears in Admin Notifications screen
  ↓
Admin can filter, read, and mark as read
```

## API Usage

### Start a Trial
```typescript
import { startVASTrialSubscription } from '@/utils/vasSubscription';

const result = await startVASTrialSubscription(
  masterAccountId,
  'plant_manager_access',
  'Plant Manager',
  79,
  'USD'
);
```

### Activate Subscription
```typescript
import { activateVASSubscription } from '@/utils/vasSubscription';

await activateVASSubscription(subscriptionId, masterAccountId);
```

### Check Expired Trials
```typescript
import { checkAndUpdateExpiredTrials } from '@/utils/vasSubscription';

// Run daily via Cloud Function
await checkAndUpdateExpiredTrials();
```

## Firestore Collections

### vasSubscriptions
Stores subscription data:
- Trial dates
- Payment dates
- State transitions
- Pricing info

### adminNotifications
Stores admin notifications:
- Notification type
- Priority level
- Read status
- Related master account
- Metadata

## Required Setup

### 1. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```
Wait 5-15 minutes for completion.

### 2. Optional: Cloud Function for Auto-Expiration
```typescript
// functions/index.ts
export const checkExpiredTrials = functions.pubsub
  .schedule('0 0 * * *')
  .onRun(async () => {
    await checkAndUpdateExpiredTrials();
  });
```

### 3. Security Rules (Add to firestore.rules)
```javascript
match /vasSubscriptions/{id} {
  allow read: if request.auth.uid == resource.data.masterAccountId || isAdmin();
  allow create: if request.auth.uid == request.resource.data.masterAccountId;
  allow update, delete: if isAdmin();
}

match /adminNotifications/{id} {
  allow read, write: if isAdmin();
}
```

## Navigation

### User Path
Settings → Value-Added Services → Start Trial Button

### Admin Path
Admin Panel → Admin Notifications

## Notification Types Reference

| Type | Priority | When Triggered | Action Required |
|------|----------|----------------|-----------------|
| ACTIVATION_CODE_REDEEMED | High/Medium | Account activated | None - informational |
| VAS_SUBSCRIPTION_STARTED | Medium | Trial started | None - monitor trial |
| VAS_TRIAL_EXPIRING | Medium | 2 days before expiry | Optional reminder to user |
| VAS_TRIAL_EXPIRED | High | Trial ended | Follow up for payment |
| VAS_SUBSCRIPTION_ACTIVATED | Low | Payment received | None - success |
| VAS_PAYMENT_PENDING | Medium | Awaiting payment | Follow up with user |
| VAS_SUSPENDED | High | Subscription suspended | Resolve issue |

## Testing Checklist

- [ ] Start a VAS trial from vas-management screen
- [ ] Verify notification appears in admin-notifications
- [ ] Check notification has correct type and priority
- [ ] Test mark as read functionality
- [ ] Test filter (unread/all)
- [ ] Verify trial gives immediate access to feature
- [ ] Check Firestore for vasSubscription document
- [ ] Manually expire trial (change date) and run check
- [ ] Verify state transitions to PAYMENT_PENDING
- [ ] Check expiration notification created

## Troubleshooting

### Trial not starting
- Check masterAccountId is valid
- Verify user has free account
- Check Firestore rules allow writes

### Notifications not appearing
- Check adminNotifications collection exists
- Verify Firestore indexes are deployed
- Check user has admin role

### State not transitioning
- Run `checkAndUpdateExpiredTrials()` manually
- Check trial end date in Firestore
- Verify indexes are enabled

## Files to Review

### Core Implementation
- `utils/vasSubscription.ts` - Subscription management logic
- `app/admin-notifications.tsx` - Notification viewer UI
- `app/vas-management.tsx` - Trial start UI

### Configuration
- `types/index.ts` - Type definitions
- `firestore.indexes.json` - Index configuration

### Documentation
- `docs/VAS-SUBSCRIPTION-TRIAL-SYSTEM.md` - Complete system docs
- `docs/VAS-FIRESTORE-INDEXES.md` - Index details

## Support

For detailed information, see:
- Full system documentation: `/docs/VAS-SUBSCRIPTION-TRIAL-SYSTEM.md`
- Index documentation: `/docs/VAS-FIRESTORE-INDEXES.md`
- Firebase setup: `/docs/FIREBASE-SETUP-CHECKLIST.md`

## Summary

✅ **Implemented**: Admin notifications + 12-day trial system  
✅ **Payment Gateway**: Kept on backburner as requested  
✅ **Indexes**: All 9 indexes defined and documented  
✅ **Documentation**: Comprehensive guides provided  
✅ **Ready**: For deployment and testing
