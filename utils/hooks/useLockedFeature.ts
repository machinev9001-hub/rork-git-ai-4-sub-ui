import { useState, useCallback } from 'react';
import { VASFeatureId, FeatureFlags } from '@/types';
import { useFeatureFlags } from './useFeatureFlags';
import { getVASFeatureMetadata } from '@/utils/featureFlags';
import { VASFeatureMetadata } from '@/components/VASPromptModal';

type UseLockedFeatureReturn = {
  isLocked: boolean;
  showPrompt: () => void;
  promptVisible: boolean;
  hidePrompt: () => void;
  featureMetadata: VASFeatureMetadata | null;
};

/**
 * Hook to manage locked feature interactions
 * 
 * @param featureKey - The feature flag key to check
 * @param vasFeatureId - Optional VAS feature ID for detailed prompt
 * @returns Object with lock status and prompt controls
 * 
 * @example
 * const { isLocked, showPrompt, promptVisible, hidePrompt, featureMetadata } = 
 *   useLockedFeature('analytics', 'analytics');
 * 
 * if (isLocked) {
 *   return <TouchableOpacity onPress={showPrompt}>
 *     <Text>Analytics (Locked)</Text>
 *   </TouchableOpacity>
 * }
 */
export function useLockedFeature(
  featureKey: keyof FeatureFlags,
  vasFeatureId?: VASFeatureId
): UseLockedFeatureReturn {
  const featureFlags = useFeatureFlags();
  const [promptVisible, setPromptVisible] = useState(false);

  const isLocked = !featureFlags[featureKey];

  const showPrompt = useCallback(() => {
    if (isLocked) {
      setPromptVisible(true);
    }
  }, [isLocked]);

  const hidePrompt = useCallback(() => {
    setPromptVisible(false);
  }, []);

  const featureMetadata = vasFeatureId 
    ? getVASFeatureMetadata()[vasFeatureId] 
    : null;

  return {
    isLocked,
    showPrompt,
    promptVisible,
    hidePrompt,
    featureMetadata,
  };
}
