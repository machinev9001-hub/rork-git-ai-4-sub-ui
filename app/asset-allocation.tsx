import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { ArrowLeft, Save, MapPin, CheckCircle2, XCircle, Package } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Colors } from '@/constants/colors';

type Site = {
  id: string;
  name: string;
  location?: string;
  status?: string;
};

type PlantAssetAllocation = {
  id?: string;
  assetId: string;
  siteId: string;
  companyId: string;
  masterAccountId: string;
  isActive: boolean;
  allocatedAt: number;
  allocatedBy: string;
  deallocatedAt?: number;
  deallocatedBy?: string;
  allocationStatus: 'allocated' | 'in-transit' | 'available';
};

export default function AssetAllocationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const assetId = params.assetId as string;
  const assetName = params.assetName as string;

  const [sites, setSites] = useState<Site[]>([]);
  const [allocations, setAllocations] = useState<Map<string, PlantAssetAllocation>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.currentCompanyId || !user?.masterAccountId) {
      Alert.alert('Error', 'Missing company information');
      return;
    }

    try {
      setIsLoading(true);

      // Load company sites
      const sitesRef = collection(db, 'sites');
      const sitesQuery = query(
        sitesRef,
        where('companyId', '==', user.currentCompanyId),
        where('masterAccountId', '==', user.masterAccountId)
      );
      const sitesSnapshot = await getDocs(sitesQuery);
      const sitesData = sitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Site));
      setSites(sitesData);

      // Load existing asset allocations
      const allocationsRef = collection(db, 'plantAssetAllocations');
      const allocationsQuery = query(
        allocationsRef,
        where('assetId', '==', assetId),
        where('companyId', '==', user.currentCompanyId)
      );
      const allocationsSnapshot = await getDocs(allocationsQuery);
      const allocationsMap = new Map<string, PlantAssetAllocation>();
      allocationsSnapshot.docs.forEach(doc => {
        const allocation = { id: doc.id, ...doc.data() } as PlantAssetAllocation;
        allocationsMap.set(allocation.siteId, allocation);
      });
      setAllocations(allocationsMap);

    } catch (error) {
      console.error('[AssetAllocation] Error loading data:', error);
      Alert.alert('Error', 'Failed to load sites');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAllocation = (siteId: string) => {
    const newAllocations = new Map(allocations);
    const existing = newAllocations.get(siteId);

    if (existing) {
      // Toggle active state (deallocate)
      newAllocations.set(siteId, {
        ...existing,
        isActive: !existing.isActive,
        allocationStatus: existing.isActive ? 'available' : 'allocated',
      });
    } else {
      // Create new allocation
      newAllocations.set(siteId, {
        assetId,
        siteId,
        companyId: user!.currentCompanyId!,
        masterAccountId: user!.masterAccountId!,
        isActive: true,
        allocatedAt: Date.now(),
        allocatedBy: user!.userId!,
        allocationStatus: 'allocated',
      });
    }

    setAllocations(newAllocations);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      router.back();
      return;
    }

    setIsSaving(true);

    try {
      const allocationsRef = collection(db, 'plantAssetAllocations');

      // Ensure only one active allocation at a time
      const activeAllocations = Array.from(allocations.values()).filter(a => a.isActive);
      if (activeAllocations.length > 1) {
        Alert.alert(
          'Error',
          'An asset can only be allocated to one site at a time. Please select only one site.',
          [{ text: 'OK' }]
        );
        setIsSaving(false);
        return;
      }

      // Process all changes
      for (const [siteId, allocation] of allocations.entries()) {
        if (allocation.id) {
          // Update existing allocation
          const allocationDoc = doc(db, 'plantAssetAllocations', allocation.id);
          await updateDoc(allocationDoc, {
            isActive: allocation.isActive,
            allocationStatus: allocation.allocationStatus,
            updatedAt: serverTimestamp(),
            ...(allocation.isActive ? {} : {
              deallocatedAt: Date.now(),
              deallocatedBy: user!.userId,
            }),
          });
        } else {
          // Create new allocation
          await addDoc(allocationsRef, {
            ...allocation,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Update the asset's allocationStatus in plantAssets collection
      const assetDoc = doc(db, 'plantAssets', assetId);
      const activeAllocation = activeAllocations[0];
      await updateDoc(assetDoc, {
        allocationStatus: activeAllocation ? 'ALLOCATED' : 'UNALLOCATED',
        siteId: activeAllocation?.siteId || null,
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Asset allocation saved', [
        { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error('[AssetAllocation] Error saving:', error);
      Alert.alert('Error', 'Failed to save asset allocation');
    } finally {
      setIsSaving(false);
    }
  };

  const activeAllocationSite = Array.from(allocations.entries())
    .find(([_, allocation]) => allocation.isActive)?.[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Asset Allocation</Text>
          <Text style={styles.headerSubtitle}>{assetName}</Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Save size={24} color={hasChanges ? Colors.primary : '#94a3b8'} />
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading sites...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.summaryCard, activeAllocationSite ? styles.summaryCardAllocated : styles.summaryCardAvailable]}>
            <Package size={20} color={activeAllocationSite ? '#15803d' : '#3b82f6'} />
            <Text style={activeAllocationSite ? styles.summaryTextAllocated : styles.summaryTextAvailable}>
              {activeAllocationSite 
                ? `Allocated to ${sites.find(s => s.id === activeAllocationSite)?.name || 'site'}`
                : 'Available - Not allocated to any site'}
            </Text>
          </View>

          {sites.length === 0 ? (
            <View style={styles.emptyState}>
              <MapPin size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>No Sites Available</Text>
              <Text style={styles.emptyStateText}>
                Create sites for your company to allocate assets
              </Text>
            </View>
          ) : (
            <View style={styles.sitesContainer}>
              {sites.map((site) => {
                const allocation = allocations.get(site.id);
                const isAllocated = allocation?.isActive ?? false;

                return (
                  <View key={site.id} style={styles.siteCard}>
                    <View style={styles.siteInfo}>
                      <View style={styles.siteHeader}>
                        <Text style={styles.siteName}>{site.name}</Text>
                        {isAllocated ? (
                          <CheckCircle2 size={18} color="#10b981" />
                        ) : (
                          <XCircle size={18} color="#cbd5e1" />
                        )}
                      </View>
                      {site.location && (
                        <Text style={styles.siteLocation}>{site.location}</Text>
                      )}
                      {site.status && (
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>{site.status}</Text>
                        </View>
                      )}
                    </View>
                    <Switch
                      value={isAllocated}
                      onValueChange={() => toggleAllocation(site.id)}
                      trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                      thumbColor={isAllocated ? '#fff' : '#f4f3f4'}
                      ios_backgroundColor="#e2e8f0"
                      disabled={isSaving}
                    />
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.noteSection}>
            <Text style={styles.noteText}>
              ⚠️ An asset can only be allocated to ONE site at a time
            </Text>
            <Text style={styles.noteText}>
              💡 Toggle to allocate or deallocate asset from a site
            </Text>
            <Text style={styles.noteText}>
              Changes are saved when you press the Save button
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  summaryCardAvailable: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  summaryCardAllocated: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  summaryTextAvailable: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1e40af',
  },
  summaryTextAllocated: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#15803d',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  sitesContainer: {
    gap: 12,
  },
  siteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  siteInfo: {
    flex: 1,
    gap: 6,
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  siteLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#15803d',
  },
  noteSection: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fde047',
    marginTop: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#854d0e',
    lineHeight: 18,
  },
});
