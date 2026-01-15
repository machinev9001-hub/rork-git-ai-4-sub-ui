# EPH System & Free User Workflow

## Overview

This document describes the complete EPH (Equipment Per Hour) workflow, including how free users interact with the system. Both free and enterprise users share the same core workflow—the only difference is feature access restrictions for free users.

---

## User Types & Access

### Enterprise Users
- Full access to all features
- Can create sites, manage employees, generate reports
- Can hire plant assets from subcontractors or free users
- Generate and send EPH reports

### Free Users
- Same workflow and UI as enterprise users
- Most features are locked with explanatory popups
- Can list plant assets in the marketplace
- Receive EPH reports from enterprise clients via EPH Inbox
- Can review and approve/dispute hours

**Important:** Free users land on the same HOME screen as enterprise users. Locked modules display a popup explaining the feature with options to unlock.

---

## EPH Workflow Overview

### Enterprise → Asset Owner Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Enterprise User                    Asset Owner                 │
│  (Hires assets)                     (Subcontractor or Free User)│
│                                                                 │
│  ┌─────────────┐                    ┌─────────────┐            │
│  │ Record      │                    │ EPH Inbox   │            │
│  │ Timesheets  │                    │             │            │
│  └─────┬───────┘                    └──────▲──────┘            │
│        │                                   │                    │
│        ▼                                   │                    │
│  ┌─────────────┐    Send Report     ┌──────┴──────┐            │
│  │ Billing     │ ─────────────────► │ EPH Report  │            │
│  │ Config      │                    │ Created     │            │
│  └─────────────┘                    └──────┬──────┘            │
│                                            │                    │
│                                            ▼                    │
│                                     ┌─────────────┐            │
│                                     │ Review &    │            │
│                                     │ Approve     │            │
│                                     └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### PlantAsset Type (Extended)

```typescript
export type PlantAsset = {
  // Existing fields...
  assetId: string;
  assetName: string;
  assetType: string;
  
  // Owner identification
  ownerType: 'company' | 'subcontractor';
  ownerId?: string;                    // For subcontractors (existing)
  ownerMasterAccountId?: string;       // Free user's master account ID
  ownerEmail?: string;                 // Contact email for EPH reports
  ownerContactName?: string;           // Contact name
  ownerName?: string;                  // Company/business name
}
```

**Logic:**
- `ownerType === 'subcontractor'` → Use existing subcontractor workflow with `ownerId`
- `ownerType === 'company'` AND `ownerMasterAccountId` → Free user owner

### EPHReport Type

```typescript
export type EPHReport = {
  id: string;
  reportId: string;
  status: 'draft' | 'sent' | 'reviewed' | 'agreed' | 'disputed';
  
  // Recipient info
  recipientType: 'subcontractor' | 'free_user';
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientMasterAccountId?: string;
  
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
  disputeNotes?: string;
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## Workflow Steps

### Step 1: Enterprise Generates EPH Report

Location: `app/billing-config.tsx` → EPH Tab

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

When "Send to Owner" is clicked:
1. Generate PDF report
2. Identify owner type (subcontractor vs free user)
3. Create EPH report record in Firestore
4. Send email notification

### Step 2: Free User Receives Notification

Email notification sent to owner:
```
Subject: EPH Report for Review - [Company Name]

Dear [Owner Name],

[Company Name] has sent you an Equipment/Plant Hours (EPH) 
report for the period [Start Date] to [End Date].

Your Assets: [Count]
Total Hours: [Hours]h
Estimated Cost: R[Amount]

Please login to review and approve the hours.

[View EPH Report]
```

### Step 3: Free User Reviews in EPH Inbox

Location: `app/eph-inbox.tsx`

UI Layout:
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

### Step 4: Free User Takes Action

**Approve Hours:**
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
};
```

**Dispute Hours:**
```typescript
const disputeEPH = async (reportId: string, notes: string) => {
  await updateDoc(doc(db, 'ephReports', reportId), {
    status: 'disputed',
    reviewedAt: Timestamp.now(),
    reviewedBy: currentUser.userId,
    disputeNotes: notes,
    updatedAt: Timestamp.now(),
  });
};
```

### Step 5: Enterprise Receives Response

Status updates visible in billing-config EPH tab:
- ✅ **Agreed** → Can proceed to payment
- ⚠️ **Disputed** → View notes, edit hours, resend

---

## Firebase Configuration

### Security Rules

```javascript
match /ephReports/{reportId} {
  allow read: if request.auth != null;
  
  allow create: if request.auth != null;
  
  allow update: if request.auth != null && (
    resource.data.senderMasterAccountId == request.auth.token.masterAccountId ||
    resource.data.recipientMasterAccountId == request.auth.token.masterAccountId
  );
  
  allow delete: if request.auth != null && 
    resource.data.senderMasterAccountId == request.auth.token.masterAccountId;
}
```

### Required Indexes

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

---

## Implementation Status

### Completed
- [x] Extended PlantAsset type with owner fields
- [x] Created EPHReport type (`types/ephReport.ts`)
- [x] Created EPH report manager (`utils/ephReportManager.ts`)
- [x] Created EPH inbox screen (`app/eph-inbox.tsx`)
- [x] Free user routing aligned with enterprise workflow

### Pending
- [ ] Update billing-config.tsx to use EPH report system
- [ ] Add EPH inbox navigation for free users in settings
- [ ] Deploy Firebase indexes
- [ ] Deploy Firebase security rules
- [ ] End-to-end testing

---

## Testing Checklist

### Scenario 1: Enterprise → Free User EPH Flow
1. Enterprise has a site with allocated plant assets from free user
2. Enterprise goes to Billing Config → EPH tab
3. Selects date range and free user's assets
4. Clicks "Send to Owner"
5. **Expected:** EPH report created, email sent, free user sees report in inbox

### Scenario 2: Free User Approves EPH
1. Free user logs in
2. Opens EPH Inbox
3. Reviews pending report
4. Clicks "Approve"
5. **Expected:** Status changes to "agreed", enterprise notified

### Scenario 3: Free User Disputes EPH
1. Free user opens report
2. Clicks "Dispute"
3. Enters notes
4. **Expected:** Status changes to "disputed", notes saved

### Scenario 4: Mixed Owners
1. Site has assets from both subcontractor and free user
2. Enterprise generates EPH for all
3. **Expected:** Separate reports created for each owner

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sent | Check `ownerEmail` is set on PlantAsset |
| EPH Inbox empty | Verify `ownerMasterAccountId` matches user's master account |
| Assets not showing | Ensure assets have timesheets and are verified |
| Cannot group by owner | Check all assets have proper owner info |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/billing-config.tsx` | Enterprise generates/sends EPH |
| `app/eph-inbox.tsx` | Free user receives/reviews EPH |
| `types/ephReport.ts` | EPH report type definitions |
| `utils/ephReportManager.ts` | EPH report CRUD operations |
| `types/index.ts` | PlantAsset type with owner fields |

---

## Future Enhancements

1. **Auto-approval** - If no response in X days
2. **Partial approval** - Approve some assets, dispute others
3. **Payment tracking** - Link to payment confirmation
4. **Analytics dashboard** - Free user income by client
5. **Contract terms** - Store agreed rates
6. **Multi-currency** - Support different currencies
7. **Tax documents** - Auto-generate invoices
