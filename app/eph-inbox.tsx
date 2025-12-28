import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Calendar, DollarSign, Package, CheckCircle, AlertCircle, Clock, MessageSquare } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getEPHReportsForRecipient, approveEPHReport, disputeEPHReport } from '@/utils/ephReportManager';
import { EPHReport } from '@/types/ephReport';

type FilterStatus = 'all' | 'sent' | 'reviewed' | 'agreed' | 'disputed';

export default function EPHInboxScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<EPHReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<EPHReport[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedReport, setSelectedReport] = useState<EPHReport | null>(null);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState('');

  const loadEPHReports = useCallback(async () => {
    if (!user?.masterAccountId) return;

    try {
      setLoading(true);
      console.log('[EPH Inbox] Loading reports for:', user.masterAccountId);
      const fetchedReports = await getEPHReportsForRecipient(user.masterAccountId);
      setReports(fetchedReports);
      console.log('[EPH Inbox] Loaded', fetchedReports.length, 'reports');
    } catch (error) {
      console.error('[EPH Inbox] Error loading reports:', error);
      Alert.alert('Error', 'Failed to load EPH reports');
    } finally {
      setLoading(false);
    }
  }, [user?.masterAccountId]);

  useEffect(() => {
    if (user?.masterAccountId) {
      loadEPHReports();
    }
  }, [user?.masterAccountId, loadEPHReports]);

  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredReports(reports);
    } else {
      setFilteredReports(reports.filter(r => r.status === filterStatus));
    }
  }, [filterStatus, reports]);

  const handleApprove = async (report: EPHReport) => {
    if (!user?.userId || !report.id) return;

    Alert.alert(
      'Approve EPH Report',
      `Are you sure you want to approve this report from ${report.senderCompanyName}?\n\nTotal Hours: ${report.totalHours.toFixed(1)}h\nTotal Cost: R${report.totalCost.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await approveEPHReport(report.id!, user.userId);
              Alert.alert('Success', 'EPH report approved');
              loadEPHReports();
            } catch (error) {
              console.error('[EPH Inbox] Error approving:', error);
              Alert.alert('Error', 'Failed to approve report');
            }
          },
        },
      ]
    );
  };

  const handleDispute = async (report: EPHReport) => {
    setSelectedReport(report);
    setDisputeNotes('');
    setDisputeModalVisible(true);
  };

  const submitDispute = async () => {
    if (!user?.userId || !selectedReport?.id || !disputeNotes.trim()) {
      Alert.alert('Error', 'Please provide dispute notes');
      return;
    }

    try {
      await disputeEPHReport(selectedReport.id, user.userId, disputeNotes);
      Alert.alert('Success', 'Dispute submitted. The enterprise will be notified.');
      setDisputeModalVisible(false);
      setSelectedReport(null);
      setDisputeNotes('');
      loadEPHReports();
    } catch (error) {
      console.error('[EPH Inbox] Error disputing:', error);
      Alert.alert('Error', 'Failed to submit dispute');
    }
  };

  const getStatusColor = (status: EPHReport['status']): string => {
    switch (status) {
      case 'sent': return '#F59E0B';
      case 'reviewed': return '#3B82F6';
      case 'agreed': return '#10B981';
      case 'disputed': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getStatusIcon = (status: EPHReport['status']) => {
    const color = getStatusColor(status);
    switch (status) {
      case 'sent': return <Clock size={20} color={color} />;
      case 'reviewed': return <FileText size={20} color={color} />;
      case 'agreed': return <CheckCircle size={20} color={color} />;
      case 'disputed': return <AlertCircle size={20} color={color} />;
      default: return <FileText size={20} color={color} />;
    }
  };

  const getStatusLabel = (status: EPHReport['status']): string => {
    switch (status) {
      case 'sent': return 'Awaiting Review';
      case 'reviewed': return 'Reviewed';
      case 'agreed': return 'Agreed';
      case 'disputed': return 'Disputed';
      default: return status;
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderFilterButton = (label: string, status: FilterStatus, count: number) => {
    const isActive = filterStatus === status;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setFilterStatus(status)}
      >
        <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderReportCard = (report: EPHReport) => {
    return (
      <View key={report.id} style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reportHeaderLeft}>
            <FileText size={24} color="#3B82F6" />
            <View style={styles.reportHeaderText}>
              <Text style={styles.reportCompany}>{report.senderCompanyName}</Text>
              <Text style={styles.reportSite}>{report.siteName || 'Unknown Site'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(report.status)}20` }]}>
            {getStatusIcon(report.status)}
            <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
              {getStatusLabel(report.status)}
            </Text>
          </View>
        </View>

        <View style={styles.reportInfo}>
          <View style={styles.reportInfoRow}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.reportInfoLabel}>Period:</Text>
            <Text style={styles.reportInfoValue}>
              {formatDate(report.dateRangeFrom)} - {formatDate(report.dateRangeTo)}
            </Text>
          </View>

          <View style={styles.reportInfoRow}>
            <Package size={16} color={Colors.textSecondary} />
            <Text style={styles.reportInfoLabel}>Assets:</Text>
            <Text style={styles.reportInfoValue}>{report.totalAssets}</Text>
          </View>

          <View style={styles.reportInfoRow}>
            <Clock size={16} color={Colors.textSecondary} />
            <Text style={styles.reportInfoLabel}>Total Hours:</Text>
            <Text style={styles.reportInfoValue}>{report.totalHours.toFixed(1)}h</Text>
          </View>

          <View style={styles.reportInfoRow}>
            <DollarSign size={16} color={Colors.textSecondary} />
            <Text style={styles.reportInfoLabel}>Total Cost:</Text>
            <Text style={styles.reportCost}>R{report.totalCost.toFixed(2)}</Text>
          </View>
        </View>

        {report.message && (
          <View style={styles.messageBox}>
            <MessageSquare size={14} color={Colors.textSecondary} />
            <Text style={styles.messageText}>{report.message}</Text>
          </View>
        )}

        {report.disputeNotes && (
          <View style={styles.disputeBox}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.disputeText}>{report.disputeNotes}</Text>
          </View>
        )}

        {report.status === 'sent' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(report)}
            >
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.disputeButton}
              onPress={() => handleDispute(report)}
            >
              <AlertCircle size={18} color="#fff" />
              <Text style={styles.disputeButtonText}>Dispute</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.reportFooter}>
          <Text style={styles.reportFooterText}>
            Sent: {report.sentAt ? new Date(report.sentAt.seconds * 1000).toLocaleDateString('en-GB') : 'Unknown'}
          </Text>
          {report.agreedAt && (
            <Text style={styles.reportFooterText}>
              Agreed: {new Date(report.agreedAt.seconds * 1000).toLocaleDateString('en-GB')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const statusCounts = {
    all: reports.length,
    sent: reports.filter(r => r.status === 'sent').length,
    reviewed: reports.filter(r => r.status === 'reviewed').length,
    agreed: reports.filter(r => r.status === 'agreed').length,
    disputed: reports.filter(r => r.status === 'disputed').length,
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'EPH Inbox',
          headerStyle: { backgroundColor: Colors.headerBg },
          headerTintColor: Colors.text,
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading EPH reports...</Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {renderFilterButton('All', 'all', statusCounts.all)}
            {renderFilterButton('Awaiting', 'sent', statusCounts.sent)}
            {renderFilterButton('Reviewed', 'reviewed', statusCounts.reviewed)}
            {renderFilterButton('Agreed', 'agreed', statusCounts.agreed)}
            {renderFilterButton('Disputed', 'disputed', statusCounts.disputed)}
          </ScrollView>

          <ScrollView style={styles.content}>
            {filteredReports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FileText size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No EPH reports</Text>
                <Text style={styles.emptySubtext}>
                  EPH reports from enterprise clients will appear here
                </Text>
              </View>
            ) : (
              <View style={styles.reportsContainer}>
                {filteredReports.map(report => renderReportCard(report))}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {disputeModalVisible && selectedReport && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Dispute EPH Report</Text>
            <Text style={styles.modalSubtitle}>
              {selectedReport.senderCompanyName}
            </Text>
            <Text style={styles.modalLabel}>Please provide details about the discrepancy:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="E.g., Hours don't match our records for Asset XYZ-123..."
              placeholderTextColor={Colors.textSecondary}
              value={disputeNotes}
              onChangeText={setDisputeNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDisputeModalVisible(false);
                  setSelectedReport(null);
                  setDisputeNotes('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={submitDispute}
              >
                <Text style={styles.modalSubmitButtonText}>Submit Dispute</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  filterContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  reportsContainer: {
    padding: 16,
    gap: 16,
  },
  reportCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reportHeaderText: {
    flex: 1,
  },
  reportCompany: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  reportSite: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reportInfo: {
    gap: 12,
    marginBottom: 16,
  },
  reportInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportInfoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reportInfoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  reportCost: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    marginBottom: 16,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  disputeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginBottom: 16,
  },
  disputeText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  disputeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
  },
  disputeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportFooterText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
