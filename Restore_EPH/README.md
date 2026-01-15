# Restore_EPH - EPH System Backup

This folder contains exact copies of all EPH (Employee Plant Hours) related files from the main repository, organized in the same hierarchy as the original files.

## Purpose

This backup was created to preserve the complete EPH system implementation including:
- Core EPH functionality
- Billing integration
- Supporting components
- Utility functions
- Type definitions
- Documentation
- Configuration files

## Directory Structure

```
Restore_EPH/
├── app/                          # Application screens and routes
│   ├── (tabs)/                   # Tab navigation
│   │   └── _layout.tsx
│   ├── accounts/                 # Account-related screens
│   │   └── index.tsx
│   ├── _layout.tsx               # Root layout
│   ├── billing-config.tsx        # Billing configuration
│   ├── eph-inbox.tsx             # EPH inbox screen
│   └── eph-menu.tsx              # EPH menu screen
├── components/                   # React components
│   └── accounts/                 # Account-related components
│       ├── AgreedHoursModal.tsx
│       ├── EditEPHHoursModal.tsx
│       ├── ExportJobsList.tsx
│       ├── ExportRequestModal.tsx
│       ├── FiltersBar.tsx
│       ├── PlantAssetsTimesheetsTab.tsx
│       ├── ReportGenerationModal.tsx
│       ├── SendConfirmationModal.tsx
│       └── TimesheetComparisonModal.tsx
├── docs/                         # Documentation
│   ├── BILLING-TIMESHEET-WORKFLOW-CLARIFICATION.md
│   ├── EPH-AGREEMENT-IMPLEMENTATION-STATUS.md
│   ├── EPH-AGREEMENT-WORKFLOW-COMPLETE.md
│   ├── EPH-FIREBASE-INDEXES-REQUIRED.md
│   ├── EPH-FREE-USER-WORKFLOW.md
│   └── EPH-SUBCONTRACTOR-AGREEMENT-WORKFLOW.md
├── types/                        # TypeScript type definitions
│   ├── emhReport.ts
│   ├── ephReport.ts
│   └── index.ts
├── utils/                        # Utility functions
│   ├── accounts/
│   │   └── exportHandler.ts
│   ├── agreedTimesheetManager.ts
│   ├── billableHoursCalculator.ts
│   ├── ephEmailService.ts
│   ├── ephPendingEditsManager.ts
│   ├── ephReportManager.ts
│   ├── timesheetExport.ts
│   └── timesheetPdfGenerator.ts
└── firestore.indexes.json        # Firebase Firestore indexes configuration

## File Categories

### Core EPH Files (7)
- app/eph-inbox.tsx
- app/eph-menu.tsx
- utils/ephReportManager.ts
- utils/ephEmailService.ts
- utils/ephPendingEditsManager.ts
- types/ephReport.ts
- components/accounts/EditEPHHoursModal.tsx

### Billing Integration (3)
- app/billing-config.tsx
- components/accounts/PlantAssetsTimesheetsTab.tsx
- components/accounts/AgreedHoursModal.tsx

### Supporting Components (6)
- components/accounts/TimesheetComparisonModal.tsx
- components/accounts/SendConfirmationModal.tsx
- components/accounts/FiltersBar.tsx
- components/accounts/ExportRequestModal.tsx
- components/accounts/ReportGenerationModal.tsx
- components/accounts/ExportJobsList.tsx

### Utility Files (5)
- utils/agreedTimesheetManager.ts
- utils/timesheetPdfGenerator.ts
- utils/timesheetExport.ts
- utils/billableHoursCalculator.ts
- utils/accounts/exportHandler.ts

### Types (3)
- types/ephReport.ts
- types/emhReport.ts
- types/index.ts

### Documentation (6)
- docs/EPH-AGREEMENT-WORKFLOW-COMPLETE.md
- docs/EPH-AGREEMENT-IMPLEMENTATION-STATUS.md
- docs/EPH-FREE-USER-WORKFLOW.md
- docs/EPH-SUBCONTRACTOR-AGREEMENT-WORKFLOW.md
- docs/EPH-FIREBASE-INDEXES-REQUIRED.md
- docs/BILLING-TIMESHEET-WORKFLOW-CLARIFICATION.md

### Config (1)
- firestore.indexes.json

### Navigation Entry Points (3)
- app/accounts/index.tsx
- app/(tabs)/_layout.tsx
- app/_layout.tsx

## Total Files: 33

## Created
Date: 2026-01-15
Purpose: Complete EPH system backup with exact file hierarchy preservation
