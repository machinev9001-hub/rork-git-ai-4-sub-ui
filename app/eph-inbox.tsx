import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Calendar, Package, CheckCircle, AlertCircle, Clock, MessageSquare, X, Inbox, Send, CreditCard, ChevronDown, ChevronUp, CalendarDays, CheckSquare, Square } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingAgreementsByMasterAccount, PendingAgreement } from '@/utils/pendingAgreementManager';
import { getAgreedTimesheetsByDateRange } from '@/utils/agreedTimesheetManager';

import { collection, getDocs, query, where, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PlantAsset, Subcontractor } from '@/types';
import { BillableHoursResult } from '@/utils/billableHoursCalculator';
import ReportGenerationModal from '@/components/accounts/ReportGenerationModal';
import SendConfirmationModal from '@/components/accounts/SendConfirmationModal';
import { generateTimesheetPDF, downloadTimesheetPDF, emailTimesheetPDF } from '@/utils/timesheetPdfGenerator';
import { sendEPHToSubcontractor } from '@/utils/ephEmailService';

type FilterStatus = 'all' | 'pending_subcontractor_review' | 'subcontractor_responded' | 'agreed' | 'rejected';
type TabType = 'inbox' | 'report' | 'payments';

type TimesheetEntry = {
  id: string;
  date: string;
  openHours: string;
  closeHours: string;
  totalHours: number;
  operatorName: string;
  isRainDay: boolean;
  isStrikeDay: boolean;
  isBreakdown: boolean;
  isPublicHoliday: boolean;
  notes?: string;
  hasOriginalEntry?: boolean;
  adjustedBy?: string;
  isAdjustment?: boolean;
};

type EPHRecord = {
  assetId: string;
  assetType: string;
  plantNumber?: string;
  registrationNumber?: string;
  rate: number;
  rateType: 'wet' | 'dry';
  totalActualHours: number;
  totalBillableHours: number;
  estimatedCost: number;
  actualNormalHours: number;
  actualSaturdayHours: number;
  actualSundayHours: number;
  actualPublicHolidayHours: number;
  actualRainDayHours: number;
  billableNormalHours: number;
  billableSaturdayHours: number;
  billableSundayHours: number;
  billablePublicHolidayHours: number;
  billableRainDayHours: number;
  rawTimesheets: TimesheetEntry[];
  billingResultsByDate?: Map<string, BillableHoursResult>;
};



export default function MachineHoursScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<PendingAgreement[]>([]);
  const [filteredReports, setFilteredReports] = useState<PendingAgreement[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [selectedReport, setSelectedReport] = useState<PendingAgreement | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailedTimesheets, setDetailedTimesheets] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<string | null>(null);
  const [, setPlantAssets] = useState<PlantAsset[]>([]);
  const [ephData, setEphData] = useState<EPHRecord[]>([]);
  const [, setEphTimesheets] = useState<Map<string, TimesheetEntry[]>>(new Map());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());



  const loadSubcontractors = useCallback(async () => {
    if (!user?.masterAccountId || !user?.siteId) return;
    try {
      const q = query(
        collection(db, 'subcontractors'),
        where('masterAccountId', '==', user.masterAccountId),
        where('siteId', '==', user.siteId),
        where('status', '==', 'Active'),
        firestoreOrderBy('name')
      );
      const snapshot = await getDocs(q);
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subcontractor));
      setSubcontractors(subs);
    } catch (error) {
      console.error('[EPH] Error loading subcontractors:', error);
    }
  }, [user?.masterAccountId, user?.siteId]);

  const generateEPHReport = useCallback(async (assets: PlantAsset[], _subcontractorId: string) => {
    try {
      console.log('[EPH] Generating EPH report for', assets.length, 'assets');
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const agreedTimesheets = await getAgreedTimesheetsByDateRange(
        user?.masterAccountId || '',
        startDateStr,
        endDateStr
      );
      console.log('[EPH] Found', agreedTimesheets.length, 'agreed timesheets');
      
      const assetTimesheetsMap = new Map<string, any[]>();
      agreedTimesheets.forEach(ts => {
        if (ts.assetId && ts.timesheetType === 'plant_asset') {
          const existing = assetTimesheetsMap.get(ts.assetId) || [];
          existing.push(ts);
          assetTimesheetsMap.set(ts.assetId, existing);
        }
      });
      
      const ephRecords: EPHRecord[] = assets.map((asset) => {
        const assetTimesheets = assetTimesheetsMap.get(asset.assetId) || [];
        console.log('[EPH] Asset', asset.assetId, 'has', assetTimesheets.length, 'agreed timesheets');
        
        const rawEntries: TimesheetEntry[] = assetTimesheets.map(ts => ({
          id: ts.id,
          date: ts.date,
          openHours: String(ts.originalOpenHours || 0),
          closeHours: String(ts.originalCloseHours || 0),
          totalHours: ts.agreedHours || ts.originalHours || 0,
          operatorName: ts.operatorName || 'Unknown',
          isRainDay: ts.isRainDay || false,
          isStrikeDay: false,
          isBreakdown: ts.isBreakdown || false,
          isPublicHoliday: ts.isPublicHoliday || false,
          notes: ts.adminNotes || ts.originalNotes,
          hasOriginalEntry: false,
          adjustedBy: ts.agreedByRole,
          isAdjustment: false,
        }));
        
        setEphTimesheets(prev => { const m = new Map(prev); m.set(asset.assetId, rawEntries); return m; });
        
        let actualNormalHours = 0, actualSaturdayHours = 0, actualSundayHours = 0, actualPublicHolidayHours = 0, actualRainDayHours = 0;
        let billableNormalHours = 0, billableSaturdayHours = 0, billableSundayHours = 0, billablePublicHolidayHours = 0, billableRainDayHours = 0;
        const billingResultsByDate = new Map<string, BillableHoursResult>();
        
        assetTimesheets.forEach((ts) => {
          const actualHours = ts.agreedHours || ts.originalHours || 0;
          const storedBillableHours = ts.billableHours || actualHours;
          const date = new Date(ts.date);
          const dayOfWeek = date.getDay();
          
          const billingResult: BillableHoursResult = {
            actualHours: actualHours,
            billableHours: storedBillableHours,
            appliedRule: ts.billingRule || 'stored',
            minimumApplied: 0,
            notes: '',
          };
          billingResultsByDate.set(ts.date, billingResult);
          
          if (ts.isRainDay) { actualRainDayHours += actualHours; billableRainDayHours += storedBillableHours; }
          else if (ts.isPublicHoliday) { actualPublicHolidayHours += actualHours; billablePublicHolidayHours += storedBillableHours; }
          else if (dayOfWeek === 6) { actualSaturdayHours += actualHours; billableSaturdayHours += storedBillableHours; }
          else if (dayOfWeek === 0) { actualSundayHours += actualHours; billableSundayHours += storedBillableHours; }
          else { actualNormalHours += actualHours; billableNormalHours += storedBillableHours; }
        });
        
        const rate = asset.dryRate || asset.wetRate || 0;
        const totalActualHours = actualNormalHours + actualSaturdayHours + actualSundayHours + actualPublicHolidayHours + actualRainDayHours;
        const totalBillableHours = billableNormalHours + billableSaturdayHours + billableSundayHours + billablePublicHolidayHours + billableRainDayHours;
        
        return {
          assetId: asset.assetId, assetType: asset.type, plantNumber: asset.plantNumber, registrationNumber: asset.registrationNumber,
          rate, rateType: (asset.dryRate ? 'dry' : 'wet') as 'wet' | 'dry',
          totalActualHours, totalBillableHours, estimatedCost: totalBillableHours * rate,
          actualNormalHours, actualSaturdayHours, actualSundayHours, actualPublicHolidayHours, actualRainDayHours,
          billableNormalHours, billableSaturdayHours, billableSundayHours, billablePublicHolidayHours, billableRainDayHours,
          rawTimesheets: rawEntries, billingResultsByDate,
        };
      });
      
      setEphData(ephRecords);
      console.log('[EPH] Generated', ephRecords.length, 'EPH records');
    } catch (error) {
      console.error('[EPH] Error generating EPH report:', error);
      Alert.alert('Error', 'Failed to generate EPH report. Please try again.');
    }
  }, [startDate, endDate, user?.masterAccountId]);

  const loadPlantAssets = useCallback(async (subcontractorId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'plantAssets'),
        where('masterAccountId', '==', user?.masterAccountId),
        where('siteId', '==', user?.siteId),
        where('ownerId', '==', subcontractorId),
        where('ownerType', '==', 'subcontractor')
      );
      const snapshot = await getDocs(q);
      const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlantAsset));
      setPlantAssets(assets);
      if (assets.length > 0) await generateEPHReport(assets, subcontractorId);
      else setEphData([]);
    } catch (error) {
      console.error('[EPH] Error loading plant assets:', error);
    } finally {
      setLoading(false);
    }
  }, [generateEPHReport, user?.masterAccountId, user?.siteId]);

  const loadEPHReports = useCallback(async () => {
    if (!user?.masterAccountId) return;
    try {
      setReportsLoading(true);
      const fetchedReports = await getPendingAgreementsByMasterAccount(user.masterAccountId);
      setReports(fetchedReports);
      console.log('[EPH Inbox] Loaded', fetchedReports.length, 'pending agreements');
    } catch (error) {
      console.error('[EPH Inbox] Error loading reports:', error);
      Alert.alert('Error', 'Failed to load EPH reports');
    } finally {
      setReportsLoading(false);
    }
  }, [user?.masterAccountId]);

  useEffect(() => {
    loadSubcontractors();
    if (user?.masterAccountId) loadEPHReports();
  }, [user?.masterAccountId, loadEPHReports, loadSubcontractors]);

  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredReports(reports);
    } else {
      setFilteredReports(reports.filter(r => r.status === filterStatus));
    }
  }, [filterStatus, reports]);

  const handleViewDetails = async (report: PendingAgreement) => {
    setSelectedReport(report);
    setLoadingDetails(true);
    setDetailsVisible(true);

    try {
      console.log('[EPH Inbox] Loading timesheet details for agreement:', report.id);
      const timesheets: any[] = [];

      const agreedTimesheets = await getAgreedTimesheetsByDateRange(
        report.masterAccountId,
        report.dateRange.from,
        report.dateRange.to
      );
      
      agreedTimesheets.forEach(ts => {
        if (ts.assetId === report.assetId && ts.timesheetType === 'plant_asset') {
          timesheets.push({
            id: ts.id,
            assetId: ts.assetId,
            assetType: ts.assetType || report.assetType || 'Plant Asset',
            plantNumber: report.plantNumber || '',
            registrationNumber: report.registrationNumber || '',
            date: ts.date,
            totalHours: ts.agreedHours || ts.originalHours || 0,
            openHours: String(ts.originalOpenHours || '00:00'),
            closeHours: String(ts.originalCloseHours || '00:00'),
            operatorName: ts.operatorName || 'Unknown',
            isBreakdown: ts.isBreakdown || false,
            isRainDay: ts.isRainDay || false,
            isStrikeDay: false,
            isPublicHoliday: ts.isPublicHoliday || false,
            notes: ts.adminNotes || ts.originalNotes || '',
            billableHours: ts.billableHours,
            billingRule: ts.billingRule,
          });
        }
      });

      console.log('[EPH Inbox] Loaded', timesheets.length, 'timesheet entries');
      setDetailedTimesheets(timesheets);
    } catch (error) {
      console.error('[EPH Inbox] Error loading timesheet details:', error);
      Alert.alert('Error', 'Failed to load timesheet details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusColor = (status: PendingAgreement['status']): string => {
    switch (status) {
      case 'pending_subcontractor_review': return '#F59E0B';
      case 'subcontractor_responded': return '#3B82F6';
      case 'admin_final_review': return '#8B5CF6';
      case 'agreed': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getStatusIcon = (status: PendingAgreement['status']) => {
    const color = getStatusColor(status);
    switch (status) {
      case 'pending_subcontractor_review': return <Clock size={20} color={color} />;
      case 'subcontractor_responded': return <FileText size={20} color={color} />;
      case 'admin_final_review': return <FileText size={20} color={color} />;
      case 'agreed': return <CheckCircle size={20} color={color} />;
      case 'rejected': return <AlertCircle size={20} color={color} />;
      default: return <FileText size={20} color={color} />;
    }
  };

  const getStatusLabel = (status: PendingAgreement['status']): string => {
    switch (status) {
      case 'pending_subcontractor_review': return 'Awaiting Review';
      case 'subcontractor_responded': return 'Response Received';
      case 'admin_final_review': return 'Final Review';
      case 'agreed': return 'Agreed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const formatDateStr = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toggleCardExpansion = (assetId: string) => {
    setExpandedCards(prev => { const s = new Set(prev); if (s.has(assetId)) s.delete(assetId); else s.add(assetId); return s; });
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds(prev => { const s = new Set(prev); if (s.has(assetId)) s.delete(assetId); else s.add(assetId); return s; });
  };

  const handleGeneratePDF = async (options: { scope: 'all' | 'selected'; deliveryMethod: 'download' | 'email'; recipientEmail?: string }) => {
    if (!selectedSubcontractor) { Alert.alert('Error', 'No subcontractor selected'); return; }
    const selectedAssets = options.scope === 'selected' ? ephData.filter(r => selectedAssetIds.has(r.assetId)) : ephData;
    if (selectedAssets.length === 0) { Alert.alert('Error', 'No assets to include'); return; }
    try {
      const subcontractor = subcontractors.find(s => s.id === selectedSubcontractor);
      const groups = selectedAssets.map(record => {
        const entries = record.rawTimesheets.map(ts => {
          const billingResult = record.billingResultsByDate?.get(ts.date);
          const billableHours = billingResult?.billableHours ?? ts.totalHours;
          const totalCost = billableHours * record.rate;
          return {
            id: ts.id,
            date: ts.date,
            operatorName: ts.operatorName,
            operatorId: ts.operatorName,
            verified: true,
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'system',
            masterAccountId: user?.masterAccountId || '',
            siteId: user?.siteId || '',
            type: 'plant_hours' as const,
            openHours: parseFloat(ts.openHours) || 0,
            closeHours: parseFloat(ts.closeHours) || 0,
            totalHours: ts.totalHours,
            actualHours: ts.totalHours,
            billableHours: billableHours,
            assetRate: record.rate,
            totalCost: totalCost,
            isBreakdown: ts.isBreakdown,
            inclementWeather: ts.isRainDay,
            isRainDay: ts.isRainDay,
            isStrikeDay: ts.isStrikeDay,
            isPublicHoliday: ts.isPublicHoliday,
            hasAttachment: false,
            assetId: record.assetId,
            assetType: record.assetType,
            plantNumber: record.plantNumber,
            registrationNumber: record.registrationNumber,
            ownerId: selectedSubcontractor,
            ownerType: 'subcontractor' as const,
            ownerName: subcontractor?.name,
            notes: ts.notes,
            location: user?.siteId,
          };
        });

        const dateGroups = entries.map(entry => ({
          date: entry.date,
          operatorEntry: entry,
          plantManagerEntry: undefined,
          adminEntry: undefined,
          subcontractorEntry: undefined,
        }));

        return {
          key: record.assetId,
          title: record.assetType,
          subtitle: record.plantNumber || record.registrationNumber || record.assetId,
          entries,
          dateGroups,
        };
      });
      console.log('[EPH PDF] Generating PDF with', groups.length, 'groups');
      groups.forEach(g => console.log('[EPH PDF] Group:', g.title, g.subtitle, 'entries:', g.entries.length, 'dateGroups:', g.dateGroups.length));
      const { uri, fileName } = await generateTimesheetPDF({ groups, reportType: 'plant', subcontractorName: subcontractor?.name, dateRange: { from: startDate, to: endDate }, selectedOnly: options.scope === 'selected', selectedGroups: options.scope === 'selected' ? new Set(selectedAssets.map(r => r.assetId)) : undefined });
      if (options.deliveryMethod === 'email') { await emailTimesheetPDF(uri, fileName, { recipientEmail: options.recipientEmail, subject: `EPH Report - ${subcontractor?.name}`, body: 'Please find attached the EPH report.' }); Alert.alert('Success', 'Email composer opened'); }
      else { await downloadTimesheetPDF(uri, fileName); Alert.alert('Success', 'Report downloaded'); }
    } catch (error) { console.error('[PDF] Error:', error); Alert.alert('Error', 'Failed to generate report'); }
  };

  const handleSendToSubcontractor = async (recipientEmail: string, message: string) => {
    if (!selectedSubcontractor || !user) { Alert.alert('Error', 'Missing info'); return; }
    try {
      const selectedAssets = Array.from(selectedAssetIds).map(id => ephData.find(r => r.assetId === id)).filter(Boolean) as EPHRecord[];
      const totalHours = selectedAssets.reduce((sum, a) => sum + a.totalBillableHours, 0);
      const subcontractor = subcontractors.find(s => s.id === selectedSubcontractor);
      
      const groups = selectedAssets.map(record => {
        const entries = record.rawTimesheets.map(ts => {
          const billingResult = record.billingResultsByDate?.get(ts.date);
          const billableHours = billingResult?.billableHours ?? ts.totalHours;
          const totalCost = billableHours * record.rate;
          return {
            id: ts.id,
            date: ts.date,
            operatorName: ts.operatorName,
            operatorId: ts.operatorName,
            verified: true,
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'system',
            masterAccountId: user?.masterAccountId || '',
            siteId: user?.siteId || '',
            type: 'plant_hours' as const,
            openHours: parseFloat(ts.openHours) || 0,
            closeHours: parseFloat(ts.closeHours) || 0,
            totalHours: ts.totalHours,
            actualHours: ts.totalHours,
            billableHours: billableHours,
            assetRate: record.rate,
            totalCost: totalCost,
            isBreakdown: ts.isBreakdown,
            inclementWeather: ts.isRainDay,
            isRainDay: ts.isRainDay,
            isStrikeDay: ts.isStrikeDay,
            isPublicHoliday: ts.isPublicHoliday,
            hasAttachment: false,
            assetId: record.assetId,
            assetType: record.assetType,
            plantNumber: record.plantNumber,
            registrationNumber: record.registrationNumber,
            ownerId: selectedSubcontractor,
            ownerType: 'subcontractor' as const,
            ownerName: subcontractor?.name,
            notes: ts.notes,
            location: user?.siteId,
          };
        });
        const dateGroups = entries.map(entry => ({
          date: entry.date,
          operatorEntry: entry,
          plantManagerEntry: undefined,
          adminEntry: undefined,
          subcontractorEntry: undefined,
        }));
        return {
          key: record.assetId,
          title: record.assetType,
          subtitle: record.plantNumber || record.registrationNumber || record.assetId,
          entries,
          dateGroups,
        };
      });
      
      const { uri, fileName } = await generateTimesheetPDF({ groups, reportType: 'plant', subcontractorName: subcontractor?.name, dateRange: { from: startDate, to: endDate }, selectedOnly: true, selectedGroups: new Set(selectedAssets.map(r => r.assetId)) });
      await sendEPHToSubcontractor({ recipientEmail, message, pdfUri: uri, pdfFileName: fileName, subcontractorName: subcontractor?.name || 'Unknown', dateRange: { from: startDate, to: endDate }, assetCount: selectedAssets.length, totalHours, companyName: user.companyName || 'Your Company' });
      Alert.alert('Success', 'EPH report sent');
    } catch (error) { console.error('[EPH] Error:', error); throw error; }
  };

  const handleDirectApprove = async () => { Alert.alert('Info', 'Direct approval coming soon'); };

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

  const renderReportCard = (report: PendingAgreement) => {
    const adminHours = report.adminEditedVersion?.hours;
    const subHours = report.subcontractorSuggestedVersion?.hours;
    
    return (
      <View key={report.id} style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reportHeaderLeft}>
            <FileText size={24} color="#3B82F6" />
            <View style={styles.reportHeaderText}>
              <Text style={styles.reportCompany}>To: {report.subcontractorName}</Text>
              <Text style={styles.reportSite}>{report.assetType} - {report.plantNumber || report.registrationNumber || report.assetId}</Text>
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
              {formatDateStr(report.dateRange.from)} - {formatDateStr(report.dateRange.to)}
            </Text>
          </View>

          <View style={styles.reportInfoRow}>
            <Package size={16} color={Colors.textSecondary} />
            <Text style={styles.reportInfoLabel}>Asset:</Text>
            <Text style={styles.reportInfoValue}>{report.assetType}</Text>
          </View>

          {adminHours !== undefined && (
            <View style={styles.reportInfoRow}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.reportInfoLabel}>Admin Hours:</Text>
              <Text style={styles.reportInfoValue}>{adminHours.toFixed(1)}h</Text>
            </View>
          )}

          {subHours !== undefined && (
            <View style={styles.reportInfoRow}>
              <Clock size={16} color="#10B981" />
              <Text style={styles.reportInfoLabel}>Sub Response:</Text>
              <Text style={[styles.reportInfoValue, { color: '#10B981' }]}>{subHours.toFixed(1)}h</Text>
            </View>
          )}
        </View>

        {report.adminEditedVersion?.notes && (
          <View style={styles.messageBox}>
            <MessageSquare size={14} color={Colors.textSecondary} />
            <Text style={styles.messageText}>{report.adminEditedVersion.notes}</Text>
          </View>
        )}

        {report.subcontractorSuggestedVersion?.notes && (
          <View style={styles.disputeBox}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.disputeText}>{report.subcontractorSuggestedVersion.notes}</Text>
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
            Sent: {report.sentToSubcontractorAt ? new Date(report.sentToSubcontractorAt.seconds * 1000).toLocaleDateString('en-GB') : 'Unknown'}
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
    pending_subcontractor_review: reports.filter(r => r.status === 'pending_subcontractor_review').length,
    subcontractor_responded: reports.filter(r => r.status === 'subcontractor_responded').length,
    agreed: reports.filter(r => r.status === 'agreed').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
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
        <ScrollView style={styles.content}>
          <View style={styles.generationContainer}>
            <View style={styles.selectorSection}>
              <Text style={styles.selectorLabel}>Select Subcontractor:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subList}>
                {subcontractors.map(sub => (
                  <TouchableOpacity key={sub.id} style={[styles.subButton, selectedSubcontractor === sub.id && styles.subButtonActive]} onPress={() => { setSelectedSubcontractor(sub.id!); loadPlantAssets(sub.id!); }}>
                    <Text style={[styles.subButtonText, selectedSubcontractor === sub.id && styles.subButtonTextActive]}>{sub.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.dateRangeSection}>
              <View style={styles.dateRangeHeader}>
                <CalendarDays size={20} color="#1e3a8a" />
                <Text style={styles.dateRangeTitle}>Billing Period</Text>
              </View>
              <View style={styles.datePickersRow}>
                <View style={styles.datePickerBlock}>
                  <Text style={styles.datePickerLabel}>Start Date</Text>
                  {Platform.OS === 'web' ? (
                    <input type="date" value={startDate.toISOString().split('T')[0]} onChange={(e: any) => setStartDate(new Date(e.target.value))} style={{ height: 44, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingLeft: 12, paddingRight: 12, fontSize: 14 }} />
                  ) : (
                    <TouchableOpacity style={styles.dateButton}><Calendar size={18} color="#64748b" /><Text style={styles.dateButtonText}>{formatDate(startDate)}</Text></TouchableOpacity>
                  )}
                </View>
                <View style={styles.datePickerBlock}>
                  <Text style={styles.datePickerLabel}>End Date</Text>
                  {Platform.OS === 'web' ? (
                    <input type="date" value={endDate.toISOString().split('T')[0]} onChange={(e: any) => setEndDate(new Date(e.target.value))} style={{ height: 44, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingLeft: 12, paddingRight: 12, fontSize: 14 }} />
                  ) : (
                    <TouchableOpacity style={styles.dateButton}><Calendar size={18} color="#64748b" /><Text style={styles.dateButtonText}>{formatDate(endDate)}</Text></TouchableOpacity>
                  )}
                </View>
              </View>
              {selectedSubcontractor && (
                <View style={styles.generateButtonsRow}>
                  <TouchableOpacity style={[styles.genButton, styles.genButtonPrimary]} onPress={() => setReportModalVisible(true)}>
                    <FileText size={18} color="#fff" /><Text style={styles.genButtonText}>Generate All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.genButton, styles.genButtonSecondary, selectedAssetIds.size === 0 && styles.genButtonDisabled]} onPress={() => { if (selectedAssetIds.size > 0) setReportModalVisible(true); else Alert.alert('Select assets first'); }} disabled={selectedAssetIds.size === 0}>
                    <CheckSquare size={18} color={selectedAssetIds.size === 0 ? '#94a3b8' : '#1e3a8a'} /><Text style={[styles.genButtonTextSec, selectedAssetIds.size === 0 && styles.genButtonTextDisabled]}>Selected ({selectedAssetIds.size})</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.genButton, styles.sendButton, selectedAssetIds.size === 0 && styles.genButtonDisabled]} onPress={() => { if (selectedAssetIds.size > 0) setSendModalVisible(true); else Alert.alert('Select assets first'); }} disabled={selectedAssetIds.size === 0}>
                    <Send size={18} color={selectedAssetIds.size === 0 ? '#94a3b8' : '#10b981'} /><Text style={[styles.sendButtonText, selectedAssetIds.size === 0 && styles.genButtonTextDisabled]}>Send</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.accent} /><Text style={styles.loadingText}>Loading assets...</Text></View>
            ) : ephData.length > 0 ? (
              <View style={styles.ephList}>
                {ephData.map(item => {
                  const isExpanded = expandedCards.has(item.assetId);
                  const isSelected = selectedAssetIds.has(item.assetId);
                  return (
                    <View key={item.assetId} style={styles.ephCard}>
                      <TouchableOpacity style={styles.ephCardHeader} onPress={() => toggleCardExpansion(item.assetId)}>
                        <TouchableOpacity onPress={() => toggleAssetSelection(item.assetId)} style={styles.checkbox}>
                          {isSelected ? <CheckSquare size={24} color="#1e3a8a" /> : <Square size={24} color="#94a3b8" />}
                        </TouchableOpacity>
                        <View style={styles.ephHeaderLeft}>
                          <Text style={styles.ephAssetType}>{item.assetType}</Text>
                          <Text style={styles.ephAssetNumber}>{item.plantNumber || item.registrationNumber || item.assetId}</Text>
                        </View>
                        {isExpanded ? <ChevronUp size={24} color="#64748b" /> : <ChevronDown size={24} color="#64748b" />}
                      </TouchableOpacity>
                      <View style={styles.ephMinimalInfo}>
                        <View style={styles.ephInfoRow}><Text style={styles.ephInfoLabel}>Rate:</Text><View style={styles.ephRateContainer}><Text style={styles.ephRateBadge}>{item.rateType.toUpperCase()}</Text><Text style={styles.ephInfoValue}>R{item.rate.toFixed(2)}/hr</Text></View></View>
                        <View style={styles.ephDivider} />
                        <View style={styles.ephInfoRow}><Text style={styles.ephInfoLabel}>Actual Hours:</Text><Text style={styles.ephInfoValue}>{item.totalActualHours.toFixed(1)}h</Text></View>
                        <View style={styles.ephInfoRow}><Text style={styles.ephTotalLabel}>Billable Hours:</Text><Text style={styles.ephTotalValue}>{item.totalBillableHours.toFixed(1)}h</Text></View>
                        <View style={styles.ephInfoRow}><Text style={styles.ephTotalLabel}>Total Cost:</Text><Text style={styles.ephCostValue}>R{item.estimatedCost.toFixed(2)}</Text></View>
                      </View>
                      {isExpanded && (
                        <View style={styles.ephExpandedContent}>
                          <View style={styles.ephDivider} />
                          <Text style={styles.ephBreakdownTitle}>Hours Breakdown</Text>
                          <View style={styles.ephGrid}>
                            <View style={styles.ephGridHeader}><Text style={styles.ephGridHeaderLabel}>Day Type</Text><Text style={styles.ephGridHeaderValue}>Actual</Text><Text style={styles.ephGridHeaderValue}>Billable</Text></View>
                            <View style={styles.ephRow}><Text style={styles.ephLabel}>Weekdays:</Text><Text style={styles.ephValueActual}>{item.actualNormalHours.toFixed(1)}h</Text><Text style={styles.ephValueBillable}>{item.billableNormalHours.toFixed(1)}h</Text></View>
                            <View style={styles.ephRow}><Text style={styles.ephLabel}>Saturday:</Text><Text style={styles.ephValueActual}>{item.actualSaturdayHours.toFixed(1)}h</Text><Text style={styles.ephValueBillable}>{item.billableSaturdayHours.toFixed(1)}h</Text></View>
                            <View style={styles.ephRow}><Text style={styles.ephLabel}>Sunday:</Text><Text style={styles.ephValueActual}>{item.actualSundayHours.toFixed(1)}h</Text><Text style={styles.ephValueBillable}>{item.billableSundayHours.toFixed(1)}h</Text></View>
                            <View style={styles.ephRow}><Text style={styles.ephLabel}>Public Holidays:</Text><Text style={styles.ephValueActual}>{item.actualPublicHolidayHours.toFixed(1)}h</Text><Text style={styles.ephValueBillable}>{item.billablePublicHolidayHours.toFixed(1)}h</Text></View>
                            <View style={styles.ephRow}><Text style={styles.ephLabel}>Rain Days:</Text><Text style={styles.ephValueActual}>{item.actualRainDayHours.toFixed(1)}h</Text><Text style={styles.ephValueBillable}>{item.billableRainDayHours.toFixed(1)}h</Text></View>
                            <View style={[styles.ephRow, styles.ephTotalRow]}><Text style={[styles.ephLabel, styles.ephTotalLabelBold]}>TOTALS:</Text><Text style={styles.ephValueActualTotal}>{item.totalActualHours.toFixed(1)}h</Text><Text style={styles.ephValueBillableTotal}>{item.totalBillableHours.toFixed(1)}h</Text></View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : selectedSubcontractor ? (
              <View style={styles.emptyContainer}><Package size={64} color={Colors.textSecondary} /><Text style={styles.emptyText}>No plant assets found</Text><Text style={styles.emptySubtext}>This subcontractor has no plant assets registered</Text></View>
            ) : (
              <View style={styles.emptyContainer}><FileText size={64} color={Colors.textSecondary} /><Text style={styles.emptyText}>Select a Subcontractor</Text><Text style={styles.emptySubtext}>Choose a subcontractor above to generate EPH reports</Text></View>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'report' && (
        reportsLoading ? (
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
              {renderFilterButton('Awaiting', 'pending_subcontractor_review', statusCounts.pending_subcontractor_review)}
              {renderFilterButton('Responded', 'subcontractor_responded', statusCounts.subcontractor_responded)}
              {renderFilterButton('Agreed', 'agreed', statusCounts.agreed)}
              {renderFilterButton('Rejected', 'rejected', statusCounts.rejected)}
            </ScrollView>

            <ScrollView style={styles.content}>
              {filteredReports.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Send size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>No EPH reports awaiting approval</Text>
                  <Text style={styles.emptySubtext}>
                    EPH reports sent to subcontractors will appear here for review and approval
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
                <Text style={styles.detailsSubtitle}>Sent to: {selectedReport.subcontractorName}</Text>
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
                  <Text style={styles.summaryLabel}>Asset: {selectedReport.assetType}</Text>
                  <Text style={styles.summaryLabel}>Period: {selectedReport.dateRange.from} - {selectedReport.dateRange.to}</Text>
                  {selectedReport.adminEditedVersion && (
                    <Text style={styles.summaryLabel}>Admin Hours: {selectedReport.adminEditedVersion.hours.toFixed(1)}h</Text>
                  )}
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
      <ReportGenerationModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onGenerate={handleGeneratePDF}
        hasSelection={selectedAssetIds.size > 0}
        selectedCount={selectedAssetIds.size}
        totalCount={ephData.length}
      />

      <SendConfirmationModal
        visible={sendModalVisible}
        onClose={() => setSendModalVisible(false)}
        onSend={handleSendToSubcontractor}
        onDirectApprove={handleDirectApprove}
        subcontractorName={subcontractors.find(s => s.id === selectedSubcontractor)?.name || 'Unknown'}
        assetCount={selectedAssetIds.size}
        dateRange={{ from: startDate, to: endDate }}
      />
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
  generationContainer: {
    padding: 16,
  },
  selectorSection: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  subList: {
    flexDirection: 'row',
  },
  subButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
    marginRight: 8,
  },
  subButtonActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  subButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  subButtonTextActive: {
    color: '#ffffff',
  },
  dateRangeSection: {
    backgroundColor: Colors.cardBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dateRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dateRangeTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  datePickersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerBlock: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.cardBg,
  },
  dateButtonText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  generateButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  genButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  genButtonPrimary: {
    backgroundColor: '#1e3a8a',
  },
  genButtonSecondary: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: '#1e3a8a',
  },
  genButtonDisabled: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  genButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  genButtonTextSec: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  genButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  sendButton: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  ephList: {
    gap: 16,
  },
  ephCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ephCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  checkbox: {
    paddingRight: 8,
  },
  ephHeaderLeft: {
    flex: 1,
  },
  ephAssetType: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  ephAssetNumber: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ephMinimalInfo: {
    gap: 8,
  },
  ephInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ephInfoLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  ephInfoValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#3B82F6',
  },
  ephRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ephRateBadge: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ephDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  ephTotalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  ephTotalValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#3B82F6',
  },
  ephCostValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  ephExpandedContent: {
    marginTop: 8,
  },
  ephBreakdownTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  ephGrid: {
    gap: 6,
  },
  ephGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ephGridHeaderLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  ephGridHeaderValue: {
    width: 60,
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    textAlign: 'right' as const,
  },
  ephRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ephLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ephValueActual: {
    width: 60,
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'right' as const,
  },
  ephValueBillable: {
    width: 60,
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#10b981',
    textAlign: 'right' as const,
  },
  ephTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ephTotalLabelBold: {
    fontWeight: '700' as const,
    color: Colors.text,
  },
  ephValueActualTotal: {
    width: 60,
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'right' as const,
  },
  ephValueBillableTotal: {
    width: 60,
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#10b981',
    textAlign: 'right' as const,
  },
});
