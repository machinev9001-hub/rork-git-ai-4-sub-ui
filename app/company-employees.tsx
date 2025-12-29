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
import { ArrowLeft, Plus, UserCircle, Search, Building2, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Employee, AccessScope } from '@/types';

export default function CompanyEmployeesScreen() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadEmployees = useCallback(async () => {
    if (!user?.currentCompanyId) {
      console.log('[CompanyEmployees] No company selected');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      console.log('[CompanyEmployees] Loading employees for company:', user.currentCompanyId);

      const employeesRef = collection(db, 'employees');
      const employeesQuery = query(
        employeesRef,
        where('companyId', '==', user.currentCompanyId)
      );

      const employeesSnapshot = await getDocs(employeesQuery);
      const loadedEmployees: Employee[] = [];

      employeesSnapshot.forEach((doc) => {
        const data = doc.data();
        loadedEmployees.push({
          id: doc.id,
          name: data.name,
          role: data.role,
          contact: data.contact,
          email: data.email,
          employeeIdNumber: data.employeeIdNumber,
          citizenshipCountry: data.citizenshipCountry,
          companyId: data.companyId,
          masterAccountId: data.masterAccountId,
          siteId: data.siteId,
          type: data.type,
          employerName: data.employerName,
          employerId: data.employerId,
          employerType: data.employerType,
          accessScope: data.accessScope as AccessScope,
          canAccessMasterCompanyProfile: data.canAccessMasterCompanyProfile,
          inductionStatus: data.inductionStatus || false,
          inductionDate: data.inductionDate,
          inductionNotes: data.inductionNotes,
          attachments: data.attachments || [],
          medicalExpiryDate: data.medicalExpiryDate,
          licenseExpiryDate: data.licenseExpiryDate,
          competencyExpiryDate: data.competencyExpiryDate,
          pdpExpiryDate: data.pdpExpiryDate,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      console.log('[CompanyEmployees] Loaded', loadedEmployees.length, 'employees');
      setEmployees(loadedEmployees);
    } catch (error) {
      console.error('[CompanyEmployees] Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, [user?.currentCompanyId]);

  useFocusEffect(
    useCallback(() => {
      loadEmployees();
    }, [loadEmployees])
  );

  const handleAddEmployee = () => {
    router.push('/add-employee');
  };

  const handleEmployeePress = (employee: Employee) => {
    router.push({
      pathname: '/onboarding-employee-detail',
      params: { employeeId: employee.id },
    });
  };

  const handleManageSites = (employee: Employee) => {
    router.push({
      pathname: '/employee-site-linking',
      params: {
        employeeId: employee.id,
        employeeName: employee.name,
      },
    });
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeIdNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderAccessScope = (scope?: AccessScope) => {
    const scopeLabels: Record<AccessScope, string> = {
      'company-level': 'Company',
      'all-sites': 'All Sites',
      'selected-sites': 'Selected Sites',
      'no-sites': 'No Sites',
    };
    return scopeLabels[scope || 'no-sites'];
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <View style={styles.employeeCardContainer}>
      <TouchableOpacity
        style={styles.employeeCard}
        onPress={() => handleEmployeePress(item)}
      >
        <View style={styles.employeeIcon}>
          <UserCircle size={40} color="#3b82f6" />
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeRole}>{item.role}</Text>
          <View style={styles.employeeMetaRow}>
            {item.employeeIdNumber && (
              <Text style={styles.employeeMeta}>ID: {item.employeeIdNumber}</Text>
            )}
            {item.accessScope && (
              <>
                <Text style={styles.employeeMetaDivider}>•</Text>
                <Text style={styles.employeeMeta}>{renderAccessScope(item.accessScope)}</Text>
              </>
            )}
          </View>
        </View>
        <ChevronRight size={20} color="#94a3b8" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.manageSitesButton}
        onPress={() => handleManageSites(item)}
      >
        <Building2 size={16} color="#3b82f6" />
        <Text style={styles.manageSitesText}>Manage Sites</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Company Employees',
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
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Company Employees',
          headerStyle: { backgroundColor: '#1e3a8a' },
          headerTintColor: '#fff',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleAddEmployee} style={styles.headerButton}>
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
            placeholder="Search employees..."
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

        {/* Employee List */}
        {filteredEmployees.length === 0 ? (
          <View style={styles.emptyState}>
            <UserCircle size={64} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No employees found' : 'No employees yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first company-level employee'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.addButton} onPress={handleAddEmployee}>
                <Plus size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Employee</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id || ''}
            renderItem={renderEmployee}
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
  employeeCard: {
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
  employeeIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
    gap: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  employeeRole: {
    fontSize: 14,
    color: '#64748b',
  },
  employeeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  employeeMetaDivider: {
    fontSize: 12,
    color: '#cbd5e1',
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
  employeeCardContainer: {
    gap: 8,
  },
  manageSitesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  manageSitesText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#3b82f6',
  },
});
