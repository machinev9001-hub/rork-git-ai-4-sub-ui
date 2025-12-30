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
import { ArrowLeft, Save, Building2, CheckCircle2, XCircle } from 'lucide-react-native';
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

type EmployeeSiteLink = {
  id?: string;
  employeeId: string;
  siteId: string;
  companyId: string;
  masterAccountId: string;
  isActive: boolean;
  assignedAt: number;
  assignedBy: string;
  deactivatedAt?: number;
  deactivatedBy?: string;
};

export default function EmployeeSiteLinkingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const employeeId = params.employeeId as string;
  const employeeName = params.employeeName as string;

  const [sites, setSites] = useState<Site[]>([]);
  const [linkedSites, setLinkedSites] = useState<Map<string, EmployeeSiteLink>>(new Map());
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

      // Load existing employee-site links
      const linksRef = collection(db, 'employeeSiteLinks');
      const linksQuery = query(
        linksRef,
        where('employeeId', '==', employeeId),
        where('companyId', '==', user.currentCompanyId)
      );
      const linksSnapshot = await getDocs(linksQuery);
      const linksMap = new Map<string, EmployeeSiteLink>();
      linksSnapshot.docs.forEach(doc => {
        const link = { id: doc.id, ...doc.data() } as EmployeeSiteLink;
        linksMap.set(link.siteId, link);
      });
      setLinkedSites(linksMap);

    } catch (error) {
      console.error('[EmployeeSiteLinking] Error loading data:', error);
      Alert.alert('Error', 'Failed to load sites');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSiteLink = (siteId: string) => {
    const newLinkedSites = new Map(linkedSites);
    const existing = newLinkedSites.get(siteId);

    if (existing) {
      // Toggle active state
      newLinkedSites.set(siteId, {
        ...existing,
        isActive: !existing.isActive,
      });
    } else {
      // Create new link
      newLinkedSites.set(siteId, {
        employeeId,
        siteId,
        companyId: user!.currentCompanyId!,
        masterAccountId: user!.masterAccountId!,
        isActive: true,
        assignedAt: Date.now(),
        assignedBy: user!.userId!,
      });
    }

    setLinkedSites(newLinkedSites);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      router.back();
      return;
    }

    setIsSaving(true);

    try {
      const linksRef = collection(db, 'employeeSiteLinks');

      // Process all changes
      for (const [siteId, link] of linkedSites.entries()) {
        if (link.id) {
          // Update existing link
          const linkDoc = doc(db, 'employeeSiteLinks', link.id);
          await updateDoc(linkDoc, {
            isActive: link.isActive,
            updatedAt: serverTimestamp(),
            ...(link.isActive ? {} : {
              deactivatedAt: Date.now(),
              deactivatedBy: user!.userId,
            }),
          });
        } else {
          // Create new link
          await addDoc(linksRef, {
            ...link,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      Alert.alert('Success', 'Employee site assignments saved', [
        { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error('[EmployeeSiteLinking] Error saving:', error);
      Alert.alert('Error', 'Failed to save site assignments');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSiteCount = Array.from(linkedSites.values()).filter(link => link.isActive).length;

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
          <Text style={styles.headerTitle}>Site Assignments</Text>
          <Text style={styles.headerSubtitle}>{employeeName}</Text>
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
          <View style={styles.summaryCard}>
            <Building2 size={20} color="#3b82f6" />
            <Text style={styles.summaryText}>
              {activeSiteCount} of {sites.length} sites assigned
            </Text>
          </View>

          {sites.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateTitle}>No Sites Available</Text>
              <Text style={styles.emptyStateText}>
                Create sites for your company to assign employees
              </Text>
            </View>
          ) : (
            <View style={styles.sitesContainer}>
              {sites.map((site) => {
                const link = linkedSites.get(site.id);
                const isLinked = link?.isActive ?? false;

                return (
                  <View key={site.id} style={styles.siteCard}>
                    <View style={styles.siteInfo}>
                      <View style={styles.siteHeader}>
                        <Text style={styles.siteName}>{site.name}</Text>
                        {isLinked ? (
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
                      value={isLinked}
                      onValueChange={() => toggleSiteLink(site.id)}
                      trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                      thumbColor={isLinked ? '#fff' : '#f4f3f4'}
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
              💡 Toggle switches to assign or remove employee from sites
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
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1e40af',
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
