import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type FeatureLockedBadgeProps = {
  featureName: string;
  size?: 'small' | 'medium' | 'large';
  showUpgrade?: boolean;
  onUpgradePress?: () => void;
};

/**
 * Badge component to indicate a feature is locked
 */
export function FeatureLockedBadge({
  featureName,
  size = 'small',
  showUpgrade = false,
  onUpgradePress,
}: FeatureLockedBadgeProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    if (onUpgradePress) {
      onUpgradePress();
    } else {
      router.push('/accounts/settings' as any);
    }
  };

  const iconSize = size === 'small' ? 12 : size === 'medium' ? 16 : 20;
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, styles[`badge${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles]]}>
        <Lock size={iconSize} color="#f59e0b" strokeWidth={2} />
        <Text style={[styles.text, { fontSize }]}>Locked</Text>
      </View>
      {showUpgrade && (
        <TouchableOpacity onPress={handleUpgrade} style={styles.upgradeButton}>
          <Text style={styles.upgradeText}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

type FeatureLockedOverlayProps = {
  featureName: string;
  message?: string;
  onUpgradePress?: () => void;
};

/**
 * Overlay component to show when a feature is locked
 */
export function FeatureLockedOverlay({
  featureName,
  message,
  onUpgradePress,
}: FeatureLockedOverlayProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    if (onUpgradePress) {
      onUpgradePress();
    } else {
      router.push('/accounts/settings' as any);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <Lock size={48} color="#f59e0b" strokeWidth={2} />
        <Text style={styles.overlayTitle}>{featureName} is Locked</Text>
        <Text style={styles.overlayMessage}>
          {message ||
            `This feature is only available with an Enterprise account or as a Value-Added Service.`}
        </Text>
        <TouchableOpacity onPress={handleUpgrade} style={styles.overlayButton}>
          <Text style={styles.overlayButtonText}>View Upgrade Options</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  badgeSmall: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeMedium: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeLarge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    color: '#92400e',
    fontWeight: '600' as const,
  },
  upgradeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600' as const,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    gap: 16,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e293b',
    textAlign: 'center',
  },
  overlayMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  overlayButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  overlayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
