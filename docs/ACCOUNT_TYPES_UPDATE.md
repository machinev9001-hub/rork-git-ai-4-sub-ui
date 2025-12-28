# Account Types & Feature Management Update

## Summary

This update adds support for two account types (Enterprise and Free) with a flexible feature flag system and Value-Added Services (VAS) management.

## What's New

### 1. Account Type Selection
- Users can now choose between Enterprise and Free accounts during signup
- New account type selection screen with detailed feature comparison
- Seamless activation flow integration

### 2. Feature Flag System
- Dynamic feature access based on account type
- Support for Value-Added Services (VAS) on Free accounts
- Backward compatible with existing accounts (default to Enterprise)

### 3. VAS Management Screen
- Dedicated UI for managing VAS subscriptions (Free accounts)
- Visual display of available services with pricing
- Subscribe/unsubscribe functionality (UI only)
- Upgrade prompts to Enterprise

### 4. Account Type Display
- Settings screen now shows current account type
- Quick access to VAS management for Free accounts
- Visual badges distinguishing account types

## Files Changed

### New Files
- `app/account-type-selection.tsx` - Account type selection screen
- `app/vas-management.tsx` - VAS management screen
- `components/FeatureLocked.tsx` - Feature lock UI components
- `utils/featureFlags.ts` - Feature flag logic
- `utils/hooks/useFeatureFlags.ts` - React hooks for feature flags
- `docs/ACCOUNT_TYPES_GUIDE.md` - Developer documentation
- `docs/ACCOUNT_TYPES_UPDATE.md` - This file

### Modified Files
- `types/index.ts` - Added AccountType, VASFeatureId, and FeatureFlags types
- `contexts/AuthContext.tsx` - Updated to handle account types and VAS features
- `app/login.tsx` - Updated to navigate to account type selection
- `app/activate.tsx` - Updated to capture selected account type
- `app/setup-master-pin.tsx` - Updated to pass account type to AuthContext
- `app/(tabs)/settings.tsx` - Added account type display and VAS management link
- `.gitignore` - Added package-lock.json

## Feature Access Matrix

### Enterprise Accounts (Unlimited)
✅ All features enabled by default
- Employee & Asset Management
- Time Tracking
- Analytics & Reporting
- Data Exports
- Advanced Integrations
- Custom Branding
- Priority Support
- Task & Progress Management

### Free Accounts (Limited + VAS)
Base features:
- ✅ Employee Management
- ✅ Asset Management
- ✅ External Data Reception
- ✅ Time Tracking

Optional VAS features (subscription required):
- ➕ Advanced Analytics ($49/mo)
- ➕ Advanced Reporting ($39/mo)
- ➕ Data Exports ($29/mo)
- ➕ Advanced Integrations ($59/mo)
- ➕ Custom Branding ($99/mo)
- ➕ Priority Support ($79/mo)

## Usage Examples

### For Users

**Creating an Account:**
1. On the login screen, tap "Create New Account"
2. Choose between Enterprise or Free account
3. Enter your activation code
4. Set up your master PIN
5. Complete company setup

**Managing VAS (Free Accounts):**
1. Go to Settings
2. Tap "Value-Added Services" under Account
3. Browse available services
4. Tap "Subscribe" on desired features
5. Follow payment flow (to be implemented)

**Upgrading to Enterprise:**
1. Go to Settings > Account
2. Tap "Upgrade" or visit VAS Management
3. Contact Sales to upgrade

### For Developers

**Check if a feature is enabled:**
```typescript
import { useFeature } from '@/utils/hooks/useFeatureFlags';

function MyComponent() {
  const hasAnalytics = useFeature('analytics');
  
  if (!hasAnalytics) {
    return <FeatureLockedOverlay featureName="Analytics" />;
  }
  
  return <AnalyticsDashboard />;
}
```

**Get account type:**
```typescript
import { useAccountType, useIsFreeAccount } from '@/utils/hooks/useFeatureFlags';

function MyComponent() {
  const accountType = useAccountType(); // 'enterprise' | 'free'
  const isFree = useIsFreeAccount();
  
  return isFree ? <UpgradePrompt /> : <PremiumFeature />;
}
```

See `docs/ACCOUNT_TYPES_GUIDE.md` for complete developer documentation.

## Database Schema Changes

### MasterAccount Collection
```typescript
{
  // ... existing fields
  accountType?: 'enterprise' | 'free',  // New field
  vasFeatures?: string[],               // New field - array of VAS feature IDs
}
```

### User Collection
```typescript
{
  // ... existing fields
  accountType?: 'enterprise' | 'free',  // New field
  vasFeatures?: string[],               // New field - array of VAS feature IDs
}
```

## Migration Notes

### Backward Compatibility
- **All existing accounts default to 'enterprise'** for backward compatibility
- No migration required for existing data
- New accounts can choose their type during signup
- Existing users can upgrade/downgrade (future feature)

### Firestore Indexes
No new indexes required. The optional fields use simple equality queries.

## Important Notes

### ⚠️ Current Limitations

This is a **frontend-only implementation**. The following are NOT included:

1. **Backend API Enforcement**: Feature flags are only checked on the client
2. **Payment Integration**: VAS subscriptions are UI-only (no real payments)
3. **Security Rules**: Firebase rules don't enforce account types yet
4. **Billing System**: No automated billing or subscription management

### 🔒 Production Requirements

Before deploying to production, implement:

1. **Server-side validation** of feature access
2. **Payment gateway integration** (Stripe, PayPal, etc.)
3. **Firebase security rules** to enforce account types
4. **Backend API endpoints** for VAS subscription management
5. **Webhook handlers** for payment processing
6. **Automated billing** and subscription lifecycle management

## Testing

### Test Scenarios

1. **Create Enterprise Account**
   - Should have all features enabled
   - Should not see VAS management option
   - Should show "Enterprise" badge in settings

2. **Create Free Account**
   - Should have limited features enabled
   - Should see VAS management in settings
   - Should show "Free" badge in settings
   - Should be able to view available VAS features

3. **VAS UI (Free Accounts)**
   - Can view all available VAS features
   - Can see pricing and descriptions
   - Subscribe/unsubscribe buttons work (UI only)
   - Shows active subscriptions correctly

4. **Backward Compatibility**
   - Existing accounts work without modification
   - No account type defaults to enterprise
   - All features remain accessible for existing users

### Manual Testing Checklist

- [ ] Create new Enterprise account
- [ ] Create new Free account  
- [ ] View VAS management screen
- [ ] Subscribe to VAS feature (UI demo)
- [ ] Check settings display
- [ ] Verify existing accounts still work
- [ ] Test account type badge display
- [ ] Test upgrade prompts

## Deployment Steps

1. **Code Review**: Review all changes
2. **Testing**: Complete manual testing checklist
3. **Documentation**: Ensure all docs are up to date
4. **Deploy**: Push to staging/production
5. **Monitor**: Watch for issues with account creation
6. **Communicate**: Notify team of new features

## Future Roadmap

### Phase 2: Backend Integration
- [ ] Implement server-side feature validation
- [ ] Add Firebase security rules
- [ ] Create API endpoints for VAS management

### Phase 3: Payment Integration
- [ ] Integrate payment gateway
- [ ] Implement subscription management
- [ ] Add billing history
- [ ] Send payment receipts

### Phase 4: Advanced Features
- [ ] Account upgrade/downgrade flow
- [ ] Free trial periods for VAS
- [ ] Custom feature bundles
- [ ] Volume discounts
- [ ] Annual subscription options

### Phase 5: Analytics
- [ ] Track feature usage by account type
- [ ] Monitor VAS adoption rates
- [ ] Analyze upgrade conversion rates
- [ ] Generate revenue reports

## Support

For questions or issues:
- See `docs/ACCOUNT_TYPES_GUIDE.md` for developer documentation
- Check the code comments in modified files
- Review the type definitions in `types/index.ts`

## Changelog

### Version 1.0.0 - Initial Release
- Added account type selection during signup
- Implemented feature flag system
- Created VAS management UI
- Updated settings to show account type
- Added developer documentation
- Maintained backward compatibility
