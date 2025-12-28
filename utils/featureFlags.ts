import { AccountType, FeatureFlags, VASFeatureId } from '@/types';

/**
 * Default feature flags for enterprise accounts
 */
const ENTERPRISE_FEATURES: FeatureFlags = {
  employee_management: true,
  asset_management: true,
  external_data_reception: true,
  analytics: true,
  reporting: true,
  data_exports: true,
  advanced_integrations: true,
  custom_branding: true,
  priority_support: true,
  task_management: true,
  time_tracking: true,
  progress_reporting: true,
};

/**
 * Default feature flags for free accounts
 */
const FREE_FEATURES: FeatureFlags = {
  employee_management: true,
  asset_management: true,
  external_data_reception: true,
  analytics: false,
  reporting: false,
  data_exports: false,
  advanced_integrations: false,
  custom_branding: false,
  priority_support: false,
  task_management: false,
  time_tracking: true,
  progress_reporting: false,
};

/**
 * Map VAS features to feature flag keys
 */
const VAS_TO_FEATURE_MAP: Record<VASFeatureId, keyof FeatureFlags> = {
  analytics: 'analytics',
  reporting: 'reporting',
  data_exports: 'data_exports',
  advanced_integrations: 'advanced_integrations',
  custom_branding: 'custom_branding',
  priority_support: 'priority_support',
};

/**
 * Get feature flags for an account based on account type and VAS subscriptions
 */
export function getFeatureFlags(
  accountType: AccountType | undefined,
  vasFeatures: VASFeatureId[] = []
): FeatureFlags {
  // Default to enterprise for backward compatibility
  const baseFeatures = accountType === 'free' ? { ...FREE_FEATURES } : { ...ENTERPRISE_FEATURES };

  // Apply VAS features for free accounts
  if (accountType === 'free') {
    vasFeatures.forEach((vasFeature) => {
      const featureKey = VAS_TO_FEATURE_MAP[vasFeature];
      if (featureKey) {
        baseFeatures[featureKey] = true;
      }
    });
  }

  return baseFeatures;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(
  featureKey: keyof FeatureFlags,
  accountType: AccountType | undefined,
  vasFeatures: VASFeatureId[] = []
): boolean {
  const flags = getFeatureFlags(accountType, vasFeatures);
  return flags[featureKey];
}

/**
 * Get all available VAS features with their metadata
 */
export function getAvailableVASFeatures() {
  return [
    {
      id: 'analytics' as VASFeatureId,
      name: 'Advanced Analytics',
      description: 'Access to detailed analytics and insights dashboard',
      price: '$49/month',
      isActive: false,
    },
    {
      id: 'reporting' as VASFeatureId,
      name: 'Advanced Reporting',
      description: 'Generate custom reports and export capabilities',
      price: '$39/month',
      isActive: false,
    },
    {
      id: 'data_exports' as VASFeatureId,
      name: 'Data Exports',
      description: 'Export data in multiple formats (CSV, Excel, PDF)',
      price: '$29/month',
      isActive: false,
    },
    {
      id: 'advanced_integrations' as VASFeatureId,
      name: 'Advanced Integrations',
      description: 'Connect with third-party tools and APIs',
      price: '$59/month',
      isActive: false,
    },
    {
      id: 'custom_branding' as VASFeatureId,
      name: 'Custom Branding',
      description: 'Customize the app with your company branding',
      price: '$99/month',
      isActive: false,
    },
    {
      id: 'priority_support' as VASFeatureId,
      name: 'Priority Support',
      description: '24/7 priority customer support',
      price: '$79/month',
      isActive: false,
    },
  ];
}

/**
 * Get feature locked message for UI
 */
export function getFeatureLockedMessage(featureName: string): string {
  return `${featureName} is only available with an Enterprise account or as a Value-Added Service. Subscribe to unlock this feature.`;
}
