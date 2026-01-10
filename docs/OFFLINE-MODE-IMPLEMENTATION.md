# Offline Mode Implementation Guide

## Overview

This app implements comprehensive offline functionality allowing field workers to continue operations without network connectivity. Changes are queued locally and automatically synchronized when connection is restored.

## Architecture

### 1. Firebase Offline Persistence

**Status:** ✅ Implemented

Firebase Firestore offline persistence is enabled for both web and native platforms:

```typescript
// config/firebase.ts
if (Platform.OS === 'web') {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
} else {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache(),
    ignoreUndefinedProperties: true,
  });
}
```

**Features:**
- Automatic local caching of Firestore data
- Real-time listeners work from cache when offline
- Seamless transition between online/offline states

### 2. Offline Queue System

**Status:** ✅ Implemented

Location: `utils/offlineQueue.ts`

**Key Features:**
- Priority-based queue (P0-P3)
- Automatic retry with exponential backoff
- Data size estimation and burst budgeting
- Entity type detection for smart prioritization

**Priority Levels:**
- **P0 (Critical):** Task requests, approvals, allocations, timesheets
- **P1 (Normal):** Messages, general updates
- **P2 (Production):** Completed Today, progress data
- **P3 (Heavy Data):** Images, large attachments

**Usage:**
```typescript
import { offlineQueue } from '@/utils/offlineQueue';

// Enqueue an operation
await offlineQueue.enqueue({
  type: 'set',
  collection: 'taskRequests',
  docId: requestId,
  data: requestData,
}, {
  priority: 'P0',
  entityType: 'taskRequest',
});

// Force sync
await offlineQueue.syncQueue('critical'); // P0 only
await offlineQueue.syncQueue('full');     // All items
```

### 3. Conflict Resolution

**Status:** ✅ Implemented

Location: `utils/conflictResolution.ts`

**Strategies:**
- **server-wins:** Server data takes priority
- **client-wins:** Local data takes priority
- **merge:** Intelligent field-level merging
- **timestamp-wins:** Most recent wins
- **manual:** User resolution required

**Automatic Detection:**
Conflicts are automatically detected during queue sync when timestamps differ:

```typescript
const conflict = await conflictResolver.detectConflict(
  collection,
  docId,
  localData,
  localTimestamp
);

if (conflict) {
  const result = await conflictResolver.resolveConflict(conflict);
}
```

**Merge Strategy:**
- Array fields (images, attachments): Combines unique items
- Numeric fields (completedToday, hours): Takes maximum value
- Version numbers: Auto-increments for tracking

### 4. User Authentication Offline

**Status:** ✅ Implemented

Location: `contexts/AuthContext.tsx`

**Features:**
- Firebase Auth retains user sessions automatically
- User profile cached in AsyncStorage (`@user`)
- PIN authentication works offline
- Minimal user info stored for offline access

**Storage Keys:**
- `@user` - Current user session
- `@pin` - Hashed PIN for offline auth
- `@last_known_user` - Last authenticated user
- `@offline_mode` - Offline mode flag

### 5. UI Enhancements

**Status:** ✅ Implemented

Location: `components/OfflineBanner.tsx`

**Features:**
- Real-time connectivity status
- Pending changes indicator with priority breakdown
- Sync options modal (Critical Only / Full Sync)
- Auto-dismissing sync banner
- Failed sync notifications with retry/clear actions

**States Displayed:**
- Online (with last sync time)
- Offline Mode (with pending count)
- Syncing (dismissible)
- Pending Sync (with sync options)
- Sync Errors (with retry)

### 6. Testing Utilities

**Status:** ✅ Implemented

Location: `utils/offlineTesting.ts`

**Available Tests:**
```typescript
import { offlineTester } from '@/utils/offlineTesting';

// Simulate offline mode
await offlineTester.simulateOfflineMode(30000); // 30 seconds

// Restore online
await offlineTester.restoreOnlineMode();

// Inspect queue
const queueStatus = await offlineTester.inspectQueue();

// Test operations
await offlineTester.testQueueOperation('write');
await offlineTester.testQueueOperation('update');
await offlineTester.testQueueOperation('delete');

// Test conflict detection
await offlineTester.testConflictDetection();

// Get storage stats
const stats = await offlineTester.getOfflineStorageStats();

// Force sync test
await offlineTester.forceSyncTest('full');

// Clear offline data
await offlineTester.clearAllOfflineData();
```

## Data Persistence Strategy

### AsyncStorage Usage

**CRITICAL:** AsyncStorage is APPEND-ONLY for operational data:
- ✅ Offline queue saved to AsyncStorage
- ✅ Once synced to Firebase, queue items removed
- ✅ Cached data (users, tasks, activities) remains FOREVER
- ✅ Ensures field workers have historical data offline
- ❌ Only temporary session data cleared on logout

### Collections Cached Locally

1. **Users** - `utils/userCache.ts`
2. **Employees** - `utils/employeeCache.ts`
3. **Tasks** - `utils/taskCache.ts`
4. **Site Packs** - `utils/sitePackCache.ts`
5. **Task Locks** - `utils/taskLockCache.ts`

## Sync Behavior

### Automatic Sync Triggers

1. **Network Reconnection:** Auto-sync on connectivity restored
2. **Queue Addition:** Immediate sync if online
3. **App Focus:** Background re-sync on app foreground

### Sync Modes

1. **auto (default)**
   - Max 250KB per burst
   - Processes all priorities in order
   - Recursive retry every 5 seconds

2. **critical**
   - P0 items only
   - Max 100KB budget
   - Fast unlock for field workers

3. **full**
   - Max 2MB per burst
   - All priorities
   - For good signal conditions

### Burst Budgeting

Prevents network congestion and timeout errors:
- Estimates operation size based on JSON stringification
- Tracks cumulative bytes per sync cycle
- Stops sync when budget exceeded
- Resumes in next cycle

## Testing Scenarios

### 1. Offline Data Entry
- [ ] Create task request while offline
- [ ] Verify queued in OfflineBanner
- [ ] Restore connectivity
- [ ] Confirm automatic sync
- [ ] Verify task appears in Firebase

### 2. Conflict Resolution
- [ ] Edit document offline (Device A)
- [ ] Edit same document online (Device B)
- [ ] Sync Device A
- [ ] Verify conflict detected
- [ ] Confirm resolution strategy applied
- [ ] Validate merged data

### 3. Priority Sync
- [ ] Queue P0, P2, P3 items while offline
- [ ] Use "Sync Critical Only"
- [ ] Verify only P0 synced
- [ ] Use "Sync Everything"
- [ ] Confirm all items synced

### 4. App Restart Offline
- [ ] Queue operations offline
- [ ] Force quit app
- [ ] Restart app (still offline)
- [ ] Verify queue persisted
- [ ] Restore connectivity
- [ ] Confirm sync completes

### 5. Authentication Offline
- [ ] Logout while online
- [ ] Go offline
- [ ] Attempt login with PIN
- [ ] Verify offline auth works
- [ ] Access cached data

### 6. Heavy Data Sync
- [ ] Queue multiple images (P3)
- [ ] Attempt sync on weak signal
- [ ] Verify burst budget prevents overload
- [ ] Confirm incremental sync over time

## Monitoring & Debugging

### Console Logs

All offline operations are logged with prefixes:
- `[OfflineQueue]` - Queue operations
- `[ConflictResolver]` - Conflict detection/resolution
- `[OfflineTester]` - Testing utilities
- `[Firebase]` - Persistence initialization

### Debug Info Screen

Location: `app/debug-info.tsx`

Add offline testing UI:
```typescript
import { offlineTester } from '@/utils/offlineTesting';

// In debug screen
const queueStatus = await offlineTester.inspectQueue();
const storageStats = await offlineTester.getOfflineStorageStats();
```

## Known Limitations

### 1. Firebase Authentication
- ❌ No full offline sign-in after logout
- ✅ Sessions persist automatically
- ✅ PIN auth works offline

### 2. Firestore Queries
- ❌ Complex queries may not work offline if not cached
- ✅ Use `.addSnapshotListener()` for better offline support
- ✅ Explicitly use `Source.CACHE` when needed

### 3. Storage Limits
- Mobile: ~10MB AsyncStorage recommended
- Web: ~50MB+ IndexedDB available
- Monitor with `offlineTester.getOfflineStorageStats()`

### 4. Conflict Detection
- ⚠️ Requires `updatedAt` or `lastModified` fields
- ⚠️ Version fields recommended for merge tracking
- ⚠️ Manual resolution UI not implemented (falls back to strategies)

## Configuration

### Enable/Disable Offline Queue

Location: `constants/colors.ts`

```typescript
export const OFFLINE_CONFIG = {
  ENABLE_OFFLINE_QUEUE: true,
  MAX_QUEUE_SIZE: 500,
  MAX_RETRY_ATTEMPTS: 3,
  SYNC_BURST_SIZE_BYTES: 250 * 1024,
};
```

## Future Enhancements

### Not Yet Implemented

1. **Background Sync**
   - Periodic sync when app in background
   - Requires task manager setup

2. **Conflict Resolution UI**
   - Visual diff viewer
   - Manual merge interface
   - Conflict history

3. **Selective Sync**
   - User-controlled entity type sync
   - Bandwidth-aware sync strategies

4. **Storage Optimization**
   - Automatic cache cleanup
   - Configurable retention policies
   - Compression for large data

5. **Progress Indicators**
   - Per-item sync progress
   - Detailed sync history
   - Bandwidth usage metrics

## Support

For issues or questions:
1. Check console logs for error details
2. Use `offlineTester.inspectQueue()` for diagnostics
3. Review conflict resolution logs
4. Test with airplane mode for consistent offline state

---

**Last Updated:** 2025-01-10
**Implementation Status:** Production Ready ✅
