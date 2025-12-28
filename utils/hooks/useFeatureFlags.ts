import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFeatureFlags, isFeatureEnabled } from '@/utils/featureFlags';
import { FeatureFlags } from '@/types';

/**
 * Hook to access feature flags based on current user's account type and VAS subscriptions
 */
export function useFeatureFlags(): FeatureFlags {
  const { user } = useAuth();

  return useMemo(() => {
    return getFeatureFlags(user?.accountType, user?.vasFeatures);
  }, [user?.accountType, user?.vasFeatures]);
}

/**
 * Hook to check if a specific feature is enabled
 */
export function useFeature(featureKey: keyof FeatureFlags): boolean {
  const { user } = useAuth();

  return useMemo(() => {
    return isFeatureEnabled(featureKey, user?.accountType, user?.vasFeatures);
  }, [featureKey, user?.accountType, user?.vasFeatures]);
}

/**
 * Hook to get account type
 */
export function useAccountType(): 'enterprise' | 'free' {
  const { user } = useAuth();
  // Default to enterprise for backward compatibility
  return user?.accountType || 'enterprise';
}

/**
 * Hook to check if user has a free account
 */
export function useIsFreeAccount(): boolean {
  const accountType = useAccountType();
  return accountType === 'free';
}
