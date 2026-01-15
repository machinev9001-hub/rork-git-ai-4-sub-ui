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
