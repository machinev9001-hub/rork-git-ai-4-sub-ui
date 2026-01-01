# Plant Asset Marketplace & VAS System

## Overview
The Plant Asset Marketplace is a centralized platform where Free users can list their plant assets for hire, and Enterprise users can view and access these assets through VAS (Value Added Service) activation.

## Account Type Functionality

### Free Account Capabilities
1. **Asset Database Management**
   - Can load and manage plant assets within their account
   - Full CRUD operations on their own assets
   - Assets stored in the `plantAssets` collection

2. **Marketplace Toggle**
   - Each plant asset has an `isAvailableForVAS` boolean field
   - Free users can toggle this field per asset to make it available in the marketplace
   - Assets with `isAvailableForVAS: true` appear in the marketplace for all users

3. **Visibility**
   - Can view marketplace but with **restricted information**
   - Cannot see full owner/contact details of other assets
   - Asset IDs are masked (e.g., `***1234`)
   - Owner names are hidden (`***`)

### Enterprise Account Capabilities
1. **Full Marketplace Access**
   - View all plant assets in the database across all users
   - See complete asset details including:
     - Full asset ID
     - Owner company name
     - Full address/location
     - Contact information (when VAS activated)

2. **VAS Activation**
   - VAS must be activated to unlock full asset details
   - Without VAS: Basic view with masked information
   - With VAS: Complete owner and contact details revealed

## Database Structure

### PlantAsset Fields for Marketplace
```typescript
interface PlantAsset {
  id: string;
  assetId: string;
  type: string;
  typeId: string;
  groupId: string;
  plantNumber?: string;
  registrationNumber?: string;
  
  // Ownership
  ownerId: string; // companyId or subcontractorId
  ownerType: 'company' | 'subcontractor';
  ownerCompanyId?: string;
  ownerCompanyName?: string;
  ownerProvince?: string; // Stored at asset level OR inherited from company
  ownerAddress?: string;
  
  // Allocation Status
  allocationStatus: 'UNALLOCATED' | 'ALLOCATED' | 'IN_TRANSIT';
  siteId?: string | null;
  
  // Marketplace Availability
  isAvailableForVAS: boolean; // Toggle to show/hide in marketplace
  
  // Standard fields
  masterAccountId: string;
  companyId?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### Company Geographic Settings
```typescript
interface Company {
  // ... existing fields
  
  // Geographic Availability for Marketplace
  plantAvailabilityProvince?: string; // Province/County where assets available
  plantAvailabilityRadiusKm?: number; // Radius in KM from company location
  plantAvailabilityGeoType?: 'province' | 'radius'; // Type of geographic filter
}
```

## Marketplace Display Logic

### Global Asset View
**Shows ALL plant assets in the database across all companies**

Query:
```typescript
const assetsQuery = query(collection(db, 'plantAssets'));
const assetsSnapshot = await getDocs(assetsQuery);
```

Purpose: Enterprise users can see the full scope of assets available in the entire system.

### Availability Filter
**Filter assets marked as available for hire**

Filter logic:
```typescript
const availableAssets = allAssets.filter(asset => 
  asset.isAvailableForVAS === true
);
```

This ensures only assets explicitly toggled by owners appear in the "Available Assets" view.

### Availability Status Display
Each asset displays one of two states:

1. **Allocated** - Currently assigned or in use
   - `allocationStatus === 'ALLOCATED'`
   - Color: Red (#EF4444)
   - Status text: "Allocated"

2. **Available** - Free for hire
   - `allocationStatus === 'UNALLOCATED'` or `allocationStatus === 'IN_TRANSIT'`
   - Color: Green (#10B981)
   - Status text: "Available"

### Marketplace Asset Card Information

Each asset card shows:

1. **Type** - Asset type name (e.g., Excavator, Crane, Loader)
2. **Location** - Based on:
   - `asset.ownerProvince` (preferred)
   - OR `asset.ownerAddress` (parsed to show province/region)
   - OR owner company's registered location
3. **Asset ID** - Full or masked based on VAS access
4. **Owner Name** - Full or masked based on VAS access
5. **Availability Badge** - Allocated/Available with color coding

### Information Masking (Without VAS)

```typescript
// Asset ID - show only last 4 characters
assetId: hasVasAccess ? asset.assetId : `***${asset.assetId.slice(-4)}`

// Owner Name - fully masked
ownerName: hasVasAccess ? asset.ownerCompanyName : '***'

// Location - show only province/region
location: hasVasAccess 
  ? asset.ownerAddress // Full address
  : asset.ownerProvince // Province only
```

## Geographic Availability Settings

### Configuration Location
**Settings → Company Profile → Assets & Pool**

### Option 1: Province/County Selection
```typescript
{
  plantAvailabilityGeoType: 'province',
  plantAvailabilityProvince: 'Gauteng' // Example
}
```

- User selects their province/county from a dropdown
- All assets from this company are considered available within this province
- Marketplace can filter to show only assets in specific provinces

### Option 2: Radius from Company Location
```typescript
{
  plantAvailabilityGeoType: 'radius',
  plantAvailabilityRadiusKm: 400 // Example: 400km radius
}
```

- User defines radius in kilometers from company's registered address
- System calculates geographic range
- Future enhancement: Can use geocoding to calculate distances

### Geographic Filtering in Marketplace

Enterprise users can filter marketplace by:
```typescript
// Filter by province
if (currentCompany.plantAvailabilityGeoType === 'province') {
  filtered = allAssets.filter(asset => 
    asset.ownerProvince === currentCompany.plantAvailabilityProvince
  );
}

// Filter by radius (future)
if (currentCompany.plantAvailabilityGeoType === 'radius') {
  // Calculate distance between company location and asset owner location
  // Filter assets within the specified radius
}
```

## UI Components

### 1. Marketplace View (`app/plant-asset-marketplace.tsx`)
**Shows:**
- VAS activation status banner
- Filter toggle: "All Assets" vs "Available Only"
- Statistics cards:
  - Total in Database
  - Available for Hire
  - In Current View
- Grouped asset listings by:
  - Asset Group (expandable)
  - Asset Type (expandable)
  - Individual Assets (cards)

### 2. Asset Toggle (Free Users)
**Location:** Asset management screen / Asset detail view

**Functionality:**
```typescript
await updateDoc(doc(db, 'plantAssets', assetId), {
  isAvailableForVAS: !currentValue,
  updatedAt: serverTimestamp()
});
```

**UI:**
- Toggle switch/button
- Label: "Available in Marketplace"
- Description: "Make this asset visible to Enterprise clients"

### 3. Geographic Settings (Company Settings)
**Location:** Settings → Company Profile

**Form Fields:**
```typescript
<RadioGroup value={geoType} onChange={setGeoType}>
  <Radio value="province">Province/County</Radio>
  <Radio value="radius">Radius from Location</Radio>
</RadioGroup>

{geoType === 'province' && (
  <Dropdown
    options={provinces}
    value={selectedProvince}
    onChange={setSelectedProvince}
  />
)}

{geoType === 'radius' && (
  <Input
    type="number"
    value={radiusKm}
    onChange={setRadiusKm}
    placeholder="e.g., 400"
    suffix="km"
  />
)}
```

### 4. VAS Activation Prompt
**Triggered when:** Non-VAS user taps on asset card

**Alert:**
```
Title: VAS Activation Required
Message: To view full asset details including owner information, 
         please activate the VAS (Value Added Service) feature.

Buttons:
- Cancel
- Activate VAS (→ VAS activation flow)
```

## Query Requirements

### Index 1: All Assets (Global View)
**Collection:** `plantAssets`
**Fields:**
- None required (full collection scan)

**Purpose:** Load all assets globally for marketplace

### Index 2: Available Assets Filter
**Collection:** `plantAssets`
**Fields:**
- `isAvailableForVAS` (Ascending)
- `createdAt` (Descending)

**Query:**
```typescript
query(
  collection(db, 'plantAssets'),
  where('isAvailableForVAS', '==', true),
  orderBy('createdAt', 'desc')
)
```

### Index 3: Assets by Province
**Collection:** `plantAssets`
**Fields:**
- `ownerProvince` (Ascending)
- `isAvailableForVAS` (Ascending)
- `createdAt` (Descending)

**Query:**
```typescript
query(
  collection(db, 'plantAssets'),
  where('ownerProvince', '==', selectedProvince),
  where('isAvailableForVAS', '==', true),
  orderBy('createdAt', 'desc')
)
```

## Workflows

### Free User: Adding Asset to Marketplace
1. Navigate to "My Plant Assets"
2. Select an asset
3. Toggle "Available in Marketplace" ON
4. Asset now visible globally with `isAvailableForVAS: true`

### Enterprise User: Browsing Marketplace (Without VAS)
1. Navigate to "Plant Asset Marketplace"
2. View banner: "VAS Not Activated"
3. See all assets with masked information:
   - Asset type and group visible
   - Location shows province only
   - Asset ID masked to last 4 digits
   - Owner name shows as `***`
4. Toggle filter to show "Available Only"
5. Apply geographic filter (if configured)
6. Tap asset → Prompt to activate VAS

### Enterprise User: Browsing Marketplace (With VAS)
1. Navigate to "Plant Asset Marketplace"
2. View banner: "VAS Activated"
3. See all assets with full details:
   - Complete asset ID
   - Full owner name and company
   - Complete address
   - Contact information
4. Apply filters as needed
5. Tap asset → View full details and contact owner

### Company: Configuring Geographic Availability
1. Navigate to Settings → Company Profile
2. Scroll to "Assets & Pool" section
3. Select availability type:
   - **Province**: Choose from dropdown
   - **Radius**: Enter kilometers (e.g., 400)
4. Save settings
5. All company's assets inherit this availability zone

## Business Rules

### Asset Visibility Rules
1. **All assets** are visible in marketplace global view
2. Only assets with `isAvailableForVAS: true` show in "Available" filter
3. Asset detail masking depends on VAS activation, not account type
4. Free users can see their own assets fully, others are masked

### Allocation vs Availability
- An asset can be `isAvailableForVAS: true` but `allocationStatus: 'ALLOCATED'`
- This means: "We hire out this asset, but it's currently in use"
- Marketplace shows both status indicators
- Available filter only shows `isAvailableForVAS: true`
- Enterprise users can see the asset is allocated and when it might be free

### Geographic Rules
1. Geographic settings apply to **all assets** owned by a company
2. Individual asset location (if set) takes precedence over company location
3. Assets without specific location inherit company's province/address
4. Radius filtering requires geocoding (future enhancement)

### VAS Access Rules
1. VAS is activated per company (not per user)
2. All users within a VAS-enabled company see full details
3. Free accounts cannot activate VAS
4. VAS unlocks:
   - Full asset IDs
   - Owner names and company details
   - Contact information
   - Full addresses

## Statistics Displayed

### Marketplace Dashboard Stats
1. **Total in Database** - Count of all `plantAssets` documents
2. **Available for Hire** - Count where `isAvailableForVAS === true` AND `allocationStatus !== 'ALLOCATED'`
3. **In Current View** - Count after all filters applied

### Per Asset Group/Type
- Number of assets in each group
- Number of types within each group
- Number of assets per type

## Future Enhancements

### Phase 2: Advanced Features
1. **Contact Owner** - Direct messaging or email to asset owner
2. **Request Quote** - Submit hire request with dates and details
3. **Booking System** - Reserve assets for future dates
4. **Ratings & Reviews** - Rate assets and owners after hire
5. **Asset Comparison** - Compare multiple similar assets side-by-side

### Phase 3: Geographic Enhancements
1. **Map View** - Show assets on an interactive map
2. **Distance Calculation** - Calculate actual distance from user's location
3. **Radius Filtering** - Filter assets within X km of a specific location
4. **Multi-Province Selection** - Select multiple provinces

### Phase 4: Advanced Matching
1. **Asset Recommendations** - Suggest assets based on user's needs
2. **Availability Calendar** - Show when allocated assets will be free
3. **Price Estimates** - Show typical hire rates (if provided)
4. **Bulk Hire** - Request multiple assets at once

## Implementation Status

### ✅ Completed
- [x] Global asset view (all assets across database)
- [x] `isAvailableForVAS` field for marketplace toggle
- [x] Availability status display (Allocated/Available)
- [x] Information masking for non-VAS users
- [x] Filter toggle (All Assets / Available Only)
- [x] Grouped display by asset group and type
- [x] Geographic settings in Company type
- [x] Province-based filtering

### 🚧 In Progress
- [ ] Asset toggle UI for Free users to mark assets as available
- [ ] Geographic settings UI in Company Profile
- [ ] VAS activation flow
- [ ] Asset detail view with full information

### 📋 Planned
- [ ] Radius-based geographic filtering
- [ ] Map view for assets
- [ ] Contact owner functionality
- [ ] Booking/request system

## Testing Scenarios

### Test 1: Free User Lists Asset
1. Login as Free account user
2. Create/edit a plant asset
3. Toggle "Available in Marketplace" ON
4. Verify `isAvailableForVAS: true` in Firestore
5. Check asset appears in marketplace

### Test 2: Enterprise Without VAS Views Marketplace
1. Login as Enterprise account (VAS not activated)
2. Navigate to Plant Asset Marketplace
3. Verify VAS banner shows "Not Activated"
4. Verify asset details are masked
5. Tap asset → Verify VAS activation prompt

### Test 3: Enterprise With VAS Views Full Details
1. Activate VAS for Enterprise account
2. Navigate to Plant Asset Marketplace
3. Verify VAS banner shows "Activated"
4. Verify full asset details visible
5. Verify owner information revealed

### Test 4: Geographic Filtering
1. Set company province to "Gauteng"
2. Create assets with `ownerProvince: "Gauteng"` and "Western Cape"
3. Apply province filter
4. Verify only Gauteng assets shown

### Test 5: Availability Filter
1. Create assets with various `isAvailableForVAS` and `allocationStatus` values
2. Toggle "Available Only" filter
3. Verify only `isAvailableForVAS: true` shown
4. Verify both Allocated and Available statuses display correctly

## Related Documentation
- [Plant Asset Allocation System](./PLANT-ASSET-ALLOCATION-SYSTEM.md)
- [Plant Asset Allocation Ready](./PLANT-ASSET-ALLOCATION-READY.md)
- [Account Types Guide](./ACCOUNT_TYPES_GUIDE.md)
- [VAS Management](../app/vas-management.tsx)
