# VAS Subscription & Admin Notifications - Complete Index Guide

## Overview
This guide provides detailed instructions for manually creating the 9 Firestore indexes required for the VAS subscription trial system and admin notification features.

---

## 📍 How to Create Indexes in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"** button
5. Fill in the details exactly as shown below
6. Click **"Create"**
7. Wait for status to change from "Building" to "Enabled" (5-15 minutes)

---

## 🔹 Collection: `vasSubscriptions`

These indexes support querying VAS subscriptions by state (TRIAL_ACTIVE, PAYMENT_PENDING, ACTIVE, SUSPENDED).

### ✅ Index 1: Master Account Subscriptions by State

**Purpose**: Find all subscriptions for a user in a specific state  
**Example Query**: Get all TRIAL_ACTIVE subscriptions for a user

**Manual Creation Steps**:
1. Collection ID: `vasSubscriptions`
2. Query scope: `Collection`
3. Add Field 1: `masterAccountId` → Order: `Ascending`
4. Add Field 2: `state` → Order: `Ascending`

**JSON Format** (for reference):
```json
{
  "collectionGroup": "vasSubscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "state", "order": "ASCENDING" }
  ]
}
```

---

### ✅ Index 2: Feature Subscription Check

**Purpose**: Check if user already has subscription for specific feature  
**Example Query**: Does user have plant_manager_access subscription?

**Manual Creation Steps**:
1. Collection ID: `vasSubscriptions`
2. Query scope: `Collection`
3. Add Field 1: `masterAccountId` → Order: `Ascending`
4. Add Field 2: `featureId` → Order: `Ascending`

**JSON Format**:
```json
{
  "collectionGroup": "vasSubscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "featureId", "order": "ASCENDING" }
  ]
}
```

---

### ✅ Index 3: Trial Expiration Detection

**Purpose**: Find expired trials automatically  
**Example Query**: Find all TRIAL_ACTIVE subscriptions past their trialEndDate

**Manual Creation Steps**:
1. Collection ID: `vasSubscriptions`
2. Query scope: `Collection`
3. Add Field 1: `state` → Order: `Ascending`
4. Add Field 2: `trialEndDate` → Order: `Ascending`

**JSON Format**:
```json
{
  "collectionGroup": "vasSubscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "state", "order": "ASCENDING" },
    { "fieldPath": "trialEndDate", "order": "ASCENDING" }
  ]
}
```

---

### ✅ Index 4: Subscription History

**Purpose**: View user's subscription history sorted by date and filtered by state  
**Example Query**: Get all ACTIVE subscriptions for user, newest first

**Manual Creation Steps**:
1. Collection ID: `vasSubscriptions`
2. Query scope: `Collection`
3. Add Field 1: `masterAccountId` → Order: `Ascending`
4. Add Field 2: `state` → Order: `Ascending`
5. Add Field 3: `createdAt` → Order: `Descending`

**JSON Format**:
```json
{
  "collectionGroup": "vasSubscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "state", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 🔹 Collection: `adminNotifications`

These indexes support admin notification viewing, filtering, and state-based notifications.

### ✅ Index 5: Notifications by Type

**Purpose**: Filter notifications by type and date  
**Example Query**: Show all VAS_SUBSCRIPTION_STARTED notifications

**Manual Creation Steps**:
1. Collection ID: `adminNotifications`
2. Query scope: `Collection`
3. Add Field 1: `type` → Order: `Ascending`
4. Add Field 2: `createdAt` → Order: `Descending`

**JSON Format**:
```json
{
  "collectionGroup": "adminNotifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### ✅ Index 6: Unread Notifications

**Purpose**: Display only unread notifications  
**Example Query**: Show all unread notifications, newest first

**Manual Creation Steps**:
1. Collection ID: `adminNotifications`
2. Query scope: `Collection`
3. Add Field 1: `isRead` → Order: `Ascending`
4. Add Field 2: `createdAt` → Order: `Descending`

**JSON Format**:
```json
{
  "collectionGroup": "adminNotifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isRead", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### ✅ Index 7: Priority Sorting

**Purpose**: Sort notifications by priority level  
**Example Query**: Show urgent and high priority notifications first

**Manual Creation Steps**:
1. Collection ID: `adminNotifications`
2. Query scope: `Collection`
3. Add Field 1: `priority` → Order: `Descending`
4. Add Field 2: `createdAt` → Order: `Descending`

**JSON Format**:
```json
{
  "collectionGroup": "adminNotifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "priority", "order": "DESCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### ✅ Index 8: User-Specific Notifications

**Purpose**: Get all notifications for specific master account  
**Example Query**: Show all notifications for user "john.doe@example.com"

**Manual Creation Steps**:
1. Collection ID: `adminNotifications`
2. Query scope: `Collection`
3. Add Field 1: `masterAccountId` → Order: `Ascending`
4. Add Field 2: `createdAt` → Order: `Descending`

**JSON Format**:
```json
{
  "collectionGroup": "adminNotifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

### ✅ Index 9: Type + Read Status Filter

**Purpose**: Combined filtering by notification type and read status  
**Example Query**: Show unread VAS_PAYMENT_PENDING notifications

**Manual Creation Steps**:
1. Collection ID: `adminNotifications`
2. Query scope: `Collection`
3. Add Field 1: `type` → Order: `Ascending`
4. Add Field 2: `isRead` → Order: `Ascending`
5. Add Field 3: `createdAt` → Order: `Descending`

**JSON Format**:
```json
{
  "collectionGroup": "adminNotifications",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "isRead", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 📊 Index Summary Table

| # | Collection | Fields | Order | State Support |
|---|------------|--------|-------|---------------|
| 1 | vasSubscriptions | masterAccountId, state | ASC, ASC | ✅ All states |
| 2 | vasSubscriptions | masterAccountId, featureId | ASC, ASC | N/A |
| 3 | vasSubscriptions | state, trialEndDate | ASC, ASC | ✅ TRIAL_ACTIVE |
| 4 | vasSubscriptions | masterAccountId, state, createdAt | ASC, ASC, DESC | ✅ All states |
| 5 | adminNotifications | type, createdAt | ASC, DESC | ✅ All notification types |
| 6 | adminNotifications | isRead, createdAt | ASC, DESC | N/A |
| 7 | adminNotifications | priority, createdAt | DESC, DESC | N/A |
| 8 | adminNotifications | masterAccountId, createdAt | ASC, DESC | N/A |
| 9 | adminNotifications | type, isRead, createdAt | ASC, ASC, DESC | ✅ All notification types |

---

## 📈 Notification Types by State

Each VAS subscription state generates specific admin notifications:

### TRIAL_ACTIVE State
- **Notification Type**: `VAS_SUBSCRIPTION_STARTED`
- **Priority**: Medium
- **Metadata Includes**: state, trialStartDate, trialEndDate, price, currency, accountType, nationalIdNumber, companyIds
- **Message**: "John Doe started a 12-day trial for Plant Manager. State: TRIAL_ACTIVE"

### TRIAL_ACTIVE → Expiring Soon
- **Notification Type**: `VAS_TRIAL_EXPIRING`
- **Priority**: Medium
- **Metadata Includes**: state, daysRemaining, trialEndDate, price, accountType
- **Message**: "John Doe's trial for Plant Manager expires in 2 days. State: TRIAL_ACTIVE"

### PAYMENT_PENDING State
- **Notification Type**: `VAS_PAYMENT_PENDING`
- **Priority**: High
- **Metadata Includes**: state, trialEndDate, price, currency, accountType, nationalIdNumber
- **Message**: "John Doe's trial for Plant Manager has expired. State: PAYMENT_PENDING. Payment now required to continue."

### ACTIVE State
- **Notification Type**: `VAS_SUBSCRIPTION_ACTIVATED`
- **Priority**: Low
- **Metadata Includes**: state, activationDate, nextPaymentDue, price, currency, accountType
- **Message**: "John Doe activated subscription for Plant Manager. State: ACTIVE"

### SUSPENDED State
- **Notification Type**: `VAS_SUSPENDED`
- **Priority**: High
- **Metadata Includes**: state, suspensionDate, reason, price, currency, accountType, nationalIdNumber
- **Message**: "John Doe's subscription for Plant Manager was suspended. State: SUSPENDED. Reason: Payment failed"

---

## 🔍 Applicant Details in Notifications

All notifications now include comprehensive applicant information in the metadata:

```javascript
{
  // Core notification fields
  type: 'VAS_SUBSCRIPTION_STARTED',
  title: 'VAS Trial Started: Plant Manager',
  message: 'John Doe started a 12-day trial for Plant Manager. State: TRIAL_ACTIVE',
  masterAccountId: 'abc123',
  masterAccountName: 'John Doe',
  
  // Metadata with full applicant details
  metadata: {
    state: 'TRIAL_ACTIVE',                    // Current subscription state
    accountType: 'free',                      // Account type
    nationalIdNumber: '1234567890',           // National ID (if available)
    companyIds: ['comp1', 'comp2'],          // Associated companies
    trialStartDate: '2026-01-04T07:00:00Z',  // When trial started
    trialEndDate: '2026-01-16T07:00:00Z',    // When trial expires
    price: 79,                                // Monthly price
    currency: 'USD'                           // Currency
  }
}
```

---

## ✅ Verification Checklist

After creating all 9 indexes:

- [ ] All indexes show status "Enabled" (not "Building")
- [ ] Test query 1: Get user's TRIAL_ACTIVE subscriptions
- [ ] Test query 2: Get unread admin notifications
- [ ] Test query 3: Find expired trials
- [ ] No error messages when viewing notifications screen
- [ ] Notifications display applicant details correctly

---

## ⚡ Quick Deploy Alternative

Instead of manual creation, deploy all indexes at once:

```bash
firebase deploy --only firestore:indexes
```

This uses the `firestore.indexes.json` file which already contains all 9 indexes.

---

## 🐛 Troubleshooting

### Index won't create
- **Cause**: Collection doesn't exist yet
- **Solution**: Create at least one document in the collection first

### Index stuck on "Building"
- **Cause**: Large dataset or Firebase processing delay
- **Solution**: Wait up to 30 minutes. Check Firebase status page for outages.

### Query still fails after index created
- **Cause**: Index not fully enabled yet
- **Solution**: Refresh Firebase Console, verify status is "Enabled"

### Wrong index created
- **Cause**: Field order or sort direction incorrect
- **Solution**: Delete the index and recreate with correct configuration

---

## 💰 Cost Impact

**Storage**: ~0.25x indexed field size per index  
**Writes**: +1 write per indexed field  
**Reads**: No additional cost

**For this implementation**:
- 9 indexes total
- Estimated storage increase: < 1% of database size
- Write cost increase: ~10-15% per subscription/notification event
- Query performance: 10-100x faster

---

## ⏱️ Build Time Estimates

| Documents | Simple Index | Complex Index |
|-----------|--------------|---------------|
| < 100 | 1-2 min | 2-5 min |
| 100-1K | 2-5 min | 5-10 min |
| 1K-10K | 5-10 min | 10-20 min |
| > 10K | 10-30 min | 20-60 min |

---

## 📝 Notes

- Indexes are automatically maintained by Firestore
- No updates needed when data changes
- Can safely delete unused indexes
- Monitor usage in Firebase Console → Usage tab
- All indexes support querying by subscription state (TRIAL_ACTIVE, PAYMENT_PENDING, ACTIVE, SUSPENDED)
