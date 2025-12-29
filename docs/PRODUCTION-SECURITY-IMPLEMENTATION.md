# Production Security Implementation

## Overview
This document outlines the production-ready security implementation for account types and feature flags in the Machine Business Management system.

## Changes Made

### 1. Firebase Security Rules (firestore.rules)

#### Helper Functions Added
```javascript
getAccountType(masterAccountId) - Fetches account type from masterAccounts
getVASFeatures(masterAccountId) - Fetches VAS features array
isEnterprise(masterAccountId) - Checks if account is enterprise
hasVASFeature(masterAccountId, featureId) - Checks for specific VAS feature
canAccessReporting(masterAccountId) - Validates reporting access
canAccessDataExports(masterAccountId) - Validates export access
canAccessAnalytics(masterAccountId) - Validates analytics access
canAccessAdvancedIntegrations(masterAccountId) - Validates integrations access
hasBasicAccess(masterAccountId) - Validates masterAccountId exists
```

#### Secured Collections

**Premium Feature Collections:**
- `exportJobs` - Requires enterprise OR data_exports VAS
- `agreedTimesheets` - Requires enterprise OR reporting VAS
- `pendingTimesheetEdits` - Requires enterprise OR reporting VAS
- `ephAgreements` - Requires enterprise OR reporting VAS
- `progressReports` - Requires enterprise OR reporting VAS
- `boqProgress` - Requires enterprise OR analytics VAS

**MasterAccounts Collection:**
- Read: Public (for login)
- Create: Public (for activation/signup)
- Update: Restricted to accountType, vasFeatures, currentCompanyId fields only
- Delete: Blocked

### 2. VAS Management (app/vas-management.tsx)

#### Real-Time Firebase Sync
- VAS subscriptions now sync directly to Firebase
- Updates masterAccounts document with vasFeatures array
- Changes are immediately enforced by security rules
- Loading states and error handling implemented

#### Features:
- Subscribe/unsubscribe to individual VAS features
- Real-time UI updates
- Firebase transaction support
- Error recovery

### 3. Required Document Fields

All documents in secured collections MUST include:
```typescript
{
  masterAccountId: string; // Required for security checks
  // ... other fields
}
```

**Collections requiring masterAccountId:**
- exportJobs
- agreedTimesheets
- pendingTimesheetEdits
- ephAgreements
- progressReports
- boqProgress

## Firebase Indexes

### No Additional Indexes Required ✓

The security rules use `get()` for direct document reads, which don't require composite indexes. The existing indexes in `firestore.indexes.json` are sufficient for query operations.

### Existing Indexes to Verify

Ensure these collections have proper indexes for your app queries (already in firestore.indexes.json):
- exportJobs: companyId, masterAccountId, siteId, createdAt
- agreedTimesheets: masterAccountId, companyId, siteId, weekEnding
- ephAgreements: masterAccountId, companyId, siteId, status

## Security Rule Performance

### Get() Calls
The security rules use `get()` to fetch masterAccount documents. Performance considerations:

**Cost:** Each secured operation incurs 1 additional document read
- Read operation on exportJobs: 1 read (data) + 1 read (masterAccount) = 2 reads
- Write operation on agreedTimesheets: 1 write + 1 read (masterAccount) = 1 write + 1 read

**Optimization:** 
- masterAccounts documents are small (only accountType and vasFeatures checked)
- Firebase caches security rule `get()` calls within the same transaction
- Batch operations benefit from single security check per masterAccountId

**Quota Impact:**
- Low - masterAccounts are rarely modified
- Typical: 2-3 reads per premium feature operation
- Acceptable for production use

## Deployment Checklist

### Before Deploying

1. **Update Firebase Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Verify Rules in Firebase Console:**
   - Go to Firebase Console → Firestore → Rules
   - Check that rules deployed successfully
   - Test rules using Rules Playground

3. **Test with Free Account:**
   - Create/use free account
   - Verify locked features show FeatureLocked component
   - Attempt to subscribe to VAS feature
   - Verify subscription syncs to Firebase
   - Test that feature becomes accessible

4. **Test with Enterprise Account:**
   - Verify all features accessible
   - No VAS subscription UI shown
   - All premium collections accessible

### After Deploying

1. **Monitor Firebase Console:**
   - Check for permission denied errors
   - Monitor read/write counts
   - Watch for unexpected security rule failures

2. **Test All Premium Features:**
   - [ ] Data exports (exportJobs collection)
   - [ ] Agreed timesheets (agreedTimesheets collection)
   - [ ] EPH agreements (ephAgreements collection)
   - [ ] Progress reports (progressReports collection)
   - [ ] BOQ analytics (boqProgress collection)

3. **Verify Error Messages:**
   - Users without access should see clear error messages
   - FeatureLocked component should display correctly
   - Subscription flow should work smoothly

## Account Type Management

### Setting Account Type

**For New Accounts (via Activation):**
```typescript
// In activation flow
{
  accountType: 'enterprise', // or 'free'
  vasFeatures: [], // empty for new accounts
}
```

**For Existing Accounts (Manual Update):**
```typescript
// Update masterAccounts document
await updateDoc(doc(db, 'masterAccounts', masterAccountId), {
  accountType: 'enterprise', // or 'free'
  updatedAt: serverTimestamp()
});
```

### VAS Features Management

**Subscribe to Feature:**
```typescript
const newFeatures = [...currentFeatures, 'analytics'];
await updateDoc(doc(db, 'masterAccounts', masterAccountId), {
  vasFeatures: newFeatures,
  updatedAt: serverTimestamp()
});
```

**Unsubscribe from Feature:**
```typescript
const newFeatures = currentFeatures.filter(f => f !== 'analytics');
await updateDoc(doc(db, 'masterAccounts', masterAccountId), {
  vasFeatures: newFeatures,
  updatedAt: serverTimestamp()
});
```

## Feature Flags Mapping

| Feature Flag | Collection Access | VAS Feature ID |
|-------------|------------------|----------------|
| analytics | boqProgress | analytics |
| reporting | progressReports, agreedTimesheets, pendingTimesheetEdits, ephAgreements | reporting |
| data_exports | exportJobs | data_exports |
| advanced_integrations | (future) | advanced_integrations |
| custom_branding | (future) | custom_branding |
| priority_support | (future) | priority_support |

## Error Handling

### Common Errors

**Permission Denied:**
```
FirebaseError: Missing or insufficient permissions
```
**Cause:** User account lacks required accountType or VAS feature
**Solution:** Verify masterAccountId on document, check account status

**Missing masterAccountId:**
```
FirebaseError: Invalid document reference
```
**Cause:** Document missing masterAccountId field
**Solution:** Always include masterAccountId when creating secured documents

### Client-Side Validation

Before writing to secured collections:
```typescript
import { isFeatureEnabled } from '@/utils/featureFlags';

const canAccess = isFeatureEnabled(
  'data_exports',
  user.accountType,
  user.vasFeatures
);

if (!canAccess) {
  // Show FeatureLocked component or prevent action
  Alert.alert('Feature Locked', getFeatureLockedMessage('Data Exports'));
  return;
}

// Proceed with operation
```

## Payment Integration (Future)

### Required for Production

Current implementation uses demo alerts for payment. Production requires:

1. **Payment Provider Integration:**
   - Stripe, PayPal, or similar
   - Handle subscription lifecycle
   - Webhook endpoints for payment events

2. **Backend Functions:**
   - Process payment confirmations
   - Update masterAccounts with VAS features
   - Handle subscription renewals/cancellations

3. **Subscription Management:**
   - Track subscription status
   - Handle grace periods
   - Send expiration notifications
   - Auto-disable expired VAS features

### Implementation Steps

1. Set up payment provider (e.g., Stripe)
2. Create Firebase Cloud Functions for:
   - Payment processing
   - Subscription webhooks
   - Feature activation/deactivation
3. Update vas-management.tsx to redirect to payment flow
4. Add subscription status monitoring
5. Implement automatic feature disabling on expiration

## Security Best Practices

### Do's ✓
- Always include masterAccountId in secured documents
- Use FeatureLocked component for locked features
- Validate access client-side before operations
- Monitor Firebase usage for unauthorized access attempts
- Keep security rules updated with new collections

### Don'ts ✗
- Don't trust client-side checks alone
- Don't store sensitive payment info in Firestore
- Don't bypass security rules with admin SDK in client
- Don't expose account upgrade logic client-side
- Don't allow users to set their own accountType

## Monitoring & Maintenance

### Weekly Checks
- Review Firebase usage metrics
- Check for permission denied errors
- Monitor VAS subscription changes
- Verify payment webhook success rate

### Monthly Reviews
- Audit account types and VAS features
- Review security rule performance
- Update pricing/features as needed
- Check for expired subscriptions

## Support Contacts

For production issues:
- **Security Rules:** Check Firebase Console logs
- **Payment Issues:** Contact payment provider support
- **Account Upgrades:** Email: sales@machineapp.com
- **Technical Support:** See priority_support VAS feature

## Rollback Plan

If security rules cause issues:

1. **Immediate Rollback:**
   ```bash
   # Revert to open rules temporarily
   firebase deploy --only firestore:rules
   ```

2. **Fix Issues:**
   - Identify missing masterAccountId fields
   - Update security rules as needed
   - Test in development environment

3. **Redeploy:**
   ```bash
   firebase deploy --only firestore:rules
   ```

## Version History

- **v1.0 (2025-12-28):** Initial production security implementation
  - Added account type validation
  - Implemented VAS feature checks
  - Secured premium collections
  - Real-time Firebase sync for subscriptions
