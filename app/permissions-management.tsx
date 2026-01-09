import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Shield, ChevronRight, Info } from 'lucide-react-native';
import type { UserTypeForPermissions } from '@/types';

const USER_TYPES: { type: UserTypeForPermissions; label: string; description: string }[] = [
  { type: 'Master', label: 'Master', description: 'Full system access' },
  { type: 'Planner', label: 'Planner', description: 'Project planning and coordination' },
  { type: 'HR', label: 'HR', description: 'Human resources management' },
  { type: 'HSE', label: 'HSE', description: 'Health, safety, and environment' },
  { type: 'Plant Manager', label: 'Plant Manager', description: 'Equipment and asset management' },
  { type: 'Supervisor', label: 'Supervisor', description: 'Site supervision and oversight' },
  { type: 'Employee', label: 'Employee', description: 'Standard employee access' },
  { type: 'Operator', label: 'Operator', description: 'Equipment operators' },
  { type: 'Staff Manager', label: 'Staff Manager', description: 'Staff allocation and management' },
  { type: 'Logistics Manager', label: 'Logistics Manager', description: 'Logistics coordination' },
  { type: 'QC', label: 'QC', description: 'Quality control' },
  { type: 'Surveyor', label: 'Surveyor', description: 'Site surveying' },
  { type: 'Accounts', label: 'Accounts', description: 'Financial management' },
  { type: 'Admin', label: 'Admin', description: 'Administrative functions' },
];

export default function PermissionsManagementScreen() {
  const { user } = useAuth();
  const { permissions, isLoading, updatePermissions } = usePermissions();
  const [selectedUserType, setSelectedUserType] = useState<UserTypeForPermissions | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (user?.role !== 'master') {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Permissions',
            headerStyle: { backgroundColor: '#1A73E8' },
            headerTintColor: '#FFF',
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubtext}>Only Master accounts can manage permissions</Text>
        </View>
      </View>
    );
  }

  const handleTogglePermission = async (
    userType: UserTypeForPermissions,
    permission: 'face_enrolment' | 'face_removal' | 'face_update'
  ) => {
    const currentValue = permissions[userType][permission];
    setIsSaving(true);

    try {
      const result = await updatePermissions(userType, {
        [permission]: !currentValue,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update permission');
      }
    } catch (error) {
      console.error('[Permissions] Error updating permission:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Permissions',
            headerStyle: { backgroundColor: '#1A73E8' },
            headerTintColor: '#FFF',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A73E8" />
          <Text style={styles.loadingText}>Loading permissions...</Text>
        </View>
      </View>
    );
  }

  if (selectedUserType) {
    const userTypeData = USER_TYPES.find(ut => ut.type === selectedUserType);
    const userTypePermissions = permissions[selectedUserType];

    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: userTypeData?.label || 'Permissions',
            headerStyle: { backgroundColor: '#1A73E8' },
            headerTintColor: '#FFF',
          }}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <Info size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Configure permissions for {userTypeData?.label} users. Changes apply immediately to all users with this role.
            </Text>
          </View>

          <View style={styles.permissionsCard}>
            <Text style={styles.cardTitle}>Face Recognition Permissions</Text>

            <View style={styles.permissionRow}>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionLabel}>Face Enrolment</Text>
                <Text style={styles.permissionDescription}>
                  Can enroll new employee faces into the system
                </Text>
              </View>
              <Switch
                value={userTypePermissions.face_enrolment}
                onValueChange={() => handleTogglePermission(selectedUserType, 'face_enrolment')}
                disabled={isSaving}
                trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
                thumbColor={userTypePermissions.face_enrolment ? '#1A73E8' : '#F3F4F6'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionRow}>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionLabel}>Face Update</Text>
                <Text style={styles.permissionDescription}>
                  Can update existing face enrollments
                </Text>
              </View>
              <Switch
                value={userTypePermissions.face_update}
                onValueChange={() => handleTogglePermission(selectedUserType, 'face_update')}
                disabled={isSaving}
                trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
                thumbColor={userTypePermissions.face_update ? '#1A73E8' : '#F3F4F6'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionRow}>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionLabel}>Face Removal</Text>
                <Text style={styles.permissionDescription}>
                  Can disable or remove face enrollments
                </Text>
              </View>
              <Switch
                value={userTypePermissions.face_removal}
                onValueChange={() => handleTogglePermission(selectedUserType, 'face_removal')}
                disabled={isSaving}
                trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
                thumbColor={userTypePermissions.face_removal ? '#1A73E8' : '#F3F4F6'}
              />
            </View>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Important Notes</Text>
            <Text style={styles.noteText}>
              • Face scanning for clock-in/out is available to ALL users regardless of these permissions{'\n'}
              • These permissions only control who can enroll, update, or remove faces{'\n'}
              • Offline face scanning works automatically for enrolled users{'\n'}
              • Changes are synced across all devices in real-time
            </Text>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedUserType(null)}
          >
            <Text style={styles.backButtonText}>Back to User Types</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Permissions',
          headerStyle: { backgroundColor: '#1A73E8' },
          headerTintColor: '#FFF',
        }}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Shield size={48} color="#1A73E8" />
          </View>
          <Text style={styles.title}>User Permissions</Text>
          <Text style={styles.subtitle}>
            Configure permissions for each user type
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Info size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            Select a user type to configure their permissions. Face scanning is always available to all users.
          </Text>
        </View>

        <View style={styles.userTypesCard}>
          <Text style={styles.cardTitle}>User Types</Text>
          {USER_TYPES.map((userType) => (
            <TouchableOpacity
              key={userType.type}
              style={styles.userTypeRow}
              onPress={() => setSelectedUserType(userType.type)}
            >
              <View style={styles.userTypeInfo}>
                <Text style={styles.userTypeLabel}>{userType.label}</Text>
                <Text style={styles.userTypeDescription}>{userType.description}</Text>
                <View style={styles.permissionsSummary}>
                  {permissions[userType.type].face_enrolment && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Enrol</Text>
                    </View>
                  )}
                  {permissions[userType.type].face_update && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Update</Text>
                    </View>
                  )}
                  {permissions[userType.type].face_removal && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Remove</Text>
                    </View>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#DC2626',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  userTypesCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 16,
  },
  userTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userTypeInfo: {
    flex: 1,
  },
  userTypeLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 4,
  },
  userTypeDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  permissionsSummary: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#1E40AF',
  },
  permissionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  permissionInfo: {
    flex: 1,
    marginRight: 16,
  },
  permissionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  noteCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#E5E7EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#374151',
  },
});
