import { Stack, router } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useCallback, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, getRoleAccentColor } from '@/constants/colors';
import { 
  Users, ClipboardList, 
  CheckCircle2, Wrench, Truck,
  HardHat, UserCheck, Lock
} from 'lucide-react-native';
import { StandardHeaderRight, StandardSiteIndicator } from '@/components/HeaderSyncStatus';
import { normalizeRole } from '@/utils/roles';
import { useFeatureFlags } from '@/utils/hooks/useFeatureFlags';
import { FeatureFlags, VASFeatureId } from '@/types';
import { VASPromptModal } from '@/components/VASPromptModal';
import { getVASFeatureMetadata } from '@/utils/featureFlags';

type MenuItem = {
  title: string;
  icon: any;
  route: string;
  roles: string[];
  bgColor: string;
  iconColor: string;
  featureKey?: keyof FeatureFlags;
  vasFeatureId?: VASFeatureId;
};

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Planner',
    icon: ClipboardList,
    route: '/master-planner',
    roles: ['master', 'Planner'],
    bgColor: '#34A853',
    iconColor: '#fff',
    featureKey: 'operations_bundle',
    vasFeatureId: 'operations_bundle',
  },
  {
    title: 'Progress Tracking',
    icon: UserCheck,
    route: '/master-supervisor',
    roles: ['master', 'Supervisor'],
    bgColor: '#FBBC04',
    iconColor: '#fff',
    featureKey: 'operations_bundle',
    vasFeatureId: 'operations_bundle',
  },
  {
    title: 'QC Requests',
    icon: CheckCircle2,
    route: '/qc-requests',
    roles: ['master', 'QC'],
    bgColor: '#ec4899',
    iconColor: '#fff',
    featureKey: 'operations_bundle',
    vasFeatureId: 'operations_bundle',
  },
  {
    title: 'Plant Manager',
    icon: Wrench,
    route: '/master-plant-manager',
    roles: ['master', 'Plant Manager'],
    bgColor: '#f59e0b',
    iconColor: '#fff',
    featureKey: 'plant_manager_access',
    vasFeatureId: 'plant_manager_access',
  },
  {
    title: 'Staff Manager',
    icon: Users,
    route: '/master-staff-manager',
    roles: ['master', 'Staff Manager', 'HR'],
    bgColor: '#8b5cf6',
    iconColor: '#fff',
    featureKey: 'staff_manager_access',
    vasFeatureId: 'staff_manager_access',
  },
  {
    title: 'Logistics',
    icon: Truck,
    route: '/master-logistics-manager',
    roles: ['master', 'Logistics Manager'],
    bgColor: '#0ea5e9',
    iconColor: '#fff',
    featureKey: 'logistics_access',
    vasFeatureId: 'logistics_access',
  },
  {
    title: 'Onboarding',
    icon: HardHat,
    route: '/onboarding-dashboard',
    roles: ['master', 'Admin', 'HSE', 'Onboarding & Inductions'],
    bgColor: '#3b82f6',
    iconColor: '#fff',
    featureKey: 'staff_manager_access',
    vasFeatureId: 'staff_manager_access',
  },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const roleAccentColor = getRoleAccentColor(user?.role);
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedVASFeature, setSelectedVASFeature] = useState<VASFeatureId | null>(null);
  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const featureFlags = useFeatureFlags();

  const filteredMenuItems = useMemo(() => (
    MENU_ITEMS.filter((item) =>
      item.roles.some((role) => normalizeRole(role) === normalizedRole)
    )
  ), [normalizedRole]);

  const handleMenuPress = (item: MenuItem) => {
    if (item.featureKey && !featureFlags[item.featureKey]) {
      if (item.vasFeatureId) {
        setSelectedVASFeature(item.vasFeatureId);
      } else {
        setSelectedVASFeature('analytics');
      }
      return;
    }
    router.push(item.route as any);
  };

  const isItemLocked = useCallback((item: MenuItem): boolean => {
    if (!item.featureKey) return false;
    return !featureFlags[item.featureKey];
  }, [featureFlags]);

  const handleRefresh = useCallback(async () => {
    console.log('HomeScreen: pull-to-refresh triggered');
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } catch (error) {
      console.error('HomeScreen: refresh failed', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Home',
          headerStyle: {
            backgroundColor: Colors.headerBg,
          },
          headerTintColor: Colors.text,
          headerRight: () => <StandardHeaderRight />,
        }}
      />
      <StandardSiteIndicator />
      <View style={[styles.headerBorder, { backgroundColor: roleAccentColor }]} />
      
      <ScrollView 
        testID="home-scroll"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.text}
            titleColor={Colors.text}
          />
        )}
      >
        <View style={styles.grid}>
          {filteredMenuItems.map((item, index) => {
            const Icon = item.icon;
            const locked = isItemLocked(item);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.menuCard, locked && styles.menuCardLocked]}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: locked ? '#9ca3af' : item.bgColor }]}>
                  {locked ? (
                    <Lock size={36} color={item.iconColor} strokeWidth={2.5} />
                  ) : (
                    <Icon size={36} color={item.iconColor} strokeWidth={2.5} />
                  )}
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                {item.title === 'Progress Tracking' && (
                  <Text style={styles.menuSubtitle}>supervisors</Text>
                )}
                {locked && (
                  <View style={styles.lockedBadge}>
                    <Lock size={10} color="#92400e" strokeWidth={2.5} />
                    <Text style={styles.lockedText}>Locked</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        
        {selectedVASFeature && (
          <VASPromptModal
            visible={!!selectedVASFeature}
            onClose={() => setSelectedVASFeature(null)}
            feature={getVASFeatureMetadata()[selectedVASFeature]}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBorder: {
    height: 2,
    width: '100%',
  },
  siteIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 4,
  },
  siteIndicatorText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  headerRight: {
    marginRight: 16,
    alignItems: 'flex-end',
  },
  headerUserName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },

  headerCompanyName: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  menuSubtitle: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 2,
    fontStyle: 'italic' as const,
  },
  menuCardLocked: {
    opacity: 0.8,
  },
  lockedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  lockedText: {
    fontSize: 10,
    color: '#92400e',
    fontWeight: '600' as const,
  },
});
