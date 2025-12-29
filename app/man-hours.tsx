import { Stack, router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FileText, ClipboardList, Inbox } from 'lucide-react-native';
import PlantAssetsTimesheetsTab from '@/components/accounts/PlantAssetsTimesheetsTab';
import { FilterValues } from '@/components/accounts/FiltersBar';
import { ExportRequest } from '@/components/accounts/ExportRequestModal';
import { handleExportRequest } from '@/utils/accounts/exportHandler';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';

type TabType = 'emh' | 'payments';

export default function ManHoursScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('emh');
  const [filters, setFilters] = useState<FilterValues>({});

  const onExport = useCallback(async (request: ExportRequest) => {
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    try {
      await handleExportRequest(request, user as User);
    } catch (error) {
      console.error('[ManHours] Export error:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'EMH (Estimated Man Hours)',
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
          style={[styles.tab, activeTab === 'emh' && styles.tabActive]}
          onPress={() => setActiveTab('emh')}
        >
          <FileText size={20} color={activeTab === 'emh' ? '#1e3a8a' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'emh' && styles.tabTextActive]}>
            EMH Report
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

      {activeTab === 'emh' ? (
        <View style={styles.content}>
          <View style={styles.placeholder}>
            <Inbox size={64} color="#3b82f6" />
            <Text style={styles.placeholderTitle}>EMH Inbox</Text>
            <Text style={styles.placeholderText}>
              Review and manage Estimated Man Hours reports from enterprise clients.
              View employee timesheets, approve hours, and handle disputes.
            </Text>
            <TouchableOpacity
              style={styles.inboxButton}
              onPress={() => router.push('/emh-inbox')}
            >
              <Inbox size={20} color="#fff" />
              <Text style={styles.inboxButtonText}>Open EMH Inbox</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <PlantAssetsTimesheetsTab 
          filters={filters}
          onFiltersChange={setFilters}
          onExport={onExport}
        />
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
  inboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inboxButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
});
