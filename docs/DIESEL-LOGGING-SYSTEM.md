# Diesel Logging & Reporting System - Complete Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [User Roles](#user-roles)
3. [Workflow](#workflow)
4. [Screen Architecture](#screen-architecture)
5. [Database Schema](#database-schema)
6. [Firebase Indexes](#firebase-indexes)
7. [Utilities & Services](#utilities--services)
8. [Complete Code Reference](#complete-code-reference)
9. [Navigation & Integration](#navigation--integration)

---

## System Overview

The Diesel Logging & Reporting System allows diesel clerks to log fuel consumption for plant assets (machinery, vehicles) and generate comprehensive reports for management and subcontractors. The system tracks:

- Fuel dispensed (bowser readings)
- Machine meter readings (hour meter or odometer)
- Fuel consumption rates
- Plant asset ownership and allocation
- Historical fuel usage patterns

### Key Features
- QR code scanning for quick asset identification
- Manual asset ID entry
- Automatic fuel consumption calculation
- PDF report generation
- Email reports to subcontractors
- Date range filtering
- Subcontractor-based filtering
- Fuel usage analytics

---

## User Roles

### Diesel Clerk
**Role:** `diesel-clerk`

**Responsibilities:**
- Scan or manually enter plant asset IDs
- Record bowser meter readings (opening/closing)
- Record machine meter readings (hour meter or odometer)
- Add notes to fuel logs
- View daily diary and messages

**Access:**
- Diesel clerk home dashboard
- Fuel logging screen
- Messages
- Daily diary

### Master Account / Company Admin
**Role:** `master`, `company-admin`

**Responsibilities:**
- Generate diesel reports
- Filter reports by date range
- Filter reports by subcontractor (plant owner)
- Export reports to PDF
- Share reports via email or system share sheet
- Send reports directly to subcontractors

**Access:**
- Diesel report screen
- All fuel logs within their master account
- Subcontractor management

---

## Workflow

### 1. Fuel Logging Workflow (Diesel Clerk)

```
Start (Diesel Clerk Home)
    ↓
Choose Method:
    ├─→ Scan QR Code → QR Scanner → Fuel Log Screen
    └─→ Manual Entry → Enter Asset ID → Fuel Log Screen
        ↓
Fuel Log Screen:
    1. View plant asset details
    2. Enter bowser opening reading
    3. Enter bowser closing reading
    4. Auto-calculate litres decanted
    5. Select meter type (Hour Meter / Odometer)
    6. Enter meter reading
    7. Add optional notes
    8. Review date, clerk name, site info
        ↓
Save Fuel Log
    ↓
Firestore: fuelLogs collection
    ↓
Options:
    ├─→ Log Another (reset form)
    └─→ Done (return to home)
```

### 2. Report Generation Workflow (Master/Admin)

```
Start (Diesel Report Screen)
    ↓
Load Data:
    - Fetch all fuel logs (default: last 30 days)
    - Fetch subcontractors
    - Calculate consumption rates
    - Auto-select all entries
        ↓
Apply Filters (Optional):
    ├─→ Date Range (from/to)
    └─→ Subcontractor Filter
        ↓
View Statistics:
    - Total entries
    - Selected entries
    - Total fuel consumed (litres)
        ↓
Review Fuel Logs:
    - Date
    - Plant asset details
    - Fuel amount
    - Meter readings
    - Consumption rate
    - Owner information
        ↓
Select/Deselect Entries
    ↓
Choose Action:
    ├─→ Export PDF (save locally)
    ├─→ Share PDF (system share sheet)
    └─→ Send to Subcontractor:
        - Select subcontractor
        - Add optional message
        - Generate PDF
        - Open email composer
        - Log to dieselReportsSent
```

### 3. Consumption Calculation Workflow

```
For each plant asset:
    1. Sort fuel logs by date (ascending)
    2. For consecutive logs with same meter type:
        ├─→ Calculate meter difference
        ├─→ If difference > 0:
        │   ├─→ meterDifference = current - previous
        │   └─→ consumptionRate = fuelAmount / meterDifference
        └─→ Display in report as L/h or L/km
```

---

## Screen Architecture

### 1. Diesel Clerk Home (`app/diesel-clerk-home.tsx`)

**Purpose:** Main dashboard for diesel clerks

**Features:**
- Welcome card with fuel icon
- Grid navigation:
  - Scan QR Code (opens QR scanner with context)
  - Manual Entry (modal for asset ID input)
  - Messages
  - Daily Diary
- Bottom navigation (Home, Settings)
- Logout functionality

**Navigation:**
```typescript
// Scan QR
router.push({ pathname: '/qr-scanner', params: { context: 'diesel-clerk' } })

// Manual Entry
router.push({ pathname: '/diesel-clerk-fuel-log', params: { plantAssetId: 'ASSET123' } })

// Messages
router.push('/messages')

// Daily Diary
router.push('/daily-diary')
```

**UI Components:**
- SafeAreaView with top/bottom edges
- ScrollView for content
- Modal for manual entry input
- TouchableOpacity cards with icons
- Accent color from user role

### 2. Diesel Clerk Fuel Log (`app/diesel-clerk-fuel-log.tsx`)

**Purpose:** Record fuel logs for specific plant assets

**Features:**
- Asset information card (type, ID, plant number, reg number, operator)
- Bowser meter readings (opening, closing)
- Auto-calculated litres decanted
- Meter type selector (Hour Meter / Odometer)
- Machine meter reading input
- Notes field (optional)
- Date, clerk name, site info display
- Save/Cancel actions

**Data Flow:**
```typescript
Input Parameters:
  - plantAssetId: string (from QR scan or manual entry)

Fetch Data:
  - Query plantAssets collection by assetId + masterAccountId
  - Load plant asset details

Form Fields:
  - bowserOpeningReading: number
  - bowserClosingReading: number
  - litresDecanted: calculated (closing - opening)
  - meterType: 'HOUR_METER' | 'ODOMETER'
  - meterReading: number
  - notes: string (optional)

Save to Firestore:
  Collection: fuelLogs
  Document Fields: (see Database Schema)
```

**Validation:**
- Bowser opening reading must be >= 0
- Bowser closing reading must be >= bowser opening reading
- Meter reading must be >= 0

### 3. Diesel Report (`app/diesel-report.tsx`)

**Purpose:** Generate and manage diesel reports

**Features:**
- Header with date range display
- Filter toggle (date range, subcontractor)
- Statistics bar (total entries, selected, total fuel)
- Select/deselect all functionality
- Action buttons (Export PDF, Share PDF, Send to Subcontractor)
- Scrollable fuel log cards with checkboxes
- Date pickers (native on mobile, web fallback)
- Subcontractor selection modal
- Send modal with message input

**Data Flow:**
```typescript
Initial Load:
  - fromDate: today - 30 days
  - toDate: today
  - Query fuelLogs by masterAccountId + date range
  - Query subcontractors by masterAccountId
  - Calculate consumption rates
  - Auto-select all entries

Filter by Subcontractor:
  - Filter logs where ownerType === 'subcontractor' && ownerId in selectedSubcontractors

Calculate Consumption:
  - Group logs by assetId
  - Sort by date
  - For consecutive logs with same meterType:
    - meterDifference = current.meterReading - previous.meterReading
    - consumptionRate = fuelAmount / meterDifference

Actions:
  - Export PDF: generateDieselReportPDF() → save locally
  - Share PDF: generateDieselReportPDF() → shareDieselReportPDF()
  - Send to Sub: generateDieselReportPDF() → sendDieselReportToSubcontractor()
```

**UI Components:**
- Collapsible filters panel
- Fuel log cards with:
  - Checkbox for selection
  - Date and asset type header
  - Plant details (plant number, reg, owner)
  - Meter readings
  - Fuel amount (highlighted)
  - Consumption rate (if calculated)
  - Notes (if present)
- Modals (date picker, subcontractor selector, send confirmation)

---

## Database Schema

### Collection: `fuelLogs`

**Purpose:** Store all fuel log entries

```typescript
type FuelLog = {
  id?: string;                          // Auto-generated document ID
  assetId: string;                      // Plant asset ID
  assetType: string;                    // e.g., "Excavator", "Dump Truck"
  plantNumber?: string;                 // Plant number (optional)
  registrationNumber?: string;          // Vehicle registration (optional)
  fuelAmount: number;                   // Litres decanted (closing - opening)
  bowserOpeningReading: number;         // Bowser meter opening reading (litres)
  bowserClosingReading: number;         // Bowser meter closing reading (litres)
  meterReading: number;                 // Machine meter reading
  meterType: 'HOUR_METER' | 'ODOMETER'; // Type of meter
  date: string;                         // Date in YYYY-MM-DD format
  timestamp: Timestamp;                 // Server timestamp
  loggedBy: string;                     // User ID of diesel clerk
  loggedByName: string;                 // Name of diesel clerk
  siteId?: string;                      // Site ID
  siteName?: string;                    // Site name
  masterAccountId: string;              // Master account ID (required)
  companyId?: string;                   // Company ID
  notes?: string;                       // Optional notes
  createdAt: Timestamp;                 // Creation timestamp
  
  // Calculated fields (not stored, calculated at query time)
  meterDifference?: number;             // Difference from previous reading
  consumptionRate?: number;             // L/h or L/km
}
```

**Indexes Required:**
```json
{
  "collectionGroup": "fuelLogs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
}
```

**Additional Index (for date range queries):**
```json
{
  "collectionGroup": "fuelLogs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

**Additional Index (for asset-specific queries):**
```json
{
  "collectionGroup": "fuelLogs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "assetId", "order": "ASCENDING" },
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

### Collection: `dieselReportsSent`

**Purpose:** Track sent diesel reports for audit trail

```typescript
type DieselReportSent = {
  recipientEmail: string;               // Recipient email address
  recipientName: string;                // Recipient name (subcontractor)
  dateRangeFrom: string;                // Report start date (YYYY-MM-DD)
  dateRangeTo: string;                  // Report end date (YYYY-MM-DD)
  totalFuel: number;                    // Total fuel in report (litres)
  entryCount: number;                   // Number of entries in report
  siteId: string;                       // Site ID
  siteName: string;                     // Site name
  masterAccountId: string;              // Master account ID
  companyId: string;                    // Company ID
  sentAt: Timestamp;                    // When report was sent
  createdAt: Timestamp;                 // Creation timestamp
}
```

**Indexes Required:**
```json
{
  "collectionGroup": "dieselReportsSent",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "dieselReportsSent",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "masterAccountId", "order": "ASCENDING" },
    { "fieldPath": "siteId", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "DESCENDING" }
  ]
}
```

```json
{
  "collectionGroup": "dieselReportsSent",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientEmail", "order": "ASCENDING" },
    { "fieldPath": "sentAt", "order": "DESCENDING" }
  ]
}
```

### Related Collections (References)

#### Collection: `plantAssets`
Used to fetch plant asset details when logging fuel.

**Query:**
```typescript
query(
  collection(db, 'plantAssets'),
  where('assetId', '==', plantAssetId),
  where('masterAccountId', '==', masterAccountId)
)
```

#### Collection: `subcontractors`
Used for filtering and sending reports.

**Query:**
```typescript
query(
  collection(db, 'subcontractors'),
  where('masterAccountId', '==', masterAccountId)
)
```

---

## Firebase Indexes

### Required Indexes (Add to `firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "fuelLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "fuelLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "fuelLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assetId", "order": "ASCENDING" },
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "fuelLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "fuelLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "loggedBy", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "fuelLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "ownerType", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "dieselReportsSent",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "dieselReportsSent",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "masterAccountId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "dieselReportsSent",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recipientEmail", "order": "ASCENDING" },
        { "fieldPath": "sentAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

---

## Utilities & Services

### 1. Diesel Report PDF Generator (`utils/dieselReportPdfGenerator.ts`)

**Purpose:** Generate PDF reports from fuel logs

**Key Function:**
```typescript
async function generateDieselReportPDF(options: DieselReportOptions): Promise<string>
```

**Parameters:**
```typescript
type DieselReportOptions = {
  logs: FuelLogEntry[];
  dateRange: { from: Date; to: Date };
  subcontractorFilter: string[];
  companyName: string;
}
```

**Returns:** URI of generated PDF file

**PDF Structure:**
- Header (title, company, date range)
- Summary (total entries, unique assets, total fuel)
- Applied filters (if any)
- Table with columns:
  - Date
  - Plant No.
  - Reg No.
  - Owner
  - Type
  - Meter Reading
  - Fuel (L)
  - Usage (hours/km worked)
  - Consumption (L/h or L/km)
  - Logged By
- Total row
- Footer (generated timestamp)

**Styling:**
- Professional layout with typography
- Color-coded sections
- Highlighted totals
- Print-optimized
- Page break handling

**Dependencies:**
- `expo-print` for PDF generation

### 2. Diesel Report Email Service (`utils/dieselReportEmailService.ts`)

**Purpose:** Send/share diesel reports via email or system share

**Key Functions:**

#### `sendDieselReportToSubcontractor()`
```typescript
async function sendDieselReportToSubcontractor(
  params: SendDieselReportParams
): Promise<void>
```

**Parameters:**
```typescript
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
}
```

**Behavior:**
- **Mobile:** Opens native email composer with:
  - Pre-filled recipient
  - Subject line with date range
  - Body with report summary
  - PDF attachment
- **Web:** Shows alert (simulation)
- Logs sent report to `dieselReportsSent` collection

#### `shareDieselReportPDF()`
```typescript
async function shareDieselReportPDF(
  params: ShareDieselReportParams
): Promise<void>
```

**Parameters:**
```typescript
type ShareDieselReportParams = {
  pdfUri: string;
  fileName: string;
}
```

**Behavior:**
- **Mobile:** Opens system share sheet (can share to any app)
- **Web:** Shows download simulation alert

**Dependencies:**
- `expo-mail-composer` for email functionality
- `expo-sharing` for system share sheet

---

## Complete Code Reference

### Screen: `app/diesel-clerk-home.tsx`

**Lines of Code:** 394

**Key Sections:**
1. **Imports & Setup** (lines 1-14)
   - React Navigation (expo-router)
   - React Native components
   - Icons from lucide-react-native
   - Auth context
   - Theme colors

2. **Component State** (lines 10-14)
   - `showManualEntry` - modal visibility
   - `manualAssetId` - manual entry input
   - `accentColor` - role-based color

3. **Navigation Items** (lines 48-73)
   - Scan QR Code
   - Manual Entry
   - Messages
   - Daily Diary

4. **Handlers** (lines 16-46)
   - `handleLogout()` - logout confirmation
   - `handleManualEntry()` - validate and navigate

5. **UI Structure** (lines 76-190)
   - Header with site name and logout
   - Welcome card with icon
   - Grid navigation cards
   - Bottom navigation bar
   - Manual entry modal

### Screen: `app/diesel-clerk-fuel-log.tsx`

**Lines of Code:** 640

**Key Sections:**
1. **Type Definitions** (lines 11-32)
   - FuelLog type

2. **Component State** (lines 35-46)
   - Plant asset data
   - Form fields
   - Loading states

3. **Data Fetching** (lines 52-96)
   - `fetchPlantAsset()` - query by assetId + masterAccountId

4. **Form Submission** (lines 98-182)
   - `handleSaveFuelLog()` - validation and save to Firestore

5. **UI Structure** (lines 210-380)
   - Asset information card
   - Bowser readings section
   - Calculated litres decanted
   - Meter type selector
   - Machine meter reading
   - Notes input
   - Info card
   - Save/Cancel footer

### Screen: `app/diesel-report.tsx`

**Lines of Code:** 1250

**Key Sections:**
1. **Type Definitions** (lines 3-64)
   - FuelLogEntry (with calculated fields)
   - Subcontractor

2. **Component State** (lines 67-90)
   - Fuel logs
   - Selected rows
   - Filters (date range, subcontractors)
   - Loading/exporting states
   - Modal visibility

3. **Data Loading** (lines 92-210)
   - `loadData()` - load logs and subcontractors
   - `loadFuelLogs()` - query with date range
   - `loadSubcontractors()` - fetch subcontractors
   - `calculateConsumption()` - compute rates

4. **Row Selection** (lines 212-243)
   - `toggleRow()` - select/deselect individual
   - `toggleAllRows()` - select/deselect all
   - `toggleSubcontractor()` - filter by subcontractor

5. **Export Actions** (lines 257-388)
   - `handleExportPDF()` - generate and save PDF
   - `handleSharePDF()` - generate and share PDF
   - `handleSendToSubcontractor()` - generate and email PDF

6. **UI Structure** (lines 410-824)
   - Header with date range
   - Filters panel (collapsible)
   - Statistics bar
   - Actions bar (select all, export, share, send)
   - Fuel log cards (scrollable)
   - Date picker modals
   - Subcontractor selection modal
   - Send confirmation modal

### Utility: `utils/dieselReportPdfGenerator.ts`

**Lines of Code:** 346

**Key Sections:**
1. **Type Definitions** (lines 3-35)
2. **Helper Functions** (lines 37-54)
   - `formatDate()` - format date for display
   - `formatDateTime()` - format datetime for footer
3. **PDF Generation** (lines 56-345)
   - HTML template with inline CSS
   - Responsive table layout
   - Print-optimized styles
   - expo-print integration

### Utility: `utils/dieselReportEmailService.ts`

**Lines of Code:** 184

**Key Sections:**
1. **Type Definitions** (lines 7-26)
2. **Email Composition** (lines 36-119)
   - `sendDieselReportToSubcontractor()` - email with attachment
   - Platform-specific handling (mobile/web)
3. **Share Functionality** (lines 121-148)
   - `shareDieselReportPDF()` - system share sheet
4. **Audit Logging** (lines 150-183)
   - `logDieselReportSent()` - save to Firestore

---

## Navigation & Integration

### Entry Points

#### For Diesel Clerks
1. Login with role `diesel-clerk`
2. Navigate to home: `/diesel-clerk-home`
3. Options:
   - Scan QR: `/qr-scanner?context=diesel-clerk` → `/diesel-clerk-fuel-log?plantAssetId=X`
   - Manual: Modal → `/diesel-clerk-fuel-log?plantAssetId=X`

#### For Master Accounts
1. Login with role `master` or `company-admin`
2. Access from accounts menu or billing menu
3. Navigate to: `/diesel-report`

### QR Scanner Integration

When QR scanner is called with `context=diesel-clerk`:
```typescript
// In qr-scanner.tsx
if (context === 'diesel-clerk') {
  router.push({
    pathname: '/diesel-clerk-fuel-log',
    params: { plantAssetId: scannedAssetId }
  });
}
```

### Role-Based Access Control

```typescript
// In AuthContext or routing logic
const allowedRoles = {
  '/diesel-clerk-home': ['diesel-clerk'],
  '/diesel-clerk-fuel-log': ['diesel-clerk'],
  '/diesel-report': ['master', 'company-admin', 'accounts']
};
```

### Add to Main Navigation

```typescript
// For diesel clerk role in app/_layout.tsx or main menu
if (user.role === 'diesel-clerk') {
  router.replace('/diesel-clerk-home');
}

// For master/admin in accounts or reports menu
{
  title: 'Diesel Report',
  icon: Fuel,
  route: '/diesel-report',
  roles: ['master', 'company-admin', 'accounts']
}
```

---

## Security Rules

### Firestore Security Rules

Add to `firestore.rules`:

```javascript
// Fuel Logs - Diesel Clerk can create, Master can read
match /fuelLogs/{logId} {
  allow create: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'diesel-clerk'
    && request.resource.data.loggedBy == request.auth.uid
    && request.resource.data.masterAccountId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.masterAccountId;
  
  allow read: if request.auth != null 
    && resource.data.masterAccountId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.masterAccountId;
  
  allow update, delete: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['master', 'company-admin']
    && resource.data.masterAccountId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.masterAccountId;
}

// Diesel Reports Sent - Audit log
match /dieselReportsSent/{reportId} {
  allow create: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['master', 'company-admin', 'accounts']
    && request.resource.data.masterAccountId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.masterAccountId;
  
  allow read: if request.auth != null 
    && resource.data.masterAccountId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.masterAccountId;
}
```

---

## Testing Checklist

### Functional Testing

#### Diesel Clerk Functionality
- [ ] Login as diesel clerk
- [ ] Navigate to diesel clerk home
- [ ] Scan QR code for plant asset
- [ ] Verify asset details load correctly
- [ ] Enter fuel log with valid data
- [ ] Verify litres decanted calculation
- [ ] Switch between Hour Meter and Odometer
- [ ] Add notes to fuel log
- [ ] Save fuel log successfully
- [ ] Verify log appears in Firestore
- [ ] Test "Log Another" functionality
- [ ] Test manual asset ID entry
- [ ] Test with missing/invalid asset ID

#### Report Generation
- [ ] Login as master/admin
- [ ] Navigate to diesel report
- [ ] Verify default date range (last 30 days)
- [ ] Verify fuel logs load correctly
- [ ] Test date range filtering
- [ ] Test subcontractor filtering
- [ ] Verify consumption rate calculations
- [ ] Test row selection (individual)
- [ ] Test select/deselect all
- [ ] Export PDF successfully
- [ ] Verify PDF content and formatting
- [ ] Share PDF via system share
- [ ] Send report to subcontractor via email
- [ ] Verify email composer opens with correct data
- [ ] Verify dieselReportsSent log created

### Edge Cases
- [ ] Plant asset not found
- [ ] No fuel logs in date range
- [ ] Consumption calculation with missing previous reading
- [ ] Multiple logs same day for same asset
- [ ] Large dataset (1000+ logs) performance
- [ ] Subcontractor with no email address
- [ ] Web vs mobile platform differences
- [ ] Offline functionality (if applicable)

### Data Validation
- [ ] Negative bowser readings rejected
- [ ] Closing < opening reading rejected
- [ ] Negative meter reading rejected
- [ ] Empty/whitespace-only notes handled
- [ ] Special characters in notes
- [ ] Very large fuel amounts (outliers)
- [ ] Date range validation (from < to)

---

## Deployment Steps

### 1. Deploy Firestore Indexes
```bash
# Add indexes to firestore.indexes.json (see Firebase Indexes section)
firebase deploy --only firestore:indexes
```

### 2. Deploy Security Rules
```bash
# Add rules to firestore.rules (see Security Rules section)
firebase deploy --only firestore:rules
```

### 3. Deploy Application
```bash
# Build and deploy app
npm run build
# or
expo build:ios
expo build:android
```

### 4. Create Test Data
```bash
# Add test plant assets
# Add test diesel clerk user
# Add test subcontractors
# Create sample fuel logs
```

---

## Troubleshooting

### Common Issues

#### 1. Plant Asset Not Found
**Symptom:** "Asset Not Found" alert after scanning QR or manual entry

**Causes:**
- Asset doesn't exist in plantAssets collection
- Asset belongs to different masterAccountId
- Incorrect assetId format

**Solution:**
- Verify asset exists in Firestore
- Check masterAccountId matches
- Ensure QR code contains correct assetId

#### 2. Missing Firestore Index
**Symptom:** "The query requires an index" error

**Solution:**
- Click the provided link in error message
- Or manually add index from Firebase Console
- Or deploy indexes using `firebase deploy --only firestore:indexes`

#### 3. PDF Generation Fails
**Symptom:** "Failed to generate diesel report PDF" error

**Causes:**
- expo-print not installed
- Invalid HTML in template
- File system permissions

**Solution:**
- Install expo-print: `expo install expo-print`
- Check console for HTML parsing errors
- Verify app has file system write permissions

#### 4. Email Composer Not Available
**Symptom:** "Email composer not available" error

**Causes:**
- expo-mail-composer not installed
- No email app configured on device
- Running on web (not supported)

**Solution:**
- Install expo-mail-composer: `expo install expo-mail-composer`
- Configure email app on device
- Use share functionality as alternative on web

#### 5. Consumption Rate Not Calculated
**Symptom:** Consumption column shows "-" in report

**Causes:**
- Only one log for asset (no previous reading)
- Meter type changed between logs
- Meter reading decreased (not allowed)

**Solution:**
- Need at least 2 logs with same meter type
- Ensure meter readings are sequential
- Check that readings are increasing

---

## Future Enhancements

### Planned Features
1. **Bulk Import** - Import fuel logs from CSV/Excel
2. **Analytics Dashboard** - Fuel trends, cost analysis, efficiency metrics
3. **Alerts** - Unusual consumption patterns, low fuel warnings
4. **Mobile Fuel Tracking** - GPS tracking for mobile bowsers
5. **Integration with Fleet Management** - Sync with other systems
6. **Photo Attachments** - Attach photos of meter readings
7. **Voice Notes** - Audio notes for fuel logs
8. **Offline Mode** - Log fuel without internet connection
9. **Fuel Cost Tracking** - Track fuel prices and costs
10. **Scheduled Reports** - Auto-generate and email reports

### API Endpoints (Future)
```typescript
// For third-party integrations
POST   /api/fuel-logs        - Create fuel log
GET    /api/fuel-logs        - List fuel logs
GET    /api/fuel-logs/:id    - Get specific log
PUT    /api/fuel-logs/:id    - Update fuel log
DELETE /api/fuel-logs/:id    - Delete fuel log
GET    /api/fuel-reports     - Generate report
POST   /api/fuel-reports     - Save custom report
```

---

## Support & Maintenance

### Monitoring
- Track fuel log creation rates
- Monitor PDF generation success/failure rates
- Track email delivery success
- Alert on unusual patterns (outliers, spikes)

### Regular Maintenance
- Archive old fuel logs (> 2 years)
- Clean up orphaned PDF files
- Review and optimize Firestore indexes
- Update PDF templates as needed

### Documentation Updates
- Keep this document updated with changes
- Document new features and workflows
- Update troubleshooting section with new issues
- Maintain changelog of database schema changes

---

## Changelog

### Version 1.0.0 (Current)
- Initial diesel logging system implementation
- Diesel clerk home and fuel log screens
- Diesel report with PDF generation
- Email and share functionality
- Date range and subcontractor filtering
- Consumption rate calculations
- Firestore indexes and security rules

---

## References

### External Dependencies
- **expo-print**: PDF generation - https://docs.expo.dev/versions/latest/sdk/print/
- **expo-mail-composer**: Email functionality - https://docs.expo.dev/versions/latest/sdk/mail-composer/
- **expo-sharing**: System share sheet - https://docs.expo.dev/versions/latest/sdk/sharing/
- **@react-native-community/datetimepicker**: Date picker - https://github.com/react-native-datetimepicker/datetimepicker
- **lucide-react-native**: Icons - https://lucide.dev/

### Related Documentation
- [Plant Asset System](./PLANT-ASSET-SYSTEM.md)
- [QR Code System](./QR-AUTHENTICATION-SYSTEM.md)
- [User Roles](./USER-ROLES.md)
- [Firestore Indexes](./FIRESTORE_INDEXES_SETUP.md)
- [Security Rules](./FIREBASE-SECURITY-RULES.md)

---

**Last Updated:** 2026-01-17  
**Document Version:** 1.0.0  
**Author:** Rork System Documentation
