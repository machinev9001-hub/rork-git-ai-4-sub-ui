import { collection, doc, setDoc, getDocs, getDoc, query, where, orderBy, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { EMHReport, EMHRecipientType, LineItemDispute } from '@/types/emhReport';
import { Employee } from '@/types';

export type EmployeeOwnerInfo = {
  recipientType: EMHRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientMasterAccountId?: string;
};

export function determineEmployeeOwner(employee: Employee, subcontractorMasterAccountId?: string, subcontractorEmail?: string): EmployeeOwnerInfo {
  console.log('[emhReportManager] Determining owner for employee:', employee.id, {
    employerType: employee.employerType,
    employerId: employee.employerId,
    employerName: employee.employerName,
    subcontractorMasterAccountId,
  });

  if (employee.employerType === 'subcontractor' && employee.employerId) {
    if (subcontractorMasterAccountId) {
      return {
        recipientType: 'free_user',
        recipientId: subcontractorMasterAccountId,
        recipientName: employee.employerName || 'Free User',
        recipientEmail: subcontractorEmail,
        recipientMasterAccountId: subcontractorMasterAccountId,
      };
    }
    
    return {
      recipientType: 'subcontractor',
      recipientId: employee.employerId,
      recipientName: employee.employerName || 'Unknown Subcontractor',
      recipientEmail: subcontractorEmail,
    };
  }
  
  throw new Error(`Cannot determine employee owner for ${employee.id}. Missing employerId or invalid employerType.`);
}

export async function createEMHReport(params: {
  ownerInfo: EmployeeOwnerInfo;
  senderMasterAccountId: string;
  senderCompanyName: string;
  siteId: string;
  siteName?: string;
  dateRangeFrom: Date;
  dateRangeTo: Date;
  employeeIds: string[];
  totalHours: number;
  totalCost: number;
  message?: string;
  pdfUrl?: string;
  sentBy: string;
}): Promise<string> {
  console.log('[emhReportManager] Creating EMH report:', {
    recipientType: params.ownerInfo.recipientType,
    recipientId: params.ownerInfo.recipientId,
    employeeCount: params.employeeIds.length,
  });

  const reportRef = doc(collection(db, 'emhReports'));
  const reportId = `EMH-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  const reportData: EMHReport = {
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
    employeeIds: params.employeeIds,
    totalEmployees: params.employeeIds.length,
    totalHours: params.totalHours,
    totalCost: params.totalCost,
    message: params.message,
    pdfUrl: params.pdfUrl,
    sentAt: Timestamp.now(),
    sentBy: params.sentBy,
    createdAt: Timestamp.now(),
  };
  
  await setDoc(reportRef, reportData);
  
  console.log('[emhReportManager] EMH report created:', reportRef.id);
  return reportRef.id;
}

export async function getEMHReportsForRecipient(
  recipientMasterAccountId: string,
  status?: EMHReport['status']
): Promise<EMHReport[]> {
  console.log('[emhReportManager] Fetching EMH reports for recipient:', recipientMasterAccountId);

  let q = query(
    collection(db, 'emhReports'),
    where('recipientMasterAccountId', '==', recipientMasterAccountId),
    orderBy('createdAt', 'desc')
  );

  if (status) {
    q = query(
      collection(db, 'emhReports'),
      where('recipientMasterAccountId', '==', recipientMasterAccountId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EMHReport));
  
  console.log('[emhReportManager] Found', reports.length, 'EMH reports');
  return reports;
}

export async function getEMHReportsForSender(
  senderMasterAccountId: string,
  status?: EMHReport['status']
): Promise<EMHReport[]> {
  console.log('[emhReportManager] Fetching EMH reports for sender:', senderMasterAccountId);

  let q = query(
    collection(db, 'emhReports'),
    where('senderMasterAccountId', '==', senderMasterAccountId),
    orderBy('sentAt', 'desc')
  );

  if (status) {
    q = query(
      collection(db, 'emhReports'),
      where('senderMasterAccountId', '==', senderMasterAccountId),
      where('status', '==', status),
      orderBy('sentAt', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EMHReport));
  
  console.log('[emhReportManager] Found', reports.length, 'EMH reports');
  return reports;
}

export async function approveEMHReport(
  reportId: string,
  userId: string
): Promise<void> {
  console.log('[emhReportManager] Approving EMH report:', reportId);

  await updateDoc(doc(db, 'emhReports', reportId), {
    status: 'agreed',
    reviewedAt: Timestamp.now(),
    reviewedBy: userId,
    agreedAt: Timestamp.now(),
    agreedBy: userId,
    updatedAt: Timestamp.now(),
  });

  console.log('[emhReportManager] EMH report approved');
}

export async function disputeEMHReport(
  reportId: string,
  userId: string,
  notes: string,
  lineItemDisputes?: LineItemDispute[]
): Promise<void> {
  console.log('[emhReportManager] Disputing EMH report:', reportId);

  await updateDoc(doc(db, 'emhReports', reportId), {
    status: 'disputed',
    reviewedAt: Timestamp.now(),
    reviewedBy: userId,
    disputeNotes: notes,
    lineItemDisputes: lineItemDisputes || [],
    updatedAt: Timestamp.now(),
  });

  console.log('[emhReportManager] EMH report disputed');
}

export async function getEMHReportDetails(
  reportId: string
): Promise<EMHReport | null> {
  console.log('[emhReportManager] Fetching EMH report details:', reportId);

  const docRef = doc(db, 'emhReports', reportId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    console.log('[emhReportManager] Report not found');
    return null;
  }

  return { id: snapshot.id, ...snapshot.data() } as EMHReport;
}

export async function markEMHAsReviewed(
  reportId: string,
  userId: string
): Promise<void> {
  console.log('[emhReportManager] Marking EMH as reviewed:', reportId);

  await updateDoc(doc(db, 'emhReports', reportId), {
    status: 'reviewed',
    reviewedAt: Timestamp.now(),
    reviewedBy: userId,
    updatedAt: Timestamp.now(),
  });

  console.log('[emhReportManager] EMH report marked as reviewed');
}
