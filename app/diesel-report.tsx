import { Stack, router } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Fuel, 
  X, 
  Filter, 
  Download, 
  Mail, 
  Share2, 
  Calendar,
  CheckSquare,
  Square,
  Send,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { generateDieselReportPDF } from '@/utils/dieselReportPdfGenerator';
import { sendDieselReportToSubcontractor, shareDieselReportPDF } from '@/utils/dieselReportEmailService';

type FuelLogEntry = {
  id: string;
  assetId: string;
  assetType: string;
  plantNumber?: string;
  registrationNumber?: string;
  fuelAmount: number;
  meterReading: number;
  meterType: 'HOUR_METER' | 'ODOMETER';
  date: string;
  loggedBy: string;
  loggedByName: string;
  siteId?: string;
  siteName?: string;
  masterAccountId: string;
  companyId?: string;
  ownerName?: string;
  ownerId?: string;
  ownerType?: 'company' | 'subcontractor';
  notes?: string;
};

type Subcontractor = {
  id: string;
  name: string;
  email?: string;
};

export default function DieselReportScreen() {
  const { user } = useAuth();
  
  const [fuelLogs, setFuelLogs] = useState<FuelLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [selectedSubcontractors, setSelectedSubcontractors] = useState<Set<string>>(new Set());
  const [showSubcontractorModal, setShowSubcontractorModal] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const [selectedSubForSend, setSelectedSubForSend] = useState<string>('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.masterAccountId, fromDate, toDate, selectedSubcontractors]);

  const loadData = async () => {
    if (!user?.masterAccountId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('[DieselReport] Loading fuel logs...');

      const [logs, subs] = await Promise.all([
        loadFuelLogs(),
        loadSubcontractors(),
      ]);

      setFuelLogs(logs);
      setSubcontractors(subs);
      
      const allIds = new Set(logs.map(log => log.id));
      setSelectedRows(allIds);
      
      console.log('[DieselReport] Loaded', logs.length, 'fuel logs');
    } catch (error) {
      console.error('[DieselReport] Error loading data:', error);
      Alert.alert('Error', 'Failed to load diesel report data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFuelLogs = async (): Promise<FuelLogEntry[]> => {
    if (!user?.masterAccountId) return [];

    const logsRef = collection(db, 'fuelLogs');
    let q = query(
      logsRef,
      where('masterAccountId', '==', user.masterAccountId),
      where('date', '>=', fromDate.toISOString().split('T')[0]),
      where('date', '<=', toDate.toISOString().split('T')[0]),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    let logs: FuelLogEntry[] = [];

    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() } as FuelLogEntry);
    });

    if (selectedSubcontractors.size > 0) {
      logs = logs.filter(log => 
        log.ownerType === 'subcontractor' && 
        log.ownerId && 
        selectedSubcontractors.has(log.ownerId)
      );
    }

    return logs;
  };

  const loadSubcontractors = async (): Promise<Subcontractor[]> => {
    if (!user?.masterAccountId) return [];

    const subsRef = collection(db, 'subcontractors');
    const q = query(subsRef, where('masterAccountId', '==', user.masterAccountId));
    const snapshot = await getDocs(q);

    const subs: Subcontractor[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      subs.push({
        id: doc.id,
        name: data.name || 'Unknown',
        email: data.email,
      });
    });

    return subs.sort((a, b) => a.name.localeCompare(b.name));
  };

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === filteredLogs.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredLogs.map(log => log.id)));
    }
  };

  const toggleSubcontractor = (id: string) => {
    const newSelected = new Set(selectedSubcontractors);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSubcontractors(newSelected);
  };

  const clearSubcontractorFilter = () => {
    setSelectedSubcontractors(new Set());
    setShowSubcontractorModal(false);
  };

  const filteredLogs = useMemo(() => {
    return fuelLogs;
  }, [fuelLogs]);

  const selectedLogs = useMemo(() => {
    return filteredLogs.filter(log => selectedRows.has(log.id));
  }, [filteredLogs, selectedRows]);

  const totalFuel = useMemo(() => {
    return selectedLogs.reduce((sum, log) => sum + log.fuelAmount, 0);
  }, [selectedLogs]);

  const handleExportPDF = async () => {
    if (selectedLogs.length === 0) {
      Alert.alert('No Data', 'Please select at least one entry to export');
      return;
    }

    try {
      setIsExporting(true);
      console.log('[DieselReport] Generating PDF...');

      const pdfUri = await generateDieselReportPDF({
        logs: selectedLogs,
        dateRange: { from: fromDate, to: toDate },
        subcontractorFilter: Array.from(selectedSubcontractors).map(id => 
          subcontractors.find(s => s.id === id)?.name || id
        ),
        companyName: user?.companyName || 'Company',
      });

      console.log('[DieselReport] PDF generated:', pdfUri);
      Alert.alert('Success', 'PDF exported successfully');
    } catch (error) {
      console.error('[DieselReport] Error exporting PDF:', error);
      Alert.alert('Error', 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePDF = async () => {
    if (selectedLogs.length === 0) {
      Alert.alert('No Data', 'Please select at least one entry to share');
      return;
    }

    try {
      setIsExporting(true);
      console.log('[DieselReport] Generating PDF for sharing...');

      const pdfUri = await generateDieselReportPDF({
        logs: selectedLogs,
        dateRange: { from: fromDate, to: toDate },
        subcontractorFilter: Array.from(selectedSubcontractors).map(id => 
          subcontractors.find(s => s.id === id)?.name || id
        ),
        companyName: user?.companyName || 'Company',
      });

      await shareDieselReportPDF({
        pdfUri,
        fileName: `Diesel_Report_${fromDate.toISOString().split('T')[0]}_to_${toDate.toISOString().split('T')[0]}.pdf`,
      });

      console.log('[DieselReport] PDF shared successfully');
    } catch (error) {
      console.error('[DieselReport] Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendToSubcontractor = () => {
    if (selectedLogs.length === 0) {
      Alert.alert('No Data', 'Please select at least one entry to send');
      return;
    }

    const availableSubs = subcontractors.filter(sub => {
      return selectedLogs.some(log => log.ownerId === sub.id && log.ownerType === 'subcontractor');
    });

    if (availableSubs.length === 0) {
      Alert.alert('No Subcontractors', 'No subcontractors found in selected entries');
      return;
    }

    setSelectedSubForSend(availableSubs[0].id);
    setShowSendModal(true);
  };

  const confirmSendToSubcontractor = async () => {
    if (!selectedSubForSend) return;

    const subcontractor = subcontractors.find(s => s.id === selectedSubForSend);
    if (!subcontractor) return;

    if (!subcontractor.email) {
      Alert.alert('No Email', `${subcontractor.name} does not have an email address configured`);
      return;
    }

    const subLogs = selectedLogs.filter(log => log.ownerId === selectedSubForSend);

    try {
      setIsExporting(true);
      setShowSendModal(false);

      console.log('[DieselReport] Generating PDF for', subcontractor.name);

      const pdfUri = await generateDieselReportPDF({
        logs: subLogs,
        dateRange: { from: fromDate, to: toDate },
        subcontractorFilter: [subcontractor.name],
        companyName: user?.companyName || 'Company',
      });

      await sendDieselReportToSubcontractor({
        recipientEmail: subcontractor.email,
        recipientName: subcontractor.name,
        message: sendMessage,
        pdfUri,
        pdfFileName: `Diesel_Report_${subcontractor.name}_${fromDate.toISOString().split('T')[0]}.pdf`,
        dateRange: { from: fromDate, to: toDate },
        totalFuel: subLogs.reduce((sum, log) => sum + log.fuelAmount, 0),
        entryCount: subLogs.length,
        companyName: user?.companyName || 'Company',
        siteId: user?.siteId || '',
        siteName: user?.siteName || '',
        masterAccountId: user?.masterAccountId || '',
        companyId: user?.currentCompanyId || '',
      });

      Alert.alert('Success', `Diesel report sent to ${subcontractor.name}`);
      setSendMessage('');
    } catch (error) {
      console.error('[DieselReport] Error sending to subcontractor:', error);
      Alert.alert('Error', 'Failed to send diesel report');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading diesel report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <X size={24} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Diesel Report</Text>
            <Text style={styles.headerSubtitle}>
              {formatDate(fromDate)} - {formatDate(toDate)}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? '#f59e0b' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersSectionTitle}>Date Range</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowFromDatePicker(true)}
            >
              <Calendar size={16} color="#64748b" />
              <Text style={styles.dateButtonText}>{formatDate(fromDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateToText}>to</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowToDatePicker(true)}
            >
              <Calendar size={16} color="#64748b" />
              <Text style={styles.dateButtonText}>{formatDate(toDate)}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filtersSectionTitle}>Plant Owner (Subcontractor)</Text>
          <TouchableOpacity 
            style={styles.subcontractorButton}
            onPress={() => setShowSubcontractorModal(true)}
          >
            <Text style={styles.subcontractorButtonText}>
              {selectedSubcontractors.size === 0 
                ? 'All Subcontractors' 
                : `${selectedSubcontractors.size} Selected`}
            </Text>
            <Filter size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Entries</Text>
          <Text style={styles.statValue}>{filteredLogs.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Selected</Text>
          <Text style={styles.statValue}>{selectedRows.size}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Fuel</Text>
          <Text style={styles.statValue}>{totalFuel.toFixed(1)}L</Text>
        </View>
      </View>

      <View style={styles.actionsBar}>
        <TouchableOpacity 
          style={styles.selectAllButton}
          onPress={toggleAllRows}
        >
          {selectedRows.size === filteredLogs.length ? (
            <CheckSquare size={20} color="#3b82f6" />
          ) : (
            <Square size={20} color="#64748b" />
          )}
          <Text style={styles.selectAllText}>Select All</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, isExporting && styles.actionButtonDisabled]}
            onPress={handleExportPDF}
            disabled={isExporting || selectedRows.size === 0}
          >
            <Download size={18} color={isExporting || selectedRows.size === 0 ? '#94a3b8' : '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, isExporting && styles.actionButtonDisabled]}
            onPress={handleSharePDF}
            disabled={isExporting || selectedRows.size === 0}
          >
            <Share2 size={18} color={isExporting || selectedRows.size === 0 ? '#94a3b8' : '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.sendButton, isExporting && styles.actionButtonDisabled]}
            onPress={handleSendToSubcontractor}
            disabled={isExporting || selectedRows.size === 0}
          >
            <Send size={18} color={isExporting || selectedRows.size === 0 ? '#94a3b8' : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Fuel size={48} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyText}>No diesel logs found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        ) : (
          filteredLogs.map((log) => (
            <TouchableOpacity
              key={log.id}
              style={[styles.logCard, selectedRows.has(log.id) && styles.logCardSelected]}
              onPress={() => toggleRow(log.id)}
              activeOpacity={0.7}
            >
              <View style={styles.logCardHeader}>
                <View style={styles.checkboxContainer}>
                  {selectedRows.has(log.id) ? (
                    <CheckSquare size={24} color="#3b82f6" />
                  ) : (
                    <Square size={24} color="#cbd5e1" />
                  )}
                </View>
                <View style={styles.logCardHeaderInfo}>
                  <Text style={styles.logCardDate}>{formatDate(new Date(log.date))}</Text>
                  <Text style={styles.logCardAsset}>{log.assetType}</Text>
                </View>
              </View>

              <View style={styles.logCardBody}>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Plant Number:</Text>
                  <Text style={styles.logValue}>{log.plantNumber || 'N/A'}</Text>
                </View>
                {log.registrationNumber && (
                  <View style={styles.logRow}>
                    <Text style={styles.logLabel}>Registration:</Text>
                    <Text style={styles.logValue}>{log.registrationNumber}</Text>
                  </View>
                )}
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Owner:</Text>
                  <Text style={styles.logValue}>{log.ownerName || 'N/A'}</Text>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Refueled By:</Text>
                  <Text style={styles.logValue}>{log.loggedByName}</Text>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Machine Hours:</Text>
                  <Text style={styles.logValue}>
                    {log.meterReading} {log.meterType === 'HOUR_METER' ? 'hrs' : 'km'}
                  </Text>
                </View>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Fuel Refueled:</Text>
                  <Text style={[styles.logValue, styles.fuelAmount]}>
                    {log.fuelAmount.toFixed(2)} L
                  </Text>
                </View>
                {log.notes && (
                  <View style={styles.logRow}>
                    <Text style={styles.logLabel}>Notes:</Text>
                    <Text style={styles.logValue}>{log.notes}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {showFromDatePicker && (
        Platform.OS === 'web' ? (
          <Modal
            visible={showFromDatePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFromDatePicker(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowFromDatePicker(false)}
            >
              <Pressable style={styles.datePickerModal} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.datePickerTitle}>Select From Date</Text>
                <input
                  type="date"
                  value={fromDate.toISOString().split('T')[0]}
                  onChange={(e: any) => {
                    setFromDate(new Date(e.target.value));
                    setShowFromDatePicker(false);
                  }}
                  style={{
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    width: '100%',
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowFromDatePicker(false);
              if (selectedDate) setFromDate(selectedDate);
            }}
          />
        )
      )}

      {showToDatePicker && (
        Platform.OS === 'web' ? (
          <Modal
            visible={showToDatePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowToDatePicker(false)}
          >
            <Pressable 
              style={styles.modalOverlay}
              onPress={() => setShowToDatePicker(false)}
            >
              <Pressable style={styles.datePickerModal} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.datePickerTitle}>Select To Date</Text>
                <input
                  type="date"
                  value={toDate.toISOString().split('T')[0]}
                  onChange={(e: any) => {
                    setToDate(new Date(e.target.value));
                    setShowToDatePicker(false);
                  }}
                  style={{
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    width: '100%',
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowToDatePicker(false);
              if (selectedDate) setToDate(selectedDate);
            }}
          />
        )
      )}

      <Modal
        visible={showSubcontractorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubcontractorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subcontractorModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subcontractors</Text>
              <TouchableOpacity onPress={() => setShowSubcontractorModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.subcontractorList}>
              {subcontractors.map(sub => (
                <TouchableOpacity
                  key={sub.id}
                  style={styles.subcontractorItem}
                  onPress={() => toggleSubcontractor(sub.id)}
                >
                  {selectedSubcontractors.has(sub.id) ? (
                    <CheckSquare size={24} color="#3b82f6" />
                  ) : (
                    <Square size={24} color="#cbd5e1" />
                  )}
                  <Text style={styles.subcontractorName}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={clearSubcontractorFilter}
              >
                <Text style={styles.modalButtonSecondaryText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => setShowSubcontractorModal(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSendModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sendModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send to Subcontractor</Text>
              <TouchableOpacity onPress={() => setShowSendModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sendModalContent}>
              <Text style={styles.inputLabel}>Select Subcontractor</Text>
              <View style={styles.pickerContainer}>
                {subcontractors
                  .filter(sub => selectedLogs.some(log => log.ownerId === sub.id))
                  .map(sub => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.pickerItem,
                        selectedSubForSend === sub.id && styles.pickerItemSelected
                      ]}
                      onPress={() => setSelectedSubForSend(sub.id)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        selectedSubForSend === sub.id && styles.pickerItemTextSelected
                      ]}>
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                }
              </View>

              <Text style={styles.inputLabel}>Message (Optional)</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Add a message for the subcontractor..."
                value={sendMessage}
                onChangeText={setSendMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowSendModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={confirmSendToSubcontractor}
              >
                <Mail size={18} color="#fff" />
                <Text style={styles.modalButtonPrimaryText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filtersSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 8,
    marginTop: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500' as const,
  },
  dateToText: {
    fontSize: 13,
    color: '#64748b',
  },
  subcontractorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subcontractorButtonText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500' as const,
  },
  statsBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  actionsBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    backgroundColor: '#10b981',
  },
  actionButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  logCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  logCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  checkboxContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logCardHeaderInfo: {
    flex: 1,
  },
  logCardDate: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 2,
  },
  logCardAsset: {
    fontSize: 13,
    color: '#64748b',
  },
  logCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logLabel: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  logValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
  },
  fuelAmount: {
    color: '#f59e0b',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 16,
  },
  subcontractorModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  sendModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  subcontractorList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  subcontractorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subcontractorName: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500' as const,
  },
  sendModalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#475569',
    marginBottom: 8,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerItem: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  pickerItemSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500' as const,
  },
  pickerItemTextSelected: {
    color: '#1e40af',
    fontWeight: '600' as const,
  },
  messageInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
