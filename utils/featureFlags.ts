import { AccountType, FeatureFlags, VASFeatureId } from '@/types';
import { VASFeatureMetadata } from '@/components/VASPromptModal';

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
  marketplace_access: 'asset_management', // Maps to asset_management feature flag
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
 * Get detailed metadata for VAS features for use in prompts/modals
 */
export function getVASFeatureMetadata(): Record<VASFeatureId, VASFeatureMetadata> {
  return {
    analytics: {
      id: 'analytics',
      name: 'Advanced Analytics',
      description: 'Unlock powerful analytics and insights to track performance across your projects, sites, and teams.',
      valueSummary: 'Make data-driven decisions with real-time dashboards, trend analysis, and predictive insights that help you optimize operations and reduce costs.',
      benefits: [
        'Real-time performance dashboards',
        'Customizable KPI tracking',
        'Trend analysis and forecasting',
        'Cross-site performance comparison',
        'Export charts and reports',
      ],
      price: '$49/month',
      learnMoreUrl: 'https://machineapp.com/features/analytics',
    },
    reporting: {
      id: 'reporting',
      name: 'Advanced Reporting',
      description: 'Generate comprehensive reports with custom templates and automated scheduling.',
      valueSummary: 'Save hours every week with automated report generation. Create professional reports for stakeholders, compliance, and project reviews.',
      benefits: [
        'Customizable report templates',
        'Scheduled report delivery',
        'Multi-format exports (PDF, Excel, CSV)',
        'Compliance-ready documentation',
        'Automated distribution to stakeholders',
      ],
      price: '$39/month',
      learnMoreUrl: 'https://machineapp.com/features/reporting',
    },
    data_exports: {
      id: 'data_exports',
      name: 'Data Exports',
      description: 'Export your data in multiple formats for backup, analysis, or integration with other systems.',
      valueSummary: 'Own your data completely. Export timesheets, assets, progress, and more in the format you need for accounting, payroll, or business intelligence tools.',
      benefits: [
        'Export to CSV, Excel, and PDF',
        'Bulk data exports',
        'Filtered and custom exports',
        'Automated backup scheduling',
        'Integration-ready data formats',
      ],
      price: '$29/month',
      learnMoreUrl: 'https://machineapp.com/features/data-exports',
    },
    advanced_integrations: {
      id: 'advanced_integrations',
      name: 'Advanced Integrations',
      description: 'Connect with your existing tools and systems through powerful API integrations.',
      valueSummary: 'Streamline workflows by connecting MACHINE with your accounting software, ERP systems, payroll providers, and more.',
      benefits: [
        'REST API access',
        'Webhook notifications',
        'Pre-built integrations (QuickBooks, Xero, etc.)',
        'Custom integration support',
        'Real-time data synchronization',
      ],
      price: '$59/month',
      learnMoreUrl: 'https://machineapp.com/features/integrations',
    },
    custom_branding: {
      id: 'custom_branding',
      name: 'Custom Branding',
      description: 'White-label the app with your company logo, colors, and branding.',
      valueSummary: 'Present a professional, branded experience to your team and subcontractors. Reinforce your company identity in every interaction.',
      benefits: [
        'Custom logo and colors',
        'Branded login screen',
        'Custom email templates',
        'Branded reports and exports',
        'Professional appearance for clients',
      ],
      price: '$99/month',
      learnMoreUrl: 'https://machineapp.com/features/branding',
    },
    priority_support: {
      id: 'priority_support',
      name: 'Priority Support',
      description: 'Get help when you need it most with 24/7 priority customer support.',
      valueSummary: 'Skip the queue and get immediate assistance from our expert support team. Minimize downtime and keep your projects running smoothly.',
      benefits: [
        '24/7 phone and email support',
        'Priority queue - faster response times',
        'Dedicated account manager',
        'Training and onboarding assistance',
        'Proactive system health monitoring',
      ],
      price: '$79/month',
      learnMoreUrl: 'https://machineapp.com/features/priority-support',
    },
    marketplace_access: {
      id: 'marketplace_access',
      name: 'Marketplace Access',
      description: 'List your plant assets on the marketplace for other companies to discover and hire.',
      valueSummary: 'Expand your reach and generate additional revenue by making your assets visible to other companies in need of plant and equipment.',
      benefits: [
        'List assets on the marketplace',
        'Receive hire requests from other companies',
        'Set your own rates and availability',
        'Track marketplace performance',
        'Grow your rental business',
      ],
      price: '$49/month',
      learnMoreUrl: 'https://machineapp.com/features/marketplace',
    },
  };
}

/**
 * Get feature locked message for UI
 */
export function getFeatureLockedMessage(featureName: string): string {
  return `${featureName} is only available with an Enterprise account or as a Value-Added Service. Subscribe to unlock this feature.`;
}
