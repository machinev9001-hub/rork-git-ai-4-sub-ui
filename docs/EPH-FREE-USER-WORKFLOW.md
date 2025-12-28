# EPH Workflow for Free Users

## Overview

This document describes the EPH (Equipment Per Hour) workflow extension to support free users as plant asset owners.

## Current Situation

**Enterprise Setup:**
- Enterprise users have sites
- They hire plant assets from subcontractors OR free users
- Plant assets record timesheets
- EPH reports are generated and sent to subcontractors for approval
- After agreement, billing proceeds

**Free User Setup:**
- Free users create master accounts
- They list their plant assets in the marketplace
- Enterprise users (or VAS-enabled free users) can see and hire these assets
- Free users need to receive EPH reports from enterprises where their assets are working

## The Problem

The current EPH system only supports:
- **Enterprise → Subcontractor** workflow
- Uses `ownerId` (subcontractor document ID) to identify asset owners

Free users need:
- **Enterprise → Free User** workflow
- Track which free user (masterAccountId) owns each plant asset
- EPH inbox to receive reports from multiple enterprise clients
- Ability to review and approve hours

## Solution Architecture

### 1. Extended PlantAsset Type

```typescript
export type PlantAsset = {
  // ... existing fields
  ownerType: 'company' | 'subcontractor';
  ownerId?: string;  // For subcontractors (existing)
  
  // NEW FIELDS for free user owners
  ownerMasterAccountId?: string;  // Free user's master account ID
  ownerEmail?: string;  // Contact email for EPH reports
  ownerContactName?: string;  // Contact name
}
```

**Logic:**
- If `ownerType === 'subcontractor'`: Use existing subcontractor workflow with `ownerId`
- If `ownerType === 'company'` AND `ownerMasterAccountId` is set: This is a free user owner

### 2. New EPHReport Collection

**Purpose:** Track EPH reports sent to free users (and subcontractors)

**Collection:** `ephReports`

```typescript
export type EPHReport = {
  id: string;
  reportId: string;
  status: 'draft' | 'sent' | 'reviewed' | 'agreed' | 'disputed';
  
  // Recipient info
  recipientType: 'subcontractor' | 'free_user';
  recipientId: string;  // subcontractorId or ownerMasterAccountId
  recipientName: string;
  recipientEmail?: string;
  recipientMasterAccountId?: string;  // For free users
  
  // Sender info
  senderMasterAccountId: string;
  senderCompanyName: string;
  siteId: string;
  siteName?: string;
  
  // Report data
  dateRangeFrom: string;
  dateRangeTo: string;
  assetIds: string[];
  totalAssets: number;
  totalHours: number;
  totalCost: number;
  message?: string;
  pdfUrl?: string;
  
  // Timeline
  sentAt?: Timestamp;
  sentBy?: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  agreedAt?: Timestamp;
  agreedBy?: string;
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 3. EPH Generation Changes

**File:** `app/billing-config.tsx`

When generating EPH, identify the owner:

```typescript
const determineAssetOwner = (asset: PlantAsset) => {
  if (asset.ownerType === 'subcontractor' && asset.ownerId) {
    return {
      recipientType: 'subcontractor',
      recipientId: asset.ownerId,
      recipientName: asset.ownerName || 'Unknown Subcontractor',
    };
  }
  
  if (asset.ownerType === 'company' && asset.ownerMasterAccountId) {
    return {
      recipientType: 'free_user',
      recipientId: asset.ownerMasterAccountId,
      recipientName: asset.ownerName || asset.ownerContactName || 'Free User',
      recipientMasterAccountId: asset.ownerMasterAccountId,
    };
  }
  
  throw new Error('Cannot determine asset owner');
};
```

### 4. Free User EPH Inbox

**New Screen:** `app/eph-inbox.tsx`

**Purpose:** Free users see EPH reports sent to them by enterprise clients

**Features:**
- List all EPH reports where `recipientMasterAccountId === currentUser.masterAccountId`
- Filter by status (sent, reviewed, agreed)
- View report details
- Review and approve hours
- Dispute hours (add notes)

**UI Layout:**
```
┌─────────────────────────────────────┐
│ EPH Inbox                           │
│ ──────────────────────────────────  │
│                                     │
│ 📋 ABC Construction Ltd             │
│    Date: 1 Dec - 15 Dec 2025        │
│    Assets: 3                        │
│    Hours: 285h                      │
│    Cost: R128,250                   │
│    Status: 🟡 Awaiting Review       │
│    [View Details]                   │
│                                     │
│ 📋 XYZ Builders                     │
│    Date: 1 Dec - 7 Dec 2025         │
│    Assets: 1                        │
│    Hours: 48h                       │
│    Cost: R21,600                    │
│    Status: ✅ Agreed                │
│    [View Details]                   │
│                                     │
└─────────────────────────────────────┘
```

### 5. Workflow Steps

#### Step 1: Enterprise Generates EPH

```typescript
// In billing-config.tsx - when "Send to Subcontractor/Owner" clicked

const sendEPHReport = async () => {
  // 1. Generate PDF
  const pdfUri = await generateTimesheetPDF(ephData);
  
  // 2. Determine recipient
  const owner = determineAssetOwner(selectedAssets[0]);
  
  // 3. Create EPH report record
  const reportRef = doc(collection(db, 'ephReports'));
  await setDoc(reportRef, {
    id: reportRef.id,
    reportId: `EPH-${Date.now()}`,
    status: 'sent',
    recipientType: owner.recipientType,
    recipientId: owner.recipientId,
    recipientName: owner.recipientName,
    recipientEmail: recipientEmail,
    recipientMasterAccountId: owner.recipientMasterAccountId,
    senderMasterAccountId: user.masterAccountId,
    senderCompanyName: user.companyName,
    siteId: user.siteId,
    siteName: user.siteName,
    dateRangeFrom: startDate.toISOString(),
    dateRangeTo: endDate.toISOString(),
    assetIds: selectedAssets.map(a => a.assetId),
    totalAssets: selectedAssets.length,
    totalHours: totalHours,
    totalCost: totalCost,
    message: customMessage,
    pdfUrl: pdfUri,
    sentAt: Timestamp.now(),
    sentBy: user.userId,
    createdAt: Timestamp.now(),
  });
  
  // 4. Send email notification
  await sendEPHToOwner({
    recipientEmail,
    recipientName: owner.recipientName,
    ownerType: owner.recipientType,
    ...
  });
};
```

#### Step 2: Free User Receives Notification

**Email:**
```
Subject: EPH Report for Review - ABC Construction Ltd

Dear John's Plant Hire,

ABC Construction Ltd has sent you an Equipment/Plant Hours (EPH) 
report for the period 1 Dec 2025 to 15 Dec 2025.

Your Assets: 3
Total Hours: 285h
Estimated Cost: R128,250

Please login to your account to review and approve the hours.

[View EPH Report]

Thank you,
ABC Construction Ltd
```

#### Step 3: Free User Reviews EPH

**Screen:** EPH Inbox → EPH Detail

**Actions:**
1. **Approve Hours** - Agree with the report
2. **Dispute Hours** - Add notes about discrepancies
3. **Request Edits** - Ask enterprise to adjust hours

```typescript
const approveEPH = async (reportId: string) => {
  await updateDoc(doc(db, 'ephReports', reportId), {
    status: 'agreed',
    reviewedAt: Timestamp.now(),
    reviewedBy: currentUser.userId,
    agreedAt: Timestamp.now(),
    agreedBy: currentUser.userId,
    updatedAt: Timestamp.now(),
  });
  
  // Send confirmation email to enterprise
  await sendApprovalNotification(...);
};

const disputeEPH = async (reportId: string, notes: string) => {
  await updateDoc(doc(db, 'ephReports', reportId), {
    status: 'disputed',
    reviewedAt: Timestamp.now(),
    reviewedBy: currentUser.userId,
    disputeNotes: notes,
    updatedAt: Timestamp.now(),
  });
  
  // Send dispute notification to enterprise
  await sendDisputeNotification(...);
};
```

#### Step 4: Enterprise Receives Response

**Notification Methods:**
- Email notification
- In-app notification badge
- Status update in billing-config EPH tab

**If Approved:**
- Status: "✅ Agreed by Owner"
- Can proceed to payment

**If Disputed:**
- Status: "⚠️ Disputed by Owner"
- View dispute notes
- Edit hours and resend

### 6. Firebase Rules

```javascript
match /ephReports/{reportId} {
  allow read: if (
    request.auth != null &&
    (
      // Sender can read their sent reports
      resource.data.senderMasterAccountId == request.auth.token.masterAccountId ||
      // Recipient can read reports sent to them
      resource.data.recipientMasterAccountId == request.auth.token.masterAccountId
    )
  );
  
  allow create: if (
    request.auth != null &&
    request.resource.data.senderMasterAccountId == request.auth.token.masterAccountId
  );
  
  allow update: if (
    request.auth != null &&
    (
      // Sender can update their reports
      resource.data.senderMasterAccountId == request.auth.token.masterAccountId ||
      // Recipient can update status (approve/dispute)
      (
        resource.data.recipientMasterAccountId == request.auth.token.masterAccountId &&
        request.resource.data.status in ['reviewed', 'agreed', 'disputed']
      )
    )
  );
}
```

### 7. Firebase Indexes

Add to `firestore.indexes.json`:

```json
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
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "DESCENDING" }
  ]
}
```

## Implementation Checklist

### Phase 1: Type Definitions
- [ ] Add new fields to PlantAsset type
- [ ] Create EPHReport type
- [ ] Update billing-config types

### Phase 2: Asset Onboarding
- [ ] Update plant asset creation to capture owner email
- [ ] Add owner masterAccountId for free users
- [ ] Update marketplace to show owner type

### Phase 3: EPH Generation Updates
- [ ] Detect owner type (subcontractor vs free user)
- [ ] Group assets by owner
- [ ] Create EPH report records
- [ ] Support both email types

### Phase 4: Free User Inbox
- [ ] Create EPH inbox screen
- [ ] Query reports by recipientMasterAccountId
- [ ] Display report cards
- [ ] Detail view with all timesheet data

### Phase 5: Response Actions
- [ ] Approve EPH button
- [ ] Dispute EPH with notes
- [ ] Send notifications back to enterprise

### Phase 6: Enterprise Monitoring
- [ ] Show EPH status in billing-config
- [ ] Handle disputed reports
- [ ] Resend edited reports

### Phase 7: Testing
- [ ] Test subcontractor workflow (existing)
- [ ] Test free user workflow (new)
- [ ] Test mixed scenarios (some sub, some free)
- [ ] Test notifications
- [ ] Test dispute resolution

## Benefits

1. **Unified Workflow:** One EPH system for both subcontractors and free users
2. **Transparency:** Free users see exactly what they'll be paid
3. **Automation:** Less manual communication needed
4. **Audit Trail:** Complete history of reports, approvals, disputes
5. **Scalability:** Free users can work with multiple enterprise clients
6. **Professional:** Proper invoicing and approval workflow

## Future Enhancements

1. **Auto-approval:** If no response in X days, auto-approve
2. **Partial approval:** Approve some assets, dispute others
3. **Payment tracking:** Link to payment confirmation
4. **Analytics:** Free user dashboard showing income by client
5. **Contract terms:** Store agreed rates and terms
6. **Multi-currency:** Support different currencies
7. **Tax documents:** Generate tax invoices automatically

## Support

For questions or implementation help, refer to:
- `docs/EPH-AGREEMENT-WORKFLOW-COMPLETE.md`
- `docs/PLANT-HOURS-BILLING-SYSTEM-COMPLETE.md`
- `app/billing-config.tsx`
