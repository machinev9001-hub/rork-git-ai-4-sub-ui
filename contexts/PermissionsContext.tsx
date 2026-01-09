import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { UserTypeForPermissions, UserTypePermissions } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const PERMISSIONS_STORAGE_KEY = '@permissions_cache';

const DEFAULT_PERMISSIONS: Record<UserTypeForPermissions, UserTypePermissions['permissions']> = {
  'Master': { face_enrolment: true, face_removal: true, face_update: true },
  'Planner': { face_enrolment: false, face_removal: false, face_update: false },
  'HR': { face_enrolment: true, face_removal: true, face_update: true },
  'HSE': { face_enrolment: true, face_removal: true, face_update: true },
  'Plant Manager': { face_enrolment: true, face_removal: true, face_update: true },
  'Supervisor': { face_enrolment: true, face_removal: true, face_update: true },
  'Employee': { face_enrolment: false, face_removal: false, face_update: false },
  'Operator': { face_enrolment: false, face_removal: false, face_update: false },
  'Staff Manager': { face_enrolment: false, face_removal: false, face_update: false },
  'Logistics Manager': { face_enrolment: false, face_removal: false, face_update: false },
  'Onboarding & Inductions': { face_enrolment: false, face_removal: false, face_update: false },
  'General Worker': { face_enrolment: false, face_removal: false, face_update: false },
  'QC': { face_enrolment: false, face_removal: false, face_update: false },
  'Surveyor': { face_enrolment: false, face_removal: false, face_update: false },
  'Accounts': { face_enrolment: false, face_removal: false, face_update: false },
  'Admin': { face_enrolment: true, face_removal: true, face_update: true },
};

export const [PermissionsProvider, usePermissions] = createContextHook(() => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<UserTypeForPermissions, UserTypePermissions['permissions']>>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(PERMISSIONS_STORAGE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.masterAccountId === user?.masterAccountId) {
          setPermissions(parsedCache.permissions);
          console.log('[PermissionsContext] Loaded from cache');
          return true;
        }
      }
    } catch (error) {
      console.error('[PermissionsContext] Error loading cache:', error);
    }
    return false;
  }, [user?.masterAccountId]);

  const saveToCache = useCallback(async (perms: Record<UserTypeForPermissions, UserTypePermissions['permissions']>) => {
    try {
      if (user?.masterAccountId) {
        await AsyncStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify({
          masterAccountId: user.masterAccountId,
          permissions: perms,
          cachedAt: new Date().toISOString(),
        }));
        console.log('[PermissionsContext] Saved to cache');
      }
    } catch (error) {
      console.error('[PermissionsContext] Error saving cache:', error);
    }
  }, [user?.masterAccountId]);

  const loadFromFirestore = useCallback(async () => {
    if (!user?.masterAccountId) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('[PermissionsContext] Loading from Firestore for masterAccountId:', user.masterAccountId);
      
      const permissionsRef = collection(db, 'userTypePermissions');
      const q = query(permissionsRef, where('masterAccountId', '==', user.masterAccountId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('[PermissionsContext] No permissions found, using defaults');
        await saveToCache(DEFAULT_PERMISSIONS);
        setPermissions(DEFAULT_PERMISSIONS);
        setIsLoading(false);
        return;
      }

      const loadedPermissions = { ...DEFAULT_PERMISSIONS };
      snapshot.forEach((doc) => {
        const data = doc.data() as UserTypePermissions;
        loadedPermissions[data.userType] = data.permissions;
      });

      setPermissions(loadedPermissions);
      await saveToCache(loadedPermissions);
      console.log('[PermissionsContext] Loaded from Firestore');
    } catch (error) {
      console.error('[PermissionsContext] Error loading from Firestore:', error);
      await loadFromCache();
    } finally {
      setIsLoading(false);
    }
  }, [user?.masterAccountId, loadFromCache, saveToCache]);

  useEffect(() => {
    const init = async () => {
      const hasCachedData = await loadFromCache();
      if (hasCachedData) {
        setIsLoading(false);
      }
      await loadFromFirestore();
    };
    init();
  }, [loadFromCache, loadFromFirestore]);

  useEffect(() => {
    if (!user?.masterAccountId) return;

    const permissionsRef = collection(db, 'userTypePermissions');
    const q = query(permissionsRef, where('masterAccountId', '==', user.masterAccountId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPermissions = { ...DEFAULT_PERMISSIONS };
      snapshot.forEach((doc) => {
        const data = doc.data() as UserTypePermissions;
        loadedPermissions[data.userType] = data.permissions;
      });
      setPermissions(loadedPermissions);
      saveToCache(loadedPermissions);
      console.log('[PermissionsContext] Real-time update received');
    }, (error) => {
      console.error('[PermissionsContext] Real-time listener error:', error);
    });

    return () => unsubscribe();
  }, [user?.masterAccountId, saveToCache]);

  const updatePermissions = useCallback(async (
    userType: UserTypeForPermissions,
    newPermissions: Partial<UserTypePermissions['permissions']>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.masterAccountId) {
      return { success: false, error: 'No master account ID' };
    }

    try {
      const permissionsRef = collection(db, 'userTypePermissions');
      const q = query(
        permissionsRef,
        where('masterAccountId', '==', user.masterAccountId),
        where('userType', '==', userType)
      );
      const snapshot = await getDocs(q);

      const updatedPermissions = {
        ...permissions[userType],
        ...newPermissions,
      };

      const permissionData: UserTypePermissions = {
        masterAccountId: user.masterAccountId,
        userType,
        permissions: updatedPermissions,
        updatedAt: serverTimestamp(),
        updatedBy: user.id,
        createdAt: serverTimestamp(),
      };

      if (!snapshot.empty) {
        const docRef = doc(db, 'userTypePermissions', snapshot.docs[0].id);
        await setDoc(docRef, permissionData, { merge: true });
      } else {
        const docRef = doc(permissionsRef);
        await setDoc(docRef, permissionData);
      }

      const newPerms = { ...permissions, [userType]: updatedPermissions };
      setPermissions(newPerms);
      await saveToCache(newPerms);

      console.log('[PermissionsContext] Permissions updated for:', userType);
      return { success: true };
    } catch (error) {
      console.error('[PermissionsContext] Error updating permissions:', error);
      return { success: false, error: 'Failed to update permissions' };
    }
  }, [user, permissions, saveToCache]);

  const hasPermission = useCallback((
    userType: UserTypeForPermissions | undefined,
    permission: keyof UserTypePermissions['permissions']
  ): boolean => {
    if (!userType) return false;
    return permissions[userType]?.[permission] ?? false;
  }, [permissions]);

  const canEnrollFace = useCallback((userType: UserTypeForPermissions | undefined): boolean => {
    return hasPermission(userType, 'face_enrolment');
  }, [hasPermission]);

  const canRemoveFace = useCallback((userType: UserTypeForPermissions | undefined): boolean => {
    return hasPermission(userType, 'face_removal');
  }, [hasPermission]);

  const canUpdateFace = useCallback((userType: UserTypeForPermissions | undefined): boolean => {
    return hasPermission(userType, 'face_update');
  }, [hasPermission]);

  return {
    permissions,
    isLoading,
    updatePermissions,
    hasPermission,
    canEnrollFace,
    canRemoveFace,
    canUpdateFace,
  };
});
