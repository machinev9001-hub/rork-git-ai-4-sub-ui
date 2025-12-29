import { Stack, router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, FileText, Send, CreditCard, ChevronRight, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  color: string;
};

export default function EmhMenuScreen() {
  const menuItems: MenuItem[] = [
    {
      id: 'inbox',
      title: 'EMH Reports',
      subtitle: 'View sent man hours reports and their status',
      icon: <FileText size={24} color="#fff" />,
      route: '/emh-inbox',
      color: '#10B981',
    },
    {
      id: 'timesheets',
      title: 'Employee Timesheets',
      subtitle: 'Review and manage employee timesheet data',
      icon: <Clock size={24} color="#fff" />,
      route: '/emh-inbox',
      color: '#3B82F6',
    },
    {
      id: 'approvals',
      title: 'EMH Approvals',
      subtitle: 'Review and approve incoming EMH reports',
      icon: <Send size={24} color="#fff" />,
      route: '/emh-inbox',
      color: '#8B5CF6',
    },
    {
      id: 'payments',
      title: 'EMH Payments',
      subtitle: 'Process payments for agreed EMH reports',
      icon: <CreditCard size={24} color="#fff" />,
      route: '/emh-inbox',
      color: '#F59E0B',
    },
  ];

  const handleNavigation = (route: string) => {
    console.log('[EMH Menu] Navigating to:', route);
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: 'Man Hours (EMH)',
          headerStyle: {
            backgroundColor: '#14532d',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Users size={32} color="#14532d" />
          </View>
          <Text style={styles.headerTitle}>Employee Man Hours</Text>
          <Text style={styles.headerSubtitle}>
            Site-level employee hours tracking, reporting, and billing
          </Text>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() => handleNavigation(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                {item.icon}
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>EMH Workflow</Text>
          <Text style={styles.infoText}>
            1. Employee timesheets are captured at site level{'\n'}
            2. Generate EMH reports for subcontractor employees{'\n'}
            3. Send reports for review and approval{'\n'}
            4. Process payments for agreed hours
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  menuGrid: {
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f172a',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  infoBox: {
    marginTop: 24,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#14532d',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#14532d',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 20,
  },
});
