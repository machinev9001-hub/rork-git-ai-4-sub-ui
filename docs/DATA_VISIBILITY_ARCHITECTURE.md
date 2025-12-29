# Data Visibility & Access Control Architecture

## Overview

This document describes the site-based data visibility and access control system implemented for the MACHINE Business Tracker application.

## Core Principles

### 1. Site-Based Access Control (Critical Constraint)

All subcontractor data visibility is governed by **SiteId indexing**. This is the fundamental rule that ensures proper data isolation and security.

**Key Rules:**
- Subcontractors may have assets across multiple sites
- Subcontractors must **only** see data for sites where:
  - Their assets are allocated
  - They are formally linked by the Site Master account
- Data relationship: **Site → Subcontractor → Asset → Timesheet**
- No global visibility unless explicitly permitted

### 2. Cross-Company Data Isolation

Companies **cannot** see each other's internal assets or data.

**Exceptions:**
- Assets are visible cross-company only via the **Marketplace** (if VAS enabled)
- Marketplace visibility is controlled by the `isAvailableForMarketplace` field
- Companies can choose visibility level: internal, marketplace, or both

### 3. Company-Level Ownership with Site Allocation

**Employees:**
- Created once at company level
- Linked to sites via `EmployeeSite` junction table
- `companyId` is the single source of truth
- `siteId` maintained for backward compatibility

**Assets:**
- Created once at company level
- Allocated to sites via `AssetSite` junction table
- `companyId` is the single source of truth
- `siteId` maintained for backward compatibility

## Data Models

### Junction Tables

#### EmployeeSite
Links company-level employees to sites.

```typescript
{
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName: string;
  companyId: string;
  masterAccountId: string;
  role?: string; // Site-specific role override
  linkedAt: Timestamp;
  linkedBy: string;
  unlinkedAt?: Timestamp;
  unlinkedBy?: string;
  isActive: boolean;
}
```

#### AssetSite
Links company-level assets to sites.

```typescript
{
  assetId: string;
  assetName: string;
  assetType: string;
  siteId: string;
  siteName: string;
  companyId: string;
  masterAccountId: string;
  allocatedAt: Timestamp;
  allocatedBy: string;
  deallocatedAt?: Timestamp;
  deallocatedBy?: string;
  isActive: boolean;
  allocationNotes?: string;
}
```

## Access Patterns

### Master Users
- **Scope**: All data within their company
- **Access**: All sites in the company
- **Can**: Switch companies, manage company profile, view all employees/assets

```typescript
// Query pattern for Master users
where('companyId', '==', user.currentCompanyId)
```

### Site Users (Planner, Supervisor, etc.)
- **Scope**: Single site
- **Access**: Only their assigned site
- **Cannot**: See data from other sites in the company

```typescript
// Query pattern for site users
where('siteId', '==', user.siteId)
```

### Subcontractors
- **Scope**: Multiple sites (where they have assets or are linked)
- **Access**: Only sites where:
  1. Their assets are allocated (via AssetSite.isActive = true)
  2. They are formally linked (via SubcontractorSite)
- **Cannot**: See data from sites without active relationship

```typescript
// Query pattern for subcontractors
// First, get allowed site IDs
const allowedSites = await getSubcontractorSiteAccess({ subcontractorId });

// Then query with site restriction
where('siteId', 'in', allowedSites)
```

## Timesheet Visibility (EPH)

### Site Master Actions
- Generate EPH timesheets
- Send timesheets to subcontractors via the app
- View all timesheets for their site

### Subcontractor Capabilities
- View timesheets **per site** (filtered by site access)
- Filter by:
  - Site (only sites they have access to)
  - Asset (only their assets)
  - Date range
  - Project
  - Billing status
- Acknowledge, export, or dispute based on permissions

### Filtering Logic

```typescript
// EPH Timesheet filtering for subcontractors
const timesheets = await getFilteredEPHTimesheets({
  userRole: 'Subcontractor',
  userId: subcontractorId,
  allowedSiteIds: await getSubcontractorSiteAccess({ subcontractorId }),
  assetId: 'optional-asset-filter',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});
```

## Implementation Guidelines

### 1. Always Check Site Access

Before displaying any data, verify the user has access:

```typescript
import { canAccessSiteData } from '@/utils/dataVisibilityRules';

const hasAccess = canAccessSiteData({
  userRole: user.role,
  userCompanyId: user.companyId,
  userSiteId: user.siteId,
  targetSiteId: data.siteId,
  targetCompanyId: data.companyId,
  allowedSiteIds: allowedSites, // For subcontractors
});

if (!hasAccess) {
  // Don't show data
  return null;
}
```

### 2. Build Queries with Proper Constraints

Use the helper functions to build queries:

```typescript
import { buildTimesheetQueryConstraints } from '@/utils/dataVisibilityRules';

const constraints = buildTimesheetQueryConstraints({
  userRole: user.role,
  userId: user.id,
  siteId: user.siteId,
  companyId: user.companyId,
  isSubcontractor: user.type === 'subcontractor',
  allowedSiteIds: allowedSites,
});

const timesheetsQuery = query(
  collection(db, 'plantAssetTimesheets'),
  ...constraints
);
```

### 3. Enforce Cross-Company Isolation

For any cross-company interactions (except marketplace):

```typescript
import { enforceCrossCompanyIsolation } from '@/utils/dataVisibilityRules';

const canView = enforceCrossCompanyIsolation({
  userCompanyId: user.companyId,
  targetCompanyId: asset.companyId,
  isMarketplaceContext: false, // Set to true for marketplace
});

if (!canView) {
  // Block access
  throw new Error('Cross-company access denied');
}
```

## Marketplace Special Rules

### Asset Visibility in Marketplace

Assets in the marketplace follow different rules:

1. **Marketplace must reflect real-time asset status:**
   - If `siteId` exists (via AssetSite.isActive) → asset is **allocated**
   - If no `siteId` → asset is **available**
   - Marketplace users can see if assets are currently deployed or free

2. **Marketplace visibility is VAS-controlled:**
   - `isAvailableForMarketplace`: Boolean toggle
   - `marketplaceVisibility`: 'internal' | 'marketplace' | 'both'
   - Only assets with marketplace visibility enabled appear to other companies

3. **Companies cannot see each other's internal assets:**
   - Internal assets (`marketplaceVisibility: 'internal'`) are never cross-company visible
   - Only marketplace assets are visible to other companies

### Querying Marketplace Assets

```typescript
// Get marketplace assets (cross-company)
const marketplaceAssets = await query(
  collection(db, 'plantAssets'),
  where('isAvailableForMarketplace', '==', true),
  where('marketplaceVisibility', 'in', ['marketplace', 'both']),
  where('companyId', '!=', user.companyId) // Exclude own company
);

// Check real-time availability
for (const asset of marketplaceAssets) {
  const isAllocated = await isAssetAllocated(asset.id);
  asset.availability = isAllocated ? 'allocated' : 'available';
}
```

## Testing Checklist

When implementing data visibility:

- [ ] Master users can see all company data
- [ ] Site users can only see their site data
- [ ] Subcontractors can only see data for sites with active relationships
- [ ] Cross-company data is properly isolated
- [ ] Marketplace shows correct real-time asset status
- [ ] EPH timesheets are filtered by site access
- [ ] Asset allocation/deallocation updates visibility correctly
- [ ] Employee site linking works as expected

## Security Considerations

1. **Never trust client-side filtering alone**: Always enforce at query level
2. **Use Firestore Security Rules**: Complement app-level checks with database rules
3. **Log access attempts**: Track who accesses what data
4. **Validate site access**: Before any write operation, verify user has permission
5. **Rate limit queries**: Prevent abuse of data access APIs

## Migration Notes

### Backward Compatibility

The system maintains backward compatibility with existing site-based code:

- `siteId` field is still present in Employee and PlantAsset types
- Existing queries using `siteId` continue to work
- New queries should use junction tables for more flexible access control

### Migration Path

1. **Phase 1**: Add junction tables alongside existing fields
2. **Phase 2**: Populate junction tables from existing data
3. **Phase 3**: Update queries to use junction tables
4. **Phase 4**: Deprecate direct `siteId` usage (keep for compatibility)

## Summary

The data visibility system ensures:
- ✅ Site-based access control for all users
- ✅ Subcontractors see only relevant site data
- ✅ Cross-company data isolation (except marketplace)
- ✅ Real-time asset status in marketplace
- ✅ EPH timesheet filtering by site
- ✅ Company-level ownership with site allocation
- ✅ Backward compatibility with existing code
