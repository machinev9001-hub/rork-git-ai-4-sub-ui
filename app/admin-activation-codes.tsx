import { Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  User,
  Calendar,
} from 'lucide-react-native';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

type ActivationCodeData = {
  id: string;
  code: string;
  companyName?: string;
  companyId?: string;
  status: 'active' | 'redeemed' | 'expired' | 'revoked';
  expiryDate?: Date;
  redeemedAt?: Date;
  redeemedBy?: string;
  createdAt: Date;
  currentRedemptions?: number;
  maxRedemptions?: number;
  masterAccountName?: string;
  masterAccountId?: string;
};

export default function AdminActivationCodesScreen() {
  const [codes, setCodes] = useState<ActivationCodeData[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<ActivationCodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'redeemed' | 'expired'>('all');

  const loadActivationCodes = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);

    try {
      console.log('[AdminActivationCodes] Loading activation codes...');
      
      // Get activation codes
      const codesRef = collection(db, 'activation_codes');
      const codesQuery = query(codesRef, orderBy('createdAt', 'desc'), limit(100));
      const codesSnapshot = await getDocs(codesQuery);
      
      const loadedCodes: ActivationCodeData[] = [];
      
      // Get all master account IDs from redeemed codes
      const masterAccountIds = new Set<string>();
      codesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.redeemedBy) {
          masterAccountIds.add(data.redeemedBy);
        }
      });
      
      // Load master account names
      const masterAccountNames: Record<string, string> = {};
      if (masterAccountIds.size > 0) {
        const masterAccountsRef = collection(db, 'masterAccounts');
        const masterAccountsSnapshot = await getDocs(masterAccountsRef);
        
        masterAccountsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (masterAccountIds.has(doc.id)) {
            masterAccountNames[doc.id] = data.name || data.masterId || 'Unknown';
          }
        });
      }
      
      // Process codes
      for (const doc of codesSnapshot.docs) {
        const data = doc.data();
        
        const code: ActivationCodeData = {
          id: doc.id,
          code: data.code,
          companyName: data.companyName,
          companyId: data.companyId,
          status: data.status || 'active',
          expiryDate: data.expiryDate?.toDate(),
          redeemedAt: data.redeemedAt?.toDate(),
          redeemedBy: data.redeemedBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          currentRedemptions: data.currentRedemptions || 0,
          maxRedemptions: data.maxRedemptions || 1,
          masterAccountName: data.redeemedBy ? masterAccountNames[data.redeemedBy] : undefined,
          masterAccountId: data.redeemedBy,
        };
        
        // Auto-expire if needed
        if (code.status === 'active' && code.expiryDate && code.expiryDate < new Date()) {
          code.status = 'expired';
        }
        
        loadedCodes.push(code);
      }
      
      console.log('[AdminActivationCodes] Loaded', loadedCodes.length, 'codes');
      setCodes(loadedCodes);
      setFilteredCodes(loadedCodes);
    } catch (error) {
      console.error('[AdminActivationCodes] Error loading codes:', error);
      Alert.alert('Error', 'Failed to load activation codes');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivationCodes();
  }, []);

  useEffect(() => {
    // Filter codes based on search and status
    let filtered = codes;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(code => code.status === statusFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(code => 
        code.code.toLowerCase().includes(query) ||
        code.companyName?.toLowerCase().includes(query) ||
        code.masterAccountName?.toLowerCase().includes(query)
      );
    }
    
    setFilteredCodes(filtered);
  }, [searchQuery, statusFilter, codes]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadActivationCodes(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'redeemed': return '#3b82f6';
      case 'expired': return '#f59e0b';
      case 'revoked': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} color="#10b981" />;
      case 'redeemed': return <CheckCircle size={16} color="#3b82f6" />;
      case 'expired': return <Clock size={16} color="#f59e0b" />;
      case 'revoked': return <XCircle size={16} color="#ef4444" />;
      default: return <AlertCircle size={16} color="#64748b" />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient
        colors={['#dc2626', '#ef4444', '#f87171']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Activation Codes</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            View and manage all activation codes
          </Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by code, company, or account..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('all')}
            >
              <Text style={[styles.filterButtonText, statusFilter === 'all' && styles.filterButtonTextActive]}>
                All ({codes.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'active' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('active')}
            >
              <Text style={[styles.filterButtonText, statusFilter === 'active' && styles.filterButtonTextActive]}>
                Active ({codes.filter(c => c.status === 'active').length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'redeemed' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('redeemed')}
            >
              <Text style={[styles.filterButtonText, statusFilter === 'redeemed' && styles.filterButtonTextActive]}>
                Redeemed ({codes.filter(c => c.status === 'redeemed').length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'expired' && styles.filterButtonActive]}
              onPress={() => setStatusFilter('expired')}
            >
              <Text style={[styles.filterButtonText, statusFilter === 'expired' && styles.filterButtonTextActive]}>
                Expired ({codes.filter(c => c.status === 'expired').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#fff" />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading activation codes...</Text>
            </View>
          ) : filteredCodes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color="#fecaca" />
              <Text style={styles.emptyText}>
                {searchQuery || statusFilter !== 'all' 
                  ? 'No codes match your filters'
                  : 'No activation codes found'}
              </Text>
            </View>
          ) : (
            filteredCodes.map((code) => (
              <View key={code.id} style={styles.codeCard}>
                <View style={styles.codeHeader}>
                  <View style={styles.codeStatus}>
                    {getStatusIcon(code.status)}
                    <Text style={[styles.codeStatusText, { color: getStatusColor(code.status) }]}>
                      {code.status.toUpperCase()}
                    </Text>
                  </View>
                  {code.createdAt && (
                    <Text style={styles.codeDate}>
                      {code.createdAt.toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <View style={styles.codeMain}>
                  <Text style={styles.codeText}>{code.code}</Text>
                </View>

                {code.companyName && (
                  <View style={styles.codeInfo}>
                    <Building2 size={16} color="#64748b" />
                    <Text style={styles.codeInfoText}>
                      Company: {code.companyName}
                    </Text>
                  </View>
                )}

                {code.masterAccountName && (
                  <View style={styles.codeInfo}>
                    <User size={16} color="#64748b" />
                    <Text style={styles.codeInfoText}>
                      Redeemed by: {code.masterAccountName}
                    </Text>
                  </View>
                )}

                {code.redeemedAt && (
                  <View style={styles.codeInfo}>
                    <Calendar size={16} color="#64748b" />
                    <Text style={styles.codeInfoText}>
                      Redeemed: {code.redeemedAt.toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {code.expiryDate && (
                  <View style={styles.codeInfo}>
                    <Clock size={16} color="#64748b" />
                    <Text style={styles.codeInfoText}>
                      {code.status === 'expired' ? 'Expired' : 'Expires'}: {code.expiryDate.toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.codeStats}>
                  <Text style={styles.codeStatsText}>
                    Used: {code.currentRedemptions || 0} / {code.maxRedemptions || 1}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dc2626',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fecaca',
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  filterButtonTextActive: {
    color: '#dc2626',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#fecaca',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#fecaca',
    textAlign: 'center',
  },
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeStatusText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  codeDate: {
    fontSize: 13,
    color: '#64748b',
  },
  codeMain: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e3a8a',
    textAlign: 'center',
    letterSpacing: 2,
  },
  codeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeInfoText: {
    fontSize: 14,
    color: '#475569',
  },
  codeStats: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginTop: 4,
  },
  codeStatsText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
