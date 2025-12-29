import { Stack, router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Building2, Users, Package } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Company } from '@/types';
import { Colors } from '@/constants/colors';

/**
 * Master Company Profile Screen
 * 
 * This screen manages the company-level settings that serve as the single source
 * of truth for employees, plant assets, billing, and marketplace visibility.
 * 
 * Only accessible to users with Master Company access.
 */
export default function MasterCompanyProfileScreen() {
  const { user, masterAccount } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  // Company basic info
  const [legalEntityName, setLegalEntityName] = useState('');
  const [alias, setAlias] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [adminContact, setAdminContact] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [companyRegistrationNr, setCompanyRegistrationNr] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [industrySector, setIndustrySector] = useState('');

  // Get current company ID
  const currentCompanyId = user?.currentCompanyId || masterAccount?.currentCompanyId;

  const loadCompanyProfile = useCallback(async () => {
    if (!currentCompanyId) {
      Alert.alert('Error', 'No company selected');
      router.back();
      return;
    }

    // Check if user has master access
    if (user?.role !== 'master') {
      Alert.alert('Access Denied', 'Only Master users can access Company Profile');
      router.back();
      return;
    }

    try {
      setIsFetching(true);
      const companyRef = doc(db, 'companies', currentCompanyId);
      const companyDoc = await getDoc(companyRef);
      
      if (companyDoc.exists()) {
        const data = companyDoc.data() as Company;
        
        setLegalEntityName(data.legalEntityName || '');
        setAlias(data.alias || '');
        setAddress(data.address || '');
        setContactNumber(data.contactNumber || '');
        setAdminContact(data.adminContact || '');
        setAdminEmail(data.adminEmail || '');
        setCompanyRegistrationNr(data.companyRegistrationNr || '');
        setVatNumber(data.vatNumber || '');
        setIndustrySector(data.industrySector || '');
      }
    } catch (error) {
      console.error('[MasterCompanyProfile] Error loading profile:', error);
      Alert.alert('Error', 'Failed to load company profile');
    } finally {
      setIsFetching(false);
    }
  }, [currentCompanyId, user?.role]);

  useEffect(() => {
    loadCompanyProfile();
  }, [loadCompanyProfile]);

  const handleSave = async () => {
    if (user?.role !== 'master') {
      Alert.alert('Access Denied', 'Only Master users can edit Company Profile');
      return;
    }
    
    if (!currentCompanyId) {
      Alert.alert('Error', 'No company ID found');
      return;
    }

    // Validate required fields
    if (!legalEntityName.trim() || !alias.trim()) {
      Alert.alert('Validation Error', 'Legal Entity Name and Alias are required');
      return;
    }

    setIsLoading(true);

    try {
      const companyRef = doc(db, 'companies', currentCompanyId);
      
      // Update company profile
      await setDoc(
        companyRef,
        {
          legalEntityName: legalEntityName.trim(),
          alias: alias.trim(),
          address: address.trim(),
          contactNumber: contactNumber.trim(),
          adminContact: adminContact.trim(),
          adminEmail: adminEmail.trim(),
          companyRegistrationNr: companyRegistrationNr.trim(),
          vatNumber: vatNumber.trim(),
          industrySector: industrySector.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert('Success', 'Company profile saved successfully');
      router.back();
    } catch (error) {
      console.error('[MasterCompanyProfile] Error saving profile:', error);
      Alert.alert('Error', 'Failed to save company profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Master Company Profile',
          headerStyle: { backgroundColor: Colors.headerBg },
          headerTintColor: Colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={styles.headerButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Save size={24} color={Colors.accent} />
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Building2 size={20} color={Colors.accent} />
          <Text style={styles.infoBannerText}>
            This is your Master Company Profile - the single source of truth for employees,
            assets, and company-wide settings.
          </Text>
        </View>

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Legal Entity Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={legalEntityName}
              onChangeText={setLegalEntityName}
              placeholder="Enter legal entity name"
              placeholderTextColor={Colors.textSecondary}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Alias / Trading Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={alias}
              onChangeText={setAlias}
              placeholder="Enter company alias"
              placeholderTextColor={Colors.textSecondary}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Industry Sector</Text>
            <TextInput
              style={styles.input}
              value={industrySector}
              onChangeText={setIndustrySector}
              placeholder="e.g., Construction, Solar, Engineering"
              placeholderTextColor={Colors.textSecondary}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter company address"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="Enter contact number"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Admin Contact Person</Text>
            <TextInput
              style={styles.input}
              value={adminContact}
              onChangeText={setAdminContact}
              placeholder="Enter admin contact name"
              placeholderTextColor={Colors.textSecondary}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Admin Email</Text>
            <TextInput
              style={styles.input}
              value={adminEmail}
              onChangeText={setAdminEmail}
              placeholder="Enter admin email"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Legal & Registration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Registration</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Registration Number</Text>
            <TextInput
              style={styles.input}
              value={companyRegistrationNr}
              onChangeText={setCompanyRegistrationNr}
              placeholder="Enter registration number"
              placeholderTextColor={Colors.textSecondary}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>VAT Number</Text>
            <TextInput
              style={styles.input}
              value={vatNumber}
              onChangeText={setVatNumber}
              placeholder="Enter VAT number"
              placeholderTextColor={Colors.textSecondary}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Quick Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          
          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push('/master-staff-manager' as any)}
          >
            <Users size={24} color={Colors.accent} />
            <View style={styles.quickLinkContent}>
              <Text style={styles.quickLinkTitle}>Employee Management</Text>
              <Text style={styles.quickLinkDescription}>
                Manage company employees and site assignments
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickLinkCard}
            onPress={() => router.push('/master-plant-manager' as any)}
          >
            <Package size={24} color={Colors.accent} />
            <View style={styles.quickLinkContent}>
              <Text style={styles.quickLinkTitle}>Asset Management</Text>
              <Text style={styles.quickLinkDescription}>
                Manage company assets and site allocations
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
  },
  headerContent: {
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accountBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 24,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionContent: {
    flex: 1,
    gap: 2,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  quickActionDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
    gap: 4,
  },
  menuItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  menuItemLabelLocked: {
    color: '#94a3b8',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  vasBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  vasBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#ca8a04',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickLinkCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickLinkContent: {
    flex: 1,
  },
  quickLinkTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  quickLinkDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
