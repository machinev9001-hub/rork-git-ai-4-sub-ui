# EPH Utilities - Complete Code

This document contains all EPH-related utility functions with full implementation code.

---

## Overview

EPH utilities handle:
1. **EPH Report Management** - Creating and managing EPH reports
2. **Email Services** - Sending EPH reports and confirmations
3. **Pending Edits** - Tracking subcontractor/admin edits before agreement
4. **Agreed Timesheets** - Managing approved timesheets
5. **Billable Hours Calculation** - Complex billing logic
6. **Timesheet Export** - CSV export functionality
7. **PDF Generation** - Report PDF creation
8. **Export Handler** - Large data export management

---

## 1. EPH Report Manager

**File Path**: `utils/ephReportManager.ts`

**Purpose**: Core EPH report management - create, retrieve, approve, dispute reports

**Key Functions**:
- `determineAssetOwner()` - Identifies asset owner (subcontractor/free user)
- `createEPHReport()` - Creates new EPH report
- `getEPHReportsForRecipient()` - Gets reports for recipient
- `getEPHReportsForSender()` - Gets reports sent by sender
- `approveEPHReport()` - Approves report
- `disputeEPHReport()` - Disputes report with notes

**Firebase Collections Used**:
- `ephReports` - Main EPH reports collection

```typescript
import { collection, doc, setDoc, getDocs, getDoc, query, where, orderBy, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { EPHReport, EPHRecipientType, LineItemDispute } from '@/types/ephReport';
import { PlantAsset } from '@/types';

export type AssetOwnerInfo = {
  recipientType: EPHRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientMasterAccountId?: string;
};

export function determineAssetOwner(asset: PlantAsset): AssetOwnerInfo {
  console.log('[ephReportManager] Determining owner for asset:', asset.assetId, {
    ownerType: asset.ownerType,
    ownerId: asset.ownerId,
    ownerMasterAccountId: asset.ownerMasterAccountId,
    ownerName: asset.ownerName,
  });

  if (asset.ownerType === 'subcontractor' && asset.ownerId) {
    return {
      recipientType: 'subcontractor',
      recipientId: asset.ownerId,
      recipientName: asset.ownerName || 'Unknown Subcontractor',
      recipientEmail: asset.ownerEmail,
    };
  }
  
  if (asset.ownerType === 'company' && asset.ownerMasterAccountId) {
    return {
      recipientType: 'free_user',
      recipientId: asset.ownerMasterAccountId,
      recipientName: asset.ownerName || asset.ownerContactName || 'Free User',
      recipientEmail: asset.ownerEmail,
      recipientMasterAccountId: asset.ownerMasterAccountId,
    };
  }
  
  throw new Error(`Cannot determine asset owner for ${asset.assetId}. Missing ownerId or ownerMasterAccountId.`);
}

export async function createEPHReport(params: {
  ownerInfo: AssetOwnerInfo;
  senderMasterAccountId: string;
  senderCompanyName: string;
  siteId: string;
  siteName?: string;
  dateRangeFrom: Date;
  dateRangeTo: Date;
  assetIds: string[];
  totalHours: number;
  totalCost: number;
  message?: string;
  pdfUrl?: string;
  sentBy: string;
}): Promise<string> {
  console.log('[ephReportManager] Creating EPH report:', {
    recipientType: params.ownerInfo.recipientType,
    recipientId: params.ownerInfo.recipientId,
    assetCount: params.assetIds.length,
  });

  const reportRef = doc(collection(db, 'ephReports'));
  const reportId = `EPH-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  const reportData: EPHReport = {
    id: reportRef.id,
    reportId,
    status: 'sent',
    recipientType: params.ownerInfo.recipientType,
    recipientId: params.ownerInfo.recipientId,
    recipientName: params.ownerInfo.recipientName,
    recipientEmail: params.ownerInfo.recipientEmail,
    recipientMasterAccountId: params.ownerInfo.recipientMasterAccountId,
    senderMasterAccountId: params.senderMasterAccountId,
    senderCompanyName: params.senderCompanyName,
    siteId: params.siteId,
    siteName: params.siteName,
    dateRangeFrom: params.dateRangeFrom.toISOString().split('T')[0],
    dateRangeTo: params.dateRangeTo.toISOString().split('T')[0],
    assetIds: params.assetIds,
    totalAssets: params.assetIds.length,
    totalHours: params.totalHours,
    totalCost: params.totalCost,
    message: params.message,
    pdfUrl: params.pdfUrl,
    sentAt: Timestamp.now(),
    sentBy: params.sentBy,
    createdAt: Timestamp.now(),
  };
  
  await setDoc(reportRef, reportData);
  
  console.log('[ephReportManager] EPH report created:', reportRef.id);
  return reportRef.id;
}

export async function getEPHReportsForRecipient(
  recipientMasterAccountId: string,
  status?: EPHReport['status']
): Promise<EPHReport[]> {
  console.log('[ephReportManager] Fetching EPH reports for recipient:', recipientMasterAccountId);

  let q = query(
    collection(db, 'ephReports'),
    where('recipientMasterAccountId', '==', recipientMasterAccountId),
    orderBy('createdAt', 'desc')
  );

  if (status) {
    q = query(
      collection(db, 'ephReports'),
      where('recipientMasterAccountId', '==', recipientMasterAccountId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EPHReport));
  
  console.log('[ephReportManager] Found', reports.length, 'EPH reports');
  return reports;
}

export async function getEPHReportsForSender(
  senderMasterAccountId: string,
  status?: EPHReport['status']
): Promise<EPHReport[]> {
  console.log('[ephReportManager] Fetching EPH reports for sender:', senderMasterAccountId);

  let q = query(
    collection(db, 'ephReports'),
    where('senderMasterAccountId', '==', senderMasterAccountId),
    orderBy('sentAt', 'desc')
  );

  if (status) {
    q = query(
      collection(db, 'ephReports'),
      where('senderMasterAccountId', '==', senderMasterAccountId),
      where('status', '==', status),
      orderBy('sentAt', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EPHReport));
  
  console.log('[ephReportManager] Found', reports.length, 'EPH reports');
  return reports;
}

export async function approveEPHReport(
  reportId: string,
  userId: string
): Promise<void> {
  console.log('[ephReportManager] Approving EPH report:', reportId);

  await updateDoc(doc(db, 'ephReports', reportId), {
    status: 'agreed',
    reviewedAt: Timestamp.now(),
    reviewedBy: userId,
    agreedAt: Timestamp.now(),
    agreedBy: userId,
    updatedAt: Timestamp.now(),
  });

  console.log('[ephReportManager] EPH report approved');
}

export async function disputeEPHReport(
  reportId: string,
  userId: string,
  notes: string,
  lineItemDisputes?: LineItemDispute[]
): Promise<void> {
  console.log('[ephReportManager] Disputing EPH report:', reportId);

  await updateDoc(doc(db, 'ephReports', reportId), {
    status: 'disputed',
    reviewedAt: Timestamp.now(),
    reviewedBy: userId,
    disputeNotes: notes,
    lineItemDisputes: lineItemDisputes || [],
    updatedAt: Timestamp.now(),
  });

  console.log('[ephReportManager] EPH report disputed');
}

export async function getEPHReportDetails(
  reportId: string
): Promise<EPHReport | null> {
  console.log('[ephReportManager] Fetching EPH report details:', reportId);

  const docRef = doc(db, 'ephReports', reportId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    console.log('[ephReportManager] Report not found');
    return null;
  }

  return { id: snapshot.id, ...snapshot.data() } as EPHReport;
}

export async function markEPHAsReviewed(
  reportId: string,
  userId: string
): Promise<void> {
  console.log('[ephReportManager] Marking EPH as reviewed:', reportId);

  await updateDoc(doc(db, 'ephReports', reportId), {
    status: 'reviewed',
    reviewedAt: Timestamp.now(),
    reviewedBy: userId,
    updatedAt: Timestamp.now(),
  });

  console.log('[ephReportManager] EPH report marked as reviewed');
}
```

---

## 2. EPH Email Service

**File Path**: `utils/ephEmailService.ts`

**Purpose**: Send EPH reports and agreement confirmations via email

**Dependencies**: `expo-mail-composer`

**Key Functions**:
- `sendEPHToSubcontractor()` - Send EPH report with PDF attachment
- `sendAgreementConfirmationToSubcontractor()` - Send agreement confirmation

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

## 3. EPH Pending Edits Manager

**File Path**: `utils/ephPendingEditsManager.ts`

**Purpose**: Track pending edits from subcontractors/admins before final agreement

**Firebase Collections Used**:
- `ephPendingEdits` - Pending timesheet edits

**Key Functions**:
- `createPendingEdit()` - Create new pending edit
- `getPendingEditsByAsset()` - Get pending edits for specific asset/date
- `getAllPendingEditsByAssetId()` - Get all pending edits for asset
- `supersedePendingEdit()` - Mark edit as superseded
- `reviewPendingEdit()` - Mark edit as reviewed

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

## Dependencies Summary

**NPM Packages Required**:
- `firebase` - Firestore database
- `expo-mail-composer` - Email functionality
- `expo-print` - PDF generation (used in timesheetPdfGenerator)
- `expo-sharing` - File sharing (used in timesheetPdfGenerator)

**Internal Dependencies**:
- `@/config/firebase` - Firebase configuration
- `@/types` - Type definitions
- `@/types/ephReport` - EPH-specific types

---

## Next Steps

Continue to next batch for:
- Agreed Timesheet Manager (more complex)
- Billable Hours Calculator
- Timesheet Export
- PDF Generator
- Export Handler

These files are larger and contain complex billing logic.
