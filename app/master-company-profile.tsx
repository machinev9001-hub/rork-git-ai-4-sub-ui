import { Stack, router } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Building2, 
  Users, 
  Package, 
  CreditCard, 
  Store, 
  Settings,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type MenuItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  route: string;
  vasRequired?: boolean;
};

export default function MasterCompanyProfileScreen() {
  const { user, masterAccount, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const companyName = user?.companyName || 'Company';

  const menuSections: MenuSection[] = [
    {
      title: 'People & Assets',
      items: [
        {
          id: 'employees',
          label: 'Employee Management',
          description: 'Manage company employees and assign to sites',
          icon: Users,
          route: '/company-employees',
        },
        {
          id: 'assets',
          label: 'Plant Asset Management',
          description: 'Manage company plant assets and allocations',
          icon: Package,
          route: '/company-assets',
        },
      ],
    },
    {
      title: 'Business',
      items: [
        {
          id: 'marketplace',
          label: 'Marketplace',
          description: 'List and manage assets for hire',
          icon: Store,
          route: '/plant-asset-marketplace',
          vasRequired: true,
        },
        {
          id: 'billing',
          label: 'Billing & Accounts',
          description: 'Manage billing, invoices, and payments',
          icon: CreditCard,
          route: '/billing-config',
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'company',
          label: 'Company Settings',
          description: 'Update company details and configuration',
          icon: Building2,
          route: '/company-settings',
        },
        {
          id: 'subscription',
          label: 'Subscription & VAS',
          description: 'Manage subscriptions and value-added services',
          icon: Settings,
          route: '/vas-management',
        },
      ],
    },
  ];

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.vasRequired) {
      // Check if marketplace VAS is enabled
      const hasMarketplaceVAS = user?.vasFeatures?.includes('marketplace_access') || user?.accountType === 'enterprise';
      if (!hasMarketplaceVAS) {
        Alert.alert(
          'Marketplace Access',
          'The Marketplace is a Value-Added Service. Would you like to enable it?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enable',
              onPress: () => router.push('/vas-management'),
            },
          ]
        );
        return;
      }
    }
    router.push(item.route as any);
  };

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await logout(false, 'user-initiated');
            router.replace('/login');
          },
        },
      ]
    );
  }, [logout]);

  const handleSitesNavigation = () => {
    router.push('/master-sites');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />

      <LinearGradient
        colors={['#1e3a8a', '#3b82f6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>{companyName}</Text>
              <Text style={styles.headerSubtitle}>Master Company Profile</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {user?.accountType && (
            <View style={styles.accountBadge}>
              <Text style={styles.accountBadgeText}>
                {user.accountType === 'enterprise' ? 'Enterprise' : 'Free Account'}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Quick Action: Go to Sites */}
        <TouchableOpacity 
          style={styles.quickActionCard}
          onPress={handleSitesNavigation}
        >
          <View style={styles.quickActionIcon}>
            <Building2 size={24} color="#3b82f6" />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Manage Sites</Text>
            <Text style={styles.quickActionDescription}>
              Create and manage company sites
            </Text>
          </View>
          <ChevronRight size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const isLocked = item.vasRequired && !(user?.vasFeatures?.includes('marketplace_access') || user?.accountType === 'enterprise');
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuItem,
                      itemIndex === section.items.length - 1 && styles.menuItemLast,
                    ]}
                    onPress={() => handleMenuItemPress(item)}
                  >
                    <View style={styles.menuItemIcon}>
                      <Icon size={20} color={isLocked ? '#94a3b8' : '#3b82f6'} />
                    </View>
                    <View style={styles.menuItemContent}>
                      <View style={styles.menuItemHeader}>
                        <Text style={[styles.menuItemLabel, isLocked && styles.menuItemLabelLocked]}>
                          {item.label}
                        </Text>
                        {isLocked && (
                          <View style={styles.vasBadge}>
                            <Text style={styles.vasBadgeText}>VAS</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.menuItemDescription}>{item.description}</Text>
                    </View>
                    <ChevronRight size={20} color="#94a3b8" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Company-level management • Centralized control
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
  },
  headerContent: {
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accountBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 24,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionContent: {
    flex: 1,
    gap: 2,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  quickActionDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
    gap: 4,
  },
  menuItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  menuItemLabelLocked: {
    color: '#94a3b8',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  vasBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  vasBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#ca8a04',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
