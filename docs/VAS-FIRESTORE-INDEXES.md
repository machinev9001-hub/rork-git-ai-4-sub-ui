# VAS Subscription & Admin Notifications - Firestore Index Requirements

## Overview

This document outlines the new Firestore indexes required for the VAS subscription trial system and admin notification features.

## New Collections

### 1. vasSubscriptions
Tracks VAS feature subscriptions with trial periods and payment states.

**Purpose**: Manage 12-day trial subscriptions for VAS features with automatic state transitions.

### 2. adminNotifications
Stores notifications for system admins about account activations and subscription events.

**Purpose**: Centralized admin notification system for monitoring enterprise activations and VAS subscriptions.

## Required Firestore Indexes

### vasSubscriptions Collection

#### Index 1: Master Account Subscriptions by State
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
**Usage**: Query all subscriptions for a user filtered by state (e.g., get all TRIAL_ACTIVE subscriptions)
**Query**: `where('masterAccountId', '==', userId).where('state', '==', 'TRIAL_ACTIVE')`

#### Index 2: Master Account Feature Check
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
**Usage**: Check if user already has subscription for specific feature
**Query**: `where('masterAccountId', '==', userId).where('featureId', '==', 'plant_manager_access')`

#### Index 3: Trial Expiration Detection
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
**Usage**: Find trials that are expiring soon or have expired (for automated processing)
**Query**: `where('state', '==', 'TRIAL_ACTIVE').where('trialEndDate', '<=', todayDate)`

#### Index 4: Subscription History
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
**Usage**: Get user's subscription history filtered by state, sorted by date
**Query**: `where('masterAccountId', '==', userId).where('state', '==', 'ACTIVE').orderBy('createdAt', 'desc')`

### adminNotifications Collection

#### Index 5: Notifications by Type
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
**Usage**: Filter notifications by type (e.g., all activation notifications)
**Query**: `where('type', '==', 'ACTIVATION_CODE_REDEEMED').orderBy('createdAt', 'desc')`

#### Index 6: Unread Notifications
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
**Usage**: Get unread notifications sorted by date
**Query**: `where('isRead', '==', false).orderBy('createdAt', 'desc')`

#### Index 7: Priority Sorting
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
**Usage**: Sort notifications by priority and date (high priority first)
**Query**: `orderBy('priority', 'desc').orderBy('createdAt', 'desc')`

#### Index 8: Master Account Notifications
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
**Usage**: Get all notifications for a specific user/account
**Query**: `where('masterAccountId', '==', userId).orderBy('createdAt', 'desc')`

#### Index 9: Combined Type and Read Status
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
**Usage**: Filter by notification type and read status
**Query**: `where('type', '==', 'VAS_TRIAL_EXPIRING').where('isRead', '==', false).orderBy('createdAt', 'desc')`

## Index Deployment

### Option 1: Firebase Console (Manual)

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Navigate to Firestore Database > Indexes
4. Click "Add Index" for each index listed above
5. Enter the collection name and field configurations
6. Click "Create"

### Option 2: Firebase CLI (Recommended)

The indexes have been added to `firestore.indexes.json`. Deploy using:

```bash
firebase deploy --only firestore:indexes
```

This will create all indexes automatically based on the configuration file.

### Option 3: Auto-creation via Error Links

When you run queries that require these indexes, Firestore will provide error messages with direct links to create the indexes. Click the link to auto-create the index.

## Index Creation Time

- Simple indexes (1-2 fields): ~1-5 minutes
- Complex indexes (3+ fields): ~5-15 minutes
- Large datasets (10,000+ documents): May take longer

**Note**: You can use your app while indexes are building. Queries will fail until the index is ready.

## Verifying Indexes

### In Firebase Console
1. Go to Firestore Database > Indexes
2. Check that all indexes show "Enabled" status
3. Any indexes showing "Building" are still in progress

### In Code
If a query fails with an index error, you'll see:
```
Error: The query requires an index. You can create it here: [link]
```

## Index Maintenance

### Monitoring
- Check index usage in Firebase Console
- Remove unused indexes to reduce costs
- Monitor query performance

### Updates
If you modify queries, you may need to add new indexes. The error messages will guide you.

## Cost Considerations

Each index:
- **Storage**: ~0.25x the size of indexed fields
- **Writes**: Additional write cost per indexed field
- **Reads**: No additional cost (queries are faster)

For this implementation:
- 9 new indexes
- Estimated additional storage: <1% of total database size
- Write operations: +1-2 per subscription/notification event

## Security Rules

Ensure security rules are updated for new collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // VAS Subscriptions
    match /vasSubscriptions/{subscriptionId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.masterAccountId ||
                      request.auth.token.role == 'Admin');
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.masterAccountId;
      allow update, delete: if request.auth != null && 
                               request.auth.token.role == 'Admin';
    }
    
    // Admin Notifications
    match /adminNotifications/{notificationId} {
      allow read, write: if request.auth != null && 
                            request.auth.token.role == 'Admin';
    }
  }
}
```

## Testing Indexes

### Test Query 1: Get User's Active Trials
```typescript
const q = query(
  collection(db, 'vasSubscriptions'),
  where('masterAccountId', '==', userId),
  where('state', '==', 'TRIAL_ACTIVE')
);
// Requires Index 1
```

### Test Query 2: Find Expired Trials
```typescript
const q = query(
  collection(db, 'vasSubscriptions'),
  where('state', '==', 'TRIAL_ACTIVE'),
  where('trialEndDate', '<=', Timestamp.now())
);
// Requires Index 3
```

### Test Query 3: Get Unread Notifications
```typescript
const q = query(
  collection(db, 'adminNotifications'),
  where('isRead', '==', false),
  orderBy('createdAt', 'desc'),
  limit(50)
);
// Requires Index 6
```

### Test Query 4: High Priority Notifications
```typescript
const q = query(
  collection(db, 'adminNotifications'),
  where('priority', 'in', ['high', 'urgent']),
  orderBy('createdAt', 'desc')
);
// May require additional index if not working with Index 7
```

## Troubleshooting

### Issue: Index not found error
**Solution**: Wait for index to finish building, or create it via the error link

### Issue: Index takes too long to build
**Solution**: Normal for large datasets. Check progress in Firebase Console

### Issue: Query still slow after index
**Solution**: Check if query can be optimized or needs a different index structure

### Issue: Too many indexes warning
**Solution**: Review and remove unused indexes, consolidate similar queries

## Future Index Additions

As the system grows, you may need additional indexes for:

1. **Subscription Analytics**
   - Group by feature and state
   - Filter by date ranges

2. **Notification Filtering**
   - Combined priority and type filters
   - Date range filters

3. **Reporting Queries**
   - Aggregate subscription counts
   - Revenue tracking by feature

## Related Documentation

- [VAS-SUBSCRIPTION-TRIAL-SYSTEM.md](./VAS-SUBSCRIPTION-TRIAL-SYSTEM.md) - Complete system documentation
- [FIREBASE-SETUP-CHECKLIST.md](./FIREBASE-SETUP-CHECKLIST.md) - General Firebase setup
- [FIREBASE-INDEXES.md](./FIREBASE-INDEXES.md) - All Firebase indexes

## Summary

Total new indexes: **9**
- vasSubscriptions: 4 indexes
- adminNotifications: 5 indexes

All indexes are defined in `firestore.indexes.json` and can be deployed with a single command.

Expected deployment time: 5-15 minutes
Expected impact: Minimal (< 1% storage increase)
