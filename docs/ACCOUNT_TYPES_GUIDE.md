# Account Types & Feature Flags - Developer Guide

This guide explains how to use the account type system and feature flags in the Machine Business Tracker app.

## Overview

The app now supports two account types:
- **Enterprise**: Full access to all features (default for existing accounts)
- **Free**: Limited access with the ability to add Value-Added Services (VAS)

## Type Definitions

Account types and feature flags are defined in `types/index.ts`:

```typescript
export type AccountType = 'enterprise' | 'free';

export type VASFeatureId =
  | 'analytics'
  | 'reporting'
  | 'data_exports'
  | 'advanced_integrations'
  | 'custom_branding'
  | 'priority_support';

export type FeatureFlags = {
  employee_management: boolean;
  asset_management: boolean;
  external_data_reception: boolean;
  analytics: boolean;
  reporting: boolean;
  data_exports: boolean;
  advanced_integrations: boolean;
  custom_branding: boolean;
  priority_support: boolean;
  task_management: boolean;
  time_tracking: boolean;
  progress_reporting: boolean;
};
```

## Using Feature Flags in Components

### 1. Check if a feature is enabled

```typescript
import { useFeature } from '@/utils/hooks/useFeatureFlags';

function MyComponent() {
  const canUseAnalytics = useFeature('analytics');
  
  if (!canUseAnalytics) {
    return <FeatureLockedOverlay featureName="Analytics" />;
  }
  
  return <AnalyticsDashboard />;
}
```

### 2. Get all feature flags

```typescript
import { useFeatureFlags } from '@/utils/hooks/useFeatureFlags';

function MyComponent() {
  const features = useFeatureFlags();
  
  return (
    <View>
      {features.analytics && <AnalyticsButton />}
      {features.reporting && <ReportingButton />}
      {features.data_exports && <ExportButton />}
    </View>
  );
}
```

### 3. Check account type

```typescript
import { useAccountType, useIsFreeAccount } from '@/utils/hooks/useFeatureFlags';

function MyComponent() {
  const accountType = useAccountType(); // 'enterprise' | 'free'
  const isFree = useIsFreeAccount(); // boolean
  
  return (
    <View>
      <Text>Account Type: {accountType}</Text>
      {isFree && <UpgradePrompt />}
    </View>
  );
}
```

## Feature-Locked UI Components

### 1. Feature Locked Badge

Shows a small "Locked" badge next to a feature:

```typescript
import { FeatureLockedBadge } from '@/components/FeatureLocked';

function MyComponent() {
  return (
    <View>
      <Text>Analytics Dashboard</Text>
      <FeatureLockedBadge 
        featureName="Analytics"
        size="small"
        showUpgrade={true}
      />
    </View>
  );
}
```

### 2. Feature Locked Overlay

Shows a full-screen overlay when a locked feature is accessed:

```typescript
import { FeatureLockedOverlay } from '@/components/FeatureLocked';

function AnalyticsScreen() {
  const canUseAnalytics = useFeature('analytics');
  
  return (
    <View>
      {!canUseAnalytics && (
        <FeatureLockedOverlay 
          featureName="Analytics"
          message="Upgrade to Enterprise or add Analytics as a Value-Added Service"
        />
      )}
      <AnalyticsDashboard />
    </View>
  );
}
```

## Account Creation Flow

### For Users

1. User clicks "Create New Account" on login screen
2. User selects account type (Enterprise or Free)
3. User enters activation code
4. User sets up master PIN
5. Account is created with selected account type

### For Developers

The account type is automatically stored when creating a master account:

```typescript
// In setup-master-pin.tsx
const result = await createMasterAccount(
  name,
  masterId,
  pin,
  activationCode,
  accountType // 'enterprise' or 'free'
);
```

## Value-Added Services (VAS)

Free account users can subscribe to individual features through the VAS management screen.

### Accessing VAS Management

Users can access VAS management from:
- Settings > Account > Value-Added Services
- Direct navigation: `/vas-management`

### Available VAS Features

1. **Advanced Analytics** ($49/month)
2. **Advanced Reporting** ($39/month)
3. **Data Exports** ($29/month)
4. **Advanced Integrations** ($59/month)
5. **Custom Branding** ($99/month)
6. **Priority Support** ($79/month)

## Feature Access Matrix

### Enterprise Accounts
All features are enabled by default.

### Free Accounts (Base)
- ✅ Employee management
- ✅ Asset management
- ✅ External data reception
- ✅ Time tracking
- ❌ Analytics (VAS)
- ❌ Reporting (VAS)
- ❌ Data exports (VAS)
- ❌ Advanced integrations (VAS)
- ❌ Custom branding (VAS)
- ❌ Priority support (VAS)
- ❌ Task management
- ❌ Progress reporting

## Backward Compatibility

All existing accounts without an `accountType` field will default to `'enterprise'` to maintain backward compatibility. No action is required for existing users.

## Testing

### Create Enterprise Account
1. Login > Create New Account
2. Select "Enterprise Account"
3. Complete activation flow

### Create Free Account
1. Login > Create New Account
2. Select "Free Account"
3. Complete activation flow
4. Navigate to Settings > Value-Added Services to test VAS UI

## Future Enhancements

The following are planned for future releases:
- Backend API enforcement of feature flags
- Payment integration for VAS subscriptions
- Firebase security rules for account types
- Upgrade path from Free to Enterprise
- Custom feature bundles
- Trial periods for VAS features

## Notes

⚠️ **Current Implementation**: This is a frontend-only implementation. All feature checks are performed on the client side. Backend API enforcement and payment integration are not included in this initial release.

🔒 **Security**: For production, ensure that:
- Feature flags are enforced on the backend API
- Firebase security rules validate account types
- Payment integration is properly implemented
- VAS subscriptions are verified server-side
