import { Stack, router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Package, Search, Building2, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PlantAsset, AllocationStatus } from '@/types';

export default function CompanyAssetsScreen() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<PlantAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAssets = useCallback(async () => {
    if (!user?.currentCompanyId) {
      console.log('[CompanyAssets] No company selected');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      console.log('[CompanyAssets] Loading assets for company:', user.currentCompanyId);

      const assetsRef = collection(db, 'plantAssets');
      const assetsQuery = query(
        assetsRef,
        where('companyId', '==', user.currentCompanyId)
      );

      const assetsSnapshot = await getDocs(assetsQuery);
      const loadedAssets: PlantAsset[] = [];

      assetsSnapshot.forEach((doc) => {
        const data = doc.data();
        loadedAssets.push({
          id: doc.id,
          assetId: data.assetId,
          type: data.type,
          typeId: data.typeId,
          groupId: data.groupId,
          plantNumber: data.plantNumber,
          registrationNumber: data.registrationNumber,
          ownerName: data.ownerName,
          ownerId: data.ownerId,
          ownerType: data.ownerType,
          currentOperator: data.currentOperator,
          currentOperatorId: data.currentOperatorId,
          siteId: data.siteId,
          masterAccountId: data.masterAccountId,
          companyId: data.companyId,
          allocationStatus: data.allocationStatus as AllocationStatus,
          currentAllocation: data.currentAllocation,
          allocationHistory: data.allocationHistory,
          inductionStatus: data.inductionStatus || false,
          inductionDate: data.inductionDate,
          onboardingDate: data.onboardingDate,
          inductionNotes: data.inductionNotes,
          attachments: data.attachments || [],
          checklist: data.checklist || [],
          dryRate: data.dryRate,
          wetRate: data.wetRate,
          dailyRate: data.dailyRate,
          billingMethod: data.billingMethod,
          internalAllocationEnabled: data.internalAllocationEnabled ?? true,
          marketplaceVisibilityEnabled: data.marketplaceVisibilityEnabled ?? false,
          availability: data.availability || 'available',
          archived: data.archived || false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      console.log('[CompanyAssets] Loaded', loadedAssets.length, 'assets');
      setAssets(loadedAssets);
    } catch (error) {
      console.error('[CompanyAssets] Error loading assets:', error);
      Alert.alert('Error', 'Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [user?.currentCompanyId]);

  useFocusEffect(
    useCallback(() => {
      loadAssets();
    }, [loadAssets])
  );

  const handleAddAsset = () => {
    router.push('/add-asset');
  };

  const handleAssetPress = (asset: PlantAsset) => {
    router.push({
      pathname: '/plant-asset-actions',
      params: { assetId: asset.id },
    });
  };

  const filteredAssets = assets.filter((asset) =>
    asset.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.plantNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAllocationStatus = (status: AllocationStatus, siteId?: string | null) => {
    const statusLabels: Record<AllocationStatus, { label: string; color: string; bgColor: string }> = {
      UNALLOCATED: { label: 'Available', color: '#10b981', bgColor: '#d1fae5' },
      ALLOCATED: { label: 'Allocated', color: '#3b82f6', bgColor: '#dbeafe' },
      IN_TRANSIT: { label: 'In Transit', color: '#f59e0b', bgColor: '#fef3c7' },
    };
    
    const statusInfo = statusLabels[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
      </View>
    );
  };

  const renderAsset = ({ item }: { item: PlantAsset }) => (
    <TouchableOpacity
      style={styles.assetCard}
      onPress={() => handleAssetPress(item)}
    >
      <View style={styles.assetIcon}>
        <Package size={40} color="#3b82f6" />
      </View>
      <View style={styles.assetInfo}>
        <Text style={styles.assetType}>{item.type}</Text>
        <View style={styles.assetMetaRow}>
          {item.plantNumber && (
            <Text style={styles.assetMeta}>Plant #{item.plantNumber}</Text>
          )}
          {item.registrationNumber && (
            <>
              {item.plantNumber && <Text style={styles.assetMetaDivider}>•</Text>}
              <Text style={styles.assetMeta}>Reg: {item.registrationNumber}</Text>
            </>
          )}
        </View>
        <View style={styles.assetBottomRow}>
          {renderAllocationStatus(item.allocationStatus, item.siteId)}
          {item.marketplaceVisibilityEnabled && (
            <View style={styles.marketplaceBadge}>
              <Text style={styles.marketplaceBadgeText}>Marketplace</Text>
            </View>
          )}
        </View>
      </View>
      <ChevronRight size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Company Assets',
            headerStyle: { backgroundColor: '#1e3a8a' },
            headerTintColor: '#fff',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading assets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Company Assets',
          headerStyle: { backgroundColor: '#1e3a8a' },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleAddAsset} style={styles.headerButton}>
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Company Info Banner */}
        {user?.companyName && (
          <View style={styles.companyBanner}>
            <Building2 size={16} color="#3b82f6" />
            <Text style={styles.companyBannerText}>{user.companyName}</Text>
          </View>
        )}

        {/* Asset List */}
        {filteredAssets.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No assets found' : 'No assets yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first company-level asset'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.addButton} onPress={handleAddAsset}>
                <Plus size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Asset</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredAssets}
            keyExtractor={(item) => item.id || ''}
            renderItem={renderAsset}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  companyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  companyBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3b82f6',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  assetIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetInfo: {
    flex: 1,
    gap: 6,
  },
  assetType: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  assetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  assetMetaDivider: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  assetBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  marketplaceBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  marketplaceBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#ca8a04',
    letterSpacing: 0.5,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
