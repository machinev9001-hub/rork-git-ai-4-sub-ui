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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, 
  Search,
  CreditCard,
  Users,
  CheckCircle,
  XCircle,
  DollarSign,
  Building2,
  Calendar,
  TrendingUp,
} from 'lucide-react-native';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AccountType, VASFeatureId } from '@/types';

type MasterAccountWithId = {
  id: string;
  masterId: string;
  name: string;
  accountType?: AccountType;
  vasFeatures?: VASFeatureId[];
  companyIds: string[];
  createdAt: any;
  nationalIdNumber?: string;
  idVerificationStatus?: string;
};

type CompanyWithId = {
  id: string;
  legalEntityName: string;
  alias: string;
  accountType?: AccountType;
  subscriptionTier?: string;
  vasFeatures?: VASFeatureId[];
  masterAccountId?: string;
  subscriptionStartDate?: any;
  subscriptionEndDate?: any;
  billingEmail?: string;
};

const VAS_FEATURES: { id: VASFeatureId; name: string; price: string }[] = [
  { id: 'plant_manager_access', name: 'Plant Manager', price: '$79/mo' },
  { id: 'staff_manager_access', name: 'Staff Manager', price: '$79/mo' },
  { id: 'logistics_access', name: 'Logistics', price: '$59/mo' },
  { id: 'operations_bundle', name: 'Operations Bundle', price: '$149/mo' },
  { id: 'analytics', name: 'Analytics', price: '$49/mo' },
  { id: 'reporting', name: 'Reporting', price: '$39/mo' },
  { id: 'data_exports', name: 'Data Exports', price: '$29/mo' },
  { id: 'marketplace_access', name: 'Marketplace', price: '$99/mo' },
];

export default function AdminVASManagementScreen() {
  const [masterAccounts, setMasterAccounts] = useState<MasterAccountWithId[]>([]);
  const [companies, setCompanies] = useState<CompanyWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<MasterAccountWithId | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithId | null>(null);
  const [activeTab, setActiveTab] = useState<'accounts' | 'companies'>('accounts');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load master accounts
      const masterAccountsRef = collection(db, 'masterAccounts');
      const masterQuery = query(masterAccountsRef, orderBy('createdAt', 'desc'));
      const masterSnapshot = await getDocs(masterQuery);
      const accountsList: MasterAccountWithId[] = masterSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as MasterAccountWithId));
      setMasterAccounts(accountsList);

      // Load companies
      const companiesRef = collection(db, 'companies');
      const companiesQuery = query(companiesRef, orderBy('legalEntityName', 'asc'));
      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesList: CompanyWithId[] = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as CompanyWithId));
      setCompanies(companiesList);

      console.log('[AdminVAS] Loaded:', accountsList.length, 'accounts,', companiesList.length, 'companies');
    } catch (error) {
      console.error('[AdminVAS] Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccountVAS = async (accountId: string, vasFeatures: VASFeatureId[]) => {
    try {
      const accountRef = doc(db, 'masterAccounts', accountId);
      await updateDoc(accountRef, {
        vasFeatures,
        updatedAt: serverTimestamp(),
      });
      
      // Update local state
      setMasterAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, vasFeatures } : acc
      ));
      
      Alert.alert('Success', 'VAS features updated successfully');
    } catch (error) {
      console.error('[AdminVAS] Error updating VAS:', error);
      Alert.alert('Error', 'Failed to update VAS features');
    }
  };

  const updateAccountType = async (accountId: string, accountType: AccountType) => {
    try {
      const accountRef = doc(db, 'masterAccounts', accountId);
      await updateDoc(accountRef, {
        accountType,
        updatedAt: serverTimestamp(),
      });
      
      // Update local state
      setMasterAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, accountType } : acc
      ));
      
      Alert.alert('Success', `Account type updated to ${accountType}`);
    } catch (error) {
      console.error('[AdminVAS] Error updating account type:', error);
      Alert.alert('Error', 'Failed to update account type');
    }
  };

  const toggleVASFeature = (account: MasterAccountWithId, featureId: VASFeatureId) => {
    const currentFeatures = account.vasFeatures || [];
    const hasFeature = currentFeatures.includes(featureId);
    
    Alert.alert(
      hasFeature ? 'Remove Feature' : 'Add Feature',
      `${hasFeature ? 'Remove' : 'Add'} ${VAS_FEATURES.find(f => f.id === featureId)?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: hasFeature ? 'Remove' : 'Add',
          onPress: () => {
            const newFeatures = hasFeature
              ? currentFeatures.filter(id => id !== featureId)
              : [...currentFeatures, featureId];
            updateAccountVAS(account.id, newFeatures);
          },
        },
      ]
    );
  };

  const filteredAccounts = masterAccounts.filter(account => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.masterId?.toLowerCase().includes(query) ||
      account.name?.toLowerCase().includes(query) ||
      account.nationalIdNumber?.toLowerCase().includes(query)
    );
  });

  const filteredCompanies = companies.filter(company => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      company.legalEntityName?.toLowerCase().includes(query) ||
      company.alias?.toLowerCase().includes(query)
    );
  });

  const getAccountTypeColor = (type?: AccountType) => {
    return type === 'enterprise' ? '#10b981' : '#6b7280';
  };

  const calculateMRR = (vasFeatures?: VASFeatureId[]) => {
    if (!vasFeatures || vasFeatures.length === 0) return 0;
    
    let total = 0;
    vasFeatures.forEach(featureId => {
      const feature = VAS_FEATURES.find(f => f.id === featureId);
      if (feature) {
        const price = parseInt(feature.price.replace('$', '').replace('/mo', ''));
        total += price;
      }
    });
    return total;
  };

  const renderAccountCard = (account: MasterAccountWithId) => {
    const mrr = calculateMRR(account.vasFeatures);
    
    return (
      <TouchableOpacity
        key={account.id}
        style={styles.card}
        onPress={() => setSelectedAccount(account)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Users size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>{account.name}</Text>
          </View>
          <View style={[styles.accountTypeBadge, { backgroundColor: getAccountTypeColor(account.accountType) }]}>
            <Text style={styles.accountTypeText}>
              {account.accountType || 'free'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Master ID:</Text>
            <Text style={styles.infoValue}>{account.masterId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Companies:</Text>
            <Text style={styles.infoValue}>{account.companyIds?.length || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VAS Features:</Text>
            <Text style={styles.infoValue}>{account.vasFeatures?.length || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>MRR:</Text>
            <Text style={[styles.infoValue, styles.mrrText]}>${mrr}/mo</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCompanyCard = (company: CompanyWithId) => {
    const mrr = calculateMRR(company.vasFeatures);
    
    return (
      <TouchableOpacity
        key={company.id}
        style={styles.card}
        onPress={() => setSelectedCompany(company)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Building2 size={20} color="#8b5cf6" />
            <Text style={styles.cardTitle}>{company.legalEntityName}</Text>
          </View>
          <View style={[styles.accountTypeBadge, { backgroundColor: getAccountTypeColor(company.accountType) }]}>
            <Text style={styles.accountTypeText}>
              {company.subscriptionTier || company.accountType || 'free'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Alias:</Text>
            <Text style={styles.infoValue}>{company.alias || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VAS Features:</Text>
            <Text style={styles.infoValue}>{company.vasFeatures?.length || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>MRR:</Text>
            <Text style={[styles.infoValue, styles.mrrText]}>${mrr}/mo</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const totalMRR = masterAccounts.reduce((sum, acc) => sum + calculateMRR(acc.vasFeatures), 0);
  const enterpriseCount = masterAccounts.filter(a => a.accountType === 'enterprise').length;
  const freeCount = masterAccounts.filter(a => a.accountType !== 'enterprise').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient
        colors={['#8b5cf6', '#a78bfa', '#c4b5fd']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <CreditCard size={28} color="#fff" />
              <Text style={styles.headerTitle}>VAS & Subscriptions</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            Manage subscriptions and value-added services
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <TrendingUp size={20} color="#10b981" />
            <Text style={styles.statValue}>${totalMRR}</Text>
            <Text style={styles.statLabel}>Total MRR</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={20} color="#3b82f6" />
            <Text style={styles.statValue}>{masterAccounts.length}</Text>
            <Text style={styles.statLabel}>Accounts</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.statValue}>{enterpriseCount}</Text>
            <Text style={styles.statLabel}>Enterprise</Text>
          </View>
          <View style={styles.statCard}>
            <XCircle size={20} color="#6b7280" />
            <Text style={styles.statValue}>{freeCount}</Text>
            <Text style={styles.statLabel}>Free</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'accounts' && styles.activeTab]}
            onPress={() => setActiveTab('accounts')}
          >
            <Users size={20} color={activeTab === 'accounts' ? '#fff' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'accounts' && styles.activeTabText]}>
              Accounts ({masterAccounts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'companies' && styles.activeTab]}
            onPress={() => setActiveTab('companies')}
          >
            <Building2 size={20} color={activeTab === 'companies' ? '#fff' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'companies' && styles.activeTabText]}>
              Companies ({companies.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, name, or company..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'accounts' && (
                <>
                  {filteredAccounts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Users size={48} color="#94a3b8" />
                      <Text style={styles.emptyText}>No accounts found</Text>
                    </View>
                  ) : (
                    filteredAccounts.map(renderAccountCard)
                  )}
                </>
              )}
              
              {activeTab === 'companies' && (
                <>
                  {filteredCompanies.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Building2 size={48} color="#94a3b8" />
                      <Text style={styles.emptyText}>No companies found</Text>
                    </View>
                  ) : (
                    filteredCompanies.map(renderCompanyCard)
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </LinearGradient>

      {/* Account Detail Modal */}
      <Modal
        visible={selectedAccount !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedAccount(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account Management</Text>
              <TouchableOpacity onPress={() => setSelectedAccount(null)}>
                <X size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            {selectedAccount && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Account Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{selectedAccount.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Master ID:</Text>
                    <Text style={styles.detailValue}>{selectedAccount.masterId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Type:</Text>
                    <View style={[styles.accountTypeBadge, { backgroundColor: getAccountTypeColor(selectedAccount.accountType) }]}>
                      <Text style={styles.accountTypeText}>
                        {selectedAccount.accountType || 'free'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>MRR:</Text>
                    <Text style={[styles.detailValue, styles.mrrText]}>
                      ${calculateMRR(selectedAccount.vasFeatures)}/mo
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Account Type</Text>
                  <View style={styles.accountTypeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.accountTypeButton,
                        selectedAccount.accountType === 'free' && styles.accountTypeButtonActive
                      ]}
                      onPress={() => updateAccountType(selectedAccount.id, 'free')}
                    >
                      <Text style={[
                        styles.accountTypeButtonText,
                        selectedAccount.accountType === 'free' && styles.accountTypeButtonTextActive
                      ]}>
                        Free
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.accountTypeButton,
                        selectedAccount.accountType === 'enterprise' && styles.accountTypeButtonActive
                      ]}
                      onPress={() => updateAccountType(selectedAccount.id, 'enterprise')}
                    >
                      <Text style={[
                        styles.accountTypeButtonText,
                        selectedAccount.accountType === 'enterprise' && styles.accountTypeButtonTextActive
                      ]}>
                        Enterprise
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>VAS Features</Text>
                  {VAS_FEATURES.map(feature => {
                    const isActive = selectedAccount.vasFeatures?.includes(feature.id);
                    return (
                      <TouchableOpacity
                        key={feature.id}
                        style={[styles.featureRow, isActive && styles.featureRowActive]}
                        onPress={() => toggleVASFeature(selectedAccount, feature.id)}
                      >
                        <View style={styles.featureLeft}>
                          {isActive ? (
                            <CheckCircle size={20} color="#10b981" />
                          ) : (
                            <XCircle size={20} color="#94a3b8" />
                          )}
                          <Text style={[styles.featureName, isActive && styles.featureNameActive]}>
                            {feature.name}
                          </Text>
                        </View>
                        <Text style={styles.featurePrice}>{feature.price}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Company Detail Modal */}
      <Modal
        visible={selectedCompany !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCompany(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Company Details</Text>
              <TouchableOpacity onPress={() => setSelectedCompany(null)}>
                <X size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            {selectedCompany && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Company Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.legalEntityName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Alias:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.alias || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subscription:</Text>
                    <Text style={styles.detailValue}>
                      {selectedCompany.subscriptionTier || selectedCompany.accountType || 'free'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>VAS Features:</Text>
                    <Text style={styles.detailValue}>{selectedCompany.vasFeatures?.length || 0}</Text>
                  </View>
                </View>
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
    backgroundColor: 'rgba(139, 92, 246, 0.95)',
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
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
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 8,
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
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
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
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  accountTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accountTypeText: {
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
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  mrrText: {
    fontWeight: '700',
    color: '#10b981',
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
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  accountTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  accountTypeButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  accountTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  accountTypeButtonTextActive: {
    color: '#fff',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  featureRowActive: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  featureNameActive: {
    color: '#166534',
    fontWeight: '600',
  },
  featurePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});
