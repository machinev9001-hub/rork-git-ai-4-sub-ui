# EPH Types - Complete Type Definitions

This document contains all TypeScript type definitions used in the EPH system.

---

## 1. EPH Report Types

**File Path**: `types/ephReport.ts`

**Purpose**: Core EPH report type definitions

```typescript
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
  
  // Recipient info
  recipientType: EPHRecipientType;
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
  
  // Status tracking
  sentAt?: any;
  sentBy?: string;
  reviewedAt?: any;
  reviewedBy?: string;
  agreedAt?: any;
  agreedBy?: string;
  disputeNotes?: string;
  lineItemDisputes?: LineItemDispute[];
  
  // Metadata
  createdAt: any;
  updatedAt?: any;
};
```

---

## 2. EMH Report Types

**File Path**: `types/emhReport.ts`

**Purpose**: Employee Man Hours report types (similar structure to EPH)

```typescript
export type EMHReportStatus = 'draft' | 'sent' | 'reviewed' | 'agreed' | 'disputed';

export type EMHRecipientType = 'subcontractor' | 'free_user';

export type EMHLineItemDispute = {
  operatorId: string;
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
  operatorIds: string[];
  totalOperators: number;
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
  lineItemDisputes?: EMHLineItemDispute[];
  
  createdAt: any;
  updatedAt?: any;
};
```

---

## 3. Agreed Timesheet Types

**File Path**: `types/index.ts` (excerpt - AgreedTimesheet type)

**Purpose**: Type for approved timesheets ready for billing

```typescript
export type AgreedTimesheet = {
  id: string;
  originalTimesheetId: string;
  timesheetType: 'operator' | 'plant_asset';
  
  // Date and identification
  date: string;
  operatorId?: string;
  operatorName?: string;
  assetId?: string;
  assetType?: string;
  
  // Hours data
  originalHours: number;
  agreedHours: number;
  billableHours?: number;
  billingRule?: string;
  hoursDifference: number;
  
  // Breakdown for operator timesheets
  agreedNormalHours?: number;
  agreedOvertimeHours?: number;
  agreedSundayHours?: number;
  agreedPublicHolidayHours?: number;
  originalNormalHours?: number;
  originalOvertimeHours?: number;
  originalSundayHours?: number;
  originalPublicHolidayHours?: number;
  
  // Meter readings (for plant assets)
  originalOpenHours?: number;
  originalCloseHours?: number;
  
  // Day conditions
  isBreakdown?: boolean;
  isRainDay?: boolean;
  isInclementWeather?: boolean;
  isPublicHoliday?: boolean;
  
  // Notes
  originalNotes?: string;
  adminNotes?: string;
  
  // Location
  siteId?: string;
  siteName?: string;
  masterAccountId: string;
  companyId?: string;
  
  // Subcontractor info (if applicable)
  subcontractorId?: string;
  subcontractorName?: string;
  
  // Status and approval
  status: 'approved_for_billing' | 'billed' | 'disputed';
  agreedAt: any;
  agreedBy: string;
  agreedByRole?: 'Operator' | 'Plant Manager' | 'Admin';
  approvedForBillingAt?: any;
  approvedForBillingBy?: string;
  billedAt?: any;
  
  // Metadata
  createdAt: any;
  updatedAt: any;
};
```

---

## 4. Plant Asset Timesheet Types

**File Path**: `types/index.ts` (excerpt)

**Purpose**: Original timesheet data from plant managers

```typescript
export type PlantAssetTimesheet = {
  id?: string;
  assetId: string;
  assetType: string;
  plantNumber?: string;
  registrationNumber?: string;
  
  date: string;
  operatorId: string;
  operatorName: string;
  
  // Hour meter readings
  openHours: number | string;
  closeHours: number | string;
  totalHours: number;
  
  // Conditions
  logBreakdown: boolean;
  inclementWeather: boolean;
  isBreakdown?: boolean;
  isRainDay?: boolean;
  isStrikeDay?: boolean;
  isPublicHoliday?: boolean;
  
  // Location
  siteId: string;
  siteName?: string;
  location?: string;
  
  // Owner info
  ownerId?: string;
  ownerType?: 'company' | 'subcontractor';
  ownerName?: string;
  ownerEmail?: string;
  ownerMasterAccountId?: string;
  ownerContactName?: string;
  
  // Notes
  notes?: string;
  adminNotes?: string;
  billingNotes?: string;
  
  // Agreement tracking
  hasAgreedHours?: boolean;
  agreedHours?: number;
  agreedNotes?: string;
  agreedTimesheetId?: string;
  approvalType?: 'digital' | 'admin_direct';
  
  // Status
  verified?: boolean;
  verifiedAt?: any;
  verifiedBy?: string;
  
  // Metadata
  masterAccountId: string;
  companyId: string;
  createdAt: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
};
```

---

## 5. Operator Timesheet Types

**File Path**: `types/index.ts` (excerpt)

**Purpose**: Man hours timesheet data

```typescript
export type OperatorTimesheet = {
  id?: string;
  operatorId: string;
  operatorName: string;
  
  date: string;
  startTime: string;
  stopTime: string;
  lunchBreak: boolean;
  noLunchBreak?: boolean;
  
  // Hours breakdown
  totalManHours: number;
  normalHours?: number;
  overtimeHours?: number;
  sundayHours?: number;
  publicHolidayHours?: number;
  
  // Agreement tracking
  hasAgreedHours?: boolean;
  agreedNormalHours?: number;
  agreedOvertimeHours?: number;
  agreedSundayHours?: number;
  agreedPublicHolidayHours?: number;
  agreedNotes?: string;
  agreedTimesheetId?: string;
  
  // Location
  siteId: string;
  siteName?: string;
  
  // Notes
  notes?: string;
  
  // Status
  status?: 'draft' | 'submitted' | 'verified';
  verified?: boolean;
  verifiedAt?: any;
  verifiedBy?: string;
  
  // Metadata
  masterAccountId: string;
  companyId: string;
  createdAt: any;
  updatedAt?: any;
};
```

---

## 6. Plant Asset Types

**File Path**: `types/index.ts` (excerpt)

**Purpose**: Plant asset master data

```typescript
export type PlantAsset = {
  assetId: string;
  assetType: string;
  plantNumber?: string;
  registrationNumber?: string;
  
  // Current allocation
  currentSiteId?: string;
  currentSiteName?: string;
  currentOperatorId?: string;
  currentOperatorName?: string;
  
  // Owner info - CRITICAL for EPH
  ownerId?: string;
  ownerType?: 'company' | 'subcontractor';
  ownerName?: string;
  ownerEmail?: string;
  ownerMasterAccountId?: string;
  ownerContactName?: string;
  ownerContactNumber?: string;
  
  // Status
  status: 'active' | 'inactive' | 'maintenance';
  
  // Metadata
  masterAccountId: string;
  companyId: string;
  createdAt: any;
  updatedAt?: any;
};
```

---

## 7. Billing Config Types

**File Path**: `types/index.ts` (excerpt)

**Purpose**: Billing configuration for calculating billable hours

```typescript
export type BillingConfig = {
  id?: string;
  masterAccountId: string;
  
  // Minimum hours by day type
  weekdays: {
    minHours: number;
  };
  saturday: {
    minHours: number;
  };
  sunday: {
    minHours: number;
  };
  publicHolidays: {
    minHours: number;
  };
  
  // Special conditions
  rainDays: {
    enabled: boolean;
    minHours: number;
  };
  breakdown: {
    enabled: boolean;
  };
  
  // Rates (optional, for cost calculation)
  assetRates?: {
    [assetType: string]: number;
  };
  
  createdAt: any;
  updatedAt?: any;
};
```

---

## 8. EPH Pending Edit Types

**File Path**: Defined in `utils/ephPendingEditsManager.ts`

**Purpose**: Track pending edits before final agreement

```typescript
export type EPHPendingEdit = {
  id: string;
  originalTimesheetId: string;
  assetId: string;
  assetType: string;
  plantNumber?: string;
  date: string;
  
  // Who made the edit
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
  
  // Original values for comparison
  originalTotalHours: number;
  originalOpenHours: string;
  originalCloseHours: string;
  
  // Status tracking
  status: 'pending_review' | 'reviewed' | 'superseded';
  reviewedBy?: string;
  reviewedAt?: any;
  
  // Organization
  masterAccountId: string;
  siteId: string;
  subcontractorId: string;
  subcontractorName: string;
  
  // Metadata
  createdAt: any;
  updatedAt: any;
};
```

---

## 9. Component Prop Types

### EditEPHHoursModal Props

```typescript
type TimesheetEntry = {
  id: string;
  date: string;
  totalHours: number;
  openHours: string;
  closeHours: string;
  isBreakdown: boolean;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isPublicHoliday: boolean;
  notes?: string;
  operatorName?: string;
  assetType?: string;
  plantNumber?: string;
};

export type EditedValues = {
  totalHours: number;
  openHours: string;
  closeHours: string;
  isBreakdown: boolean;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isPublicHoliday: boolean;
  adminNotes: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (editedValues: EditedValues) => Promise<void>;
  timesheet: TimesheetEntry | null;
};
```

---

## 10. Utility Function Parameter Types

### AssetOwnerInfo (ephReportManager)

```typescript
export type AssetOwnerInfo = {
  recipientType: EPHRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientMasterAccountId?: string;
};
```

### CreateAgreedTimesheetParams (agreedTimesheetManager)

```typescript
type CreateAgreedTimesheetParams = {
  originalTimesheetId: string;
  timesheetType: 'operator' | 'plant_asset';
  date: string;
  
  operatorId?: string;
  operatorName?: string;
  assetId?: string;
  assetType?: string;
  
  originalHours: number;
  agreedHours: number;
  billableHours?: number;
  billingRule?: string;
  
  originalNotes?: string;
  adminNotes?: string;
  
  siteId?: string;
  siteName?: string;
  masterAccountId: string;
  companyId?: string;
  
  subcontractorId?: string;
  subcontractorName?: string;
  
  agreedBy: string;
  agreedByRole?: 'Operator' | 'Plant Manager' | 'Admin';
  
  // Operator timesheet fields
  agreedNormalHours?: number;
  agreedOvertimeHours?: number;
  agreedSundayHours?: number;
  agreedPublicHolidayHours?: number;
  originalNormalHours?: number;
  originalOvertimeHours?: number;
  originalSundayHours?: number;
  originalPublicHolidayHours?: number;
  
  // Plant asset fields
  originalOpenHours?: number;
  originalCloseHours?: number;
  isBreakdown?: boolean;
  isRainDay?: boolean;
  isInclementWeather?: boolean;
  isPublicHoliday?: boolean;
};
```

---

## Type Import Summary

When implementing, import types like this:

```typescript
// EPH-specific types
import { EPHReport, EPHReportStatus, EPHRecipientType, LineItemDispute } from '@/types/ephReport';
import { EMHReport, EMHReportStatus } from '@/types/emhReport';

// Main types
import { 
  AgreedTimesheet, 
  PlantAssetTimesheet, 
  OperatorTimesheet,
  PlantAsset,
  BillingConfig
} from '@/types';

// User type
import { User } from '@/types';
```

---

## Firestore Type Mapping

| TypeScript Type | Firestore Collection | Key Fields |
|----------------|---------------------|------------|
| EPHReport | `ephReports` | `id`, `recipientMasterAccountId`, `senderMasterAccountId` |
| EPHPendingEdit | `ephPendingEdits` | `id`, `assetId`, `date`, `masterAccountId` |
| AgreedTimesheet | `agreedTimesheets` | `id`, `originalTimesheetId`, `masterAccountId` |
| PlantAssetTimesheet | `plantAssetTimesheets` | `id`, `assetId`, `date`, `masterAccountId` |
| OperatorTimesheet | `operatorTimesheets` | `id`, `operatorId`, `date`, `masterAccountId` |
| PlantAsset | `plantAssets` | `assetId`, `masterAccountId` |
| BillingConfig | `billingConfigs` | `id`, `masterAccountId` |

---

## Next Steps

1. Copy type files to your types directory
2. Ensure all imports are correct
3. Run type checking: `npm run typecheck` or `tsc --noEmit`
4. Fix any missing type imports

All types use Firebase Timestamp (`any`) for date fields. In production, you should import and use `Timestamp` from `firebase/firestore`.
