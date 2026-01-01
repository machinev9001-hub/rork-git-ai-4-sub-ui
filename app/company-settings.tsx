import { Stack, router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { ArrowLeft, Save, Building2, Plus, Trash2, ChevronDown, ChevronUp, Package, Users, ChevronRight, MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export default function CompanySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [legalEntityName, setLegalEntityName] = useState('');
  const [alias, setAlias] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [adminContact, setAdminContact] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [companyRegistrationNr, setCompanyRegistrationNr] = useState('');
  const [vatNr, setVatNr] = useState('');
  const [plantTypes, setPlantTypes] = useState<string[]>([]);
  const [newPlantType, setNewPlantType] = useState('');
  const [showPlantTypesSection, setShowPlantTypesSection] = useState(false);
  const [showPlantAvailabilitySection, setShowPlantAvailabilitySection] = useState(false);
  const [plantAvailabilityProvince, setPlantAvailabilityProvince] = useState('');
  const [plantAvailabilityRadiusKm, setPlantAvailabilityRadiusKm] = useState('');
  const [plantAvailabilityGeoType, setPlantAvailabilityGeoType] = useState<'province' | 'radius' | ''>('');

  const loadCompanySettings = useCallback(async () => {
    const companyId = user?.currentCompanyId;
    if (!companyId) {
      console.log('[CompanySettings] No currentCompanyId found');
      setIsFetching(false);
      return;
    }

    try {
      setIsFetching(true);
      console.log('[CompanySettings] Loading settings for companyId:', companyId);
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);
      
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        console.log('[CompanySettings] Company data loaded:', data.alias);
        
        setLegalEntityName(data.legalEntityName || '');
        setAlias(data.alias || '');
        setAddress(data.address || '');
        setContact(data.contactNumber || '');
        setAdminContact(data.adminContact || '');
        setAdminEmail(data.adminEmail || '');
        setCompanyRegistrationNr(data.companyRegistrationNr || '');
        setVatNr(data.vatNumber || '');
        setPlantTypes(data.plantTypes || []);
        setPlantAvailabilityProvince(data.plantAvailabilityProvince || '');
        setPlantAvailabilityRadiusKm(data.plantAvailabilityRadiusKm?.toString() || '');
        setPlantAvailabilityGeoType(data.plantAvailabilityGeoType || '');
      } else {
        console.log('[CompanySettings] Company document not found');
        Alert.alert('Error', 'Company not found');
      }
      console.log('[CompanySettings] Settings loaded successfully');
    } catch (error) {
      console.error('[CompanySettings] Error loading settings:', error);
      Alert.alert('Error', 'Failed to load company settings');
    } finally {
      setIsFetching(false);
    }
  }, [user?.currentCompanyId]);

  useEffect(() => {
    if (user?.role !== 'master') {
      console.log('[CompanySettings] Access denied for role:', user?.role);
      Alert.alert('Access Denied', 'Only Master accounts can access Company Settings');
      router.back();
      return;
    }
    loadCompanySettings();
  }, [loadCompanySettings, user?.role]);

  const handleSave = async () => {
    if (user?.role !== 'master') {
      Alert.alert('Access Denied', 'Only Master accounts can edit Company Settings');
      return;
    }
    
    const companyId = user?.currentCompanyId;
    if (!companyId) {
      Alert.alert('Error', 'No company selected');
      return;
    }

    setIsLoading(true);

    try {
      console.log('[CompanySettings] Saving settings for companyId:', companyId);
      
      const companyRef = doc(db, 'companies', companyId);
      const updateData: any = {
        legalEntityName: legalEntityName.trim(),
        alias: alias.trim(),
        address: address.trim(),
        contactNumber: contact.trim(),
        adminContact: adminContact.trim(),
        adminEmail: adminEmail.trim(),
        companyRegistrationNr: companyRegistrationNr.trim(),
        vatNumber: vatNr.trim(),
        plantTypes,
        updatedAt: new Date(),
      };

      if (plantAvailabilityGeoType) {
        updateData.plantAvailabilityGeoType = plantAvailabilityGeoType;
        if (plantAvailabilityGeoType === 'province') {
          updateData.plantAvailabilityProvince = plantAvailabilityProvince;
          updateData.plantAvailabilityRadiusKm = null;
        } else if (plantAvailabilityGeoType === 'radius') {
          updateData.plantAvailabilityRadiusKm = parseFloat(plantAvailabilityRadiusKm) || null;
          updateData.plantAvailabilityProvince = null;
        }
      } else {
        updateData.plantAvailabilityGeoType = null;
        updateData.plantAvailabilityProvince = null;
        updateData.plantAvailabilityRadiusKm = null;
      }

      await setDoc(companyRef, updateData, { merge: true });

      console.log('[CompanySettings] Settings saved successfully');
      Alert.alert('Success', 'Company settings saved successfully');
      router.back();
    } catch (error) {
      console.error('[CompanySettings] Error saving settings:', error);
      Alert.alert('Error', 'Failed to save company settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isLoading}
        >
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Building2 size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>Company Settings</Text>
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Save size={24} color="#3b82f6" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Legal Entity Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter legal entity name"
                value={legalEntityName}
                onChangeText={setLegalEntityName}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alias</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter company alias"
                value={alias}
                onChangeText={setAlias}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter company address"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter contact number"
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter admin contact number"
                value={adminContact}
                onChangeText={setAdminContact}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter admin email"
                value={adminEmail}
                onChangeText={setAdminEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Company Registration Nr</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter registration number"
                value={companyRegistrationNr}
                onChangeText={setCompanyRegistrationNr}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>VAT Nr</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter VAT number"
                value={vatNr}
                onChangeText={setVatNr}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={styles.expandableCard}
              onPress={() => setShowPlantTypesSection(!showPlantTypesSection)}
              activeOpacity={0.7}
            >
              <View style={styles.expandableHeader}>
                <View style={styles.expandableTitleWithBadge}>
                  <Package size={20} color="#3b82f6" />
                  <Text style={styles.expandableTitle}>Plant Types</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plantTypes.length}</Text>
                  </View>
                </View>
                {showPlantTypesSection ? (
                  <ChevronUp size={24} color="#64748b" />
                ) : (
                  <ChevronDown size={24} color="#64748b" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navigationCard}
              onPress={() => router.push('/master-subcontractors' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.navigationCardContent}>
                <View style={styles.navigationIconContainer}>
                  <Users size={20} color="#3b82f6" />
                </View>
                <View style={styles.navigationTextContainer}>
                  <Text style={styles.navigationTitle}>Subcontractors</Text>
                  <Text style={styles.navigationSubtitle}>Manage subcontractor companies and relationships</Text>
                </View>
              </View>
              <ChevronRight size={24} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.expandableCard}
              onPress={() => setShowPlantAvailabilitySection(!showPlantAvailabilitySection)}
              activeOpacity={0.7}
            >
              <View style={styles.expandableHeader}>
                <View style={styles.expandableTitleWithBadge}>
                  <MapPin size={20} color="#10B981" />
                  <Text style={styles.expandableTitle}>Plant Asset Geographic Availability</Text>
                </View>
                {showPlantAvailabilitySection ? (
                  <ChevronUp size={24} color="#64748b" />
                ) : (
                  <ChevronDown size={24} color="#64748b" />
                )}
              </View>
            </TouchableOpacity>

            {showPlantAvailabilitySection && (
              <View style={styles.plantTypesSection}>
                <Text style={styles.sectionDescription}>
                  Configure where your plant assets are available for hire in the marketplace. This helps enterprise clients find assets available in their region.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Geographic Filter Type</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setPlantAvailabilityGeoType('province')}
                      disabled={isLoading}
                    >
                      <View style={[styles.radio, plantAvailabilityGeoType === 'province' && styles.radioSelected]}>
                        {plantAvailabilityGeoType === 'province' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>Province/County</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setPlantAvailabilityGeoType('radius')}
                      disabled={isLoading}
                    >
                      <View style={[styles.radio, plantAvailabilityGeoType === 'radius' && styles.radioSelected]}>
                        {plantAvailabilityGeoType === 'radius' && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>Radius from Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setPlantAvailabilityGeoType('')}
                      disabled={isLoading}
                    >
                      <View style={[styles.radio, !plantAvailabilityGeoType && styles.radioSelected]}>
                        {!plantAvailabilityGeoType && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioLabel}>No Filter (Nationwide)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {plantAvailabilityGeoType === 'province' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Province/County</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter province or county name"
                      value={plantAvailabilityProvince}
                      onChangeText={setPlantAvailabilityProvince}
                      editable={!isLoading}
                    />
                    <Text style={styles.helpText}>
                      Enter the province/county where your assets are available
                    </Text>
                  </View>
                )}

                {plantAvailabilityGeoType === 'radius' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Radius (in kilometers)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 400"
                      value={plantAvailabilityRadiusKm}
                      onChangeText={setPlantAvailabilityRadiusKm}
                      keyboardType="numeric"
                      editable={!isLoading}
                    />
                    <Text style={styles.helpText}>
                      Assets will be available within this radius from your company address
                    </Text>
                  </View>
                )}
              </View>
            )}

            {showPlantTypesSection && (
              <View style={styles.plantTypesSection}>
                <Text style={styles.sectionDescription}>
                  Define plant asset types that can be used throughout the project. These types will appear in dropdowns when adding or managing plant assets.
                </Text>

                <View style={styles.addPlantTypeSection}>
                  <TextInput
                    style={styles.plantTypeInput}
                    placeholder="Enter plant type (e.g., Excavator)"
                    value={newPlantType}
                    onChangeText={setNewPlantType}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={[styles.addPlantTypeButton, !newPlantType.trim() && styles.addPlantTypeButtonDisabled]}
                    onPress={() => {
                      const trimmedType = newPlantType.trim();
                      if (trimmedType && !plantTypes.includes(trimmedType)) {
                        setPlantTypes([...plantTypes, trimmedType]);
                        setNewPlantType('');
                      } else if (plantTypes.includes(trimmedType)) {
                        Alert.alert('Duplicate Type', 'This plant type already exists');
                      }
                    }}
                    disabled={!newPlantType.trim() || isLoading}
                  >
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addPlantTypeButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {plantTypes.length === 0 ? (
                  <View style={styles.emptyPlantTypes}>
                    <Package size={32} color="#cbd5e1" />
                    <Text style={styles.emptyPlantTypesText}>No plant types defined yet</Text>
                    <Text style={styles.emptyPlantTypesHint}>Add plant types to use when creating assets</Text>
                  </View>
                ) : (
                  <View style={styles.plantTypesList}>
                    {plantTypes.map((plantType, index) => (
                      <View key={index} style={styles.plantTypeItem}>
                        <View style={styles.plantTypeIcon}>
                          <Package size={16} color="#64748b" />
                        </View>
                        <Text style={styles.plantTypeText}>{plantType}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Delete Plant Type',
                              `Remove "${plantType}" from the list?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => {
                                    setPlantTypes(plantTypes.filter((_, i) => i !== index));
                                  },
                                },
                              ]
                            );
                          }}
                          style={styles.deletePlantTypeButton}
                          disabled={isLoading}
                        >
                          <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  saveButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#475569',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  expandableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandableTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandableTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  badge: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  plantTypesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
    marginTop: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  addPlantTypeSection: {
    flexDirection: 'row',
    gap: 12,
  },
  plantTypeInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addPlantTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addPlantTypeButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  addPlantTypeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyPlantTypes: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed' as const,
  },
  emptyPlantTypesText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#64748b',
  },
  emptyPlantTypesHint: {
    fontSize: 13,
    color: '#94a3b8',
  },
  plantTypesList: {
    gap: 8,
  },
  plantTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  plantTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantTypeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1e293b',
  },
  deletePlantTypeButton: {
    padding: 4,
  },
  navigationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  navigationCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navigationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationTextContainer: {
    flex: 1,
    gap: 2,
  },
  navigationTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  navigationSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#3b82f6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    fontSize: 15,
    color: '#1e293b',
  },
  helpText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 4,
    marginTop: 4,
  },
});
