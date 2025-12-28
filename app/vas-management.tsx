import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailableVASFeatures } from '@/utils/featureFlags';
import { VASFeatureId } from '@/types';
import { useAccountType } from '@/utils/hooks/useFeatureFlags';

export default function VASManagementScreen() {
  const { user } = useAuth();
  const accountType = useAccountType();
  const [selectedFeatures, setSelectedFeatures] = useState<VASFeatureId[]>(
    user?.vasFeatures || []
  );

  const availableFeatures = getAvailableVASFeatures().map((feature) => ({
    ...feature,
    isActive: selectedFeatures.includes(feature.id),
  }));

  const handleFeatureToggle = (featureId: VASFeatureId) => {
    // In a real implementation, this would trigger a payment/subscription flow
    Alert.alert(
      'Subscribe to Feature',
      'This will redirect you to the payment flow to subscribe to this feature.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            // Toggle the feature for demo purposes
            setSelectedFeatures((prev) =>
              prev.includes(featureId)
                ? prev.filter((id) => id !== featureId)
                : [...prev, featureId]
            );
            Alert.alert(
              'Success',
              'Feature subscription updated. (This is a demo - payment integration would be required for production)'
            );
          },
        },
      ]
    );
  };

  const handleUpgradeToEnterprise = () => {
    Alert.alert(
      'Upgrade to Enterprise',
      'This will redirect you to upgrade your account to Enterprise with all features included.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Contact Sales',
          onPress: () => {
            Alert.alert(
              'Contact Sales',
              'Please contact our sales team to upgrade to Enterprise.\n\nEmail: sales@machineapp.com\nPhone: +1 (555) 123-4567'
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Value-Added Services',
          headerStyle: { backgroundColor: '#1e3a8a' },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content}>
        {/* Account Type Banner */}
        <View style={styles.accountBanner}>
          <View style={styles.accountBannerContent}>
            <Text style={styles.accountBannerLabel}>Current Plan</Text>
            <Text style={styles.accountBannerType}>
              {accountType === 'enterprise' ? 'Enterprise' : 'Free Account'}
            </Text>
          </View>
          {accountType === 'free' && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradeToEnterprise}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Section for Free Accounts */}
        {accountType === 'free' && (
          <View style={styles.infoCard}>
            <AlertCircle size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              Add individual features to your Free account or upgrade to Enterprise for
              unlimited access.
            </Text>
          </View>
        )}

        {/* Enterprise Users - Show they have all features */}
        {accountType === 'enterprise' ? (
          <View style={styles.enterpriseCard}>
            <CheckCircle2 size={48} color="#10b981" />
            <Text style={styles.enterpriseTitle}>All Features Included</Text>
            <Text style={styles.enterpriseText}>
              Your Enterprise account includes unlimited access to all features and services.
            </Text>
          </View>
        ) : (
          /* Free Users - Show VAS Features */
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Available Services</Text>
            <Text style={styles.sectionDescription}>
              Subscribe to individual features to enhance your account
            </Text>

            <View style={styles.featuresList}>
              {availableFeatures.map((feature) => (
                <View
                  key={feature.id}
                  style={[
                    styles.featureCard,
                    feature.isActive && styles.featureCardActive,
                  ]}
                >
                  <View style={styles.featureHeader}>
                    <View style={styles.featureInfo}>
                      {feature.isActive ? (
                        <CheckCircle2 size={24} color="#10b981" />
                      ) : (
                        <Lock size={24} color="#94a3b8" />
                      )}
                      <View style={styles.featureTitleContainer}>
                        <Text style={styles.featureName}>{feature.name}</Text>
                        {feature.isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.featurePrice}>{feature.price}</Text>
                  </View>

                  <Text style={styles.featureDescription}>{feature.description}</Text>

                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      feature.isActive && styles.subscribeButtonActive,
                    ]}
                    onPress={() => handleFeatureToggle(feature.id)}
                  >
                    <Text
                      style={[
                        styles.subscribeButtonText,
                        feature.isActive && styles.subscribeButtonTextActive,
                      ]}
                    >
                      {feature.isActive ? 'Unsubscribe' : 'Subscribe'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upgrade Prompt for Free Users */}
        {accountType === 'free' && (
          <View style={styles.upgradePrompt}>
            <Text style={styles.upgradePromptTitle}>Want Everything?</Text>
            <Text style={styles.upgradePromptText}>
              Upgrade to Enterprise and get unlimited access to all features at a better
              value.
            </Text>
            <TouchableOpacity
              style={styles.upgradePromptButton}
              onPress={handleUpgradeToEnterprise}
            >
              <Text style={styles.upgradePromptButtonText}>Contact Sales</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  accountBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    padding: 20,
    marginBottom: 16,
  },
  accountBannerContent: {
    flex: 1,
  },
  accountBannerLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountBannerType: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  upgradeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#1e3a8a',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  enterpriseCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  enterpriseTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  enterpriseText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  featureTitleContainer: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  activeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
    textTransform: 'uppercase',
  },
  featurePrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#3b82f6',
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  subscribeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  subscribeButtonTextActive: {
    color: '#64748b',
  },
  upgradePrompt: {
    backgroundColor: '#1e3a8a',
    margin: 16,
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  upgradePromptTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  upgradePromptText: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradePromptButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  upgradePromptButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
});
