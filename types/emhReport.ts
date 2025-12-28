export type EMHReportStatus = 'draft' | 'sent' | 'reviewed' | 'agreed' | 'disputed';

export type EMHRecipientType = 'subcontractor' | 'free_user';

export type LineItemDispute = {
  employeeId: string;
  timesheetId: string;
  date: string;
  disputeNotes: string;
  originalHours: number;
  disputedHours?: number;
  createdAt: any;
  createdBy: string;
};

export type EMHReport = {
  id?: string;
  reportId: string;
  status: EMHReportStatus;
  
  recipientType: EMHRecipientType;
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
  employeeIds: string[];
  totalEmployees: number;
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
