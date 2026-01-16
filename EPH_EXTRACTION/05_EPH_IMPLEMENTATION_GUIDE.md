# EPH System - Complete Implementation Guide

This guide provides step-by-step instructions for implementing the EPH (Equipment/Plant Hours) system in a new project.

---

## Prerequisites

- ✅ Expo SDK 54+
- ✅ Firebase project configured
- ✅ React Native app with Expo Router
- ✅ TypeScript enabled
- ✅ Existing authentication system

---

## Phase 1: Setup Type Definitions (15 minutes)

### Step 1.1: Copy Type Files

```bash
# Copy EPH-specific types
cp Restore_EPH/types/ephReport.ts <your-project>/types/
cp Restore_EPH/types/emhReport.ts <your-project>/types/

# Verify types/index.ts contains required types:
# - AgreedTimesheet
# - PlantAssetTimesheet
# - OperatorTimesheet
# - PlantAsset
# - BillingConfig
```

### Step 1.2: Update types/index.ts

Add these types if they don't exist:

```typescript
// Add to types/index.ts
export type AgreedTimesheet = {
  id: string;
  originalTimesheetId: string;
  timesheetType: 'operator' | 'plant_asset';
  date: string;
  originalHours: number;
  agreedHours: number;
  billableHours?: number;
  billingRule?: string;
  status: 'approved_for_billing' | 'billed' | 'disputed';
  masterAccountId: string;
  agreedAt: any;
  agreedBy: string;
  agreedByRole?: 'Operator' | 'Plant Manager' | 'Admin';
  createdAt: any;
  updatedAt: any;
  // ... other fields from 03_EPH_TYPES.md
};
```

### Step 1.3: Verify Imports

Test type imports work:

```typescript
import { EPHReport, EPHReportStatus } from '@/types/ephReport';
import { AgreedTimesheet } from '@/types';
```

**✅ Checkpoint**: TypeScript should not show import errors for EPH types.

---

## Phase 2: Install Dependencies (5 minutes)

### Step 2.1: Install Required Packages

```bash
npx expo install expo-mail-composer expo-print expo-sharing
```

### Step 2.2: Verify package.json

Ensure these are in dependencies:

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

**✅ Checkpoint**: Run `npm install` without errors.

---

## Phase 3: Copy Utility Functions (30 minutes)

### Step 3.1: Copy Core EPH Utilities

```bash
# Create directories if needed
mkdir -p utils/accounts

# Copy EPH utilities
cp Restore_EPH/utils/ephReportManager.ts <your-project>/utils/
cp Restore_EPH/utils/ephEmailService.ts <your-project>/utils/
cp Restore_EPH/utils/ephPendingEditsManager.ts <your-project>/utils/
```

### Step 3.2: Copy Supporting Utilities

```bash
cp Restore_EPH/utils/agreedTimesheetManager.ts <your-project>/utils/
cp Restore_EPH/utils/billableHoursCalculator.ts <your-project>/utils/
cp Restore_EPH/utils/timesheetPdfGenerator.ts <your-project>/utils/
cp Restore_EPH/utils/timesheetExport.ts <your-project>/utils/
cp Restore_EPH/utils/accounts/exportHandler.ts <your-project>/utils/accounts/
```

### Step 3.3: Fix Import Paths

Update imports in copied files to match your project structure:

```typescript
// Change from:
import { db } from '@/config/firebase';
import { Colors } from '@/constants/colors';

// To match your project:
import { db } from '@/config/firebase'; // or wherever your firebase config is
import { Colors } from '@/constants/colors'; // or your colors file
```

### Step 3.4: Test Utility Imports

Create a test file to verify utilities load:

```typescript
// test-eph-utils.ts
import { createEPHReport, determineAssetOwner } from '@/utils/ephReportManager';
import { sendEPHToSubcontractor } from '@/utils/ephEmailService';
import { createPendingEdit } from '@/utils/ephPendingEditsManager';

console.log('✅ All EPH utilities imported successfully');
```

**✅ Checkpoint**: No TypeScript errors when importing utilities.

---

## Phase 4: Deploy Firebase Indexes (20 minutes)

### Step 4.1: Update firestore.indexes.json

Open your `firestore.indexes.json` and add EPH indexes from `04_EPH_FIREBASE_INDEXES.md`:

```json
{
  "indexes": [
    // ... your existing indexes ...
    
    // Add EPH indexes:
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
        { "fieldPath": "recipientMasterAccountId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
    // ... add all 10 EPH indexes from documentation
  ]
}
```

### Step 4.2: Deploy Indexes

```bash
# Deploy to Firebase
firebase deploy --only firestore:indexes

# Wait for indexes to build (5-30 minutes depending on data size)
```

### Step 4.3: Verify Index Status

1. Go to Firebase Console → Firestore → Indexes
2. Check all EPH indexes show "Enabled" status
3. If "Building", wait until complete

**✅ Checkpoint**: All EPH indexes show "Enabled" in Firebase Console.

---

## Phase 5: Copy Screen Files (15 minutes)

### Step 5.1: Copy EPH Screens

```bash
cp Restore_EPH/app/eph-inbox.tsx <your-project>/app/
cp Restore_EPH/app/eph-menu.tsx <your-project>/app/
```

### Step 5.2: Update Screen Imports

In both screen files, verify/fix imports:

```typescript
// eph-inbox.tsx
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext'; // Match your auth context
import { getEPHReportsForSender } from '@/utils/ephReportManager';
import { EPHReport } from '@/types/ephReport';
import { db } from '@/config/firebase';
```

### Step 5.3: Register Routes in _layout.tsx

Add EPH routes to your root layout:

```typescript
// app/_layout.tsx
export default function RootLayout() {
  return (
    <Stack>
      {/* ... existing routes ... */}
      
      {/* EPH Routes */}
      <Stack.Screen 
        name="eph-inbox" 
        options={{ 
          presentation: 'card',
          title: 'Machine Hours'
        }} 
      />
      <Stack.Screen 
        name="eph-menu" 
        options={{ 
          presentation: 'card',
          title: 'EPH Menu'
        }} 
      />
    </Stack>
  );
}
```

**✅ Checkpoint**: Navigate to `/eph-inbox` without crashes.

---

## Phase 6: Copy Components (20 minutes)

### Step 6.1: Copy EPH Components

```bash
# Create directory if needed
mkdir -p components/accounts

# Copy components
cp Restore_EPH/components/accounts/EditEPHHoursModal.tsx <your-project>/components/accounts/
cp Restore_EPH/components/accounts/AgreedHoursModal.tsx <your-project>/components/accounts/
cp Restore_EPH/components/accounts/TimesheetComparisonModal.tsx <your-project>/components/accounts/
cp Restore_EPH/components/accounts/SendConfirmationModal.tsx <your-project>/components/accounts/
cp Restore_EPH/components/accounts/FiltersBar.tsx <your-project>/components/accounts/
cp Restore_EPH/components/accounts/ExportRequestModal.tsx <your-project>/components/accounts/
cp Restore_EPH/components/accounts/ReportGenerationModal.tsx <your-project>/components/accounts/
cp Restore_EPH/components/accounts/ExportJobsList.tsx <your-project>/components/accounts/
cp Restore_EPH/components/accounts/PlantAssetsTimesheetsTab.tsx <your-project>/components/accounts/
```

### Step 6.2: Fix Component Imports

Each component may need import adjustments:

```typescript
// Example: EditEPHHoursModal.tsx
import { Colors } from '@/constants/colors'; // Adjust to your colors file
```

**✅ Checkpoint**: All components compile without errors.

---

## Phase 7: Integration with Existing Screens (30 minutes)

### Step 7.1: Add EPH Link to Accounts Screen

In your accounts index screen (e.g., `app/accounts/index.tsx`):

```typescript
import { router } from 'expo-router';
import { Package } from 'lucide-react-native';

// Add button/link to EPH
<TouchableOpacity 
  style={styles.menuButton}
  onPress={() => router.push('/eph-inbox')}
>
  <Package size={24} color="#3B82F6" />
  <Text style={styles.menuButtonText}>EPH Reports</Text>
  <Text style={styles.menuButtonSubtext}>Equipment/Plant Hours</Text>
</TouchableOpacity>
```

### Step 7.2: Integrate EPH Tab in Billing (Optional)

If you have a billing screen, add EPH tab using `PlantAssetsTimesheetsTab` component:

```typescript
// app/billing-config.tsx (or your billing screen)
import { PlantAssetsTimesheetsTab } from '@/components/accounts/PlantAssetsTimesheetsTab';

// Add EPH tab
<Tab name="EPH Processing">
  <PlantAssetsTimesheetsTab />
</Tab>
```

**✅ Checkpoint**: Can navigate to EPH from main menu.

---

## Phase 8: Testing (45 minutes)

### Step 8.1: Test EPH Report Creation

Create a test script:

```typescript
// test-eph-creation.ts
import { createEPHReport, determineAssetOwner } from '@/utils/ephReportManager';

const testCreateEPH = async () => {
  try {
    // Mock data
    const mockAsset = {
      assetId: 'test-asset-1',
      ownerType: 'subcontractor',
      ownerId: 'sub-123',
      ownerName: 'ABC Contractors',
      ownerEmail: 'abc@test.com'
    };

    const ownerInfo = determineAssetOwner(mockAsset);
    
    const reportId = await createEPHReport({
      ownerInfo,
      senderMasterAccountId: 'master-123',
      senderCompanyName: 'My Company',
      siteId: 'site-1',
      siteName: 'Test Site',
      dateRangeFrom: new Date('2024-01-01'),
      dateRangeTo: new Date('2024-01-31'),
      assetIds: ['test-asset-1'],
      totalHours: 160,
      totalCost: 50000,
      message: 'Test report',
      sentBy: 'admin-1'
    });

    console.log('✅ EPH Report created:', reportId);
    return reportId;
  } catch (error) {
    console.error('❌ EPH Report creation failed:', error);
    throw error;
  }
};

testCreateEPH();
```

### Step 8.2: Test EPH Inbox Loading

1. Navigate to `/eph-inbox`
2. Should show empty state if no reports
3. Create a test report using script above
4. Refresh - should see report in inbox

### Step 8.3: Test Email Sending (Mobile Only)

```typescript
import { sendEPHToSubcontractor } from '@/utils/ephEmailService';

const testEmail = async () => {
  await sendEPHToSubcontractor({
    recipientEmail: 'test@example.com',
    message: 'Please review',
    pdfUri: '/path/to/pdf', // You'll need actual PDF
    pdfFileName: 'test_eph.pdf',
    subcontractorName: 'Test Sub',
    dateRange: { from: new Date(), to: new Date() },
    assetCount: 1,
    totalHours: 8,
    companyName: 'My Company'
  });
};
```

### Step 8.4: Test Agreed Timesheet Creation

```typescript
import { agreePlantAssetTimesheet } from '@/utils/agreedTimesheetManager';

const testAgreement = async (timesheet: PlantAssetTimesheet) => {
  const agreedId = await agreePlantAssetTimesheet(
    timesheet,
    {
      agreedHours: timesheet.totalHours,
      agreedNotes: 'Approved for testing'
    },
    'admin-user-id',
    'admin_direct',
    'Admin'
  );
  
  console.log('✅ Agreed timesheet created:', agreedId);
};
```

### Step 8.5: Verify Firebase Data

Check Firebase Console:
- `ephReports` collection should have test report
- `agreedTimesheets` collection should have agreed timesheet
- All timestamps should be valid

**✅ Checkpoint**: All test operations complete successfully.

---

## Phase 9: Security Rules (15 minutes)

### Step 9.1: Add EPH Security Rules

Add to your `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // EPH Reports
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
    
    // EPH Pending Edits
    match /ephPendingEdits/{editId} {
      allow read, write: if request.auth != null && 
        resource.data.masterAccountId == request.auth.token.masterAccountId;
    }
    
    // Agreed Timesheets
    match /agreedTimesheets/{timesheetId} {
      allow read: if request.auth != null && 
        resource.data.masterAccountId == request.auth.token.masterAccountId;
      allow create, update: if request.auth != null && 
        request.resource.data.masterAccountId == request.auth.token.masterAccountId;
    }
  }
}
```

### Step 9.2: Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

**✅ Checkpoint**: Security rules deployed without errors.

---

## Phase 10: Production Checklist (10 minutes)

### Step 10.1: Final Verification

- [ ] All TypeScript errors resolved
- [ ] All Firebase indexes built and enabled
- [ ] Security rules deployed
- [ ] EPH routes registered in navigation
- [ ] Can create EPH report
- [ ] Can view EPH inbox
- [ ] Email composer opens (on mobile)
- [ ] Can agree timesheets
- [ ] agreedTimesheets collection populates correctly

### Step 10.2: Performance Optimization

```typescript
// Add to your app's initialization
import { enableIndexedDbPersistence } from 'firebase/firestore';

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser does not support offline persistence');
    }
  });
```

### Step 10.3: Monitoring Setup

Add logging to track EPH usage:

```typescript
// utils/ephReportManager.ts - add to createEPHReport
console.log('[EPH Analytics] Report created:', {
  reportId,
  recipientType: params.ownerInfo.recipientType,
  assetCount: params.assetIds.length,
  totalHours: params.totalHours,
  totalCost: params.totalCost
});
```

**✅ Checkpoint**: Ready for production!

---

## Troubleshooting Common Issues

### Issue 1: "Cannot find module '@/types/ephReport'"

**Solution**:
```bash
# Verify file exists
ls -la types/ephReport.ts

# Check tsconfig.json has path mapping
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Issue 2: "The query requires an index"

**Solution**:
1. Click the error link to auto-create index
2. OR manually add from `04_EPH_FIREBASE_INDEXES.md`
3. Wait for index to build

### Issue 3: Email composer not opening

**Solution**:
- Only works on mobile devices
- Web shows alert (expected behavior)
- Check `expo-mail-composer` is installed

### Issue 4: "Cannot read property 'masterAccountId' of undefined"

**Solution**:
- Ensure user is authenticated
- Check user object has `masterAccountId` field
- Add null checks in components

### Issue 5: Timesheets not showing in agreed collection

**Solution**:
- Check `agreePlantAssetTimesheet()` completes successfully
- Verify `status` is set to `'approved_for_billing'`
- Check Firebase Console for the document

---

## Next Steps After Implementation

### 1. User Training
- Document EPH workflow for users
- Create training videos
- Set up support channel

### 2. Advanced Features
- Add bulk EPH operations
- Implement automated EPH scheduling
- Add EPH analytics dashboard

### 3. Integration
- Connect to accounting software
- Add payment processing
- Implement invoice generation

---

## Support & Documentation

**Reference Documents**:
- `00_EPH_COMPLETE_FILE_LIST.md` - Complete file reference
- `01_EPH_SCREENS.md` - Screen implementations
- `02_EPH_UTILITIES.md` - Utility functions
- `03_EPH_TYPES.md` - Type definitions
- `04_EPH_FIREBASE_INDEXES.md` - Firebase indexes

**Original Documentation** (in Restore_EPH/docs/):
- `EPH-AGREEMENT-WORKFLOW-COMPLETE.md`
- `EPH-FIREBASE-INDEXES-REQUIRED.md`
- `BILLING-TIMESHEET-WORKFLOW-CLARIFICATION.md`

---

## Estimated Implementation Time

| Phase | Time | Complexity |
|-------|------|------------|
| Type Definitions | 15 min | Easy |
| Install Dependencies | 5 min | Easy |
| Copy Utilities | 30 min | Medium |
| Deploy Indexes | 20 min | Easy |
| Copy Screens | 15 min | Easy |
| Copy Components | 20 min | Medium |
| Integration | 30 min | Medium |
| Testing | 45 min | Medium |
| Security Rules | 15 min | Easy |
| Production Checklist | 10 min | Easy |
| **Total** | **~3 hours** | **Medium** |

*Plus index build time (5-60 minutes depending on data size)*

---

## Success Criteria

✅ **Implementation Complete When**:
1. EPH inbox screen loads without errors
2. Can create and view EPH reports
3. Email composer opens with report
4. Can agree timesheets
5. Agreed timesheets appear in billing
6. All Firebase indexes enabled
7. Security rules deployed
8. No TypeScript errors

🎉 **Congratulations! EPH system is now fully implemented.**
