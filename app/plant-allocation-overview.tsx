import { Stack, router } from 'expo-router';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Grid, Package, ChevronRight, Truck, AlertCircle, QrCode, UserCheck } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useQuery } from '@tanstack/react-query';
import { useSyncOnFocus } from '../utils/hooks/useSyncOnFocus';
import { useState } from 'react';
import { ensureBreakdownTimesheets } from '@/utils/breakdownTimesheetManager';
import type { Employee } from '@/types';

type PvArea = {
  id: string;
  name: string;
  siteId: string;
};

type BlockArea = {
  id: string;
  name: string;
  pvAreaId: string;
  pvAreaName: string;
  siteId: string;
};

type AllocatedAsset = {
  id: string;
  assetId: string;
  type: string;
  plantNumber?: string;
  registrationNumber?: string;
  currentAllocation?: {
    siteId: string;
    siteName?: string;
    allocatedAt: any;
    allocatedBy: string;
    notes?: string;
    pvArea?: string;
    blockArea?: string;
  };
};

type GroupedAllocation = {
  pvArea: string;
  blocks: {
    blockName: string;
    assets: AllocatedAsset[];
  }[];
};

export default function PlantAllocationOverviewScreen() {
  const { user } = useAuth();
  useSyncOnFocus();
  const insets = useSafeAreaInsets();
  const [expandedPvAreas, setExpandedPvAreas] = useState<Record<string, boolean>>({});
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
  const [selectedAsset, setSelectedAsset] = useState<AllocatedAsset | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [operators, setOperators] = useState<Employee[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [isAssigningOperator, setIsAssigningOperator] = useState(false);

  const { data: pvAreas = [], isLoading: loadingPvAreas } = useQuery({
    queryKey: ['pvAreas', user?.siteId],
    queryFn: async () => {
      if (!user?.siteId) return [];
      const q = query(
        collection(db, 'pvAreas'),
        where('siteId', '==', user.siteId)
      );
      const snapshot = await getDocs(q);
      const areas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PvArea[];
      
      return areas.sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    },
    enabled: !!user?.siteId,
  });

  const { data: blockAreas = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['blockAreas', user?.siteId],
    queryFn: async () => {
      if (!user?.siteId) return [];
      const q = query(
        collection(db, 'blockAreas'),
        where('siteId', '==', user.siteId)
      );
      const snapshot = await getDocs(q);
      const blocks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as BlockArea[];
      
      return blocks.sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    },
    enabled: !!user?.siteId,
  });

  const { data: allocatedAssets = [], isLoading: loadingAssets, refetch: refetchAssets } = useQuery({
    queryKey: ['allocatedAssets', user?.siteId],
    queryFn: async () => {
      if (!user?.siteId) return [];
      console.log('🚚 ==================== LOADING ALLOCATED ASSETS ====================');
      console.log('🚚 Query params - siteId:', user.siteId);
      console.log('🚚 Query params - allocationStatus: ALLOCATED');
      
      const q = query(
        collection(db, 'plantAssets'),
        where('siteId', '==', user.siteId),
        where('allocationStatus', '==', 'ALLOCATED')
      );
      const snapshot = await getDocs(q);
      const assets = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('🚚 Asset found:', {
          id: doc.id,
          assetId: data.assetId,
          type: data.type,
          allocationStatus: data.allocationStatus,
          pvArea: data.currentAllocation?.pvArea,
          blockArea: data.currentAllocation?.blockArea,
          allocatedAt: data.currentAllocation?.allocatedAt,
        });
        return {
          id: doc.id,
          ...data,
        };
      }) as AllocatedAsset[];
      
      console.log('🚚 Total allocated assets loaded:', assets.length);
      console.log('🚚 ================================================================');
      return assets;
    },
    enabled: !!user?.siteId,
  });

  const groupedData: GroupedAllocation[] = pvAreas.map(pvArea => {
    const blocksForPv = blockAreas.filter(b => b.pvAreaId === pvArea.id);
    
    console.log('📊 Grouping assets for PV Area:', pvArea.name);
    console.log('📊 Blocks in this PV Area:', blocksForPv.map(b => b.name));
    
    return {
      pvArea: pvArea.name,
      blocks: blocksForPv.map(block => {
        const assetsForBlock = allocatedAssets.filter(
          asset => {
            const matches = asset.currentAllocation?.pvArea === pvArea.name &&
                           asset.currentAllocation?.blockArea === block.name;
            
            if (matches) {
              console.log('✅ Asset matched to', pvArea.name, '-', block.name, ':', asset.assetId);
            }
            
            return matches;
          }
        );
        
        console.log('📊 Assets in', pvArea.name, '-', block.name, ':', assetsForBlock.length);
        
        return {
          blockName: block.name,
          assets: assetsForBlock,
        };
      }),
    };
  });

  const isLoading = loadingPvAreas || loadingBlocks || loadingAssets;

  const togglePvArea = (pvArea: string) => {
    setExpandedPvAreas(prev => ({ ...prev, [pvArea]: !prev[pvArea] }));
  };

  const toggleBlock = (key: string) => {
    setExpandedBlocks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const loadOperators = async (companyId: string) => {
    if (!user?.masterAccountId) return;

    try {
      console.log('[PlantAllocationOverview] Loading operators for company:', companyId);
      const operatorsQuery = query(
        collection(db, 'employees'),
        where('masterAccountId', '==', user.masterAccountId),
        where('companyId', '==', companyId),
        where('role', '==', 'Operator')
      );
      
      const snapshot = await getDocs(operatorsQuery);
      const operatorsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      
      console.log('[PlantAllocationOverview] Loaded', operatorsList.length, 'operators for company');
      setOperators(operatorsList);
    } catch (error) {
      console.error('[PlantAllocationOverview] Error loading operators:', error);
      Alert.alert('Error', 'Failed to load operators. Please try again.');
    }
  };

  const handleAssetLongPress = (asset: AllocatedAsset) => {
    setSelectedAsset(asset);
    setShowOptionsModal(true);
  };

  const handleBreakdownOption = async () => {
    if (!selectedAsset || !selectedAsset.id) return;
    
    setShowOptionsModal(false);
    
    const isCurrentlyOnBreakdown = (selectedAsset as any).breakdownStatus === true;
    
    if (isCurrentlyOnBreakdown) {
      Alert.alert(
        'Reactivate Asset',
        `Mark ${selectedAsset.assetId} as repaired and back to work?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reactivate',
            onPress: async () => {
              try {
                const today = new Date().toISOString().split('T')[0];
                const assetRef = doc(db, 'plantAssets', selectedAsset.id);
                
                await ensureBreakdownTimesheets(
                  selectedAsset.id,
                  (selectedAsset as any).breakdownStartDate || today,
                  today,
                  user?.masterAccountId || '',
                  user?.siteId || '',
                  (selectedAsset as any).currentOperatorId,
                  (selectedAsset as any).currentOperator
                );
                
                await updateDoc(assetRef, {
                  breakdownStatus: false,
                  breakdownEndDate: today,
                  breakdownReactivatedBy: user?.name || 'Unknown',
                  breakdownReactivatedAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                
                Alert.alert('Success', `${selectedAsset.assetId} reactivated and back to work.`);
                refetchAssets();
              } catch (error) {
                console.error('[PlantAllocationOverview] Error reactivating asset:', error);
                Alert.alert('Error', 'Failed to reactivate asset.');
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Book on Breakdown',
        `Mark ${selectedAsset.assetId} as on breakdown?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                const today = new Date().toISOString().split('T')[0];
                const assetRef = doc(db, 'plantAssets', selectedAsset.id);
                
                await updateDoc(assetRef, {
                  breakdownStatus: true,
                  breakdownStartDate: today,
                  breakdownEndDate: null,
                  breakdownTimestamp: serverTimestamp(),
                  breakdownLoggedBy: user?.name || 'Unknown',
                  updatedAt: serverTimestamp(),
                });
                
                await ensureBreakdownTimesheets(
                  selectedAsset.id,
                  today,
                  null,
                  user?.masterAccountId || '',
                  user?.siteId || '',
                  (selectedAsset as any).currentOperatorId,
                  (selectedAsset as any).currentOperator
                );
                
                Alert.alert('Success', `${selectedAsset.assetId} marked as on breakdown.`);
                refetchAssets();
              } catch (error) {
                console.error('[PlantAllocationOverview] Error marking breakdown:', error);
                Alert.alert('Error', 'Failed to mark asset as breakdown.');
              }
            }
          }
        ]
      );
    }
  };

  const handleQROption = () => {
    if (!selectedAsset) return;
    setShowOptionsModal(false);
    router.push({
      pathname: '/generate-plant-qr',
      params: {
        assetId: selectedAsset.assetId,
        assetType: selectedAsset.type,
        location: selectedAsset.currentAllocation?.siteName || '',
      },
    });
  };

  const handleVASToggleOption = async () => {
    if (!selectedAsset || !selectedAsset.id) return;
    
    setShowOptionsModal(false);
    
    if ((selectedAsset as any).ownerType === 'subcontractor') {
      Alert.alert(
        'Cannot List Subcontractor Asset',
        'Only company-owned assets from the master account can be listed on the VAS marketplace. Subcontractor assets cannot be listed.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const isCurrentlyListed = (selectedAsset as any).isAvailableForVAS || false;
    
    try {
      const assetRef = doc(db, 'plantAssets', selectedAsset.id);
      await updateDoc(assetRef, {
        isAvailableForVAS: !isCurrentlyListed,
        updatedAt: serverTimestamp(),
      });
      
      Alert.alert(
        'Success',
        isCurrentlyListed
          ? `${selectedAsset.assetId} removed from VAS marketplace.`
          : `${selectedAsset.assetId} is now listed on VAS marketplace.`
      );
      refetchAssets();
    } catch (error) {
      console.error('[PlantAllocationOverview] Error toggling VAS:', error);
      Alert.alert('Error', 'Failed to update VAS listing.');
    }
  };

  const handleAssignOperatorOption = () => {
    if (!(selectedAsset as any)?.companyId) {
      Alert.alert('Error', 'Plant asset does not have a company assigned.');
      return;
    }
    setShowOptionsModal(false);
    loadOperators((selectedAsset as any).companyId);
    setShowOperatorModal(true);
    if ((selectedAsset as any)?.currentOperatorId) {
      setSelectedOperatorId((selectedAsset as any).currentOperatorId);
    } else {
      setSelectedOperatorId('');
    }
  };

  const handleOperatorAssignment = async () => {
    if (!selectedAsset || !selectedAsset.id) {
      Alert.alert('Error', 'No asset selected');
      return;
    }

    if (!selectedOperatorId) {
      Alert.alert('Error', 'Please select an operator');
      return;
    }

    setIsAssigningOperator(true);
    try {
      const selectedOperator = operators.find(op => op.id === selectedOperatorId);
      
      const assetRef = doc(db, 'plantAssets', selectedAsset.id);
      await updateDoc(assetRef, {
        currentOperatorId: selectedOperatorId,
        currentOperator: selectedOperator?.name || '',
        updatedAt: serverTimestamp(),
      });
      
      Alert.alert('Success', `Operator ${selectedOperator?.name} assigned to ${selectedAsset.assetId}`);
      setShowOperatorModal(false);
      setSelectedOperatorId('');
      setSelectedAsset(null);
      refetchAssets();
    } catch (error) {
      console.error('[PlantAllocationOverview] Error assigning operator:', error);
      Alert.alert('Error', 'Failed to assign operator');
    } finally {
      setIsAssigningOperator(false);
    }
  };

  const handleRemoveOperator = async () => {
    if (!selectedAsset || !selectedAsset.id) return;

    Alert.alert(
      'Remove Operator',
      `Remove ${(selectedAsset as any).currentOperator} from ${selectedAsset.assetId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const assetRef = doc(db, 'plantAssets', selectedAsset.id);
              await updateDoc(assetRef, {
                currentOperatorId: null,
                currentOperator: null,
                updatedAt: serverTimestamp(),
              });
              
              Alert.alert('Success', 'Operator removed');
              setShowOperatorModal(false);
              setSelectedOperatorId('');
              setSelectedAsset(null);
              refetchAssets();
            } catch (error) {
              console.error('[PlantAllocationOverview] Error removing operator:', error);
              Alert.alert('Error', 'Failed to remove operator');
            }
          }
        }
      ]
    );
  };

  const scrollContentStyle = {
    paddingBottom: Math.max(insets.bottom + 120, 160),
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 0) }]}> 
      <Stack.Screen
        options={{
          title: 'Plant Allocation Overview',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
      >
        <View style={styles.headerCard}>
          <Truck size={32} color="#f59e0b" />
          <Text style={styles.headerTitle}>Plant Allocation by PV & Block</Text>
          <Text style={styles.headerSubtitle}>
            {allocatedAssets.length} assets allocated across {pvAreas.length} PV areas
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingText}>Loading allocation data...</Text>
          </View>
        ) : groupedData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No PV Areas configured</Text>
            <Text style={styles.emptySubtext}>Set up PV Areas and Blocks in settings first</Text>
          </View>
        ) : (
          <View style={styles.section}>
            {groupedData.map((group, pvIdx) => {
              const isPvExpanded = expandedPvAreas[group.pvArea];
              const totalAssetsInPv = group.blocks.reduce((sum, b) => sum + b.assets.length, 0);

              return (
                <View key={pvIdx} style={styles.pvAreaCard}>
                  <TouchableOpacity
                    style={styles.pvAreaHeader}
                    onPress={() => togglePvArea(group.pvArea)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pvAreaHeaderLeft}>
                      <MapPin size={24} color="#4285F4" />
                      <View style={styles.pvAreaInfo}>
                        <Text style={styles.pvAreaName}>{group.pvArea}</Text>
                        <Text style={styles.pvAreaSubtext}>
                          {group.blocks.length} blocks • {totalAssetsInPv} assets
                        </Text>
                      </View>
                    </View>
                    <ChevronRight 
                      size={20} 
                      color="#64748b" 
                      style={{ 
                        transform: [{ rotate: isPvExpanded ? '90deg' : '0deg' }] 
                      }} 
                    />
                  </TouchableOpacity>

                  {isPvExpanded && (
                    <View style={styles.blocksContainer}>
                      {group.blocks.length === 0 ? (
                        <View style={styles.emptyBlocksContainer}>
                          <Grid size={24} color="#cbd5e1" />
                          <Text style={styles.emptyBlocksText}>No blocks in this PV Area</Text>
                        </View>
                      ) : (
                        group.blocks.map((block, blockIdx) => {
                          const blockKey = `${group.pvArea}-${block.blockName}`;
                          const isBlockExpanded = expandedBlocks[blockKey];

                          return (
                            <View key={blockIdx} style={styles.blockCard}>
                              <TouchableOpacity
                                style={styles.blockHeader}
                                onPress={() => toggleBlock(blockKey)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.blockHeaderLeft}>
                                  <Grid size={20} color="#34A853" />
                                  <View style={styles.blockInfo}>
                                    <Text style={styles.blockName}>{block.blockName}</Text>
                                    <Text style={styles.blockSubtext}>
                                      {block.assets.length} {block.assets.length === 1 ? 'asset' : 'assets'} allocated
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.blockHeaderRight}>
                                  {block.assets.length > 0 && (
                                    <View style={styles.assetCountBadge}>
                                      <Text style={styles.assetCountText}>{block.assets.length}</Text>
                                    </View>
                                  )}
                                  <ChevronRight 
                                    size={16} 
                                    color="#64748b" 
                                    style={{ 
                                      transform: [{ rotate: isBlockExpanded ? '90deg' : '0deg' }] 
                                    }} 
                                  />
                                </View>
                              </TouchableOpacity>

                              {isBlockExpanded && (
                                <View style={styles.assetsContainer}>
                                  {block.assets.length === 0 ? (
                                    <View style={styles.emptyAssetsContainer}>
                                      <Package size={20} color="#cbd5e1" />
                                      <Text style={styles.emptyAssetsText}>No assets allocated to this block</Text>
                                    </View>
                                  ) : (
                                    block.assets.map((asset, assetIdx) => (
                                      <TouchableOpacity 
                                        key={assetIdx} 
                                        style={styles.assetItem}
                                        onLongPress={() => handleAssetLongPress(asset)}
                                        delayLongPress={500}
                                        activeOpacity={0.7}
                                      >
                                        <Package size={18} color="#f59e0b" />
                                        <View style={styles.assetDetails}>
                                          <Text style={styles.assetId}>{asset.assetId}</Text>
                                          <Text style={styles.assetType}>{asset.type}</Text>
                                          {asset.plantNumber && (
                                            <Text style={styles.assetMeta}>Plant: {asset.plantNumber}</Text>
                                          )}
                                          {asset.registrationNumber && (
                                            <Text style={styles.assetMeta}>Reg: {asset.registrationNumber}</Text>
                                          )}
                                        </View>
                                      </TouchableOpacity>
                                    ))
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{selectedAsset?.assetId}</Text>
            <Text style={styles.modalSubtitle}>{selectedAsset?.type}</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleBreakdownOption}
              activeOpacity={0.7}
            >
              <AlertCircle size={22} color={(selectedAsset as any)?.breakdownStatus ? "#10b981" : "#ef4444"} />
              <Text style={styles.optionText}>
                {(selectedAsset as any)?.breakdownStatus ? 'Reactivate Asset (Back to Work)' : 'Book on Breakdown'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleQROption}
              activeOpacity={0.7}
            >
              <QrCode size={22} color="#f59e0b" />
              <Text style={styles.optionText}>View QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleVASToggleOption}
              activeOpacity={0.7}
            >
              <Package size={22} color="#3b82f6" />
              <Text style={styles.optionText}>
                {(selectedAsset as any)?.isAvailableForVAS ? 'Remove from Marketplace' : 'List on Marketplace'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleAssignOperatorOption}
              activeOpacity={0.7}
            >
              <UserCheck size={22} color="#8b5cf6" />
              <Text style={styles.optionText}>
                {(selectedAsset as any)?.currentOperator ? `Change Operator (${(selectedAsset as any).currentOperator})` : 'Assign Operator'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOptionsModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Operator Assignment Modal */}
      <Modal
        visible={showOperatorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOperatorModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowOperatorModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Assign Operator</Text>
            <Text style={styles.modalSubtitle}>{selectedAsset?.assetId} - {selectedAsset?.type}</Text>

            {(selectedAsset as any)?.currentOperator && (
              <View style={styles.currentOperatorBadge}>
                <Text style={styles.currentOperatorLabel}>Current Operator:</Text>
                <Text style={styles.currentOperatorName}>{(selectedAsset as any).currentOperator}</Text>
              </View>
            )}

            <Text style={styles.label}>Select Operator</Text>
            {operators.length === 0 ? (
              <View style={styles.emptyPickerState}>
                <Text style={styles.emptyPickerText}>No operators available for this company.</Text>
              </View>
            ) : (
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {operators.map((operator) => (
                  <TouchableOpacity
                    key={operator.id}
                    style={[
                      styles.pickerOption,
                      selectedOperatorId === operator.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setSelectedOperatorId(operator.id!)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        selectedOperatorId === operator.id && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {operator.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedOperatorId || isAssigningOperator) && styles.submitButtonDisabled,
              ]}
              onPress={handleOperatorAssignment}
              disabled={!selectedOperatorId || isAssigningOperator}
              activeOpacity={0.7}
            >
              {isAssigningOperator ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Assign Operator</Text>
              )}
            </TouchableOpacity>

            {(selectedAsset as any)?.currentOperator && (
              <TouchableOpacity
                style={styles.removeOperatorButton}
                onPress={handleRemoveOperator}
                activeOpacity={0.7}
              >
                <Text style={styles.removeOperatorButtonText}>Remove Current Operator</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowOperatorModal(false);
                setSelectedOperatorId('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  headerCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#a0a0a0',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#a0a0a0',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#707070',
  },
  section: {
    gap: 12,
    paddingHorizontal: 16,
  },
  pvAreaCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  pvAreaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 2,
    borderBottomColor: '#4285F4',
  },
  pvAreaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pvAreaInfo: {
    flex: 1,
  },
  pvAreaName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  pvAreaSubtext: {
    fontSize: 13,
    color: '#a0a0a0',
    marginTop: 2,
  },
  blocksContainer: {
    padding: 12,
    gap: 8,
  },
  emptyBlocksContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyBlocksText: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  blockCard: {
    backgroundColor: '#0f1419',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a2e1a',
    borderBottomWidth: 1,
    borderBottomColor: '#34A853',
  },
  blockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  blockHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockInfo: {
    flex: 1,
  },
  blockName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  blockSubtext: {
    fontSize: 12,
    color: '#a0a0a0',
    marginTop: 2,
  },
  assetCountBadge: {
    backgroundColor: '#34A853',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  assetCountText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  assetsContainer: {
    padding: 8,
    gap: 8,
  },
  emptyAssetsContainer: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyAssetsText: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  assetDetails: {
    flex: 1,
    gap: 2,
  },
  assetId: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  assetType: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#f59e0b',
  },
  assetMeta: {
    fontSize: 11,
    color: '#a0a0a0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    flex: 1,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 8,
    marginTop: 12,
  },
  pickerScroll: {
    maxHeight: 150,
    marginBottom: 12,
  },
  pickerOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#475569',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  submitButton: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyPickerState: {
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffd54f',
    marginBottom: 12,
  },
  emptyPickerText: {
    fontSize: 13,
    color: '#f57c00',
    textAlign: 'center',
  },
  currentOperatorBadge: {
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  currentOperatorLabel: {
    fontSize: 12,
    color: '#6b21a8',
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  currentOperatorName: {
    fontSize: 15,
    color: '#6b21a8',
    fontWeight: '700' as const,
  },
  removeOperatorButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeOperatorButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#dc2626',
  },
});
