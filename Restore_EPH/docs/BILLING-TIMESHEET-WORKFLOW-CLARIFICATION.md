# EPH & Billing System Implementation Guide

> Complete implementation guide for replicating the EPH (Equipment/Plant Hours) and billing system with admin direct approval workflow.

---

## 📋 OVERVIEW

This guide covers the implementation of:
- **EPH Report Generation** with raw vs billable hours
- **Admin Direct Approval** (skip subcontractor digital workflow)
- **Subcontractor Digital Review Portal** 
- **Admin Edit Workflow** with pending edits
- **Version Comparison** (Operator → PM → Admin → Subcontractor)
- **Finalized Hours** for billing (source of truth)

---

## 🗂️ BATCH 1: Database Collections & Firestore Indexes

### New Collections to Create

#### 1. `ephPendingEdits` Collection
Stores admin/subcontractor edits that require review before finalization.

**Document Structure:**
```typescript
{
  id: string;                          // Auto-generated
  originalTimesheetId: string;         // Reference to verifiedTimesheet
  assetId: string;
  assetType: string;
  plantNumber?: string;
  date: string;                        // ISO date "YYYY-MM-DD"
  
  // Editor info
  editedBy: 'admin' | 'subcontractor';
  editedByUserId: string;
  editedByName: string;
  
  // Edited values
  totalHours: number;
  openHours: string;
  closeHours: string;
  isBreakdown: boolean;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isPublicHoliday: boolean;
  notes: string;
  
  // Original values (for comparison)
  originalTotalHours: number;
  originalOpenHours: string;
  originalCloseHours: string;
  
  // Status tracking
  status: 'pending_review' | 'reviewed' | 'superseded';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  
  // Isolation
  masterAccountId: string;
  siteId: string;
  subcontractorId: string;
  subcontractorName: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Required Indexes:**
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
}
```

#### 2. `ephReports` Collection
Tracks EPH report lifecycle from draft → sent → reviewed → finalized.

**Document Structure:**
```typescript
{
  id: string;                          // Auto-generated
  masterAccountId: string;
  siteId: string;
  subcontractorId: string;
  subcontractorName: string;
  
  // Date range
  startDate: string;                   // ISO date "YYYY-MM-DD"
  endDate: string;                     // ISO date "YYYY-MM-DD"
  
  // Status
  status: 'draft' | 'sent_to_subcontractor' | 'subcontractor_reviewed' | 'admin_finalized';
  
  // Asset records (array of EPHRecord)
  assetRecords: [{
    assetId: string;
    assetType: string;
    plantNumber?: string;
    registrationNumber?: string;
    rate: number;
    rateType: 'wet' | 'dry';
    normalHours: number;
    saturdayHours: number;
    sundayHours: number;
    publicHolidayHours: number;
    breakdownHours: number;
    rainDayHours: number;
    strikeDayHours: number;
    totalRawHours: number;
    totalBillableHours: number;
    estimatedCost: number;
    subcontractorDisputedHours?: number;
    adminFinalizedHours?: number;
    disputeNotes?: string;
    disputedAt?: string;
    disputedBy?: string;
  }];
  
  // Tracking
  createdAt: Timestamp;
  createdBy: string;
  sentAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  finalizedAt?: Timestamp;
  finalizedBy?: string;
  hasDisputes?: boolean;
}
```

**Required Indexes:**
```json
{
  "collectionGroup": "ephReports",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "subcontractorId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

#### 3. `agreedTimesheets` Collection (Enhancement)
Add new field for approval type tracking.

**Add to existing structure:**
```typescript
{
  // ... existing fields ...
  approvalType?: 'digital' | 'admin_direct';  // NEW FIELD
}
```

**Note:** This collection should already exist. Just add the `approvalType` field to track whether the admin directly approved or if it went through subcontractor digital workflow.

---

## 🗂️ BATCH 2: Utility Managers

### File 1: `utils/ephPendingEditsManager.ts`

**Purpose:** Manages pending edits from admin/subcontractor that require review.

**Key Functions:**
- `createPendingEdit()` - Creates new pending edit, supersedes old ones
- `getPendingEditsByAsset()` - Gets pending edits for specific asset/date
- `getAllPendingEditsByAssetId()` - Gets all pending edits for asset
- `supersedePendingEdit()` - Marks edit as superseded
- `reviewPendingEdit()` - Marks edit as reviewed

**Complete File Content:**
```typescript
import { collection, doc, setDoc, getDocs, query, where, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';

export type EPHPendingEdit = {
  id: string;
  originalTimesheetId: string;
  assetId: string;
  assetType: string;
  plantNumber?: string;
  date: string;
  editedBy: 'admin' | 'subcontractor';
  editedByUserId: string;
  editedByName: string;
  
  totalHours: number;
  openHours: string;
  closeHours: string;
  isBreakdown: boolean;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isPublicHoliday: boolean;
  notes: string;
  
  originalTotalHours: number;
  originalOpenHours: string;
  originalCloseHours: string;
  
  status: 'pending_review' | 'reviewed' | 'superseded';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  
  masterAccountId: string;
  siteId: string;
  subcontractorId: string;
  subcontractorName: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export async function createPendingEdit(params: {
  originalTimesheetId: string;
  assetId: string;
  assetType: string;
  plantNumber?: string;
  date: string;
  editedBy: 'admin' | 'subcontractor';
  editedByUserId: string;
  editedByName: string;
  totalHours: number;
  openHours: string;
  closeHours: string;
  isBreakdown: boolean;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isPublicHoliday: boolean;
  notes: string;
  originalTotalHours: number;
  originalOpenHours: string;
  originalCloseHours: string;
  masterAccountId: string;
  siteId: string;
  subcontractorId: string;
  subcontractorName: string;
}): Promise<string> {
  console.log('[ephPendingEditsManager] Creating pending edit for asset:', params.assetId);
  
  const existingEdits = await getPendingEditsByAsset(params.assetId, params.date, params.masterAccountId);
  for (const edit of existingEdits) {
    await supersedePendingEdit(edit.id);
  }
  
  const editRef = doc(collection(db, 'ephPendingEdits'));
  const editId = editRef.id;
  
  const editData: EPHPendingEdit = {
    ...params,
    id: editId,
    status: 'pending_review',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  await setDoc(editRef, editData);
  
  console.log('[ephPendingEditsManager] Pending edit created:', editId);
  return editId;
}

export async function getPendingEditsByAsset(
  assetId: string,
  date: string,
  masterAccountId: string
): Promise<EPHPendingEdit[]> {
  console.log('[ephPendingEditsManager] Fetching pending edits for asset:', assetId, 'date:', date);
  
  const q = query(
    collection(db, 'ephPendingEdits'),
    where('assetId', '==', assetId),
    where('date', '==', date),
    where('masterAccountId', '==', masterAccountId),
    where('status', '==', 'pending_review'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const edits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EPHPendingEdit);
  
  console.log('[ephPendingEditsManager] Found pending edits:', edits.length);
  return edits;
}

export async function getAllPendingEditsByAssetId(
  assetId: string,
  masterAccountId: string
): Promise<EPHPendingEdit[]> {
  console.log('[ephPendingEditsManager] Fetching all pending edits for asset:', assetId);
  
  const q = query(
    collection(db, 'ephPendingEdits'),
    where('assetId', '==', assetId),
    where('masterAccountId', '==', masterAccountId),
    where('status', '==', 'pending_review'),
    orderBy('date', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const edits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EPHPendingEdit);
  
  console.log('[ephPendingEditsManager] Found pending edits:', edits.length);
  return edits;
}

export async function supersedePendingEdit(editId: string): Promise<void> {
  console.log('[ephPendingEditsManager] Superseding pending edit:', editId);
  
  await updateDoc(doc(db, 'ephPendingEdits', editId), {
    status: 'superseded',
    updatedAt: Timestamp.now(),
  });
  
  console.log('[ephPendingEditsManager] Pending edit superseded');
}

export async function reviewPendingEdit(editId: string, reviewedBy: string): Promise<void> {
  console.log('[ephPendingEditsManager] Reviewing pending edit:', editId);
  
  await updateDoc(doc(db, 'ephPendingEdits', editId), {
    status: 'reviewed',
    reviewedBy,
    reviewedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  console.log('[ephPendingEditsManager] Pending edit reviewed');
}
```

---

### File 2: `utils/ephEmailService.ts`

**Purpose:** Handles email sending for EPH reports to subcontractors.

**Key Functions:**
- `sendEPHToSubcontractor()` - Sends EPH report via email with PDF attachment
- `sendAgreementConfirmationToSubcontractor()` - Sends confirmation email

**Complete File Content:**
```typescript
import * as MailComposer from 'expo-mail-composer';
import { Platform, Alert } from 'react-native';

export async function sendEPHToSubcontractor(params: {
  recipientEmail: string;
  message: string;
  pdfUri: string;
  pdfFileName: string;
  subcontractorName: string;
  dateRange: { from: Date; to: Date };
  assetCount: number;
  totalHours: number;
  companyName: string;
}): Promise<void> {
  console.log('[ephEmailService] Sending EPH to subcontractor:', params.recipientEmail);
  
  const { recipientEmail, message, pdfUri, pdfFileName, subcontractorName, dateRange, assetCount, totalHours, companyName } = params;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const subject = `EPH Report for Review - ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)} - ${subcontractorName}`;
  
  const body = `Dear ${subcontractorName},

Please find attached the Equipment/Plant Hours (EPH) report for the period ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}.

Assets Included: ${assetCount}
Total Hours: ${totalHours.toFixed(1)}h

${message ? `\n${message}\n\n` : ''}Please review the hours and respond with any corrections or approval.

Thank you,
${companyName}`;
  
  if (Platform.OS === 'web') {
    console.log('[ephEmailService] Web platform - opening email composer simulation');
    Alert.alert(
      'Email Composer',
      `Would open email to:\n${recipientEmail}\n\nSubject: ${subject}\n\nWith PDF attachment: ${pdfFileName}\n\nThis is a simulation on web. On mobile, this would open your email client.`,
      [{ text: 'OK' }]
    );
    return;
  }
  
  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Email composer not available on this device');
  }
  
  await MailComposer.composeAsync({
    recipients: [recipientEmail],
    subject,
    body,
    attachments: [pdfUri],
  });
  
  console.log('[ephEmailService] Email composer opened successfully');
}

export async function sendAgreementConfirmationToSubcontractor(params: {
  recipientEmail: string;
  subcontractorName: string;
  dateRange: { from: Date; to: Date };
  assetCount: number;
  totalHours: number;
  agreedBy: string;
  companyName: string;
}): Promise<void> {
  console.log('[ephEmailService] Sending agreement confirmation:', params.recipientEmail);
  
  const { recipientEmail, subcontractorName, dateRange, assetCount, totalHours, agreedBy, companyName } = params;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const subject = `EPH Agreement Confirmed - ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`;
  
  const body = `Dear ${subcontractorName},

This confirms that the Equipment/Plant Hours (EPH) report for the period ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)} has been finalized and agreed.

Assets: ${assetCount}
Total Hours: ${totalHours.toFixed(1)}h
Agreed By: ${agreedBy}
Date: ${formatDate(new Date())}

The agreed timesheets are now ready for payment processing.

Thank you,
${companyName}`;
  
  if (Platform.OS === 'web') {
    console.log('[ephEmailService] Web platform - showing confirmation');
    Alert.alert(
      'Agreement Confirmation',
      `Would send confirmation email to:\n${recipientEmail}\n\nSubject: ${subject}`,
      [{ text: 'OK' }]
    );
    return;
  }
  
  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    console.log('[ephEmailService] Email not available, skipping confirmation email');
    return;
  }
  
  await MailComposer.composeAsync({
    recipients: [recipientEmail],
    subject,
    body,
  });
  
  console.log('[ephEmailService] Confirmation email opened successfully');
}
```

---

### File 3: `utils/agreedTimesheetManager.ts` (Enhancement)

**Purpose:** Add `directApproveEPHTimesheets()` function for admin direct approval.

**New Function to Add:**
```typescript
export async function directApproveEPHTimesheets(
  timesheets: PlantAssetTimesheet[],
  agreedBy: string,
  adminNotes?: string
): Promise<string[]> {
  console.log('[agreedTimesheetManager] Direct approving', timesheets.length, 'timesheets');
  
  const agreedIds: string[] = [];
  
  for (const timesheet of timesheets) {
    const agreedId = await agreePlantAssetTimesheet(
      timesheet,
      {
        agreedHours: timesheet.totalHours,
        agreedNotes: adminNotes,
      },
      agreedBy,
      'admin_direct'  // This marks it as direct approval
    );
    agreedIds.push(agreedId);
  }
  
  console.log('[agreedTimesheetManager] Direct approved', agreedIds.length, 'timesheets');
  return agreedIds;
}
```

**Enhancement to existing `agreePlantAssetTimesheet()` function:**
```typescript
export async function agreePlantAssetTimesheet(
  originalTimesheet: PlantAssetTimesheet,
  agreedData: {
    agreedHours?: number;
    agreedNotes?: string;
  },
  agreedBy: string,
  approvalType?: 'digital' | 'admin_direct'  // ADD THIS PARAMETER
): Promise<string> {
  console.log('[agreedTimesheetManager] Creating agreed plant asset timesheet:', originalTimesheet.id, 'type:', approvalType || 'digital');

  // ... existing params creation ...

  const agreedTimesheetId = await createAgreedTimesheet(params);

  await updateDoc(doc(db, 'plantAssetTimesheets', originalTimesheet.id!), {
    agreedHours: agreedData.agreedHours,
    agreedNotes: agreedData.agreedNotes,
    hasAgreedHours: true,
    agreedTimesheetId,
    approvalType: approvalType || 'digital',  // ADD THIS LINE
    updatedAt: Timestamp.now(),
  });

  console.log('[agreedTimesheetManager] Plant asset timesheet agreed:', agreedTimesheetId);
  return agreedTimesheetId;
}
```

---

## 🗂️ BATCH 3: UI Components

### Component 1: `components/accounts/EditEPHHoursModal.tsx`

**Purpose:** Modal for admin to edit hours (creates pending edit for subcontractor review).

**Features:**
- Edit total hours, open/close times
- Toggle day conditions (breakdown, rain, strike, holiday)
- Add admin notes
- Shows plant manager's original values

**Key Props:**
```typescript
type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (editedValues: EditedValues) => Promise<void>;
  timesheet: TimesheetEntry | null;
};
```

**See file content in:** `components/accounts/EditEPHHoursModal.tsx` (from files read earlier)

---

### Component 2: `components/accounts/TimesheetComparisonModal.tsx`

**Purpose:** Modal to compare Plant Manager, Admin, and Subcontractor versions side-by-side.

**Features:**
- Shows all three versions with visual diff
- Highlights changed values
- Color-coded (PM = blue, Admin = yellow, Sub = light blue)
- Comparison arrows showing progression

**Key Props:**
```typescript
type Props = {
  visible: boolean;
  onClose: () => void;
  comparison: ComparisonData | null;
};
```

**See file content in:** `components/accounts/TimesheetComparisonModal.tsx` (from files read earlier)

---

### Component 3: `components/accounts/SendConfirmationModal.tsx` (Enhancement)

**Purpose:** Modal with TWO options: Send to subcontractor OR Direct approve (skip workflow).

**Features:**
- Option 1: Send for digital approval (email with PDF)
- Option 2: Direct approval button (admin finalizes immediately)
- Shows EPH summary (period, asset count)
- Email validation

**Key Props:**
```typescript
type Props = {
  visible: boolean;
  onClose: () => void;
  onSend: (recipientEmail: string, message: string) => Promise<void>;
  onDirectApprove?: () => Promise<void>;  // NEW: Direct approval handler
  subcontractorName: string;
  assetCount: number;
  dateRange: { from: Date; to: Date };
};
```

**Key Enhancement (Direct Approval Section):**
```tsx
<View style={styles.directApprovalBox}>
  <Text style={styles.directApprovalTitle}>Direct Approval (No Digital Workflow)</Text>
  <Text style={styles.directApprovalDescription}>
    If subcontractor does not have app access, you can approve directly and send PDF manually via email/WhatsApp.
  </Text>
  <TouchableOpacity
    style={styles.directApproveButton}
    onPress={handleDirectApprove}
    disabled={approving || sending}
  >
    <Text style={styles.directApproveButtonText}>Approve & Finalize</Text>
  </TouchableOpacity>
</View>
```

**See full file content in:** `components/accounts/SendConfirmationModal.tsx` (from files read earlier)

---

## 🗂️ BATCH 4: Main Billing Screen Enhancements

### File: `app/billing-config.tsx` (EPH Tab Section)

**Purpose:** Main billing screen with EPH report generation and management.

**Key Enhancements to EPH Tab:**

#### 1. EPH Card with Status Badges & Hours Display
```tsx
<View style={styles.ephCard}>
  {/* Status Badge */}
  {item.status && (
    <View style={[
      styles.statusBadge,
      item.status === 'draft' && styles.statusBadgeDraft,
      item.status === 'sent_to_subcontractor' && styles.statusBadgeSent,
      item.status === 'subcontractor_reviewed' && styles.statusBadgeReviewed,
      item.status === 'admin_finalized' && styles.statusBadgeFinalized,
    ]}>
      <Text style={styles.statusBadgeText}>
        {item.status === 'draft' ? 'Draft' :
         item.status === 'sent_to_subcontractor' ? 'Sent to Sub' :
         item.status === 'subcontractor_reviewed' ? 'Sub Reviewed' :
         'Finalized'}
      </Text>
    </View>
  )}
  
  {/* Pending Edits Badge */}
  {hasPendingEdits && (
    <View style={styles.pendingEditBadge}>
      <Text style={styles.pendingEditBadgeText}>Edits Pending</Text>
    </View>
  )}
  
  {/* Raw Hours vs Billable Hours */}
  <View style={styles.ephInfoRow}>
    <Text style={styles.ephTotalLabel}>Raw Hours (Operator/PM):</Text>
    <Text style={styles.ephTotalValue}>{item.totalRawHours.toFixed(2)}h</Text>
  </View>
  <View style={styles.ephInfoRow}>
    <Text style={styles.ephTotalLabel}>Billable Hours (Config):</Text>
    <Text style={styles.ephTotalValue}>{item.totalBillableHours.toFixed(2)}h</Text>
  </View>
  
  {/* Disputed/Finalized Hours */}
  {item.subcontractorDisputedHours !== undefined && (
    <View style={styles.ephInfoRow}>
      <Text style={styles.ephDisputedLabel}>Sub Disputed Hours:</Text>
      <Text style={styles.ephDisputedValue}>{item.subcontractorDisputedHours.toFixed(2)}h</Text>
    </View>
  )}
  {item.adminFinalizedHours !== undefined && (
    <View style={styles.ephInfoRow}>
      <Text style={styles.ephFinalizedLabel}>Admin Finalized Hours:</Text>
      <Text style={styles.ephFinalizedValue}>{item.adminFinalizedHours.toFixed(2)}h</Text>
    </View>
  )}
</View>
```

#### 2. Generate Buttons with Direct Approve
```tsx
<View style={styles.generateButtonsContainer}>
  {/* Generate All Button */}
  <TouchableOpacity
    style={[styles.generateButton, styles.generateButtonPrimary]}
    onPress={handleGenerateAllReport}
  >
    <FileText size={18} color="#ffffff" />
    <Text style={styles.generateButtonText}>Generate All</Text>
  </TouchableOpacity>
  
  {/* Generate Selected Button */}
  <TouchableOpacity
    style={[
      styles.generateButton,
      styles.generateButtonSecondary,
      selectedAssetIds.size === 0 && styles.generateButtonDisabled,
    ]}
    onPress={handleGenerateSelectedReport}
    disabled={selectedAssetIds.size === 0}
  >
    <CheckSquare size={18} color={selectedAssetIds.size === 0 ? "#94a3b8" : "#1e3a8a"} />
    <Text>Generate Selected ({selectedAssetIds.size})</Text>
  </TouchableOpacity>
  
  {/* Send to Subcontractor Button */}
  <TouchableOpacity
    style={[
      styles.generateButton,
      styles.sendToSubButton,
      selectedAssetIds.size === 0 && styles.generateButtonDisabled,
    ]}
    onPress={() => setSendModalVisible(true)}
    disabled={selectedAssetIds.size === 0}
  >
    <Send size={18} color={selectedAssetIds.size === 0 ? "#94a3b8" : "#10b981"} />
    <Text>Send to Subcontractor</Text>
  </TouchableOpacity>
</View>
```

#### 3. Edit Hours Handler (Creates Pending Edit)
```tsx
const handleEditHours = async (assetId: string) => {
  console.log('[EPH] Edit hours clicked for asset:', assetId);
  const timesheets = ephTimesheets.get(assetId);
  
  if (!timesheets || timesheets.length === 0) {
    Alert.alert('No Timesheets', 'No timesheets found for this asset.');
    return;
  }
  
  const asset = plantAssets.find(a => a.assetId === assetId);
  setSelectedTimesheetForEdit({
    ...timesheets[0],
    assetType: asset?.type,
    plantNumber: asset?.plantNumber || asset?.registrationNumber,
  });
  setEditModalVisible(true);
};

const handleSaveEdit = async (editedValues: any) => {
  if (!selectedTimesheetForEdit || !user) {
    console.error('[EPH] Missing timesheet or user');
    return;
  }
  
  try {
    const asset = plantAssets.find(a => a.assetId === selectedTimesheetForEdit.assetId);
    const subcontractor = subcontractors.find(s => s.id === selectedSubcontractor);
    
    // Creates pending edit (not finalized)
    await createPendingEdit({
      originalTimesheetId: selectedTimesheetForEdit.id,
      assetId: selectedTimesheetForEdit.assetId,
      assetType: asset?.type || 'Unknown',
      plantNumber: asset?.plantNumber || asset?.registrationNumber,
      date: selectedTimesheetForEdit.date,
      editedBy: 'admin',
      editedByUserId: user.userId || user.id || 'unknown',
      editedByName: user.name || 'Admin',
      totalHours: editedValues.totalHours,
      openHours: editedValues.openHours,
      closeHours: editedValues.closeHours,
      isBreakdown: editedValues.isBreakdown,
      isRainDay: editedValues.isRainDay,
      isStrikeDay: editedValues.isStrikeDay,
      isPublicHoliday: editedValues.isPublicHoliday,
      notes: editedValues.adminNotes,
      originalTotalHours: selectedTimesheetForEdit.totalHours || 0,
      originalOpenHours: selectedTimesheetForEdit.openHours || '00:00',
      originalCloseHours: selectedTimesheetForEdit.closeHours || '00:00',
      masterAccountId: user.masterAccountId || '',
      siteId: user.siteId || '',
      subcontractorId: selectedSubcontractor || '',
      subcontractorName: subcontractor?.name || 'Unknown',
    });
    
    Alert.alert('Success', 'Hours edited successfully. Changes are pending subcontractor review.');
    await loadPendingEdits();
  } catch (error) {
    console.error('[EPH] Error saving edit:', error);
    throw error;
  }
};
```

#### 4. Direct Approve Handler
```tsx
const handleDirectApproveEPH = async () => {
  if (!selectedSubcontractor || !user) {
    Alert.alert('Error', 'Missing subcontractor or user information');
    return;
  }
  
  console.log('[EPH] Direct approving EPH for selected assets');
  
  try {
    const selectedAssets = Array.from(selectedAssetIds).map(id => 
      ephData.find(record => record.assetId === id)
    ).filter(Boolean) as typeof ephData;
    
    if (selectedAssets.length === 0) {
      Alert.alert('Error', 'No assets selected');
      return;
    }
    
    const allTimesheets: any[] = [];
    for (const asset of selectedAssets) {
      const timesheets = ephTimesheets.get(asset.assetId) || [];
      const dedupedTimesheets = deduplicateTimesheetEntries(timesheets);
      allTimesheets.push(...dedupedTimesheets);
    }
    
    const agreedByIdentifier = user.userId || user.id || 'Admin';
    
    // Direct approve without subcontractor workflow
    await directApproveEPHTimesheets(
      allTimesheets,
      agreedByIdentifier,
      `Direct approval by admin - ${new Date().toLocaleDateString('en-GB')}`
    );
    
    Alert.alert(
      'Success', 
      `${selectedAssets.length} asset(s) approved and finalized. You can now generate PDF reports manually.`,
      [
        {
          text: 'OK',
          onPress: () => {
            if (selectedSubcontractor) {
              loadPlantAssets(selectedSubcontractor);
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error('[EPH] Error direct approving:', error);
    throw error;
  }
};
```

#### 5. Send to Subcontractor Handler
```tsx
const handleSendToSubcontractor = async (recipientEmail: string, message: string) => {
  if (!selectedSubcontractor || !user) {
    Alert.alert('Error', 'Missing subcontractor or user information');
    return;
  }
  
  try {
    const selectedAssets = Array.from(selectedAssetIds).map(id => 
      ephData.find(record => record.assetId === id)
    ).filter(Boolean) as typeof ephData;
    
    const totalHours = selectedAssets.reduce((sum, asset) => sum + asset.totalBillableHours, 0);
    const subcontractor = subcontractors.find(s => s.id === selectedSubcontractor);
    
    // Generate groups for PDF
    const groups = selectedAssets.map(record => {
      const timesheets = ephTimesheets.get(record.assetId) || [];
      const dedupedTimesheets = deduplicateTimesheetEntries(timesheets);
      
      return {
        key: record.assetId,
        title: record.assetType,
        subtitle: record.plantNumber || record.registrationNumber || record.assetId,
        entries: dedupedTimesheets.map(ts => ({
          // ... map timesheet data ...
        })),
        dateGroups: dedupedTimesheets.map(ts => ({
          // ... map date groups ...
        })),
      };
    });
    
    // Generate PDF
    const { uri, fileName } = await generateTimesheetPDF({
      groups,
      reportType: 'plant',
      subcontractorName: subcontractor?.name,
      dateRange: { from: startDate, to: endDate },
      selectedOnly: true,
      selectedGroups: new Set(selectedAssets.map(r => r.assetId)),
    });
    
    // Send via email
    await sendEPHToSubcontractor({
      recipientEmail,
      message,
      pdfUri: uri,
      pdfFileName: fileName,
      subcontractorName: subcontractor?.name || 'Unknown',
      dateRange: { from: startDate, to: endDate },
      assetCount: selectedAssets.length,
      totalHours,
      companyName: user.companyName || 'Your Company',
    });
    
    Alert.alert('Success', 'EPH report sent to subcontractor');
  } catch (error) {
    console.error('[EPH] Error sending to subcontractor:', error);
    throw error;
  }
};
```

#### 6. Wire Up Modal
```tsx
<SendConfirmationModal
  visible={sendModalVisible}
  onClose={() => setSendModalVisible(false)}
  onSend={handleSendToSubcontractor}
  onDirectApprove={handleDirectApproveEPH}  // Wire up direct approve
  subcontractorName={subcontractors.find(s => s.id === selectedSubcontractor)?.name || 'Unknown'}
  assetCount={selectedAssetIds.size}
  dateRange={{ from: startDate, to: endDate }}
/>
```

---

## 🗂️ BATCH 5: Subcontractor Review Screen

### File: `app/subcontractor-eph-review.tsx`

**Purpose:** Screen for subcontractor to review EPH and dispute hours.

**Features:**
- Shows raw vs billable hours for each asset
- Inline editing to dispute hours
- Add dispute reason/notes
- Submit disputed values back to admin
- Visual warnings for disputed items

**Key Functions:**
```tsx
const handleDisputeChange = (assetId: string, value: string) => {
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue >= 0) {
    setDisputedValues(prev => ({ ...prev, [assetId]: numValue }));
  }
};

const handleSubmitDispute = async () => {
  // Submits disputed values to ephReports collection
  const updatedRecords = ephRecords.map(record => {
    const disputedHours = disputedValues[record.assetId];
    const notes = disputeNotes[record.assetId];
    
    if (disputedHours !== undefined) {
      return {
        ...record,
        subcontractorDisputedHours: disputedHours,
        disputeNotes: notes || '',
        disputedAt: new Date().toISOString(),
        disputedBy: user?.userId || user?.id || 'unknown',
      };
    }
    return record;
  });

  await updateDoc(ephDocRef, {
    status: 'subcontractor_reviewed',
    assetRecords: updatedRecords,
    reviewedAt: new Date().toISOString(),
    reviewedBy: user?.userId || user?.id || 'unknown',
    hasDisputes: Object.keys(disputedValues).length > 0,
  });
};
```

**See full file content in:** `app/subcontractor-eph-review.tsx` (from files read earlier)

---

## 🗂️ BATCH 6: Types Enhancement

### File: `types/index.ts` (Add EPH Types)

**Add these types:**
```typescript
export type EPHRecord = {
  assetId: string;
  assetType: string;
  plantNumber?: string;
  registrationNumber?: string;
  rate: number;
  rateType: 'wet' | 'dry';
  normalHours: number;
  saturdayHours: number;
  sundayHours: number;
  publicHolidayHours: number;
  breakdownHours: number;
  rainDayHours: number;
  strikeDayHours: number;
  totalRawHours: number;
  totalBillableHours: number;
  estimatedCost: number;
  rawTimesheets: TimesheetEntry[];
  status?: 'draft' | 'sent_to_subcontractor' | 'subcontractor_reviewed' | 'admin_finalized';
  subcontractorDisputedHours?: number;
  adminFinalizedHours?: number;
};

export type TimesheetEntry = {
  id: string;
  date: string;
  dayOfWeek: string;
  openHours: string;
  closeHours: string;
  closingHours?: string;
  totalHours: number;
  operatorName: string;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isBreakdown: boolean;
  isPublicHoliday: boolean;
  notes?: string;
  operatorNotes?: string;
  additionalNotes?: string;
  adminNotes?: string;
  billingNotes?: string;
  verifiedAt?: string;
  hasOriginalEntry?: boolean;
  originalEntryData?: Partial<TimesheetEntry>;
  originalEntryId?: string;
  adjustedBy?: string;
  adjustedAt?: string;
  isAdjustment?: boolean;
  agreedByRole?: 'Admin' | 'Plant Manager' | 'Operator';
};
```

---

## 🗂️ BATCH 7: Testing & Verification

### Testing Checklist

#### Test 1: Direct Approval Flow (Skip Subcontractor)
1. ✅ Go to Billing Config → EPH Report tab
2. ✅ Select subcontractor and date range
3. ✅ Select assets using checkboxes
4. ✅ Click "Send to Subcontractor"
5. ✅ In modal, click "Approve & Finalize" button (direct approval)
6. ✅ Verify success message
7. ✅ Verify `agreedTimesheets` created with `approvalType: 'admin_direct'`
8. ✅ Verify asset status changed to finalized
9. ✅ Generate PDF and verify it includes finalized hours

#### Test 2: Digital Approval Flow (With Subcontractor)
1. ✅ Select assets and click "Send to Subcontractor"
2. ✅ Enter email and message
3. ✅ Click "Send for Approval"
4. ✅ Verify email composer opens with PDF attachment
5. ✅ (Subcontractor) Open EPH review screen
6. ✅ (Subcontractor) Review hours and dispute some
7. ✅ (Subcontractor) Add dispute notes and submit
8. ✅ (Admin) See "Edits Pending" badge on EPH cards
9. ✅ (Admin) Click "Compare" to see versions
10. ✅ (Admin) Finalize hours (creates agreedTimesheets with `approvalType: 'digital'`)

#### Test 3: Admin Edit Flow
1. ✅ Open EPH card details
2. ✅ Click "Edit Hours"
3. ✅ Change total hours and add admin notes
4. ✅ Click "Save Edits"
5. ✅ Verify pending edit created in `ephPendingEdits` collection
6. ✅ Verify "Edits Pending" badge appears
7. ✅ Click "Compare" to see PM vs Admin versions
8. ✅ Verify edit marked as `editedBy: 'admin'`

#### Test 4: Deduplication Logic
1. ✅ Create operator entry (5 hours)
2. ✅ Plant manager edits to 6 hours
3. ✅ Admin edits to 7 hours
4. ✅ Verify EPH shows 7 hours (highest priority)
5. ✅ Verify only one agreed timesheet created
6. ✅ Verify hierarchy: Admin > PM > Operator

#### Test 5: Raw vs Billable Hours Display
1. ✅ Verify "Raw Hours (Operator/PM)" shows actual worked hours
2. ✅ Verify "Billable Hours (Config)" shows calculated hours with config applied
3. ✅ Test rain day minimum billing
4. ✅ Test weekend minimum billing
5. ✅ Test breakdown hours calculation

---

## 📝 SUMMARY OF KEY CHANGES

### What This System Does:

1. **EPH Generation** - Creates Equipment/Plant Hours reports showing:
   - Raw hours (what operators/PM recorded)
   - Billable hours (after applying billing config)
   - Breakdown by day type (normal, saturday, sunday, holiday, rain, breakdown)

2. **Two Approval Paths:**
   - **Digital Path**: Send EPH to subcontractor → They review → Admin finalizes
   - **Direct Path**: Admin directly approves → Skip subcontractor workflow → Generate PDF manually

3. **Edit & Dispute Workflow:**
   - Admin can edit hours (creates pending edit)
   - Subcontractor can dispute hours (adds disputed values)
   - Comparison modal shows all versions side-by-side
   - Final admin approval creates `agreedTimesheets` (source of truth for billing)

4. **Status Tracking:**
   - Draft → Sent to Subcontractor → Subcontractor Reviewed → Admin Finalized
   - Visual badges show current status
   - "Edits Pending" badge when there are unresolved disputes

5. **Deduplication & Hierarchy:**
   - Admin edits > Plant Manager edits > Operator entries
   - Only highest priority entry used for billing
   - All versions visible in comparison modal

---

## 🎯 IMPLEMENTATION ORDER

1. **Start with Batch 1** - Set up database collections and indexes
2. **Then Batch 2** - Create utility managers
3. **Then Batch 3** - Build UI components
4. **Then Batch 4** - Enhance main billing screen
5. **Then Batch 5** - Create subcontractor review screen
6. **Then Batch 6** - Add TypeScript types
7. **Finally Batch 7** - Test everything

---

## ⚠️ IMPORTANT NOTES

- **Exclude subcontractor filtering** - You mentioned this works fine, so use existing plant asset query logic
- **Indexes are critical** - Must create Firestore indexes or queries will fail
- **Direct approval is optional** - The `onDirectApprove` prop in `SendConfirmationModal` is optional
- **Pending edits are NOT finalized** - They're for tracking disputes only
- **agreedTimesheets is source of truth** - Only use this for billing calculations
- **Role hierarchy matters** - Admin > PM > Operator for deduplication

---

## 📚 ADDITIONAL RESOURCES

- **Deduplication Function**: See `deduplicateTimesheetEntries()` in `billing-config.tsx` lines 386-436
- **PDF Generation**: See `handleGeneratePDFReport()` in `billing-config.tsx` lines 1046-1222
- **Comparison Logic**: See `TimesheetComparisonModal.tsx` for version comparison UI
- **Email Service**: See `ephEmailService.ts` for email templates and sending logic

---

## ✅ COMPLETION CHECKLIST

- [ ] Batch 1: Database collections created
- [ ] Batch 1: Firestore indexes created
- [ ] Batch 2: `ephPendingEditsManager.ts` created
- [ ] Batch 2: `ephEmailService.ts` created
- [ ] Batch 2: `agreedTimesheetManager.ts` enhanced with `directApproveEPHTimesheets()`
- [ ] Batch 3: `EditEPHHoursModal.tsx` created
- [ ] Batch 3: `TimesheetComparisonModal.tsx` created
- [ ] Batch 3: `SendConfirmationModal.tsx` enhanced with direct approve
- [ ] Batch 4: `billing-config.tsx` EPH tab enhanced
- [ ] Batch 4: Status badges added to EPH cards
- [ ] Batch 4: Raw vs Billable hours display added
- [ ] Batch 4: Edit hours handler wired up
- [ ] Batch 4: Direct approve handler wired up
- [ ] Batch 4: Send to subcontractor handler wired up
- [ ] Batch 5: `subcontractor-eph-review.tsx` created
- [ ] Batch 6: Types added to `types/index.ts`
- [ ] Batch 7: All tests passed

---

**END OF IMPLEMENTATION GUIDE**
