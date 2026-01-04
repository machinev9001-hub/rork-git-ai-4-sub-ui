import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Wrench, Users, Truck, ClipboardList, UserCheck, Shield, Clock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailableVASFeatures } from '@/utils/featureFlags';
import { VASFeatureId } from '@/types';
import { useAccountType } from '@/utils/hooks/useFeatureFlags';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Colors } from '@/constants/colors';
import { startVASTrialSubscription } from '@/utils/vasSubscription';

type SubscriptionGroup = {
  id: string;
  title: string;
  description: string;
  icon: any;
  iconBg: string;
  features: {
    id: VASFeatureId;
    name: string;
    description: string;
    price: string;
    icon: any;
    iconBg: string;
  }[];
  isBundled: boolean;
  bundlePrice?: string;
};

const SUBSCRIPTION_GROUPS: SubscriptionGroup[] = [
  {
    id: 'asset_management_group',
    title: 'Asset & Staff Management',
    description: 'Plant Manager, Staff Manager, and Logistics modules',
    icon: Wrench,
    iconBg: '#f59e0b',
    isBundled: false,
    features: [
      {
        id: 'plant_manager_access',
        name: 'Plant Manager',
        description: 'Full plant management including asset tracking, timesheets, and allocation',
        price: '$79/month',
        icon: Wrench,
        iconBg: '#f59e0b',
      },
      {
        id: 'staff_manager_access',
        name: 'Staff Manager',
        description: 'Employee tracking, site allocations, and timesheet oversight',
        price: '$79/month',
        icon: Users,
        iconBg: '#8b5cf6',
      },
      {
        id: 'logistics_access',
        name: 'Logistics',
        description: 'Material requests and delivery coordination',
        price: '$59/month',
        icon: Truck,
        iconBg: '#0ea5e9',
      },
    ],
  },
  {
    id: 'operations_group',
    title: 'Operations Bundle',
    description: 'Planner, Supervisor, and QC - all in one package',
    icon: ClipboardList,
    iconBg: '#10b981',
    isBundled: true,
    bundlePrice: '$149/month',
    features: [
      {
        id: 'operations_bundle',
        name: 'Planner',
        description: 'Task planning and scheduling',
        price: 'Included',
        icon: ClipboardList,
        iconBg: '#34A853',
      },
      {
        id: 'operations_bundle',
        name: 'Supervisor',
        description: 'Supervisor task management and oversight',
        price: 'Included',
        icon: UserCheck,
        iconBg: '#FBBC04',
      },
      {
        id: 'operations_bundle',
        name: 'QC',
        description: 'Quality control request handling',
        price: 'Included',
        icon: Shield,
        iconBg: '#ec4899',
      },
    ],
  },
];

export default function VASManagementScreen() {
  const { user } = useAuth();
  const accountType = useAccountType();
  const [selectedFeatures, setSelectedFeatures] = useState<VASFeatureId[]>(
    user?.vasFeatures || []
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['asset_management_group', 'operations_group']);

  const availableFeatures = getAvailableVASFeatures().map((feature) => ({
    ...feature,
    isActive: selectedFeatures.includes(feature.id),
  }));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  };

  const isFeatureActive = (featureId: VASFeatureId): boolean => {
    return selectedFeatures.includes(featureId);
  };

  const handleFeatureToggle = async (featureId: VASFeatureId, featureName: string, price: string) => {
    const masterAccountId = user?.masterAccountId;
    if (!masterAccountId) {
      Alert.alert('Error', 'Master account not found');
      return;
    }

    const isSubscribed = selectedFeatures.includes(featureId);
    const action = isSubscribed ? 'unsubscribe from' : 'start 12-day trial for';

    Alert.alert(
      isSubscribed ? 'Unsubscribe' : 'Start Free Trial',
      isSubscribed 
        ? `This will ${action} ${featureName}.`
        : `Start a 12-day free trial for ${featureName}? After the trial, you'll need to activate the subscription with payment to continue using this feature.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSubscribed ? 'Unsubscribe' : 'Start Trial',
          onPress: async () => {
            setIsUpdating(true);
            try {
              if (isSubscribed) {
                // Unsubscribe logic (remove feature)
                const newFeatures = selectedFeatures.filter((id) => id !== featureId);
                const masterAccountRef = doc(db, 'masterAccounts', masterAccountId);
                await updateDoc(masterAccountRef, {
                  vasFeatures: newFeatures,
                  updatedAt: serverTimestamp(),
                });
                setSelectedFeatures(newFeatures);
                Alert.alert('Success', 'Feature unsubscribed successfully.');
              } else {
                // Start trial subscription
                const priceNumber = parseFloat(price.replace(/[^0-9.]/g, ''));
                const result = await startVASTrialSubscription(
                  masterAccountId,
                  featureId,
                  featureName,
                  priceNumber,
                  'USD'
                );

                if (result.success) {
                  // Add to selected features for immediate UI update
                  const newFeatures = [...selectedFeatures, featureId];
                  const masterAccountRef = doc(db, 'masterAccounts', masterAccountId);
                  await updateDoc(masterAccountRef, {
                    vasFeatures: newFeatures,
                    updatedAt: serverTimestamp(),
                  });
                  setSelectedFeatures(newFeatures);
                  
                  Alert.alert(
                    'Trial Started',
                    `Your 12-day free trial for ${featureName} has started! You can use this feature immediately. Remember to activate with payment before the trial ends.`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert('Error', result.error || 'Failed to start trial. Please try again.');
                }
              }
            } catch (error) {
              console.error('Error updating VAS features:', error);
              Alert.alert(
                'Error',
                'Failed to update feature subscription. Please try again.'
              );
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleBundleToggle = async (group: SubscriptionGroup) => {
    const masterAccountId = user?.masterAccountId;
    if (!masterAccountId) {
      Alert.alert('Error', 'Master account not found');
      return;
    }

    const bundleFeatureId = 'operations_bundle' as VASFeatureId;
    const isSubscribed = selectedFeatures.includes(bundleFeatureId);
    const action = isSubscribed ? 'unsubscribe from' : 'subscribe to';

    Alert.alert(
      isSubscribed ? 'Unsubscribe from Bundle' : 'Subscribe to Operations Bundle',
      `This will ${action} the Operations Bundle (Planner, Supervisor, QC). In production, this would process payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setIsUpdating(true);
            try {
              const newFeatures = isSubscribed
                ? selectedFeatures.filter((id) => id !== bundleFeatureId)
                : [...selectedFeatures, bundleFeatureId];

              const masterAccountRef = doc(db, 'masterAccounts', masterAccountId);
              await updateDoc(masterAccountRef, {
                vasFeatures: newFeatures,
                updatedAt: serverTimestamp(),
              });

              setSelectedFeatures(newFeatures);
              
              Alert.alert(
                'Success',
                `Bundle ${isSubscribed ? 'unsubscribed' : 'subscribed'} successfully. Changes are now active.`
              );
            } catch (error) {
              console.error('Error updating VAS features:', error);
              Alert.alert(
                'Error',
                'Failed to update bundle subscription. Please try again.'
              );
            } finally {
              setIsUpdating(false);
            }
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

  const renderSubscriptionGroup = (group: SubscriptionGroup) => {
    const isExpanded = expandedGroups.includes(group.id);
    const GroupIcon = group.icon;
    const isBundleActive = group.isBundled && isFeatureActive('operations_bundle');

    return (
      <View key={group.id} style={styles.groupContainer}>
        <TouchableOpacity 
          style={[
            styles.groupHeader,
            isBundleActive && styles.groupHeaderActive
          ]} 
          onPress={() => toggleGroup(group.id)}
          activeOpacity={0.7}
        >
          <View style={styles.groupHeaderLeft}>
            <View style={[styles.groupIconContainer, { backgroundColor: group.iconBg }]}>
              <GroupIcon size={24} color="#fff" strokeWidth={2} />
            </View>
            <View style={styles.groupTitleContainer}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupDescription}>{group.description}</Text>
            </View>
          </View>
          <View style={styles.groupHeaderRight}>
            {group.isBundled && (
              <View style={[styles.bundlePriceBadge, isBundleActive && styles.bundlePriceBadgeActive]}>
                <Text style={[styles.bundlePriceText, isBundleActive && styles.bundlePriceTextActive]}>
                  {group.bundlePrice}
                </Text>
              </View>
            )}
            {isExpanded ? (
              <ChevronUp size={24} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={24} color={Colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.groupContent}>
            {group.features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              const isActive = isFeatureActive(feature.id);
              
              return (
                <View 
                  key={`${feature.id}-${index}`} 
                  style={[
                    styles.featureItem,
                    isActive && styles.featureItemActive
                  ]}
                >
                  <View style={styles.featureItemLeft}>
                    <View style={[styles.featureIconContainer, { backgroundColor: feature.iconBg }]}>
                      {isActive ? (
                        <CheckCircle2 size={20} color="#fff" strokeWidth={2} />
                      ) : (
                        <FeatureIcon size={20} color="#fff" strokeWidth={2} />
                      )}
                    </View>
                    <View style={styles.featureInfo}>
                      <Text style={styles.featureName}>{feature.name}</Text>
                      <Text style={styles.featureDescription}>{feature.description}</Text>
                    </View>
                  </View>
                  {!group.isBundled && (
                    <View style={styles.featureItemRight}>
                      <Text style={styles.featurePrice}>{feature.price}</Text>
                      <TouchableOpacity
                        style={[
                          styles.featureButton,
                          isActive && styles.featureButtonActive,
                          isUpdating && styles.featureButtonDisabled,
                        ]}
                        onPress={() => handleFeatureToggle(feature.id, feature.name, feature.price)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={isActive ? Colors.textSecondary : "#fff"} />
                        ) : (
                          <Text style={[styles.featureButtonText, isActive && styles.featureButtonTextActive]}>
                            {isActive ? 'Unsubscribe' : 'Start Trial'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  {group.isBundled && (
                    <View style={styles.includedBadge}>
                      <Text style={styles.includedBadgeText}>
                        {isBundleActive ? 'Active' : 'Included'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {group.isBundled && (
              <TouchableOpacity
                style={[
                  styles.bundleButton,
                  isBundleActive && styles.bundleButtonActive,
                  isUpdating && styles.bundleButtonDisabled,
                ]}
                onPress={() => handleBundleToggle(group)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={isBundleActive ? Colors.textSecondary : "#fff"} />
                ) : (
                  <Text style={[styles.bundleButtonText, isBundleActive && styles.bundleButtonTextActive]}>
                    {isBundleActive ? 'Unsubscribe from Bundle' : `Subscribe to Bundle - ${group.bundlePrice}`}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Value-Added Services',
          headerStyle: { backgroundColor: Colors.headerBg },
          headerTintColor: Colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {accountType === 'free' && (
          <View style={styles.infoCard}>
            <AlertCircle size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              Subscribe to individual modules or bundles to unlock features for your Free account.
            </Text>
          </View>
        )}

        {accountType === 'enterprise' ? (
          <View style={styles.enterpriseCard}>
            <CheckCircle2 size={48} color="#10b981" />
            <Text style={styles.enterpriseTitle}>All Features Included</Text>
            <Text style={styles.enterpriseText}>
              Your Enterprise account includes unlimited access to all features and services.
            </Text>
          </View>
        ) : (
          <View style={styles.subscriptionSection}>
            <Text style={styles.sectionTitle}>Role Subscriptions</Text>
            <Text style={styles.sectionDescription}>
              Unlock specific role modules for your team
            </Text>

            {SUBSCRIPTION_GROUPS.map(renderSubscriptionGroup)}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Additional Services</Text>
            <Text style={styles.sectionDescription}>
              Enhance your account with extra capabilities
            </Text>

            <View style={styles.featuresList}>
              {availableFeatures.map((feature) => (
                <View
                  key={feature.id}
                  style={[
                    styles.additionalFeatureCard,
                    feature.isActive && styles.additionalFeatureCardActive,
                  ]}
                >
                  <View style={styles.additionalFeatureHeader}>
                    <View style={styles.additionalFeatureInfo}>
                      {feature.isActive ? (
                        <CheckCircle2 size={22} color="#10b981" />
                      ) : (
                        <Lock size={22} color={Colors.textSecondary} />
                      )}
                      <View style={styles.additionalFeatureTitleContainer}>
                        <Text style={styles.additionalFeatureName}>{feature.name}</Text>
                        {feature.isActive && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.additionalFeaturePrice}>{feature.price}</Text>
                  </View>

                  <Text style={styles.additionalFeatureDescription}>{feature.description}</Text>

                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      feature.isActive && styles.subscribeButtonActive,
                      isUpdating && styles.subscribeButtonDisabled,
                    ]}
                    onPress={() => handleFeatureToggle(feature.id, feature.name, feature.price || '$0/month')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.subscribeButtonText,
                          feature.isActive && styles.subscribeButtonTextActive,
                        ]}
                      >
                        {feature.isActive ? 'Unsubscribe' : 'Start 12-Day Trial'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

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

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.headerBg,
    padding: 20,
    marginBottom: 16,
  },
  accountBannerContent: {
    flex: 1,
  },
  accountBannerLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountBannerType: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  upgradeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  enterpriseCard: {
    backgroundColor: Colors.cardBg,
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
    color: Colors.text,
  },
  enterpriseText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  subscriptionSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  groupContainer: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.cardBg,
  },
  groupHeaderActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitleContainer: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  groupDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bundlePriceBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bundlePriceBadgeActive: {
    backgroundColor: '#10b981',
  },
  bundlePriceText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  bundlePriceTextActive: {
    color: '#fff',
  },
  groupContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  featureItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  featureItemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  featurePrice: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#3b82f6',
  },
  featureButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  featureButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureButtonDisabled: {
    opacity: 0.5,
  },
  featureButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  featureButtonTextActive: {
    color: Colors.textSecondary,
  },
  includedBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  includedBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  bundleButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  bundleButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bundleButtonDisabled: {
    opacity: 0.5,
  },
  bundleButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  bundleButtonTextActive: {
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  featuresList: {
    gap: 12,
  },
  additionalFeatureCard: {
    backgroundColor: Colors.cardBg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  additionalFeatureCardActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  additionalFeatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  additionalFeatureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  additionalFeatureTitleContainer: {
    flex: 1,
  },
  additionalFeatureName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
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
  additionalFeaturePrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#3b82f6',
  },
  additionalFeatureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  subscribeButtonTextActive: {
    color: Colors.textSecondary,
  },
  upgradePrompt: {
    backgroundColor: Colors.headerBg,
    margin: 16,
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  upgradePromptTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  upgradePromptText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradePromptButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  upgradePromptButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
});
