import { Stack } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, getRoleAccentColor } from '@/constants/colors';
import { User as UserIcon, Edit2, Save, X, Building2 } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Company = {
  id: string;
  alias: string;
  legalEntityName: string;
};

export default function AccountInfoScreen() {
  const { user } = useAuth();
  const roleAccentColor = getRoleAccentColor(user?.role);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const loadCompanies = useCallback(async () => {
    if (!user?.companyIds || user.companyIds.length === 0) return;
    
    setIsLoadingCompanies(true);
    try {
      const loadedCompanies: Company[] = [];
      
      for (const companyId of user.companyIds) {
        try {
          const companyRef = doc(db, 'companies', companyId);
          const companyDoc = await getDoc(companyRef);
          
          if (companyDoc.exists()) {
            const data = companyDoc.data();
            loadedCompanies.push({
              id: companyDoc.id,
              alias: data.alias || 'Unknown Company',
              legalEntityName: data.legalEntityName || '',
            });
          }
        } catch (error) {
          console.warn('[AccountInfo] Failed to load company:', companyId, error);
        }
      }
      
      setCompanies(loadedCompanies);
    } catch (error) {
      console.error('[AccountInfo] Error loading companies:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [user?.companyIds]);

  useEffect(() => {
    if (user?.companyIds && user.companyIds.length > 0) {
      loadCompanies();
    }
  }, [user?.companyIds, loadCompanies]);

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    setIsSaving(true);

    try {
      if (user.role === 'master' && user.masterAccountId) {
        const masterRef = doc(db, 'masterAccounts', user.masterAccountId);
        await updateDoc(masterRef, {
          name: editedName.trim(),
        });
        console.log('[AccountInfo] Master account name updated');
      }
      
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          name: editedName.trim(),
        });
        console.log('[AccountInfo] User document name updated');
      } else {
        const employeeRef = doc(db, 'employees', user.id);
        const employeeDoc = await getDoc(employeeRef);
        
        if (employeeDoc.exists()) {
          await updateDoc(employeeRef, {
            name: editedName.trim(),
          });
          console.log('[AccountInfo] Employee document name updated');
        }
      }

      const updatedUser = { ...user, name: editedName.trim() };
      await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('@user_last_known', JSON.stringify(updatedUser));

      setIsEditingName(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error) {
      console.error('[AccountInfo] Error saving name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(user?.name || '');
    setIsEditingName(false);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Account Information',
          headerStyle: {
            backgroundColor: Colors.headerBg,
          },
          headerTintColor: Colors.text,
          headerTitleAlign: 'left',
        }}
      />
      <View style={[styles.headerBorder, { backgroundColor: roleAccentColor }]} />
      
      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.profileIconContainer}>
            <UserIcon size={56} color={roleAccentColor} />
          </View>
          <Text style={styles.profileName}>{user?.name || 'Unknown User'}</Text>
          <Text style={[styles.profileRole, { color: roleAccentColor }]}>
            {user?.role || 'No Role'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Details</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              {isEditingName ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.editInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Enter name"
                    editable={!isSaving}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.editActionButton}
                    onPress={handleSaveName}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={Colors.accent} />
                    ) : (
                      <Save size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editActionButton}
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.valueWithEdit}>
                  <Text style={styles.value}>{user?.name || 'N/A'}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditingName(true)}
                  >
                    <Edit2 size={16} color={Colors.accent} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>User ID</Text>
              <Text style={styles.value}>{user?.userId || 'N/A'}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.row}>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.value}>{user?.role || 'N/A'}</Text>
            </View>
            
            {user?.employeeIdNumber && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.label}>Employee ID Number</Text>
                  <Text style={styles.value}>{user.employeeIdNumber}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {(user?.siteName || user?.siteId) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Site Information</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Site</Text>
                <Text style={styles.value}>{user.siteName || 'N/A'}</Text>
              </View>
              
              {user.siteId && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.label}>Site ID</Text>
                    <Text style={styles.value}>{user.siteId}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {((user?.companyIds && user.companyIds.length > 0) || user?.currentCompanyId) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            
            {user.currentCompanyId && (
              <View style={[styles.card, styles.currentCompanyCard]}>
                <View style={styles.currentCompanyHeader}>
                  <Text style={styles.currentCompanyLabel}>Current Company</Text>
                  <View style={styles.currentCompanyBadge}>
                    <Text style={styles.currentCompanyBadgeText}>Active</Text>
                  </View>
                </View>
                <Text style={styles.currentCompanyName}>{user.companyName || 'Unknown'}</Text>
                {user.companyContactMobile && (
                  <Text style={styles.currentCompanyContact}>{user.companyContactMobile}</Text>
                )}
              </View>
            )}

            {user.companyIds && user.companyIds.length > 0 && (
              <View style={styles.card}>
                <View style={styles.allCompaniesHeader}>
                  <Building2 size={18} color={Colors.textSecondary} />
                  <Text style={styles.allCompaniesTitle}>All Linked Companies</Text>
                  <View style={styles.companyCountBadge}>
                    <Text style={styles.companyCountText}>{user.companyIds.length}</Text>
                  </View>
                </View>
                
                {isLoadingCompanies ? (
                  <View style={styles.loadingCompanies}>
                    <ActivityIndicator size="small" color={Colors.accent} />
                    <Text style={styles.loadingCompaniesText}>Loading companies...</Text>
                  </View>
                ) : companies.length > 0 ? (
                  <View style={styles.companiesList}>
                    {companies.map((company, index) => (
                      <View key={company.id}>
                        {index > 0 && <View style={styles.divider} />}
                        <View style={styles.companyItem}>
                          <View style={styles.companyItemIcon}>
                            <Building2 size={16} color={roleAccentColor} />
                          </View>
                          <View style={styles.companyItemInfo}>
                            <Text style={styles.companyItemName}>{company.alias}</Text>
                            {company.legalEntityName && company.legalEntityName !== company.alias && (
                              <Text style={styles.companyItemLegal}>{company.legalEntityName}</Text>
                            )}
                          </View>
                          {company.id === user.currentCompanyId && (
                            <View style={styles.activeIndicator}>
                              <Text style={styles.activeIndicatorText}>Active</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noCompaniesText}>Unable to load company details</Text>
                )}
              </View>
            )}
          </View>
        )}

        {(user?.supervisorName || user?.supervisorMobile) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supervisor</Text>
            <View style={styles.card}>
              {user.supervisorName && (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>Supervisor Name</Text>
                    <Text style={styles.value}>{user.supervisorName}</Text>
                  </View>
                </>
              )}
              
              {user.supervisorMobile && (
                <>
                  {user.supervisorName && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <Text style={styles.label}>Supervisor Mobile</Text>
                    <Text style={styles.value}>{user.supervisorMobile}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBorder: {
    height: 2,
    width: '100%',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  profileRole: {
    fontSize: 16,
    fontWeight: '500' as const,
    textTransform: 'capitalize',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 15,
    color: Colors.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  valueWithEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentCompanyCard: {
    marginBottom: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  currentCompanyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  currentCompanyLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentCompanyBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentCompanyBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  currentCompanyName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 4,
  },
  currentCompanyContact: {
    fontSize: 14,
    color: '#64748b',
  },
  allCompaniesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  allCompaniesTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  companyCountBadge: {
    backgroundColor: Colors.accent,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyCountText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
  },
  loadingCompanies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  loadingCompaniesText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  companiesList: {
    gap: 0,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  companyItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyItemInfo: {
    flex: 1,
    gap: 2,
  },
  companyItemName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  companyItemLegal: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  activeIndicator: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeIndicatorText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  noCompaniesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
