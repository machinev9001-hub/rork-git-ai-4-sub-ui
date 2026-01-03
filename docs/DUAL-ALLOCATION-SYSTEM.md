# Dual Allocation System - Company Level & Site Level

## Overview

The system supports **TWO DISTINCT ALLOCATION TYPES**:

1. **Company-Level Allocation**: Allocating assets/employees to a site/project/job
2. **Site-Level Allocation**: Moving assets/employees within a site to different PV areas and blocks

---

## 1. Company-Level Allocation (Site Assignment)

### Purpose
Allocate plant assets or employees from company pool to a specific site/project/job.

### Plant Assets - Company Level

#### Data Model
```typescript
PlantAsset {
  // Company-level allocation fields
  siteId?: string | null;              // NULL = unallocated, String = allocated to site
  allocationStatus: AllocationStatus;  // 'UNALLOCATED' | 'ALLOCATED' | 'IN_TRANSIT'
  masterAccountId: string;             // Master account owner
  companyId?: string;                  // Company owner
  
  currentAllocation?: {
    siteId: string;
    siteName?: string;
    allocatedAt: Timestamp;
    allocatedBy: string;
    notes?: string;
  };
  
  allocationHistory?: Array<{
    siteId: string;
    siteName?: string;
    allocatedAt: Timestamp;
    allocatedBy: string;
    deallocatedAt?: Timestamp;
    deallocatedBy?: string;
  }>;
}
```

#### Workflow

**A. View Unallocated Assets (Company Pool)**
```typescript
// Query: All assets in company pool (not allocated to any site)
const q = query(
  collection(db, 'plantAssets'),
  where('companyId', '==', companyId),
  where('allocationStatus', '==', 'UNALLOCATED'),
  orderBy('createdAt', 'desc')
);
```

**B. Allocate Asset to Site**
```typescript
await updateDoc(assetRef, {
  allocationStatus: 'ALLOCATED',
  siteId: selectedSiteId,
  currentAllocation: {
    siteId: selectedSiteId,
    siteName: selectedSiteName,
    allocatedAt: serverTimestamp(),
    allocatedBy: user.userId
  },
  allocationHistory: arrayUnion({
    siteId: selectedSiteId,
    siteName: selectedSiteName,
    allocatedAt: serverTimestamp(),
    allocatedBy: user.userId
  })
});
```

**C. View Assets at Site**
```typescript
// Query: All assets allocated to specific site
const q = query(
  collection(db, 'plantAssets'),
  where('siteId', '==', siteId),
  where('allocationStatus', '==', 'ALLOCATED'),
  orderBy('createdAt', 'desc')
);
```

**D. Deallocate Asset from Site (Return to Pool)**
```typescript
await updateDoc(assetRef, {
  allocationStatus: 'UNALLOCATED',
  siteId: null,
  currentAllocation: null,
  allocationHistory: arrayUnion({
    ...currentAllocation,
    deallocatedAt: serverTimestamp(),
    deallocatedBy: user.userId
  })
});
```

#### Required Firebase Indexes

```json
[
  {
    "collectionGroup": "plantAssets",
    "fields": [
      { "fieldPath": "companyId", "order": "ASCENDING" },
      { "fieldPath": "allocationStatus", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "plantAssets",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "allocationStatus", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "plantAssets",
    "fields": [
      { "fieldPath": "masterAccountId", "order": "ASCENDING" },
      { "fieldPath": "allocationStatus", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  }
]
```

✅ **Status**: These indexes are already in firestore.indexes.json (lines 289-312)

---

### Employees - Company Level

#### Data Model
```typescript
Employee {
  // Company-level allocation fields
  siteId?: string | null;              // NULL = unallocated, String = allocated to site
  companyId?: string;                  // Company owner
  masterAccountId: string;             // Master account owner
  employerId?: string;                 // Employer company ID
  employerType?: 'company' | 'subcontractor';
  isCrossHire?: boolean;
}
```

#### Workflow

**A. View Unallocated Employees (Company Pool)**
```typescript
// Query: All employees not allocated to any site
const q = query(
  collection(db, 'employees'),
  where('companyId', '==', companyId),
  where('siteId', '==', null),
  orderBy('createdAt', 'desc')
);
```

**B. Allocate Employee to Site**
```typescript
await updateDoc(employeeRef, {
  siteId: selectedSiteId,
  siteName: selectedSiteName,
  updatedAt: serverTimestamp(),
  updatedBy: user.userId
});
```

**C. View Employees at Site**
```typescript
// Query: All employees allocated to specific site
const q = query(
  collection(db, 'employees'),
  where('siteId', '==', siteId),
  orderBy('name', 'asc')
);
```

**D. Deallocate Employee from Site**
```typescript
await updateDoc(employeeRef, {
  siteId: null,
  siteName: null,
  updatedAt: serverTimestamp()
});
```

#### Required Firebase Indexes

```json
[
  {
    "collectionGroup": "employees",
    "fields": [
      { "fieldPath": "companyId", "order": "ASCENDING" },
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "employees",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "name", "order": "ASCENDING" }
    ]
  }
]
```

✅ **Status**: These indexes exist (employees collection has siteId indexes)

---

## 2. Site-Level Allocation (PV Area & Block Assignment)

### Purpose
Move plant assets or employees within a site to specific PV areas and blocks for precise location tracking.

### Plant Assets - Site Level

#### Data Model
```typescript
PlantAsset {
  // Site-level allocation fields (WITHIN a site)
  allocatedPvArea?: string;            // PV area within site (e.g., "PV1", "North Section")
  allocatedBlockNumber?: string;       // Block within PV area (e.g., "BLOCK1", "B-01")
  allocationDate?: Timestamp;          // When allocated to this area
  location?: string;                   // Human-readable location description
}
```

#### Workflow

**A. View Assets at Site (Before Area Assignment)**
```typescript
// Query: Assets at site, not yet assigned to PV area
const q = query(
  collection(db, 'plantAssets'),
  where('siteId', '==', siteId),
  where('allocationStatus', '==', 'ALLOCATED'),
  where('allocatedPvArea', '==', null),
  orderBy('createdAt', 'desc')
);
```

**B. Assign Asset to PV Area & Block**
```typescript
await updateDoc(assetRef, {
  allocatedPvArea: 'PV1',
  allocatedBlockNumber: 'BLOCK1',
  location: 'PV1 / BLOCK1',
  allocationDate: serverTimestamp(),
  updatedAt: serverTimestamp()
});
```

**C. View Assets by PV Area**
```typescript
// Query: All assets in specific PV area
const q = query(
  collection(db, 'plantAssets'),
  where('siteId', '==', siteId),
  where('allocatedPvArea', '==', 'PV1'),
  orderBy('createdAt', 'desc')
);
```

**D. View Assets by Block**
```typescript
// Query: All assets in specific block
const q = query(
  collection(db, 'plantAssets'),
  where('siteId', '==', siteId),
  where('allocatedPvArea', '==', 'PV1'),
  where('allocatedBlockNumber', '==', 'BLOCK1'),
  orderBy('createdAt', 'desc')
);
```

**E. Move Asset to Different Area**
```typescript
await updateDoc(assetRef, {
  allocatedPvArea: 'PV2',
  allocatedBlockNumber: 'BLOCK3',
  location: 'PV2 / BLOCK3',
  allocationDate: serverTimestamp(),
  updatedAt: serverTimestamp()
});
```

#### Required Firebase Indexes

```json
[
  {
    "collectionGroup": "plantAssets",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "allocatedPvArea", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "plantAssets",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "allocatedPvArea", "order": "ASCENDING" },
      { "fieldPath": "allocatedBlockNumber", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "plantAssets",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "allocationStatus", "order": "ASCENDING" },
      { "fieldPath": "allocatedPvArea", "order": "ASCENDING" }
    ]
  }
]
```

❌ **Status**: THESE INDEXES ARE MISSING - Need to be added

---

### Employees - Site Level

#### Data Model
```typescript
Employee {
  // Site-level allocation fields (WITHIN a site)
  allocatedPvArea?: string;            // PV area within site
  allocatedBlockNumber?: string;       // Block within PV area
  areaAllocationDate?: Timestamp;      // When allocated to this area
}
```

#### Workflow

**A. View Employees at Site (Before Area Assignment)**
```typescript
// Query: Employees at site, not yet assigned to PV area
const q = query(
  collection(db, 'employees'),
  where('siteId', '==', siteId),
  where('allocatedPvArea', '==', null),
  orderBy('name', 'asc')
);
```

**B. Assign Employee to PV Area & Block**
```typescript
await updateDoc(employeeRef, {
  allocatedPvArea: 'PV1',
  allocatedBlockNumber: 'BLOCK1',
  areaAllocationDate: serverTimestamp(),
  updatedAt: serverTimestamp()
});
```

**C. View Employees by PV Area**
```typescript
// Query: All employees in specific PV area
const q = query(
  collection(db, 'employees'),
  where('siteId', '==', siteId),
  where('allocatedPvArea', '==', 'PV1'),
  orderBy('name', 'asc')
);
```

**D. View Employees by Block**
```typescript
// Query: All employees in specific block
const q = query(
  collection(db, 'employees'),
  where('siteId', '==', siteId),
  where('allocatedPvArea', '==', 'PV1'),
  where('allocatedBlockNumber', '==', 'BLOCK1'),
  orderBy('name', 'asc')
);
```

#### Required Firebase Indexes

```json
[
  {
    "collectionGroup": "employees",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "allocatedPvArea", "order": "ASCENDING" },
      { "fieldPath": "name", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "employees",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "allocatedPvArea", "order": "ASCENDING" },
      { "fieldPath": "allocatedBlockNumber", "order": "ASCENDING" },
      { "fieldPath": "name", "order": "ASCENDING" }
    ]
  }
]
```

❌ **Status**: THESE INDEXES ARE MISSING - Need to be added

---

## Complete Allocation Flow Example

### Plant Asset Full Lifecycle

```
1. CREATE ASSET (Company Pool)
   ├─ companyId: "company123"
   ├─ siteId: null
   └─ allocationStatus: "UNALLOCATED"

2. ALLOCATE TO SITE (Company Level)
   ├─ companyId: "company123"
   ├─ siteId: "site456"
   └─ allocationStatus: "ALLOCATED"

3. ASSIGN TO AREA (Site Level)
   ├─ siteId: "site456"
   ├─ allocatedPvArea: "PV1"
   └─ allocatedBlockNumber: "BLOCK1"

4. MOVE WITHIN SITE (Site Level)
   ├─ siteId: "site456"  (unchanged)
   ├─ allocatedPvArea: "PV2"  (changed)
   └─ allocatedBlockNumber: "BLOCK3"  (changed)

5. DEALLOCATE FROM SITE (Company Level)
   ├─ companyId: "company123"
   ├─ siteId: null
   ├─ allocatedPvArea: null  (cleared)
   ├─ allocatedBlockNumber: null  (cleared)
   └─ allocationStatus: "UNALLOCATED"
```

---

## Navigation & Access to Company-Level Management

### Accessing Company Assets & Employees

**Location:** Settings Menu → Asset & Employee Pool Section

**Available to:** Master Users only (when signed into a company)

**Menu Items:**
1. **Company Assets** - Navigate to `/company-assets`
   - View all assets in company pool (across all sites)
   - Filter by allocation status (Allocated/Unallocated)
   - Search by asset name, plant number, or registration
   - Add new assets to company pool
   - View asset details and allocation history
   - Allocate/deallocate assets to/from sites

2. **Company Employees** - Navigate to `/company-employees`
   - View all employees in company pool (across all sites)
   - Filter by site allocation status
   - Search by employee name or ID number
   - Add new employees to company pool
   - View employee details and site assignments
   - Assign/unassign employees to/from sites

### Workflow for Company-Level Management

#### Adding Assets to Company Pool

**Steps:**
1. Navigate to Settings → Company Assets
2. Tap "+ ADD ASSET" button
3. Fill in asset details (redirects to `/add-asset` screen)
4. Asset is created in company pool (siteId = null, allocationStatus = 'UNALLOCATED')
5. Asset appears in company assets list

#### Allocating Asset to Site

**Steps:**
1. Navigate to Settings → Company Assets
2. Find unallocated asset in list
3. Tap asset card to view details
4. Tap "Allocate to Site" button
5. Select site from dropdown
6. Confirm allocation
7. Asset's siteId updated, allocationStatus = 'ALLOCATED'

#### Adding Employees to Company Pool

**Steps:**
1. Navigate to Settings → Company Employees
2. Tap "+ ADD EMPLOYEE" button
3. Fill in employee details (redirects to `/add-employee` screen)
4. Employee is created in company pool (siteId = null)
5. Employee appears in company employees list

#### Assigning Employee to Site

**Steps:**
1. Navigate to Settings → Company Employees
2. Find unassigned employee in list
3. Tap employee card to view details
4. Tap "Assign to Site" button
5. Select site from dropdown
6. Confirm assignment
7. Employee's siteId updated

### Difference Between Company-Level and Site-Level Screens

**Company-Level Screens** (`/company-assets`, `/company-employees`):
- Show ALL assets/employees across ALL sites
- Used for global company management
- Available only to Master users
- Access from Settings menu
- Focus: Site allocation (which site has this resource?)

**Site-Level Screens** (Within site context):
- Show only assets/employees at current site
- Used for day-to-day site operations
- Available to multiple role types
- Access from site-specific menus
- Focus: Area allocation (where within the site?)

---

## Summary of Required Changes

### ✅ Already Implemented

1. ✅ PlantAsset type has `siteId`, `allocationStatus`, `allocatedPvArea`, `allocatedBlockNumber`
2. ✅ Company-level allocation indexes for plantAssets (lines 289-312 in firestore.indexes.json)
3. ✅ Employees have `siteId` field
4. ✅ Basic employee indexes by siteId
5. ✅ Company Assets screen (`/company-assets`) - Global asset management
6. ✅ Company Employees screen (`/company-employees`) - Global employee management
7. ✅ Settings menu integration for Master users

### ❌ Missing - Need to Add

1. ❌ Site-level allocation indexes for plantAssets (siteId + allocatedPvArea + allocatedBlockNumber)
2. ❌ Employee type fields: `allocatedPvArea`, `allocatedBlockNumber`, `areaAllocationDate`
3. ❌ Site-level allocation indexes for employees (siteId + allocatedPvArea + allocatedBlockNumber)
4. ❌ UI for assigning assets/employees to PV areas within a site
5. ❌ Request type distinction: `PLANT_ALLOCATION_REQUEST` (to site) vs `PLANT_AREA_ASSIGNMENT` (within site)

---

## Next Steps

1. **Add missing indexes to firestore.indexes.json**
2. **Update Employee type** to include site-level allocation fields
3. **Create UI screens** for site-level allocation management
4. **Deploy indexes** to Firebase
5. **Test both allocation flows** end-to-end

---

Last Updated: 2025-12-28
