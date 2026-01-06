import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

type SendDieselReportParams = {
  recipientEmail: string;
  recipientName: string;
  message: string;
  pdfUri: string;
  pdfFileName: string;
  dateRange: { from: Date; to: Date };
  totalFuel: number;
  entryCount: number;
  companyName: string;
  siteId: string;
  siteName: string;
  masterAccountId: string;
  companyId: string;
};

type ShareDieselReportParams = {
  pdfUri: string;
  fileName: string;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export async function sendDieselReportToSubcontractor(params: SendDieselReportParams): Promise<void> {
  console.log('[DieselReportEmail] Sending diesel report to:', params.recipientEmail);

  const {
    recipientEmail,
    recipientName,
    message,
    pdfUri,
    pdfFileName,
    dateRange,
    totalFuel,
    entryCount,
    companyName,
    siteId,
    siteName,
    masterAccountId,
    companyId,
  } = params;

  const subject = `Diesel Log Report - ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)} - ${recipientName}`;

  const body = `Dear ${recipientName},

Please find attached the Diesel / Fuel Log Report for the period ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}.

Report Summary:
• Total Entries: ${entryCount}
• Total Fuel: ${totalFuel.toFixed(2)} L
• Site: ${siteName}

${message ? `\n${message}\n\n` : ''}Please review the fuel logs and contact us if you have any questions or concerns.

Thank you,
${companyName}`;

  if (Platform.OS === 'web') {
    console.log('[DieselReportEmail] Web platform - opening email composer simulation');
    Alert.alert(
      'Email Composer',
      `Would open email to:\n${recipientEmail}\n\nSubject: ${subject}\n\nWith PDF attachment: ${pdfFileName}\n\nThis is a simulation on web. On mobile, this would open your email client.`,
      [{ text: 'OK' }]
    );
    
    await logDieselReportSent({
      recipientEmail,
      recipientName,
      dateRange,
      totalFuel,
      entryCount,
      siteId,
      siteName,
      masterAccountId,
      companyId,
    });
    
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

  await logDieselReportSent({
    recipientEmail,
    recipientName,
    dateRange,
    totalFuel,
    entryCount,
    siteId,
    siteName,
    masterAccountId,
    companyId,
  });

  console.log('[DieselReportEmail] Email composer opened successfully');
}

export async function shareDieselReportPDF(params: ShareDieselReportParams): Promise<void> {
  console.log('[DieselReportEmail] Sharing diesel report PDF');

  const { pdfUri, fileName } = params;

  if (Platform.OS === 'web') {
    console.log('[DieselReportEmail] Web platform - download simulation');
    Alert.alert(
      'Share PDF',
      `Would download PDF: ${fileName}\n\nThis is a simulation on web. On mobile, this would open the system share sheet.`,
      [{ text: 'OK' }]
    );
    return;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing not available on this device');
  }

  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Diesel Report',
    UTI: 'com.adobe.pdf',
  });

  console.log('[DieselReportEmail] PDF shared successfully');
}

async function logDieselReportSent(params: {
  recipientEmail: string;
  recipientName: string;
  dateRange: { from: Date; to: Date };
  totalFuel: number;
  entryCount: number;
  siteId: string;
  siteName: string;
  masterAccountId: string;
  companyId: string;
}): Promise<void> {
  try {
    console.log('[DieselReportEmail] Logging diesel report sent to Firestore');

    await addDoc(collection(db, 'dieselReportsSent'), {
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      dateRangeFrom: params.dateRange.from.toISOString().split('T')[0],
      dateRangeTo: params.dateRange.to.toISOString().split('T')[0],
      totalFuel: params.totalFuel,
      entryCount: params.entryCount,
      siteId: params.siteId,
      siteName: params.siteName,
      masterAccountId: params.masterAccountId,
      companyId: params.companyId,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    console.log('[DieselReportEmail] Diesel report log saved successfully');
  } catch (error) {
    console.error('[DieselReportEmail] Error logging diesel report:', error);
  }
}
