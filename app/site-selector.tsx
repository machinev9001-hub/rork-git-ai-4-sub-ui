import { Stack, router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Site } from '@/contexts/AuthContext';
import { Colors } from '@/constants/colors';
import { isManagementRole, isOperatorRole, isDieselClerkRole } from '@/utils/roles';

export default function SiteSelectorScreen() {
  const { user, masterAccount, openSite } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadInProgress = useRef(false);
  const hasLoadedOnce = useRef(false);

  const currentCompanyId = user?.currentCompanyId || masterAccount?.currentCompanyId;

  const handleSelectSite = useCallback(async (site: Site) => {
    console.log('[SiteSelector] Site selected:', site.name);
    
    if (!openSite) {
      console.error('[SiteSelector] openSite function not available');
      return;
    }

    const result = await openSite(site.id, site.name, site.companyId);
    
    if (result.success) {
      console.log('[SiteSelector] Site selected successfully');
      console.log('[SiteSelector] User role:', user?.role);
      
      if (user) {
        const isManagement = isManagementRole(user.role);
        const isOperator = isOperatorRole(user.role);
        const isDieselClerk = isDieselClerkRole(user.role);
        const destination = isManagement ? '/(tabs)' : isOperator ? '/operator-home' : isDieselClerk ? '/diesel-clerk-home' : '/employee-timesheet';
        
        console.log('[SiteSelector] Navigating to:', destination);
        router.replace(destination as any);
      } else {
        router.replace('/(tabs)');
      }
    } else {
      console.error('[SiteSelector] Failed to select site:', result.error);
    }
  }, [openSite, user]);

  const loadSites = useCallback(async () => {
    if (loadInProgress.current) {
      console.log('[SiteSelector] Load already in progress, skipping');
      return;
    }

    if (!currentCompanyId) {
      console.log('[SiteSelector] No company selected');
      router.replace('/(tabs)');
      return;
    }

    loadInProgress.current = true;
    setIsLoading(true);
    
    try {
      console.log('[SiteSelector] Loading sites for company:', currentCompanyId);
      
      const sitesRef = collection(db, 'sites');
      const sitesQuery = query(
        sitesRef,
        where('companyId', '==', currentCompanyId),
        where('status', '==', 'Active')
      );
      const sitesSnapshot = await getDocs(sitesQuery);
      
      const loadedSites: Site[] = [];
      sitesSnapshot.forEach((doc) => {
        const data = doc.data();
        loadedSites.push({
          id: doc.id,
          name: data.name,
          companyId: data.companyId,
          masterAccountId: data.masterAccountId,
          description: data.description,
          location: data.location,
          status: data.status || 'Active',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      console.log('[SiteSelector] Loaded', loadedSites.length, 'sites');
      
      if (loadedSites.length === 0 && !hasLoadedOnce.current) {
        console.log('[SiteSelector] No sites found, navigating to home');
        hasLoadedOnce.current = true;
        router.replace('/(tabs)');
        return;
      }

      setSites(loadedSites);
      setIsLoading(false);
      hasLoadedOnce.current = true;
      loadInProgress.current = false;
    } catch (error) {
      console.error('[SiteSelector] Error loading sites:', error);
      setSites([]);
      setIsLoading(false);
      hasLoadedOnce.current = true;
      loadInProgress.current = false;
      
      router.replace('/(tabs)');
    }
  }, [currentCompanyId]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce.current) {
        loadSites();
      }
    }, [loadSites])
  );

  const handleSkip = () => {
    console.log('[SiteSelector] Skipping site selection');
    
    if (user) {
      const isManagement = isManagementRole(user.role);
      const isOperator = isOperatorRole(user.role);
      const isDieselClerk = isDieselClerkRole(user.role);
      const destination = isManagement ? '/(tabs)' : isOperator ? '/operator-home' : isDieselClerk ? '/diesel-clerk-home' : '/employee-timesheet';
      
      router.replace(destination as any);
    } else {
      router.replace('/(tabs)');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading sites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mainContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <MapPin size={48} color={Colors.accent} strokeWidth={2} />
            <Text style={styles.title}>Select Site</Text>
            <Text style={styles.subtitle}>
              Choose which site you want to access
            </Text>
          </View>

          {sites.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No active sites found for this company
              </Text>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
              >
                <Text style={styles.skipButtonText}>Continue to Home</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={sites}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.siteCard}
                    onPress={() => handleSelectSite(item)}
                  >
                    <View style={styles.siteIcon}>
                      <MapPin size={24} color={Colors.accent} />
                    </View>
                    <View style={styles.siteInfo}>
                      <Text style={styles.siteName}>{item.name}</Text>
                      {item.location && (
                        <Text style={styles.siteLocation}>{item.location}</Text>
                      )}
                      {item.description && (
                        <Text style={styles.siteDescription} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />

              <View style={styles.skipContainer}>
                <TouchableOpacity
                  style={styles.skipLink}
                  onPress={handleSkip}
                >
                  <Text style={styles.skipLinkText}>Continue without selecting site</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainContent: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  listContent: {
    gap: 12,
    paddingBottom: 80,
  },
  siteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  siteIcon: {
    width: 48,
    height: 48,
    backgroundColor: Colors.cardBg,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  siteInfo: {
    flex: 1,
    gap: 4,
  },
  siteName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  siteLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  siteDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  skipContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 24,
  },
  skipLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipLinkText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});
