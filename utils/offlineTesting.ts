import NetInfo from '@react-native-community/netinfo';
import { offlineQueue } from '@/utils/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { conflictResolver } from '@/utils/conflictResolution';

export class OfflineTester {
  private originalNetInfo: any = null;
  private isSimulatingOffline = false;

  async simulateOfflineMode(durationMs?: number) {
    console.log('[OfflineTester] Simulating offline mode');
    this.isSimulatingOffline = true;

    const state = await NetInfo.fetch();
    console.log('[OfflineTester] Current network state:', state.isConnected);

    if (durationMs) {
      setTimeout(() => {
        this.restoreOnlineMode();
      }, durationMs);
      console.log('[OfflineTester] Will restore online mode in', durationMs, 'ms');
    }

    return {
      wasOnline: state.isConnected,
      message: 'Offline mode simulated. Use airplane mode or network settings to test real offline behavior.',
    };
  }

  async restoreOnlineMode() {
    console.log('[OfflineTester] Restoring online mode');
    this.isSimulatingOffline = false;

    const state = await NetInfo.fetch();
    if (state.isConnected) {
      console.log('[OfflineTester] Network is connected, triggering sync');
      await offlineQueue.syncQueue('auto');
    }

    return {
      isConnected: state.isConnected,
      pendingCount: offlineQueue.getSyncStatus().pendingCount,
    };
  }

  async getOfflineStorageStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith('@offline_') || 
        key.startsWith('@sync_') ||
        key.startsWith('@cached_')
      );

      const stats: Record<string, any> = {};
      
      for (const key of offlineKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          stats[key] = {
            size: value.length,
            sizeKB: Math.round(value.length / 1024),
            preview: value.substring(0, 100),
          };
        }
      }

      return {
        totalKeys: offlineKeys.length,
        totalSizeKB: Object.values(stats).reduce((sum: number, item: any) => sum + item.sizeKB, 0),
        breakdown: stats,
      };
    } catch (error) {
      console.error('[OfflineTester] Error getting storage stats:', error);
      return { error: String(error) };
    }
  }

  async testQueueOperation(operation: 'write' | 'update' | 'delete') {
    const testCollection = 'offlineTests';
    const testDocId = `test_${Date.now()}`;

    try {
      switch (operation) {
        case 'write':
          await offlineQueue.enqueue({
            type: 'set',
            collection: testCollection,
            docId: testDocId,
            data: {
              testField: 'test value',
              timestamp: Date.now(),
              operationType: 'write',
            },
          }, { priority: 'P0', entityType: 'other' });
          break;

        case 'update':
          await offlineQueue.enqueue({
            type: 'update',
            collection: testCollection,
            docId: testDocId,
            data: {
              testField: 'updated value',
              updatedAt: Date.now(),
            },
          }, { priority: 'P1', entityType: 'other' });
          break;

        case 'delete':
          await offlineQueue.enqueue({
            type: 'delete',
            collection: testCollection,
            docId: testDocId,
          }, { priority: 'P2', entityType: 'other' });
          break;
      }

      console.log('[OfflineTester] Test operation enqueued:', operation);
      
      return {
        success: true,
        operation,
        docId: testDocId,
        queueStatus: offlineQueue.getSyncStatus(),
      };
    } catch (error) {
      console.error('[OfflineTester] Test operation failed:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async testConflictDetection() {
    const testData = {
      testField: 'local value',
      version: 1,
      updatedAt: Date.now() - 10000,
    };

    try {
      const conflict = await conflictResolver.detectConflict(
        'offlineTests',
        'conflict_test_doc',
        testData,
        Date.now() - 10000
      );

      return {
        hasConflict: conflict !== null,
        conflict: conflict || undefined,
        unresolvedCount: conflictResolver.getUnresolvedConflicts().length,
      };
    } catch (error) {
      console.error('[OfflineTester] Conflict detection test failed:', error);
      return {
        hasConflict: false,
        error: String(error),
      };
    }
  }

  async inspectQueue() {
    const queueItems = offlineQueue.getQueuedItems();
    const syncStatus = offlineQueue.getSyncStatus();

    return {
      syncStatus,
      queueLength: queueItems.length,
      items: queueItems.map(item => ({
        id: item.id,
        type: item.operation.type,
        collection: item.operation.collection,
        priority: item.priority,
        entityType: item.entityType,
        retryCount: item.retryCount,
        timestamp: new Date(item.timestamp).toISOString(),
        estimatedSizeKB: Math.round(item.estimatedSize / 1024),
        hasError: !!item.lastError,
      })),
      priorityBreakdown: {
        P0: queueItems.filter(i => i.priority === 'P0').length,
        P1: queueItems.filter(i => i.priority === 'P1').length,
        P2: queueItems.filter(i => i.priority === 'P2').length,
        P3: queueItems.filter(i => i.priority === 'P3').length,
      },
    };
  }

  async forceSyncTest(mode: 'auto' | 'critical' | 'full' = 'auto') {
    console.log('[OfflineTester] Forcing sync test with mode:', mode);
    
    const beforeStatus = offlineQueue.getSyncStatus();
    const state = await NetInfo.fetch();

    if (!state.isConnected) {
      return {
        success: false,
        error: 'Cannot sync: device is offline',
        networkState: state,
      };
    }

    await offlineQueue.syncQueue(mode);

    const afterStatus = offlineQueue.getSyncStatus();

    return {
      success: true,
      before: {
        pending: beforeStatus.pendingCount,
        failed: beforeStatus.failedCount,
      },
      after: {
        pending: afterStatus.pendingCount,
        failed: afterStatus.failedCount,
      },
      synced: beforeStatus.pendingCount - afterStatus.pendingCount,
    };
  }

  async clearAllOfflineData() {
    console.warn('[OfflineTester] Clearing ALL offline data');
    
    try {
      await offlineQueue.clearFailedItems();
      await conflictResolver.clearResolvedConflicts();
      
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith('@offline_') || 
        key.startsWith('@sync_') ||
        key === '@data_conflicts'
      );

      await AsyncStorage.multiRemove(offlineKeys);

      console.log('[OfflineTester] Cleared', offlineKeys.length, 'offline storage keys');

      return {
        success: true,
        clearedKeys: offlineKeys.length,
        keys: offlineKeys,
      };
    } catch (error) {
      console.error('[OfflineTester] Clear failed:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  getSimulationStatus() {
    return {
      isSimulating: this.isSimulatingOffline,
      message: this.isSimulatingOffline 
        ? 'Offline mode simulation active' 
        : 'No simulation active',
    };
  }
}

export const offlineTester = new OfflineTester();

export function useOfflineTesting() {
  return offlineTester;
}
