# Subcontractor Application UI & Access Architecture

## Overview

This document describes the architecture and implementation of the subcontractor application system within the MACHINE Business Tracker. The subcontractor application is designed to evolve into a full management platform comparable to the existing Project Tracker while maintaining full compatibility with current site-based workflows.

## Key Principles

1. **Non-Breaking**: Existing site-role routing and dedicated UIs must NOT be broken
2. **Company-First**: Subcontractors operate as independent companies with company-level data ownership
3. **Free-First Model**: Free by default with feature restrictions, upgradeable via subscriptions and VAS
4. **Optional Access**: Master Company Profile access is controlled by the `canAccessMasterCompanyProfile` flag
5. **Site-Based Security**: All data access governed by SiteId indexing with explicit grants

## Architecture Components

### 1. Account Model

#### Master Account
- Independent company identity
- Owns employees and plant assets at company level
- Manages own billing and subscriptions
- Can own multiple companies

#### Account Types
- **Free Account**: Basic features, VAS upgradeable
- **Enterprise Account**: All features included, activation code required

### 2. Subscription Flow

The onboarding flow follows this sequence:

1. **Identity Creation**: User creates login account (no company/site/permissions)
2. **Subscription Selection**: Choose Free or Enterprise
   - Free: Auto-generates activation code
   - Enterprise: Requires activation code input
3. **First Company Creation**: Mandatory - user becomes Master Account Holder
4. **Industry Selection**: Post-creation configuration (not pre-access gate)

### 3. Routing & Access Control

#### Priority Order (Post-Login)
```
IF canAccessMasterCompanyProfile = true:
  Route to Company Selection / Master Company Profile
ELSE:
  Apply existing site-role routing logic (unchanged)
```

#### Routing Logic for Master Users
```
1. No companies → /company-setup
2. Has companies, none selected → /company-selector
3. Has selected company, has canAccessMasterCompanyProfile, no site → /master-company-profile
4. Has selected company and site → /(tabs)
5. Has selected company, no canAccessMasterCompanyProfile, no site → /master-sites
```

### 4. Data Model

#### User Type Extensions
```typescript
type User = {
  // ... existing fields
  canAccessMasterCompanyProfile?: boolean; // Flag for Master Company Profile access
  accessScope?: AccessScope; // 'company-level' | 'all-sites' | 'selected-sites' | 'no-sites'
}
```

#### Company Type Extensions
```typescript
type Company = {
  // ... existing fields
  accountType?: AccountType; // Company account type
  subscriptionTier?: 'free' | 'basic' | 'premium' | 'enterprise';
  vasFeatures?: VASFeatureId[]; // Active VAS features
  billingEmail?: string;
  subscriptionStartDate?: any;
  subscriptionEndDate?: any;
}
```

#### Employee Model (Company-Level)
```typescript
type Employee = {
  // ... existing fields
  companyId: string; // Company-level ownership (required)
  siteId?: string; // DEPRECATED: Use EmployeeSiteLink instead
  accessScope?: AccessScope;
  canAccessMasterCompanyProfile?: boolean;
}

// Many-to-many employee-site relationship
type EmployeeSiteLink = {
  id?: string;
  employeeId: string;
  siteId: string;
  companyId: string;
  isActive: boolean;
  assignedAt: any;
  assignedBy: string;
  removedAt?: any;
  removedBy?: string;
}
```

#### Plant Asset Model (Company-Level)
```typescript
type PlantAsset = {
  // ... existing fields
  companyId: string; // Company-level ownership (required)
  siteId?: string | null; // DEPRECATED: Use PlantAssetAllocation instead
  internalAllocationEnabled?: boolean; // Can be allocated to own sites
  marketplaceVisibilityEnabled?: boolean; // Listed in marketplace (VAS-gated)
}

// Asset allocation tracking
type PlantAssetAllocation = {
  id?: string;
  assetId: string;
  companyId: string;
  siteId: string;
  isActive: boolean; // Current allocation or historical
  allocatedAt: any;
  allocatedBy: string;
  deallocatedAt?: any;
  deallocatedBy?: string;
}

// Marketplace listings
type MarketplaceListing = {
  id?: string;
  assetId: string;
  companyId: string; // Owner company
  availability: 'available' | 'currently_allocated' | 'maintenance';
  currentAllocationSiteId?: string;
  isActive: boolean;
}
```

### 5. Master Company Profile

Central hub for company-level management, accessible only to users with `canAccessMasterCompanyProfile = true`.

#### Features
- **Employee Management**: Create, manage, and assign employees to sites
- **Plant Asset Management**: Create, manage, and allocate assets to sites
- **Subscription & VAS**: Manage subscriptions and value-added services
- **Billing & Accounts**: Company-level billing management
- **Marketplace**: List assets for hire (VAS-gated)
- **Company Settings**: Update company details

#### Navigation
- Route: `/master-company-profile`
- Accessible from company selector after company selection
- Can navigate to `/master-sites` to select/manage sites

### 6. Employee Management Workflow

#### Creation Flow
1. Navigate to `/company-employees`
2. Create employee at company level (companyId required, no siteId)
3. Assign role(s) and access control toggles
4. Define access scope:
   - **company-level**: Access Master Company Profile
   - **all-sites**: Access all company sites
   - **selected-sites**: Access specific sites (via EmployeeSiteLink)
   - **no-sites**: No site access

#### Site Assignment
- Employees assigned to sites via EmployeeSiteLink collection
- Can be assigned from Company Profile or Site UI
- Employees never recreated per site
- Query pattern: `WHERE companyId = ? AND employeeId IN (SELECT employeeId FROM EmployeeSiteLink WHERE siteId = ? AND isActive = true)`

### 7. Plant Asset Management Workflow

#### Creation Flow
1. Navigate to `/company-assets`
2. Create asset at company level (companyId required, no siteId)
3. Set internal allocation toggle (default: enabled)
4. Set marketplace visibility toggle (requires VAS)

#### Allocation Workflow
1. From site: Allocate asset from company pool
2. Create PlantAssetAllocation record with siteId
3. Asset status becomes `ALLOCATED`
4. Site-level operational data (hours, EPH, breakdowns) continues unchanged

#### De-Establishment Workflow
1. User triggers "De-Establish Asset" action from site
2. System deactivates PlantAssetAllocation record
3. Asset status set to `UNALLOCATED` or `AVAILABLE`
4. Asset becomes eligible for reassignment or marketplace visibility

#### Marketplace Rules
- Only visible if `marketplaceVisibilityEnabled = true`
- Shows availability status:
  - `available`: No active allocation
  - `currently_allocated`: Has active siteId allocation
  - `maintenance`: Under maintenance
- Cross-company visibility ONLY through marketplace
- Marketplace access is explicit, monetized, permission-based

### 8. Site-Based Data Access

All subcontractor data visibility governed by SiteId indexing:

#### Access Chain
```
Site → Company → Asset → Timesheet/EPH
```

#### Rules
- Subcontractors can only see data for sites where:
  - Their assets are allocated, OR
  - They are formally linked via EmployeeSiteLink
- No global visibility unless explicitly granted
- Timesheets filtered by site
- EPH data filtered by site

### 9. Implementation Status

#### ✅ Completed
- Type definitions for all data models
- Master Company Profile screen structure
- Company-level employee listing UI
- Company-level asset listing UI
- Routing logic with canAccessMasterCompanyProfile flag
- Account type selection flow (already existed)
- Activation code flow for free vs enterprise (already existed)

#### 🔄 In Progress
- Employee-site linking implementation
- Asset allocation workflow
- De-establishment workflow
- Marketplace visibility implementation

#### ⏳ Pending
- Firebase security rules updates
- Firestore indexes for new collections
- Employee creation form updates
- Asset creation form updates
- Subscription enforcement logic
- Google Play Store integration
- Testing and validation

## Screens

### New Screens Created
1. **master-company-profile.tsx** - Central hub for company management
2. **company-employees.tsx** - Company-level employee listing
3. **company-assets.tsx** - Company-level asset listing

### Existing Screens (No Changes Required)
- All site-specific screens continue to work as before
- Site-role routing unchanged for existing users
- Dedicated UIs for operators, supervisors, managers, etc. remain intact

## Database Collections

### New Collections Required
- `employeeSiteLinks` - Many-to-many employee-site relationships
- `plantAssetAllocations` - Asset allocation tracking
- `marketplaceListings` - Cross-company asset marketplace

### Modified Collections
- `users` - Added `canAccessMasterCompanyProfile`, `accessScope`
- `companies` - Added subscription and VAS fields
- `employees` - Made `siteId` optional, added `companyId` required, added access fields
- `plantAssets` - Made `siteId` optional, added `companyId` required, added marketplace fields

## Security Considerations

1. **Firestore Rules**: Update to enforce company-level ownership
2. **Site Access**: Strictly enforce site-based visibility
3. **Marketplace**: Explicit permission-based cross-company access only
4. **VAS Gating**: Enforce subscription tier restrictions
5. **Employee Access**: Respect canAccessMasterCompanyProfile flag

## Migration Strategy

### Backward Compatibility
- Existing employees with `siteId` continue to work
- Existing assets with `siteId` continue to work
- New indexing via link tables runs in parallel
- No data loss or breaking changes

### Gradual Migration
1. Add new fields as optional
2. Create link tables for new records
3. Backfill link tables for existing records
4. Dual-read from both sources during transition
5. Eventually deprecate old fields (long-term)

## Testing Checklist

- [ ] Master account creation flow
- [ ] Free account onboarding
- [ ] Enterprise account onboarding
- [ ] Company selection and switching
- [ ] Master Company Profile navigation
- [ ] Company-level employee creation
- [ ] Employee-site assignment
- [ ] Company-level asset creation
- [ ] Asset allocation to site
- [ ] Asset de-establishment from site
- [ ] Marketplace visibility toggle
- [ ] Marketplace listing accuracy
- [ ] Subscription tier enforcement
- [ ] VAS feature gating
- [ ] Existing site-role routing (no breaks)
- [ ] Offline functionality

## Summary

This architecture provides a clean separation between company-level management and site-specific operations while maintaining full backward compatibility. The `canAccessMasterCompanyProfile` flag acts as a feature gate, ensuring existing users experience no disruption while new subcontractor accounts can leverage the enhanced company-level functionality.

The implementation follows the principle of minimal change - existing code paths remain untouched, and new functionality is additive rather than replacement-based. This ensures zero risk to production stability while enabling powerful new capabilities for subcontractor management.
