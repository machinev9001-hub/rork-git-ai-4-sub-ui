import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Calendar, DollarSign, Package, CheckCircle, AlertCircle, Clock, MessageSquare, X, Inbox, Send, CreditCard } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getEPHReportsForSender } from '@/utils/ephReportManager';
import { EPHReport } from '@/types/ephReport';
import { collection, getDocs, query, where, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';

type FilterStatus = 'all' | 'sent' | 'reviewed' | 'agreed' | 'disputed';
type TabType = 'inbox' | 'report' | 'payments';

export default function MachineHoursScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<EPHReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<EPHReport[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [selectedReport, setSelectedReport] = useState<EPHReport | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailedTimesheets, setDetailedTimesheets] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadEPHReports = useCallback(async () => {
    if (!user?.masterAccountId) return;

    try {
      setLoading(true);
      console.log('[EPH Inbox] Loading sent reports for:', user.masterAccountId);
      const fetchedReports = await getEPHReportsForSender(user.masterAccountId);
      setReports(fetchedReports);
      console.log('[EPH Inbox] Loaded', fetchedReports.length, 'sent reports');
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

  const handleViewDetails = async (report: EPHReport) => {
    setSelectedReport(report);
    setLoadingDetails(true);
    setDetailsVisible(true);

    try {
      console.log('[EPH Inbox] Loading timesheet details for report:', report.id);
      const timesheets: any[] = [];

      for (const assetId of report.assetIds) {
        console.log('[EPH Inbox] Fetching timesheets for asset:', assetId);
        const q = query(
          collection(db, 'plantAssetTimesheets'),
          where('assetId', '==', assetId),
          where('date', '>=', report.dateRangeFrom),
          where('date', '<=', report.dateRangeTo),
          firestoreOrderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          timesheets.push({
            id: doc.id,
            assetId: data.assetId,
            assetType: data.assetType,
            plantNumber: data.plantNumber,
            registrationNumber: data.registrationNumber,
            date: data.date,
            totalHours: data.totalHours || 0,
            openHours: data.openHours || '00:00',
            closeHours: data.closeHours || data.closingHours || '00:00',
            operatorName: data.operatorName || 'Unknown',
            isBreakdown: data.isBreakdown || false,
            isRainDay: data.isRainDay || false,
            isStrikeDay: data.isStrikeDay || false,
            isPublicHoliday: data.isPublicHoliday || false,
            notes: data.notes || data.adminNotes || data.billingNotes || '',
          });
        });
      }

      console.log('[EPH Inbox] Loaded', timesheets.length, 'timesheet entries');
      setDetailedTimesheets(timesheets);
    } catch (error) {
      console.error('[EPH Inbox] Error loading timesheet details:', error);
      Alert.alert('Error', 'Failed to load timesheet details');
    } finally {
      setLoadingDetails(false);
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
              <Text style={styles.reportCompany}>To: {report.recipientName}</Text>
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

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => handleViewDetails(report)}
        >
          <FileText size={16} color="#3B82F6" />
          <Text style={styles.viewDetailsButtonText}>View Line Items</Text>
        </TouchableOpacity>

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
          title: 'Machine Hours',
          headerStyle: { backgroundColor: Colors.headerBg },
          headerTintColor: Colors.text,
        }}
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && styles.tabActive]}
          onPress={() => setActiveTab('inbox')}
        >
          <Inbox size={20} color={activeTab === 'inbox' ? '#3B82F6' : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.tabTextActive]}>EPH Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'report' && styles.tabActive]}
          onPress={() => setActiveTab('report')}
        >
          <Send size={20} color={activeTab === 'report' ? '#3B82F6' : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'report' && styles.tabTextActive]}>EPH Approvals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
          onPress={() => setActiveTab('payments')}
        >
          <CreditCard size={20} color={activeTab === 'payments' ? '#3B82F6' : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>EPH Payments</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'inbox' && (
        loading ? (
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
                  <Text style={styles.emptyText}>No EPH reports sent</Text>
                  <Text style={styles.emptySubtext}>
                    EPH reports you send to subcontractors will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.reportsContainer}>
                  {filteredReports.map(report => renderReportCard(report))}
                </View>
              )}
            </ScrollView>
          </>
        )
      )}

      {activeTab === 'report' && (
        <ScrollView style={styles.content}>
          <View style={styles.emptyContainer}>
            <Send size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>EPH Approvals</Text>
            <Text style={styles.emptySubtext}>
              Review and approve EPH reports from sites
            </Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'payments' && (
        <ScrollView style={styles.content}>
          <View style={styles.emptyContainer}>
            <CreditCard size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>EPH Payments</Text>
            <Text style={styles.emptySubtext}>
              Process payments for agreed EPH reports
            </Text>
          </View>
        </ScrollView>
      )}

      {detailsVisible && selectedReport && (
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContent}>
            <View style={styles.detailsHeader}>
              <View>
                <Text style={styles.detailsTitle}>EPH Report Details</Text>
                <Text style={styles.detailsSubtitle}>Sent to: {selectedReport.recipientName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDetailsVisible(false);
                  setSelectedReport(null);
                  setDetailedTimesheets([]);
                }}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <View style={styles.detailsLoading}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.loadingText}>Loading timesheet details...</Text>
              </View>
            ) : (
              <ScrollView style={styles.detailsContent}>
                <View style={styles.detailsSummary}>
                  <Text style={styles.summaryLabel}>Total Hours: {selectedReport.totalHours.toFixed(1)}h</Text>
                  <Text style={styles.summaryLabel}>Total Cost: R{selectedReport.totalCost.toFixed(2)}</Text>
                  <Text style={styles.summaryLabel}>Assets: {selectedReport.totalAssets}</Text>
                </View>

                {detailedTimesheets.length === 0 ? (
                  <Text style={styles.noTimesheetsText}>No timesheet entries found</Text>
                ) : (
                  <View style={styles.timesheetsContainer}>
                    {detailedTimesheets.map((timesheet, index) => (
                      <View key={`${timesheet.id}-${index}`} style={styles.timesheetCard}>
                        <View style={styles.timesheetHeader}>
                          <View style={styles.timesheetHeaderLeft}>
                            <Text style={styles.timesheetAsset}>
                              {timesheet.assetType} - {timesheet.plantNumber || timesheet.registrationNumber}
                            </Text>
                            <Text style={styles.timesheetDate}>{timesheet.date}</Text>
                          </View>
                        </View>

                        <View style={styles.timesheetDetails}>
                          <View style={styles.timesheetRow}>
                            <Text style={styles.timesheetLabel}>Operator:</Text>
                            <Text style={styles.timesheetValue}>{timesheet.operatorName}</Text>
                          </View>
                          <View style={styles.timesheetRow}>
                            <Text style={styles.timesheetLabel}>Hours:</Text>
                            <Text style={styles.timesheetValue}>{timesheet.totalHours}h</Text>
                          </View>
                          <View style={styles.timesheetRow}>
                            <Text style={styles.timesheetLabel}>Open/Close:</Text>
                            <Text style={styles.timesheetValue}>
                              {timesheet.openHours} - {timesheet.closeHours}
                            </Text>
                          </View>

                          {(timesheet.isBreakdown || timesheet.isRainDay || timesheet.isStrikeDay || timesheet.isPublicHoliday) && (
                            <View style={styles.conditionsRow}>
                              {timesheet.isBreakdown && (
                                <View style={styles.conditionBadge}>
                                  <Text style={styles.conditionText}>Breakdown</Text>
                                </View>
                              )}
                              {timesheet.isRainDay && (
                                <View style={styles.conditionBadge}>
                                  <Text style={styles.conditionText}>Rain</Text>
                                </View>
                              )}
                              {timesheet.isStrikeDay && (
                                <View style={styles.conditionBadge}>
                                  <Text style={styles.conditionText}>Strike</Text>
                                </View>
                              )}
                              {timesheet.isPublicHoliday && (
                                <View style={styles.conditionBadge}>
                                  <Text style={styles.conditionText}>Holiday</Text>
                                </View>
                              )}
                            </View>
                          )}

                          {timesheet.notes && (
                            <View style={styles.timesheetNotes}>
                              <Text style={styles.notesText}>{timesheet.notes}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
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
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3B82F6',
  },
  detailsModalContent: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    width: '95%',
    maxWidth: 800,
    maxHeight: '90%',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  detailsSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  detailsLoading: {
    padding: 40,
    alignItems: 'center',
  },
  detailsContent: {
    flex: 1,
  },
  detailsSummary: {
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  noTimesheetsText: {
    padding: 40,
    textAlign: 'center',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timesheetsContainer: {
    padding: 16,
    gap: 12,
  },
  timesheetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timesheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  timesheetHeaderLeft: {
    flex: 1,
  },
  timesheetAsset: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  timesheetDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timesheetDetails: {
    gap: 6,
  },
  timesheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timesheetLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timesheetValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1E40AF',
  },
  timesheetNotes: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
  },
  notesText: {
    fontSize: 12,
    color: Colors.text,
    fontStyle: 'italic' as const,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#3B82F6',
  },
});
