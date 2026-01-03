# Free Account Restrictions

## Overview

Free user accounts in the Machine Business Tracker app have restrictions on the number of companies and sites they can create. These restrictions encourage users to upgrade to the Multiple Sites VAS feature or Enterprise accounts for expanded capabilities.

## Restrictions

### 1. Company Profile Limit
- **Free Accounts**: Can create only **1 company profile**
- **Enterprise Accounts**: Unlimited company profiles
- **Free + Multiple Sites VAS**: Unlimited company profiles

### 2. Site Limit
- **Free Accounts**: Can create only **1 active site** per company
- **Enterprise Accounts**: Unlimited sites
- **Free + Multiple Sites VAS**: Unlimited sites

## Multiple Sites VAS Feature

Free users who need to manage multiple sites or company profiles can unlock this capability by subscribing to the **Multiple Sites** Value-Added Service.

### Feature Details
- **Name**: Multiple Sites
- **Price**: $39/month
- **Benefits**:
  - Create unlimited sites
  - Manage multiple company profiles
  - Independent site tracking and reporting
  - Cross-site resource allocation
  - Consolidated multi-site analytics

## User Experience

### When Creating Additional Company
When a Free user attempts to create a second company profile:
1. System detects they already have 1 company
2. A VAS prompt modal appears explaining the restriction
3. User can:
   - Subscribe to Multiple Sites VAS
   - Upgrade to Enterprise account
   - Cancel and work within their existing company

### When Creating Additional Site
When a Free user attempts to create a second active site:
1. System counts active sites (excludes archived/deleted sites)
2. If limit reached, VAS prompt modal appears
3. User can:
   - Subscribe to Multiple Sites VAS
   - Upgrade to Enterprise account
   - Archive an existing site to create a new one
   - Cancel site creation

## Implementation Details

### Company Creation Check
Location: `app/company-setup.tsx`

```typescript
const accountType = masterAccount?.accountType || user?.accountType || 'enterprise';
const vasFeatures = masterAccount?.vasFeatures || user?.vasFeatures || [];
const existingCompanyCount = (masterAccount?.companyIds || user?.companyIds || []).length;

if (accountType === 'free' && existingCompanyCount >= 1 && !vasFeatures.includes('multiple_sites')) {
  // Show VAS prompt modal
  setShowVASModal(true);
  return;
}
```

### Site Creation Check
Location: `app/master-sites.tsx`

```typescript
const accountType = derivedMaster?.accountType || 'enterprise';
const vasFeatures = derivedMaster?.vasFeatures || [];
const activeSites = sitesQuery.data?.filter(s => s.status === 'Active') || [];

if (accountType === 'free' && activeSites.length >= 1 && !vasFeatures.includes('multiple_sites')) {
  // Show VAS prompt modal
  setShowVASModal(true);
  return;
}
```

## Backend Considerations

### Database Structure
- Master accounts and users store `accountType` field ('free' | 'enterprise')
- VAS features stored in `vasFeatures` array (e.g., ['multiple_sites', 'analytics'])
- Companies linked via `companyIds` array
- Sites filtered by `status` field to count only active sites

### Future Enhancements
1. **Server-side Validation**: Enforce limits at API level
2. **Firebase Security Rules**: Add rules to prevent bypassing client-side checks
3. **Usage Analytics**: Track site/company creation attempts
4. **Grace Period**: Allow temporary access during VAS subscription setup
5. **Granular Limits**: Different limits for different free tiers

## Testing

### Test Free Account Company Limit
1. Create a Free master account
2. Create first company profile (should succeed)
3. Attempt to create second company (should show VAS prompt)
4. Subscribe to Multiple Sites VAS
5. Create second company (should succeed)

### Test Free Account Site Limit
1. Login as Free account master
2. Select a company
3. Create first site (should succeed)
4. Attempt to create second site (should show VAS prompt)
5. Archive first site
6. Create new site (should succeed as active count = 0)

### Test Enterprise Account (No Restrictions)
1. Login as Enterprise account master
2. Create multiple companies (should all succeed)
3. Create multiple sites per company (should all succeed)
4. No VAS prompts should appear

## Migration Notes

### Existing Accounts
- Existing accounts default to 'enterprise' for backward compatibility
- No impact on existing Free users until they hit the limit
- Existing sites and companies remain accessible

### Upgrading Free to Enterprise
When a Free account upgrades to Enterprise:
1. `accountType` field updated to 'enterprise'
2. All restrictions immediately removed
3. VAS subscriptions can be cancelled (no longer needed)
4. All existing data remains intact

## UI/UX Guidelines

### VAS Prompt Modal
- Clear explanation of the restriction
- Highlight benefits of Multiple Sites VAS
- Prominent "Activate Feature" button
- Secondary "Upgrade to Enterprise" option
- Easy dismissal with no data loss

### Settings Display
- Show current limits in account settings
- Display "1 of 1 companies" for Free accounts
- Display "X of ∞ companies" for Enterprise
- Clear upgrade path messaging

## Related Documentation
- [Account Types Guide](./ACCOUNT_TYPES_GUIDE.md)
- [VAS Management](./SUPER-ADMIN-VAS-MANAGEMENT.md)
- [User Guide](./USER-GUIDE.md)
- [Feature Flags](./ACCOUNT_TYPES_GUIDE.md#feature-access-matrix)
