import { Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, 
  AlertTriangle, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Shield,
  AlertCircle,
  Clock,
  User,
  Download,
  Search,
} from 'lucide-react-native';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  approveIdVerification, 
  rejectIdVerification,
} from '@/utils/masterIdVerification';
import type { FraudDispute, MasterIDVerification } from '@/types';

type TabKey = 'disputes' | 'verifications';

type DisputeWithId = FraudDispute & { id: string };
type VerificationWithId = MasterIDVerification & { id: string };

export default function AdminDisputesVerificationScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('disputes');
  const [disputes, setDisputes] = useState<DisputeWithId[]>([]);
  const [verifications, setVerifications] = useState<VerificationWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithId | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<VerificationWithId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'disputes') {
        await loadDisputes();
      } else {
        await loadVerifications();
      }
    } catch (error) {
      console.error('[AdminDisputesVerification] Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDisputes = async () => {
    try {
      const disputesRef = collection(db, 'fraudDisputes');
      let q = query(disputesRef, orderBy('reportedAt', 'desc'), limit(50));
      
      const snapshot = await getDocs(q);
      const disputesList: DisputeWithId[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as DisputeWithId));
      
      setDisputes(disputesList);
      console.log('[AdminDisputesVerification] Loaded disputes:', disputesList.length);
    } catch (error) {
      console.error('[AdminDisputesVerification] Error loading disputes:', error);
      throw error;
    }
  };

  const loadVerifications = async () => {
    try {
      const verificationsRef = collection(db, 'masterIDVerification');
      let q = query(verificationsRef, orderBy('submittedAt', 'desc'), limit(50));
      
      const snapshot = await getDocs(q);
      const verificationsList: VerificationWithId[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as VerificationWithId));
      
      setVerifications(verificationsList);
      console.log('[AdminDisputesVerification] Loaded verifications:', verificationsList.length);
    } catch (error) {
      console.error('[AdminDisputesVerification] Error loading verifications:', error);
      throw error;
    }
  };

  const handleApproveVerification = async (verificationId: string) => {
    Alert.alert(
      'Approve Verification',
      'Are you sure you want to approve this ID verification? This will grant the user full access.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setIsLoading(true);
            const result = await approveIdVerification(verificationId, 'admin_user', 'Approved by admin');
            setIsLoading(false);
            
            if (result.success) {
              Alert.alert('Success', 'ID verification approved successfully');
              loadVerifications();
              setSelectedVerification(null);
            } else {
              Alert.alert('Error', result.error || 'Failed to approve verification');
            }
          },
        },
      ]
    );
  };

  const handleRejectVerification = async (verificationId: string) => {
    Alert.prompt(
      'Reject Verification',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || reason.trim() === '') {
              Alert.alert('Error', 'Please provide a reason for rejection');
              return;
            }
            
            setIsLoading(true);
            const result = await rejectIdVerification(verificationId, 'admin_user', reason);
            setIsLoading(false);
            
            if (result.success) {
              Alert.alert('Success', 'ID verification rejected');
              loadVerifications();
              setSelectedVerification(null);
            } else {
              Alert.alert('Error', result.error || 'Failed to reject verification');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const openDocument = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open document URL');
      }
    } catch (error) {
      console.error('[AdminDisputesVerification] Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_review':
        return '#f59e0b';
      case 'verified':
      case 'resolved':
        return '#10b981';
      case 'rejected':
      case 'dismissed':
        return '#ef4444';
      case 'under_investigation':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'resolved':
        return <CheckCircle size={16} color="#10b981" />;
      case 'rejected':
      case 'dismissed':
        return <XCircle size={16} color="#ef4444" />;
      case 'pending':
      case 'pending_review':
        return <Clock size={16} color="#f59e0b" />;
      case 'under_investigation':
        return <AlertCircle size={16} color="#3b82f6" />;
      default:
        return <AlertTriangle size={16} color="#6b7280" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#3b82f6';
      case 'low':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const filteredDisputes = disputes.filter(dispute => {
    if (filterStatus !== 'all' && dispute.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        dispute.nationalIdNumber?.toLowerCase().includes(query) ||
        dispute.reportedByName?.toLowerCase().includes(query) ||
        dispute.existingAccountName?.toLowerCase().includes(query) ||
        dispute.newAccountName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredVerifications = verifications.filter(verification => {
    if (filterStatus !== 'all' && verification.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        verification.nationalIdNumber?.toLowerCase().includes(query) ||
        verification.masterAccountId?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const renderDisputeCard = (dispute: DisputeWithId) => (
    <TouchableOpacity
      key={dispute.id}
      style={styles.card}
      onPress={() => setSelectedDispute(dispute)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <AlertTriangle size={20} color={getPriorityColor(dispute.priority)} />
          <Text style={styles.cardTitle}>Duplicate ID Dispute</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) }]}>
          <Text style={styles.statusText}>{dispute.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>National ID:</Text>
          <Text style={styles.infoValue}>{dispute.nationalIdNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Reported By:</Text>
          <Text style={styles.infoValue}>{dispute.reportedByName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Existing Account:</Text>
          <Text style={styles.infoValue}>{dispute.existingAccountName || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>New Account:</Text>
          <Text style={styles.infoValue}>{dispute.newAccountName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Priority:</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(dispute.priority) }]}>
            <Text style={styles.priorityText}>{dispute.priority.toUpperCase()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderVerificationCard = (verification: VerificationWithId) => (
    <TouchableOpacity
      key={verification.id}
      style={styles.card}
      onPress={() => setSelectedVerification(verification)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <FileText size={20} color="#3b82f6" />
          <Text style={styles.cardTitle}>ID Verification</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(verification.status) }]}>
          {getStatusIcon(verification.status)}
          <Text style={styles.statusText}>{verification.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>National ID:</Text>
          <Text style={styles.infoValue}>{verification.nationalIdNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Document Type:</Text>
          <Text style={styles.infoValue}>{verification.documentType.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Master Account:</Text>
          <Text style={styles.infoValue}>{verification.masterAccountId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Submitted:</Text>
          <Text style={styles.infoValue}>
            {verification.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
          </Text>
        </View>
      </View>
      
      {verification.documentUrl && (
        <TouchableOpacity
          style={styles.viewDocButton}
          onPress={() => openDocument(verification.documentUrl)}
        >
          <Eye size={16} color="#3b82f6" />
          <Text style={styles.viewDocButtonText}>View Document</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient
        colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Shield size={28} color="#fff" />
              <Text style={styles.headerTitle}>Disputes & Verification</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            Manage duplicate account disputes and ID verifications
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'disputes' && styles.activeTab]}
            onPress={() => setActiveTab('disputes')}
          >
            <AlertTriangle size={20} color={activeTab === 'disputes' ? '#fff' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'disputes' && styles.activeTabText]}>
              Disputes ({disputes.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'verifications' && styles.activeTab]}
            onPress={() => setActiveTab('verifications')}
          >
            <FileText size={20} color={activeTab === 'verifications' ? '#fff' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'verifications' && styles.activeTabText]}>
              Verifications ({verifications.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View style={styles.filterContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ID number or name..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'disputes' && (
                <>
                  {filteredDisputes.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <AlertTriangle size={48} color="#94a3b8" />
                      <Text style={styles.emptyText}>No disputes found</Text>
                    </View>
                  ) : (
                    filteredDisputes.map(renderDisputeCard)
                  )}
                </>
              )}
              
              {activeTab === 'verifications' && (
                <>
                  {filteredVerifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <FileText size={48} color="#94a3b8" />
                      <Text style={styles.emptyText}>No verifications found</Text>
                    </View>
                  ) : (
                    filteredVerifications.map(renderVerificationCard)
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </LinearGradient>

      {/* Dispute Detail Modal */}
      <Modal
        visible={selectedDispute !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedDispute(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispute Details</Text>
              <TouchableOpacity onPress={() => setSelectedDispute(null)}>
                <X size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            {selectedDispute && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Dispute Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedDispute.status) }]}>
                      <Text style={styles.statusText}>{selectedDispute.status}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Priority:</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedDispute.priority) }]}>
                      <Text style={styles.priorityText}>{selectedDispute.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dispute Type:</Text>
                    <Text style={styles.detailValue}>{selectedDispute.disputeType.replace(/_/g, ' ')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>National ID:</Text>
                    <Text style={styles.detailValue}>{selectedDispute.nationalIdNumber}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Parties Involved</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reported By:</Text>
                    <Text style={styles.detailValue}>{selectedDispute.reportedByName}</Text>
                  </View>
                  {selectedDispute.reportedByEmail && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailValue}>{selectedDispute.reportedByEmail}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Existing Account:</Text>
                    <Text style={styles.detailValue}>{selectedDispute.existingAccountName || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>New Account:</Text>
                    <Text style={styles.detailValue}>{selectedDispute.newAccountName}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Explanation</Text>
                  <Text style={styles.explanationText}>{selectedDispute.explanation}</Text>
                </View>

                {selectedDispute.supportingDocuments && selectedDispute.supportingDocuments.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Supporting Documents</Text>
                    {selectedDispute.supportingDocuments.map((doc, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.documentButton}
                        onPress={() => openDocument(doc.url)}
                      >
                        <FileText size={20} color="#3b82f6" />
                        <Text style={styles.documentButtonText}>{doc.fileName}</Text>
                        <Download size={16} color="#3b82f6" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Verification Detail Modal */}
      <Modal
        visible={selectedVerification !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedVerification(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verification Details</Text>
              <TouchableOpacity onPress={() => setSelectedVerification(null)}>
                <X size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            {selectedVerification && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Verification Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVerification.status) }]}>
                      {getStatusIcon(selectedVerification.status)}
                      <Text style={styles.statusText}>{selectedVerification.status}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>National ID:</Text>
                    <Text style={styles.detailValue}>{selectedVerification.nationalIdNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Document Type:</Text>
                    <Text style={styles.detailValue}>
                      {selectedVerification.documentType.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Master Account ID:</Text>
                    <Text style={styles.detailValue}>{selectedVerification.masterAccountId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Submitted At:</Text>
                    <Text style={styles.detailValue}>
                      {selectedVerification.submittedAt?.toDate?.()?.toLocaleString() || 'N/A'}
                    </Text>
                  </View>
                </View>

                {selectedVerification.documentUrl && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Document Preview</Text>
                    <TouchableOpacity
                      style={styles.documentPreviewButton}
                      onPress={() => openDocument(selectedVerification.documentUrl)}
                    >
                      <FileText size={48} color="#3b82f6" />
                      <Text style={styles.documentPreviewText}>
                        {selectedVerification.metadata?.fileName || 'View Document'}
                      </Text>
                      <Text style={styles.documentPreviewSubtext}>Tap to open</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedVerification.reviewNotes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Review Notes</Text>
                    <Text style={styles.explanationText}>{selectedVerification.reviewNotes}</Text>
                  </View>
                )}

                {selectedVerification.rejectionReason && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Rejection Reason</Text>
                    <Text style={styles.explanationText}>{selectedVerification.rejectionReason}</Text>
                  </View>
                )}

                {selectedVerification.status === 'pending_review' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApproveVerification(selectedVerification.id)}
                      disabled={isLoading}
                    >
                      <CheckCircle size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectVerification(selectedVerification.id)}
                      disabled={isLoading}
                    >
                      <XCircle size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
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
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(30, 58, 138, 0.95)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    width: 120,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  viewDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  viewDocButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    width: 140,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  explanationText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  documentButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  documentPreviewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  documentPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 12,
  },
  documentPreviewSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
