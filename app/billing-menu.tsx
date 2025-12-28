import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DollarSign, Package, Users } from 'lucide-react-native';

export default function BillingMenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const menuItems = [
    {
      id: 'billing-config',
      title: 'Billing Configuration',
      description: 'Configure billing rules and rates for all hour types',
      icon: DollarSign,
      color: '#f59e0b',
      route: '/billing-config',
    },
    {
      id: 'eph-inbox',
      title: 'Machine Hours (EPH)',
      description: 'Equipment and plant hours reports, approvals, and payments',
      icon: Package,
      color: '#3b82f6',
      route: '/eph-inbox',
    },
    {
      id: 'emh-inbox',
      title: 'Man Hours (EMH)',
      description: 'Employee man hours reports, approvals, and payments',
      icon: Users,
      color: '#10b981',
      route: '/emh-inbox',
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Billing Management',
          headerStyle: {
            backgroundColor: '#1e3a8a',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Billing Management</Text>
          <Text style={styles.headerSubtitle}>
            Select a category to manage hours and process billing
          </Text>
        </View>

        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <IconComponent size={32} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
