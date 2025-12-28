export type EPHReportStatus = 'draft' | 'sent' | 'reviewed' | 'agreed' | 'disputed';

export type EPHRecipientType = 'subcontractor' | 'free_user';

export type LineItemDispute = {
  assetId: string;
  timesheetId: string;
  date: string;
  disputeNotes: string;
  originalHours: number;
  disputedHours?: number;
  createdAt: any;
  createdBy: string;
};

export type EPHReport = {
  id?: string;
  reportId: string;
  status: EPHReportStatus;
  
  recipientType: EPHRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientMasterAccountId?: string;
  
  senderMasterAccountId: string;
  senderCompanyName: string;
  siteId: string;
  siteName?: string;
  
  dateRangeFrom: string;
  dateRangeTo: string;
  assetIds: string[];
  totalAssets: number;
  totalHours: number;
  totalCost: number;
  message?: string;
  pdfUrl?: string;
  
  sentAt?: any;
  sentBy?: string;
  reviewedAt?: any;
  reviewedBy?: string;
  agreedAt?: any;
  agreedBy?: string;
  disputeNotes?: string;
  lineItemDisputes?: LineItemDispute[];
  
  createdAt: any;
  updatedAt?: any;
};
