# EPH System - Complete File List & Implementation Guide

This document provides a complete reference for all EPH (Equipment/Plant Hours) system files needed for implementation.

---

## Quick Reference

**Total EPH Files**: 33 files across 6 categories

**Core Collections**: 
- `ephReports` - Main EPH reports
- `ephPendingEdits` - Pending edits before agreement
- `agreedTimesheets` - Approved timesheets ready for billing
- `plantAssetTimesheets` - Source timesheet data

---

## File Categories & Paths

### 1. Screens (2 files)

| File | Path | Description | LOC |
|------|------|-------------|-----|
| EPH Inbox | `app/eph-inbox.tsx` | Main inbox for viewing sent/received EPH reports | 828 |
| EPH Menu | `app/eph-menu.tsx` | Menu placeholder screen | 51 |

**Routes Created**:
- `/eph-inbox` - Main EPH interface
- `/eph-menu` - Menu screen

---

### 2. Core Utilities (5 files)

| File | Path | Description | LOC |
|------|------|-------------|-----|
| EPH Report Manager | `utils/ephReportManager.ts` | Create, retrieve, approve, dispute EPH reports | 225 |
| EPH Email Service | `utils/ephEmailService.ts` | Send EPH reports via email with PDF | 127 |
| EPH Pending Edits Manager | `utils/ephPendingEditsManager.ts` | Track pending edits before agreement | 157 |
| Agreed Timesheet Manager | `utils/agreedTimesheetManager.ts` | Manage approved timesheets | 359 |
| Billable Hours Calculator | `utils/billableHoursCalculator.ts` | Complex billing logic for plant hours | 307 |

---

### 3. Supporting Utilities (3 files)

| File | Path | Description | LOC |
|------|------|-------------|-----|
| Timesheet PDF Generator | `utils/timesheetPdfGenerator.ts` | Generate PDF reports | 867 |
| Timesheet Export | `utils/timesheetExport.ts` | CSV export functionality | 432 |
| Export Handler | `utils/accounts/exportHandler.ts` | Handle large exports | 150 |

---

### 4. Components (9 files)

| File | Path | Description | LOC |
|------|------|-------------|-----|
| Edit EPH Hours Modal | `components/accounts/EditEPHHoursModal.tsx` | Modal for editing EPH timesheet hours | 445 |
| Agreed Hours Modal | `components/accounts/AgreedHoursModal.tsx` | Modal for agreeing hours | 402 |
| Timesheet Comparison Modal | `components/accounts/TimesheetComparisonModal.tsx` | Compare original vs agreed hours | 426 |
| Send Confirmation Modal | `components/accounts/SendConfirmationModal.tsx` | Confirm sending EPH reports | 483 |
| Filters Bar | `components/accounts/FiltersBar.tsx` | Filter EPH data | 240 |
| Export Request Modal | `components/accounts/ExportRequestModal.tsx` | Request data export | 427 |
| Report Generation Modal | `components/accounts/ReportGenerationModal.tsx` | Generate reports | 400 |
| Export Jobs List | `components/accounts/ExportJobsList.tsx` | List of export jobs | 332 |
| Plant Assets Timesheets Tab | `components/accounts/PlantAssetsTimesheetsTab.tsx` | Main EPH processing tab | 1849 |

---

### 5. Integration Points (3 files)

| File | Path | Description | Notes |
|------|------|-------------|-------|
| Billing Config | `app/billing-config.tsx` | Main billing screen with EPH tab | Contains EPH integration |
| Accounts Index | `app/accounts/index.tsx` | Accounts entry point | Links to EPH screens |
| Root Layout | `app/_layout.tsx` | App navigation | Registers EPH routes |

---

### 6. Type Definitions (3 files)

| File | Path | Description |
|------|------|-------------|
| EPH Report Types | `types/ephReport.ts` | EPH-specific types |
| EMH Report Types | `types/emhReport.ts` | Similar structure for man hours |
| Main Types | `types/index.ts` | Shared types (AgreedTimesheet, PlantAssetTimesheet, etc.) |

---

### 7. Documentation (6 files)

| File | Path |
|------|------|
| EPH Agreement Workflow | `docs/EPH-AGREEMENT-WORKFLOW-COMPLETE.md` |
| EPH Implementation Status | `docs/EPH-AGREEMENT-IMPLEMENTATION-STATUS.md` |
| EPH Free User Workflow | `docs/EPH-FREE-USER-WORKFLOW.md` |
| EPH Subcontractor Agreement | `docs/EPH-SUBCONTRACTOR-AGREEMENT-WORKFLOW.md` |
| EPH Firebase Indexes | `docs/EPH-FIREBASE-INDEXES-REQUIRED.md` |
| Billing Timesheet Workflow | `docs/BILLING-TIMESHEET-WORKFLOW-CLARIFICATION.md` |

---

### 8. Configuration (1 file)

| File | Path | Description |
|------|------|-------------|
| Firestore Indexes | `firestore.indexes.json` | Firebase composite indexes for EPH queries |

---

## Firebase Indexes Required

### ephReports Collection

```json
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
```

### ephPendingEdits Collection

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
}
```

### agreedTimesheets Collection

```json
{
  "collectionGroup": "agreedTimesheets",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

---

## NPM Dependencies

```json
{
  "dependencies": {
    "firebase": "^10.x.x",
    "expo-mail-composer": "~12.x.x",
    "expo-print": "~12.x.x",
    "expo-sharing": "~12.x.x",
    "lucide-react-native": "^0.x.x"
  }
}
```

---

## Navigation Wiring

### 1. Add to app/_layout.tsx

```typescript
// Register EPH routes
<Stack.Screen name="eph-inbox" options={{ presentation: 'card' }} />
<Stack.Screen name="eph-menu" options={{ presentation: 'card' }} />
```

### 2. Link from Accounts Screen (app/accounts/index.tsx)

```typescript
// Add button/link to EPH inbox
<TouchableOpacity onPress={() => router.push('/eph-inbox')}>
  <Text>View EPH Reports</Text>
</TouchableOpacity>
```

### 3. Integration in Billing (app/billing-config.tsx)

The billing-config.tsx contains the main EPH processing tab. Search for:
- "Process Payments" tab
- `<PlantAssetsTimesheetsTab />` component
- EPH approval workflows

---

## Data Flow

```
1. Plant Manager creates timesheets
   └─> plantAssetTimesheets collection

2. Admin reviews & sends EPH to subcontractor
   └─> Creates ephReport
   └─> Sends email with PDF

3. Subcontractor reviews & responds
   └─> Creates ephPendingEdits (if changes needed)
   └─> OR approves directly

4. Admin agrees hours
   └─> Creates agreedTimesheets
   └─> Status: 'approved_for_billing'

5. Billing processes agreed hours
   └─> Reads from agreedTimesheets
   └─> Calculates billableHours using billing config
```

---

## Implementation Steps

### Phase 1: Core Setup
1. Copy type definitions (`types/ephReport.ts`, `types/emhReport.ts`)
2. Copy utility functions (5 core utils)
3. Set up Firebase indexes
4. Test utility functions independently

### Phase 2: UI Components
1. Copy screen files (`eph-inbox.tsx`, `eph-menu.tsx`)
2. Copy components (9 component files)
3. Wire navigation routes
4. Test screen navigation

### Phase 3: Integration
1. Integrate with billing-config.tsx
2. Add EPH tab to accounts system
3. Connect email service
4. Test end-to-end workflow

### Phase 4: Testing
1. Test EPH report creation
2. Test email sending
3. Test approval workflow
4. Test disputed items
5. Test agreed timesheets → billing

---

## Key Functions Reference

### Creating EPH Report
```typescript
import { createEPHReport, determineAssetOwner } from '@/utils/ephReportManager';

const ownerInfo = determineAssetOwner(asset);
const reportId = await createEPHReport({
  ownerInfo,
  senderMasterAccountId: user.masterAccountId,
  senderCompanyName: user.companyName,
  siteId: site.id,
  siteName: site.name,
  dateRangeFrom: new Date('2024-01-01'),
  dateRangeTo: new Date('2024-01-31'),
  assetIds: ['asset1', 'asset2'],
  totalHours: 160,
  totalCost: 50000,
  message: 'Please review',
  sentBy: user.id
});
```

### Sending EPH Email
```typescript
import { sendEPHToSubcontractor } from '@/utils/ephEmailService';

await sendEPHToSubcontractor({
  recipientEmail: 'sub@example.com',
  message: 'Please review hours',
  pdfUri: '/path/to/pdf',
  pdfFileName: 'eph_report.pdf',
  subcontractorName: 'ABC Contractors',
  dateRange: { from: new Date(), to: new Date() },
  assetCount: 5,
  totalHours: 160,
  companyName: 'My Company'
});
```

### Agreeing Timesheet
```typescript
import { agreePlantAssetTimesheet } from '@/utils/agreedTimesheetManager';

const agreedId = await agreePlantAssetTimesheet(
  originalTimesheet,
  {
    agreedHours: 8.5,
    agreedNotes: 'Approved',
    isBreakdown: false,
    isRainDay: false
  },
  user.id,
  'admin_direct',
  'Admin',
  billingConfig
);
```

---

## Security Rules Required

```javascript
// ephReports collection
match /ephReports/{reportId} {
  allow read: if request.auth != null && (
    resource.data.recipientMasterAccountId == request.auth.token.masterAccountId ||
    resource.data.senderMasterAccountId == request.auth.token.masterAccountId
  );
  allow create: if request.auth != null;
  allow update: if request.auth != null && (
    resource.data.recipientMasterAccountId == request.auth.token.masterAccountId ||
    resource.data.senderMasterAccountId == request.auth.token.masterAccountId
  );
}

// ephPendingEdits collection
match /ephPendingEdits/{editId} {
  allow read, write: if request.auth != null && 
    resource.data.masterAccountId == request.auth.token.masterAccountId;
}

// agreedTimesheets collection
match /agreedTimesheets/{timesheetId} {
  allow read: if request.auth != null && 
    resource.data.masterAccountId == request.auth.token.masterAccountId;
  allow create, update: if request.auth != null && 
    request.resource.data.masterAccountId == request.auth.token.masterAccountId;
}
```

---

## Detailed File Contents

See separate markdown files for complete code:
- `01_EPH_SCREENS.md` - Full screen implementations
- `02_EPH_UTILITIES.md` - Full utility functions
- `03_EPH_COMPONENTS.md` - Full component code (to be created)
- `04_EPH_TYPES.md` - Full type definitions (to be created)
- `05_EPH_INDEXES.md` - Complete Firebase index definitions (to be created)
- `06_EPH_IMPLEMENTATION_GUIDE.md` - Step-by-step setup (to be created)

---

## Quick Copy Commands

All files are backed up in `Restore_EPH/` folder with exact hierarchy preserved.

To copy to new project:
```bash
# Copy screens
cp Restore_EPH/app/eph-inbox.tsx <new-project>/app/
cp Restore_EPH/app/eph-menu.tsx <new-project>/app/

# Copy utilities
cp Restore_EPH/utils/ephReportManager.ts <new-project>/utils/
cp Restore_EPH/utils/ephEmailService.ts <new-project>/utils/
cp Restore_EPH/utils/ephPendingEditsManager.ts <new-project>/utils/

# Copy components
cp -r Restore_EPH/components/accounts/* <new-project>/components/accounts/

# Copy types
cp Restore_EPH/types/ephReport.ts <new-project>/types/
```

---

## Contact & Support

For implementation assistance, refer to:
- `docs/EPH-AGREEMENT-WORKFLOW-COMPLETE.md` - Complete workflow documentation
- `docs/EPH-FIREBASE-INDEXES-REQUIRED.md` - All required indexes
- Individual markdown files in `EPH_EXTRACTION/` folder
