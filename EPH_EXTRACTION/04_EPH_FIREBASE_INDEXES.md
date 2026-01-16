# EPH Firebase Indexes - Complete Index Definitions

This document contains all Firebase Firestore composite indexes required for the EPH system to function correctly.

---

## Why Indexes Are Required

Firebase Firestore requires composite indexes for queries that:
1. Use multiple `where()` filters
2. Combine `where()` with `orderBy()`
3. Use inequality filters on different fields

Without these indexes, EPH queries will fail with an error message containing a link to auto-generate the index.

---

## EPH-Specific Indexes

### 1. ephReports Collection

#### Index 1: Get reports by recipient
**Query**: Get all reports for a recipient, ordered by creation date
```typescript
query(
  collection(db, 'ephReports'),
  where('recipientMasterAccountId', '==', masterAccountId),
  orderBy('createdAt', 'desc')
)
```

**Index Definition**:
```json
{
  "collectionGroup": "ephReports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientMasterAccountId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

#### Index 2: Get reports by recipient and status
**Query**: Get reports for a recipient filtered by status
```typescript
query(
  collection(db, 'ephReports'),
  where('recipientMasterAccountId', '==', masterAccountId),
  where('status', '==', 'sent'),
  orderBy('createdAt', 'desc')
)
```

**Index Definition**:
```json
{
  "collectionGroup": "ephReports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientMasterAccountId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

#### Index 3: Get reports by sender
**Query**: Get all reports sent by a sender
```typescript
query(
  collection(db, 'ephReports'),
  where('senderMasterAccountId', '==', masterAccountId),
  orderBy('sentAt', 'desc')
)
```

**Index Definition**:
```json
{
  "collectionGroup": "ephReports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "senderMasterAccountId", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "DESCENDING" }
  ]
}
```

#### Index 4: Get reports by sender and status
**Query**: Get reports sent by a sender, filtered by status
```typescript
query(
  collection(db, 'ephReports'),
  where('senderMasterAccountId', '==', masterAccountId),
  where('status', '==', 'agreed'),
  orderBy('sentAt', 'desc')
)
```

**Index Definition**:
```json
{
  "collectionGroup": "ephReports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "senderMasterAccountId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "DESCENDING" }
  ]
}
```

---

### 2. ephPendingEdits Collection

#### Index 1: Get pending edits by asset and date
**Query**: Get pending edits for specific asset and date
```typescript
query(
  collection(db, 'ephPendingEdits'),
  where('assetId', '==', assetId),
  where('date', '==', date),
  where('masterAccountId', '==', masterAccountId),
  where('status', '==', 'pending_review'),
  orderBy('createdAt', 'desc')
)
```

**Index Definition**:
```json
{
  "collectionGroup": "ephPendingEdits",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "assetId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" },
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

#### Index 2: Get all pending edits by asset
**Query**: Get all pending edits for an asset across all dates
```typescript
query(
  collection(db, 'ephPendingEdits'),
  where('assetId', '==', assetId),
  where('masterAccountId', '==', masterAccountId),
  where('status', '==', 'pending_review'),
  orderBy('date', 'desc')
)
```

**Index Definition**:
```json
{
  "collectionGroup": "ephPendingEdits",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "assetId", "order": "ASCENDING" },
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
}
```

---

### 3. agreedTimesheets Collection

#### Index 1: Get agreed timesheets by date range
**Query**: Get agreed timesheets for billing
```typescript
query(
  collection(db, 'agreedTimesheets'),
  where('masterAccountId', '==', masterAccountId),
  where('date', '>=', startDate),
  where('date', '<=', endDate),
  where('status', '==', 'approved_for_billing')
)
```

**Index Definition**:
```json
{
  "collectionGroup": "agreedTimesheets",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

#### Index 2: Get agreed timesheets by subcontractor
**Query**: Get agreed timesheets for specific subcontractor
```typescript
query(
  collection(db, 'agreedTimesheets'),
  where('masterAccountId', '==', masterAccountId),
  where('subcontractorId', '==', subcontractorId),
  where('date', '>=', startDate),
  where('date', '<=', endDate)
)
```

**Index Definition**:
```json
{
  "collectionGroup": "agreedTimesheets",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "subcontractorId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

---

### 4. plantAssetTimesheets Collection (Used by EPH)

#### Index 1: Get timesheets by asset and date range
**Query**: Get timesheets for EPH report generation
```typescript
query(
  collection(db, 'plantAssetTimesheets'),
  where('assetId', '==', assetId),
  where('date', '>=', startDate),
  where('date', '<=', endDate),
  orderBy('date', 'desc')
)
```

**Index Definition**:
```json
{
  "collectionGroup": "plantAssetTimesheets",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "assetId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

#### Index 2: Get timesheets by owner
**Query**: Get all timesheets for assets owned by subcontractor
```typescript
query(
  collection(db, 'plantAssetTimesheets'),
  where('masterAccountId', '==', masterAccountId),
  where('ownerId', '==', ownerId),
  where('date', '>=', startDate),
  where('date', '<=', endDate)
)
```

**Index Definition**:
```json
{
  "collectionGroup": "plantAssetTimesheets",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "ownerId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

---

## Complete firestore.indexes.json Entry

Add these entries to your `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "ephReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recipientMasterAccountId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ephReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recipientMasterAccountId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ephReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "senderMasterAccountId", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ephReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "senderMasterAccountId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ephPendingEdits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assetId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "ephPendingEdits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assetId", "order": "ASCENDING" },
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "agreedTimesheets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "agreedTimesheets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "subcontractorId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "plantAssetTimesheets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assetId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "plantAssetTimesheets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Deployment Instructions

### Method 1: Firebase Console (Manual)

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Add Index"
3. For each index above:
   - Select the collection
   - Add fields in exact order shown
   - Set ascending/descending as specified
   - Click "Create Index"
4. Wait for indexes to build (can take minutes to hours depending on data size)

### Method 2: Firebase CLI (Recommended)

1. Ensure `firestore.indexes.json` contains all indexes above
2. Run: `firebase deploy --only firestore:indexes`
3. Confirm deployment
4. Indexes will build automatically

### Method 3: Click Auto-Generated Links

1. Run your app
2. When a query fails, Firebase provides a link in the error
3. Click the link to auto-generate that specific index
4. Repeat for each query that fails
5. **Note**: This is the slowest method

---

## Index Build Time Estimates

| Collection Size | Build Time |
|----------------|------------|
| < 1,000 docs   | 1-5 minutes |
| 1,000-10,000   | 5-30 minutes |
| 10,000-100,000 | 30-120 minutes |
| 100,000+       | Hours |

**Tip**: Build indexes in development/staging first before production.

---

## Testing Indexes

After deploying indexes, test each query:

```typescript
// Test EPH Reports Query
const testEPHReports = async (masterAccountId: string) => {
  const q = query(
    collection(db, 'ephReports'),
    where('senderMasterAccountId', '==', masterAccountId),
    orderBy('sentAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    console.log('✅ EPH Reports query works!', snapshot.size, 'docs');
  } catch (error) {
    console.error('❌ EPH Reports query failed:', error);
  }
};

// Test Pending Edits Query
const testPendingEdits = async (assetId: string, masterAccountId: string) => {
  const q = query(
    collection(db, 'ephPendingEdits'),
    where('assetId', '==', assetId),
    where('masterAccountId', '==', masterAccountId),
    where('status', '==', 'pending_review'),
    orderBy('date', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    console.log('✅ Pending Edits query works!', snapshot.size, 'docs');
  } catch (error) {
    console.error('❌ Pending Edits query failed:', error);
  }
};

// Test Agreed Timesheets Query
const testAgreedTimesheets = async (masterAccountId: string) => {
  const q = query(
    collection(db, 'agreedTimesheets'),
    where('masterAccountId', '==', masterAccountId),
    where('date', '>=', '2024-01-01'),
    where('date', '<=', '2024-01-31'),
    where('status', '==', 'approved_for_billing')
  );
  
  try {
    const snapshot = await getDocs(q);
    console.log('✅ Agreed Timesheets query works!', snapshot.size, 'docs');
  } catch (error) {
    console.error('❌ Agreed Timesheets query failed:', error);
  }
};
```

---

## Common Index Errors

### Error 1: Missing Index
```
Error: The query requires an index. You can create it here: https://console.firebase.google.com/...
```
**Solution**: Click the link or manually create the index

### Error 2: Index Building
```
Error: The index is still building. Please try again later.
```
**Solution**: Wait for index to finish building (check Firebase Console)

### Error 3: Wrong Field Order
```
Error: The query requires a different index
```
**Solution**: Ensure field order in index matches query exactly

---

## Index Maintenance

### When to Rebuild Indexes
- After major data structure changes
- When query patterns change significantly
- If indexes become corrupted (rare)

### Monitoring Index Usage
- Check Firebase Console → Firestore → Usage tab
- Monitor query performance
- Remove unused indexes to save resources

### Best Practices
1. **Create indexes in development first**
2. **Test all queries after deployment**
3. **Document which screen uses which index**
4. **Keep firestore.indexes.json in version control**
5. **Deploy indexes before deploying code that uses them**

---

## EPH Query → Index Mapping

| Query Location | Collection | Index Number |
|---------------|------------|--------------|
| `eph-inbox.tsx` - Load reports | `ephReports` | Index 3 |
| `eph-inbox.tsx` - Filter by status | `ephReports` | Index 4 |
| `eph-inbox.tsx` - Load timesheet details | `plantAssetTimesheets` | Index 1 |
| `ephReportManager.ts` - Get for recipient | `ephReports` | Index 1, 2 |
| `ephReportManager.ts` - Get for sender | `ephReports` | Index 3, 4 |
| `ephPendingEditsManager.ts` - Get by asset | `ephPendingEdits` | Index 1, 2 |
| `agreedTimesheetManager.ts` - Get by date range | `agreedTimesheets` | Index 1 |
| Billing integration | `agreedTimesheets` | Index 1, 2 |

---

## Troubleshooting

### Issue: Indexes not appearing in console
**Solution**: 
- Check firestore.indexes.json syntax
- Run `firebase deploy --only firestore:indexes --debug`
- Verify Firebase project is correct

### Issue: Queries still failing after index creation
**Solution**:
- Wait 5-10 minutes after index creation
- Check index status in Firebase Console
- Verify query uses exact fields and order as index

### Issue: Index build stuck
**Solution**:
- Delete and recreate index
- Check for Firestore service issues
- Contact Firebase support if persists

---

## Next Steps

1. ✅ Add indexes to `firestore.indexes.json`
2. ✅ Deploy indexes: `firebase deploy --only firestore:indexes`
3. ✅ Wait for indexes to build
4. ✅ Test all EPH queries
5. ✅ Monitor performance in production
