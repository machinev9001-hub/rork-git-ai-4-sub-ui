# VAS Subscription & Trial System Guide

## Overview

The VAS (Value-Added Services) subscription system provides a 12-day trial period for free account users to try premium features before requiring payment. This system includes automatic state management, admin notifications, and trial expiration handling.

## Subscription States

### VASSubscriptionState Types

1. **INACTIVE** - Feature not subscribed
2. **TRIAL_ACTIVE** - In 12-day trial period (feature fully accessible)
3. **PAYMENT_PENDING** - Trial expired, awaiting payment to continue
4. **ACTIVE** - Fully active with payment confirmed
5. **SUSPENDED** - Suspended due to non-payment or admin action

## Trial Flow

### 1. Starting a Trial

When a free account user clicks "Start Trial" on a VAS feature:

1. System creates a `vasSubscription` document with:
   - `state: 'TRIAL_ACTIVE'`
   - `trialStartDate`: Current timestamp
   - `trialEndDate`: 12 days from start
   - `featureId`, `featureName`, `price`, `currency`

2. Feature is immediately added to user's `vasFeatures` array for instant access

3. Admin notification created:
   - Type: `VAS_SUBSCRIPTION_STARTED`
   - Priority: `medium`
   - Includes trial end date and pricing info

### 2. During Trial Period

- User has full access to the feature (12 days)
- System can check for trials expiring soon (2 days before expiration)
- Notifications sent to admins about upcoming expirations

### 3. Trial Expiration

When trial period ends:

1. Automated process (via Cloud Function or manual check) transitions:
   - `state: 'TRIAL_ACTIVE'` → `state: 'PAYMENT_PENDING'`

2. Admin notification created:
   - Type: `VAS_TRIAL_EXPIRED`
   - Priority: `high`
   - Indicates payment now required

3. Feature remains in `vasFeatures` but functionality can be restricted

### 4. Payment & Activation

When payment is confirmed:

1. Subscription updated:
   - `state: 'PAYMENT_PENDING'` → `state: 'ACTIVE'`
   - `activationDate`: Current timestamp
   - `lastPaymentDate`: Current timestamp
   - `nextPaymentDue`: 30 days from activation

2. Admin notification created:
   - Type: `VAS_SUBSCRIPTION_ACTIVATED`
   - Priority: `low`

### 5. Suspension

If payment fails or admin suspends:

1. Subscription updated:
   - `state: 'ACTIVE'` → `state: 'SUSPENDED'`
   - `suspensionDate`: Current timestamp
   - `suspensionReason`: Reason for suspension

2. Feature removed from `vasFeatures` (access revoked)

3. Admin notification created:
   - Type: `VAS_SUSPENDED`
   - Priority: `high`

## Data Structure

### vasSubscriptions Collection

```typescript
{
  id: string;
  masterAccountId: string;
  featureId: VASFeatureId;
  featureName: string;
  state: VASSubscriptionState;
  trialStartDate?: Timestamp;       // When trial started
  trialEndDate?: Timestamp;         // Trial expires (12 days from start)
  activationDate?: Timestamp;       // When fully activated with payment
  suspensionDate?: Timestamp;       // When suspended
  suspensionReason?: string;
  lastPaymentDate?: Timestamp;      // Last payment received
  nextPaymentDue?: Timestamp;       // Next payment due (30 days cycle)
  price?: number;
  currency?: string;                // Default: 'USD'
  autoRenew?: boolean;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  createdBy: string;                // MasterAccountId
}
```

### adminNotifications Collection

```typescript
{
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  masterAccountId?: string;
  masterAccountName?: string;
  activationCodeId?: string;        // For activation notifications
  vasSubscriptionId?: string;       // For VAS notifications
  featureId?: VASFeatureId;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: {
    accountType?: string;
    companyName?: string;
    trialEndDate?: string;
    price?: number;
    currency?: string;
    daysRemaining?: number;
  };
  createdAt: Timestamp;
  readAt?: Timestamp;
  readBy?: string;
}
```

## Admin Notification Types

1. **ACTIVATION_CODE_REDEEMED** - Enterprise/Free account activated
2. **VAS_SUBSCRIPTION_STARTED** - Trial started for VAS feature
3. **VAS_SUBSCRIPTION_ACTIVATED** - Subscription activated with payment
4. **VAS_TRIAL_EXPIRING** - Trial expiring soon (2 days warning)
5. **VAS_TRIAL_EXPIRED** - Trial period ended
6. **VAS_PAYMENT_PENDING** - Payment pending for subscription
7. **VAS_SUSPENDED** - Subscription suspended
8. **GENERAL** - General admin notifications

## API Functions

### Starting a Trial

```typescript
import { startVASTrialSubscription } from '@/utils/vasSubscription';

const result = await startVASTrialSubscription(
  masterAccountId,
  'plant_manager_access',
  'Plant Manager',
  79,
  'USD'
);

if (result.success) {
  console.log('Trial started:', result.subscriptionId);
}
```

### Activating with Payment

```typescript
import { activateVASSubscription } from '@/utils/vasSubscription';

const result = await activateVASSubscription(
  subscriptionId,
  masterAccountId
);

if (result.success) {
  console.log('Subscription activated');
}
```

### Suspending a Subscription

```typescript
import { suspendVASSubscription } from '@/utils/vasSubscription';

const result = await suspendVASSubscription(
  subscriptionId,
  'Payment failed',
  masterAccountId
);
```

### Checking Expired Trials

```typescript
import { checkAndUpdateExpiredTrials } from '@/utils/vasSubscription';

// Should be called periodically (e.g., daily via Cloud Function)
const result = await checkAndUpdateExpiredTrials();
console.log(`Processed ${result.processedCount} expired trials`);
```

### Getting Active Features

```typescript
import { getActiveVASFeatures } from '@/utils/vasSubscription';

const activeFeatures = await getActiveVASFeatures(masterAccountId);
// Returns: ['plant_manager_access', 'staff_manager_access', ...]
```

### Creating Admin Notifications

```typescript
import { createAdminNotification } from '@/utils/vasSubscription';

await createAdminNotification({
  type: 'VAS_TRIAL_EXPIRING',
  title: 'Trial Expiring Soon',
  message: 'Plant Manager trial expires in 2 days',
  masterAccountId: 'user123',
  masterAccountName: 'John Doe',
  vasSubscriptionId: 'sub123',
  featureId: 'plant_manager_access',
  priority: 'medium',
  metadata: {
    daysRemaining: 2,
    trialEndDate: '2026-01-16',
  },
});
```

## Firestore Indexes

Required indexes for the new collections:

### vasSubscriptions

1. `masterAccountId` (ASC) + `state` (ASC)
2. `masterAccountId` (ASC) + `featureId` (ASC)
3. `state` (ASC) + `trialEndDate` (ASC)
4. `masterAccountId` (ASC) + `state` (ASC) + `createdAt` (DESC)

### adminNotifications

1. `type` (ASC) + `createdAt` (DESC)
2. `isRead` (ASC) + `createdAt` (DESC)
3. `priority` (DESC) + `createdAt` (DESC)
4. `masterAccountId` (ASC) + `createdAt` (DESC)
5. `type` (ASC) + `isRead` (ASC) + `createdAt` (DESC)

## Cloud Function for Trial Expiration (Recommended)

Create a scheduled Cloud Function to run daily:

```typescript
import * as functions from 'firebase-functions';
import { checkAndUpdateExpiredTrials } from './vasSubscription';

export const checkExpiredTrials = functions.pubsub
  .schedule('0 0 * * *') // Daily at midnight
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Checking expired trials...');
    const result = await checkAndUpdateExpiredTrials();
    console.log(`Processed ${result.processedCount} expired trials`);
    return null;
  });
```

## UI Components

### VAS Management Screen

- Shows available VAS features
- "Start 12-Day Trial" button for each feature
- Automatically creates trial subscription
- Shows trial status and expiration

### Admin Notifications Screen

- Displays all admin notifications
- Filter by read/unread
- Priority-based color coding
- Tap to mark as read
- Refresh to reload

### Admin Panel

- Link to Admin Notifications screen
- Shows unread notification count (future enhancement)

## Testing Checklist

- [ ] Start a VAS trial subscription
- [ ] Verify trial notification created
- [ ] Check user has immediate access to feature
- [ ] Manually expire trial (change date) and run check
- [ ] Verify PAYMENT_PENDING notification created
- [ ] Activate subscription with payment
- [ ] Verify ACTIVE notification created
- [ ] Test suspension flow
- [ ] View admin notifications screen
- [ ] Mark notifications as read

## Production Considerations

### Payment Gateway Integration

When integrating payment (Stripe/PayPal):

1. Update `activateVASSubscription` to process actual payment
2. Add webhook handlers for:
   - Payment succeeded
   - Payment failed
   - Subscription renewed
   - Subscription cancelled

3. Implement recurring billing:
   - Check `nextPaymentDue` dates
   - Auto-charge or send payment reminders
   - Handle failed payments (retry logic, grace period)

### Email Notifications

For production, add email notifications:

1. Trial started confirmation
2. Trial expiring soon (2 days before)
3. Trial expired notice
4. Payment confirmation
5. Subscription suspended warning

### WhatsApp/SMS Notifications

Integrate Twilio or similar service for:

1. Admin alerts for new activations
2. Admin alerts for trial expirations
3. User reminders for payment

## Security Rules

Add Firestore security rules:

```javascript
// vasSubscriptions - Only masters can read their own
match /vasSubscriptions/{subscriptionId} {
  allow read: if request.auth.uid == resource.data.masterAccountId ||
                 request.auth.token.role == 'Admin';
  allow create: if request.auth.uid == request.resource.data.masterAccountId;
  allow update: if request.auth.token.role == 'Admin';
  allow delete: if request.auth.token.role == 'Admin';
}

// adminNotifications - Only admins
match /adminNotifications/{notificationId} {
  allow read, write: if request.auth.token.role == 'Admin';
}
```

## Future Enhancements

1. **Subscription Dashboard** - Detailed analytics for admins
2. **Trial Extensions** - Allow admins to extend trials
3. **Promo Codes** - Apply discounts or free months
4. **Bundle Pricing** - Discounted multi-feature bundles
5. **Usage Metrics** - Track feature usage during trial
6. **Automated Reminders** - Email/SMS before trial expires
7. **Self-Service Payment** - In-app payment processing
8. **Invoice Generation** - PDF invoices for payments
9. **Billing History** - Transaction history for users
10. **Refund Processing** - Handle refund requests
