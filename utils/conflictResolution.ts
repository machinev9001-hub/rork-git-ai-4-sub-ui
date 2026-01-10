import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '@/config/firebase';

export type ConflictResolutionStrategy = 
  | 'server-wins'      // Server data takes priority
  | 'client-wins'      // Local data takes priority
  | 'merge'            // Merge both (for non-conflicting fields)
  | 'timestamp-wins'   // Most recent timestamp wins
  | 'manual';          // User needs to resolve

export type ConflictData = {
  id: string;
  collection: string;
  docId: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
  strategy: ConflictResolutionStrategy;
  resolvedAt?: number;
};

const CONFLICTS_KEY = '@data_conflicts';

class ConflictResolver {
  private conflicts: ConflictData[] = [];
  private listeners: Set<(conflicts: ConflictData[]) => void> = new Set();

  async init() {
    try {
      const stored = await AsyncStorage.getItem(CONFLICTS_KEY);
      if (stored) {
        this.conflicts = JSON.parse(stored);
        console.log('[ConflictResolver] Loaded', this.conflicts.length, 'unresolved conflicts');
      }
    } catch (error) {
      console.error('[ConflictResolver] Init error:', error);
    }
  }

  async detectConflict(
    collection: string,
    docId: string,
    localData: any,
    localTimestamp: number
  ): Promise<ConflictData | null> {
    try {
      const docRef = doc(db, collection, docId);
      const serverDoc = await getDoc(docRef);
      
      if (!serverDoc.exists()) {
        return null;
      }

      const serverData = serverDoc.data();
      const serverTimestamp = serverData.updatedAt?.toMillis?.() || 
                             serverData.createdAt?.toMillis?.() || 
                             Date.now();

      if (serverTimestamp > localTimestamp) {
        console.log('[ConflictResolver] Conflict detected:', docId);
        console.log('  Local timestamp:', new Date(localTimestamp).toISOString());
        console.log('  Server timestamp:', new Date(serverTimestamp).toISOString());
        
        const conflict: ConflictData = {
          id: `${collection}_${docId}_${Date.now()}`,
          collection,
          docId,
          localData,
          serverData,
          localTimestamp,
          serverTimestamp,
          strategy: this.determineStrategy(collection, localData, serverData),
        };

        return conflict;
      }

      return null;
    } catch (error) {
      console.error('[ConflictResolver] Detect error:', error);
      return null;
    }
  }

  private determineStrategy(
    collection: string,
    localData: any,
    serverData: any
  ): ConflictResolutionStrategy {
    if (collection === 'taskRequests' || collection === 'activityRequests') {
      if (localData.status === 'Approved' && serverData.status === 'Pending') {
        return 'server-wins';
      }
      return 'merge';
    }

    if (collection === 'timesheets' || collection === 'plantAssetTimesheets') {
      return 'server-wins';
    }

    if (collection === 'messages') {
      return 'merge';
    }

    return 'timestamp-wins';
  }

  async resolveConflict(
    conflict: ConflictData,
    strategy?: ConflictResolutionStrategy
  ): Promise<{ success: boolean; resolvedData?: any; error?: string }> {
    try {
      const resolveStrategy = strategy || conflict.strategy;
      console.log('[ConflictResolver] Resolving conflict:', conflict.id, 'Strategy:', resolveStrategy);

      let resolvedData: any;

      switch (resolveStrategy) {
        case 'server-wins':
          resolvedData = conflict.serverData;
          break;

        case 'client-wins':
          resolvedData = conflict.localData;
          break;

        case 'timestamp-wins':
          resolvedData = conflict.serverTimestamp > conflict.localTimestamp
            ? conflict.serverData
            : conflict.localData;
          break;

        case 'merge':
          resolvedData = this.mergeData(conflict.localData, conflict.serverData);
          break;

        case 'manual':
          await this.addConflict(conflict);
          return { success: false, error: 'Manual resolution required' };

        default:
          return { success: false, error: 'Unknown strategy' };
      }

      const docRef = doc(db, conflict.collection, conflict.docId);
      await setDoc(docRef, {
        ...resolvedData,
        updatedAt: serverTimestamp(),
        resolvedConflict: true,
        conflictResolvedAt: serverTimestamp(),
      }, { merge: true });

      await this.removeConflict(conflict.id);

      console.log('[ConflictResolver] Conflict resolved:', conflict.id);
      return { success: true, resolvedData };
    } catch (error) {
      console.error('[ConflictResolver] Resolve error:', error);
      return { success: false, error: String(error) };
    }
  }

  private mergeData(localData: any, serverData: any): any {
    const merged = { ...serverData };

    const localOnlyFields = ['localId', 'offlineCreated', 'pendingSync'];
    localOnlyFields.forEach(field => {
      if (localData[field] !== undefined) {
        merged[field] = localData[field];
      }
    });

    const arrayFields = ['images', 'attachments', 'comments'];
    arrayFields.forEach(field => {
      if (Array.isArray(localData[field]) && Array.isArray(serverData[field])) {
        const serverIds = new Set(serverData[field].map((item: any) => item.id || item));
        
        const localOnly = localData[field].filter((item: any) => 
          !serverIds.has(item.id || item)
        );
        
        merged[field] = [...serverData[field], ...localOnly];
      }
    });

    const numericFields = ['completedToday', 'quantity', 'hours'];
    numericFields.forEach(field => {
      if (typeof localData[field] === 'number' && typeof serverData[field] === 'number') {
        merged[field] = Math.max(localData[field], serverData[field]);
      }
    });

    if (localData.version && serverData.version) {
      merged.version = Math.max(localData.version, serverData.version) + 1;
    } else {
      merged.version = (serverData.version || 1) + 1;
    }

    return merged;
  }

  async resolveWithTransaction(
    conflict: ConflictData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, conflict.collection, conflict.docId);
      
      await runTransaction(db, async (transaction) => {
        const serverDoc = await transaction.get(docRef);
        
        if (!serverDoc.exists()) {
          transaction.set(docRef, conflict.localData);
          return;
        }

        const serverData = serverDoc.data();
        const merged = this.mergeData(conflict.localData, serverData);
        
        transaction.set(docRef, {
          ...merged,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });

      await this.removeConflict(conflict.id);
      console.log('[ConflictResolver] Transaction-based resolution complete:', conflict.id);
      
      return { success: true };
    } catch (error) {
      console.error('[ConflictResolver] Transaction error:', error);
      return { success: false, error: String(error) };
    }
  }

  private async addConflict(conflict: ConflictData) {
    this.conflicts.push(conflict);
    await this.saveConflicts();
    this.notifyListeners();
  }

  private async removeConflict(conflictId: string) {
    this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
    await this.saveConflicts();
    this.notifyListeners();
  }

  private async saveConflicts() {
    try {
      await AsyncStorage.setItem(CONFLICTS_KEY, JSON.stringify(this.conflicts));
    } catch (error) {
      console.error('[ConflictResolver] Save error:', error);
    }
  }

  getUnresolvedConflicts(): ConflictData[] {
    return [...this.conflicts];
  }

  subscribe(callback: (conflicts: ConflictData[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback([...this.conflicts]));
  }

  async clearResolvedConflicts() {
    this.conflicts = [];
    await this.saveConflicts();
    this.notifyListeners();
    console.log('[ConflictResolver] All conflicts cleared');
  }
}

export const conflictResolver = new ConflictResolver();
