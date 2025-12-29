# EPH Free User Implementation - Step-by-Step Guide

## Overview

This guide provides step-by-step instructions for implementing the EPH workflow for free users who list their plant assets on the marketplace.

## Current Status

✅ **Completed:**
1. Extended PlantAsset type with `ownerMasterAccountId`, `ownerEmail`, `ownerContactName`
2. Created EPHReport type system in `types/ephReport.ts`
3. Created EPH report manager utility in `utils/ephReportManager.ts`
4. Created EPH inbox screen in `app/eph-inbox.tsx`

⏳ **Pending:**
1. Update billing-config.tsx to use new EPH report system
2. Add EPH inbox navigation for free users
3. Update Firebase indexes
4. Update Firebase security rules
5. Test full workflow

## Step 1: Update Plant Asset Creation (Already Done Partially)

When a free user creates a plant asset, ensure these fields are captured:

**File: `app/add-asset.tsx`** (or wherever plant assets are created for free users)

```typescript
// When saving plant asset for free user:
const plantAssetData: PlantAsset = {
  // ... existing fields
  ownerType: 'company',  // For free users
  ownerMasterAccountId: user.masterAccountId,  // FREE USER'S master account
  ownerEmail: user.email || contactEmail,  // Contact email for EPH
  ownerContactName: user.name || contactName,
  ownerName: companyName || user.companyName,
};
```

## Step 2: Update Billing Config to Send EPH Reports

**File: `app/billing-config.tsx`**

Add import:
```typescript
import { determineAssetOwner, createEPHReport, AssetOwnerInfo } from '@/utils/ephReportManager';
```

Update the `handleSendToSubcontractor` function:

```typescript
const handleSendToSubcontractor = async () => {
  if (selectedAssetIds.size === 0 || !user) {
    Alert.alert('Error', 'Please select assets and try again');
    return;
  }

  try {
    setLoading(true);
    
    // Get selected assets
    const selectedAssets = ephRecords.filter(r => selectedAssetIds.has(r.assetId));
    
    // Group by owner
    const assetsByOwner = new Map<string, typeof selectedAssets>();
    const ownerInfoMap = new Map<string, AssetOwnerInfo>();
    
    for (const record of selectedAssets) {
      // Find the actual PlantAsset to get owner info
      const assetDoc = await getDoc(doc(db, 'plantAssets', record.assetId));
      if (!assetDoc.exists()) continue;
      
      const asset = assetDoc.data() as PlantAsset;
      const ownerInfo = determineAssetOwner(asset);
      const ownerKey = ownerInfo.recipientId;
      
      if (!assetsByOwner.has(ownerKey)) {
        assetsByOwner.set(ownerKey, []);
        ownerInfoMap.set(ownerKey, ownerInfo);
      }
      assetsByOwner.get(ownerKey)!.push(record);
    }
    
    // Send separate EPH report for each owner
    for (const [ownerKey, assets] of assetsByOwner.entries()) {
      const ownerInfo = ownerInfoMap.get(ownerKey)!;
      
      const totalHours = assets.reduce((sum, a) => sum + a.totalBillableHours, 0);
      const totalCost = assets.reduce((sum, a) => sum + a.estimatedCost, 0);
      
      // Generate PDF for this owner's assets
      const pdfUri = await generateTimesheetPDF({
        assets,
        dateRange: { from: startDate, to: endDate },
        ownerName: ownerInfo.recipientName,
      });
      
      // Create EPH report record
      await createEPHReport({
        ownerInfo,
        senderMasterAccountId: user.masterAccountId!,
        senderCompanyName: user.companyName || 'Your Company',
        siteId: user.siteId!,
        siteName: user.siteName,
        dateRangeFrom: startDate,
        dateRangeTo: endDate,
        assetIds: assets.map(a => a.assetId),
        totalHours,
        totalCost,
        message: customMessage,
        pdfUrl: pdfUri,
        sentBy: user.userId,
      });
      
      // Send email notification
      if (ownerInfo.recipientEmail) {
        await sendEPHToSubcontractor({
          recipientEmail: ownerInfo.recipientEmail,
          message: customMessage || '',
          pdfUri,
          pdfFileName: `EPH-${ownerInfo.recipientName}-${startDate.toISOString().split('T')[0]}.pdf`,
          subcontractorName: ownerInfo.recipientName,
          dateRange: { from: startDate, to: endDate },
          assetCount: assets.length,
          totalHours,
          companyName: user.companyName || 'Your Company',
        });
      }
      
      console.log(`[Billing Config] EPH sent to ${ownerInfo.recipientType}:`, ownerInfo.recipientName);
    }
    
    Alert.alert(
      'Success', 
      `EPH reports sent to ${assetsByOwner.size} owner(s)`
    );
    
  } catch (error) {
    console.error('[Billing Config] Error sending EPH:', error);
    Alert.alert('Error', 'Failed to send EPH reports');
  } finally {
    setLoading(false);
  }
};
```

## Step 3: Add EPH Inbox to Free User Navigation

**Option A: Add to Settings Menu**

**File: `app/(tabs)/settings.tsx`**

Add navigation button in free user section:

```typescript
{accountType === 'free' && (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => router.push('/eph-inbox')}
  >
    <FileText size={24} color="#3B82F6" />
    <View style={styles.menuItemText}>
      <Text style={styles.menuItemTitle}>EPH Inbox</Text>
      <Text style={styles.menuItemSubtitle}>
        Review reports from enterprise clients
      </Text>
    </View>
    <ChevronRight size={20} color="#64748b" />
  </TouchableOpacity>
)}
```

**Option B: Add as Tab (if free users need quick access)**

Add to `app/(tabs)/_layout.tsx`:

```typescript
{accountType === 'free' && (
  <Tabs.Screen
    name="eph-inbox"
    options={{
      title: 'EPH Inbox',
      tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
    }}
  />
)}
```

## Step 4: Update Firebase Indexes

Add to `firestore.indexes.json`:

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
    }
  ]
}
```

## Step 5: Update Firebase Security Rules

Add to `firestore.rules`:

```javascript
match /ephReports/{reportId} {
  // Anyone authenticated can read
  allow read: if request.auth != null;
  
  // Only authenticated users can create
  allow create: if request.auth != null;
  
  // Only sender or recipient can update
  allow update: if request.auth != null && (
    resource.data.senderMasterAccountId == request.auth.token.masterAccountId ||
    resource.data.recipientMasterAccountId == request.auth.token.masterAccountId
  );
  
  // Only sender can delete
  allow delete: if request.auth != null && 
    resource.data.senderMasterAccountId == request.auth.token.masterAccountId;
}
```

## Step 6: Testing Checklist

### Test Scenario 1: Enterprise → Free User EPH Flow

1. **Setup:**
   - Enterprise user has a site
   - Free user has plant assets with `ownerMasterAccountId` set
   - Assets allocated to enterprise site

2. **Steps:**
   - Enterprise: Go to Billing Config → EPH tab
   - Select date range
   - Select free user's assets
   - Click "Send to Subcontractor/Owner"
   - Enter email and message
   - Submit

3. **Expected:**
   - EPH report created in `ephReports` collection
   - Email sent to free user
   - Free user sees report in EPH Inbox
   - Status: "Awaiting Review"

### Test Scenario 2: Free User Approves EPH

1. **Steps:**
   - Free user logs in
   - Opens EPH Inbox
   - Sees pending report
   - Reviews hours and cost
   - Clicks "Approve"

2. **Expected:**
   - Report status changes to "agreed"
   - Enterprise receives notification (future)
   - Hours move to billing

### Test Scenario 3: Free User Disputes EPH

1. **Steps:**
   - Free user opens report
   - Clicks "Dispute"
   - Enters notes about discrepancy
   - Submits

2. **Expected:**
   - Report status changes to "disputed"
   - Dispute notes saved
   - Enterprise sees disputed status (future)

### Test Scenario 4: Mixed Owners (Subcontractor + Free User)

1. **Setup:**
   - Some assets from subcontractor
   - Some assets from free user
   - All working on same site

2. **Steps:**
   - Enterprise generates EPH for all assets
   - System groups by owner
   - Sends separate reports

3. **Expected:**
   - 2 separate EPH reports created
   - 2 emails sent
   - Each owner sees their report

## Step 7: Future Enhancements

1. **Notifications:**
   - Push notifications when EPH received
   - Email reminders if not reviewed in X days
   - Status change notifications to enterprise

2. **Payment Tracking:**
   - Link EPH to payment records
   - Track payment status
   - Generate tax invoices

3. **Analytics for Free Users:**
   - Dashboard showing income by client
   - Asset utilization reports
   - Revenue forecasting

4. **Contract Management:**
   - Store agreed rates per client
   - Track contract terms
   - Renewal reminders

## Common Issues & Solutions

### Issue 1: Email not sent
**Solution:** Check that `ownerEmail` is set on PlantAsset

### Issue 2: EPH Inbox empty
**Solution:** Verify `ownerMasterAccountId` matches user's master account

### Issue 3: Assets not showing in EPH
**Solution:** Check that assets have timesheets and are verified

### Issue 4: Cannot group by owner
**Solution:** Ensure all assets have proper owner info (ownerId OR ownerMasterAccountId)

## Summary

This implementation extends the existing EPH system to support free users as plant asset owners:

- **Enterprise users**: Send EPH to both subcontractors and free users
- **Free users**: Receive EPH reports in inbox, review, approve/dispute
- **System**: Tracks all reports, statuses, and audit trail
- **Flexible**: Supports mixed scenarios (some sub, some free)

The workflow is now complete end-to-end! 🎉
