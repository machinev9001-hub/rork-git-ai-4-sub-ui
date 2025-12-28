import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { FileText, ClipboardList } from 'lucide-react-native';
type TabType = 'eph' | 'payments';

export default function MachineHoursScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('eph');

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'Machine Hours',
          headerStyle: {
            backgroundColor: '#1e3a8a',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'eph' && styles.tabActive]}
          onPress={() => setActiveTab('eph')}
        >
          <FileText size={20} color={activeTab === 'eph' ? '#1e3a8a' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'eph' && styles.tabTextActive]}>
            EPH Report
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
          onPress={() => setActiveTab('payments')}
        >
          <ClipboardList size={20} color={activeTab === 'payments' ? '#1e3a8a' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
            Process Payments
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'eph' ? (
        <View style={styles.content}>
          <View style={styles.placeholder}>
            <FileText size={64} color="#94a3b8" />
            <Text style={styles.placeholderTitle}>EPH Report - Machine Hours</Text>
            <Text style={styles.placeholderText}>
              Generate and manage Equipment Per Hour reports for plant assets.
              Select subcontractors, view asset timesheets, and process billing.
            </Text>
            <Text style={styles.placeholderNote}>
              This functionality will be migrated from billing-config.tsx
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.placeholder}>
            <ClipboardList size={64} color="#94a3b8" />
            <Text style={styles.placeholderTitle}>Process Payments - Machine Hours</Text>
            <Text style={styles.placeholderText}>
              Review approved machine hour timesheets and process payments.
              View asset timesheets, generate reports, and export data.
            </Text>
            <Text style={styles.placeholderNote}>
              This functionality will use the accounts/PlantAssetsTimesheetsTab component
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1e3a8a',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  tabTextActive: {
    color: '#1e3a8a',
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  placeholderNote: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic' as const,
    marginTop: 8,
  },
});
