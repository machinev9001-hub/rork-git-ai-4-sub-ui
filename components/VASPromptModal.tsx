import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { Lock, X, ExternalLink, CreditCard, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppTheme } from '@/constants/colors';

export type VASFeatureMetadata = {
  id: string;
  name: string;
  description: string;
  valueSummary: string;
  learnMoreUrl?: string;
  videoUrl?: string;
  price?: string;
  benefits?: string[];
};

type VASPromptModalProps = {
  visible: boolean;
  onClose: () => void;
  feature: VASFeatureMetadata;
};

/**
 * Modal that appears when a user taps a locked feature
 * Provides information about the feature and CTA to activate/upgrade
 */
export function VASPromptModal({ visible, onClose, feature }: VASPromptModalProps) {
  const router = useRouter();

  const handleLearnMore = () => {
    if (feature.learnMoreUrl) {
      Linking.openURL(feature.learnMoreUrl);
    } else if (feature.videoUrl) {
      Linking.openURL(feature.videoUrl);
    }
  };

  const handleActivate = () => {
    onClose();
    // Navigate to VAS management screen
    router.push('/vas-management' as any);
  };

  const handleUpgrade = () => {
    onClose();
    // Navigate to VAS management screen with upgrade context
    router.push('/vas-management' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Lock size={32} color="#f59e0b" strokeWidth={2} />
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={AppTheme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Feature Name */}
            <Text style={styles.title}>{feature.name}</Text>

            {/* Short Description */}
            <Text style={styles.description}>{feature.description}</Text>

            {/* Value Summary */}
            <View style={styles.valueSummaryContainer}>
              <View style={styles.valueSummaryIcon}>
                <Zap size={20} color="#10b981" strokeWidth={2} />
              </View>
              <View style={styles.valueSummaryContent}>
                <Text style={styles.valueSummaryLabel}>What you'll get</Text>
                <Text style={styles.valueSummary}>{feature.valueSummary}</Text>
              </View>
            </View>

            {/* Benefits List */}
            {feature.benefits && feature.benefits.length > 0 && (
              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Key Benefits:</Text>
                {feature.benefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitItem}>
                    <View style={styles.benefitBullet} />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Price */}
            {feature.price && (
              <View style={styles.priceContainer}>
                <CreditCard size={18} color={AppTheme.accent} strokeWidth={2} />
                <Text style={styles.priceText}>{feature.price}</Text>
              </View>
            )}

            {/* Learn More Link */}
            {(feature.learnMoreUrl || feature.videoUrl) && (
              <TouchableOpacity style={styles.learnMoreButton} onPress={handleLearnMore}>
                <ExternalLink size={18} color={AppTheme.accent} strokeWidth={2} />
                <Text style={styles.learnMoreText}>
                  {feature.videoUrl ? 'Watch Video' : 'Learn More'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.activateButton}
                onPress={handleActivate}
              >
                <Text style={styles.activateButtonText}>Activate Feature</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Enterprise</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: AppTheme.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#fef3c7',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: AppTheme.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: AppTheme.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  valueSummaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  valueSummaryIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#d1fae5',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueSummaryContent: {
    flex: 1,
  },
  valueSummaryLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valueSummary: {
    fontSize: 15,
    color: '#065f46',
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: AppTheme.text,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  benefitBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppTheme.accent,
    marginTop: 7,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: AppTheme.textSecondary,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: AppTheme.accent,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 24,
  },
  learnMoreText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: AppTheme.accent,
  },
  actionButtons: {
    gap: 12,
  },
  activateButton: {
    backgroundColor: AppTheme.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: AppTheme.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  activateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  upgradeButton: {
    backgroundColor: AppTheme.surface,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: AppTheme.text,
  },
});
