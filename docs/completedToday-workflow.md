# CompletedToday Workflow - Complete Technical Documentation

## Overview

The **completedToday** workflow is a critical daily progress tracking system that allows supervisors to submit their work progress once per day, with automatic locking mechanisms to ensure data integrity and proper QC verification flow.

## Key Components

### 1. Files Involved
- `utils/completedTodayLock.ts` - Core locking logic and functions
- `components/CompletedTodayInput.tsx` - UI component for input display
- `app/supervisor-task-detail.tsx` - Main screen with workflow implementation
- `utils/hooks/useActivityManagement.ts` - Activity state management

### 2. Database Structure

#### Activity Document Fields
```typescript
{
  completedToday: number,              // Current day's submitted value
  completedTodayUnit: string,          // Unit for the value (m, m², etc.)
  completedTodayUpdatedAt: Timestamp,  // Last update timestamp
  
  completedTodayLock: {
    isLocked: boolean,                 // Lock status
    lockType: 'TIME_LOCK' | 'QC_INTERACTION',
    lockedAt: Timestamp,               // When locked
    lockedValue: number,               // Value at lock time
    lockedUnit: string,                // Unit at lock time
    lockDate: string,                  // Date of lock (YYYY-MM-DD)
    qcApprovedValue?: number,          // QC approved value (optional)
    qcApprovedUnit?: string            // QC approved unit (optional)
  },
  
  qc: {
    status: 'not_requested' | 'requested' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'rejected',
    lastRequestId?: string,
    lastUpdatedAt?: Timestamp,
    scheduledAt?: Timestamp
  }
}
```

#### History Subcollection
Path: `activities/{activityDocId}/history/{date}`

```typescript
{
  date: string,                        // YYYY-MM-DD format
  completedValue: number,              // Locked value for that day
  unit: string,                        // Unit
  percentage: string,                  // Completion % vs scope
  unverifiedPercentage: string,        // Cumulative unverified %
  cumulativeCompleted: number,         // Total completed up to this date
  scopeValue: number,                  // Scope at time of lock
  scopeApproved: boolean,              // Scope approval status
  qcStatus: string,                    // QC status for that day
  materialToggle: boolean,             // Resource toggles
  plantToggle: boolean,
  workersToggle: boolean,
  lockType: 'TIME_LOCK' | 'QC_INTERACTION',
  lockedAt: Timestamp,
  createdAt: Timestamp
}
```

#### ProgressEntries Subcollection
Path: `activities/{activityDocId}/progressEntries/{entryId}`

```typescript
{
  supervisorId: string,
  supervisorName: string,
  enteredAt: Timestamp,                // When entered (today's date)
  value: number,                       // Submitted value
  unit: string,                        // Unit
  canonicalUnit: string,               // Canonical unit
  taskId: string,
  activityId: string,
  siteId: string,
  source: 'manual' | 'grid'            // Entry source
}
```

## Workflow Phases

### Phase 1: Daily Submission (Supervisor Input)
**Location**: `app/supervisor-task-detail.tsx` → `handleSubmitCompletedToday()`

**Process**:
1. Supervisor enters value in input field
2. Selects unit (or uses BOQ unit if configured)
3. Clicks "Submit" button
4. System creates/updates progressEntry for today
5. Updates `completedToday` field in activity document

**Key Rule**: ONE submission per day representing TOTAL work completed today (not cumulative, not additive)

**Code Reference**: Lines 1849-2177 in `supervisor-task-detail.tsx`

---

### Phase 2: Time Lock (Automatic at 23:55)
**Location**: `utils/completedTodayLock.ts` → `checkAndApplyTimeLock()`

**Trigger**: Called periodically or on app/screen load

**Process**:
1. Check current time: if >= 23:55 (23 hours 55 minutes)
2. Check if already locked: skip if `completedTodayLock.isLocked === true`
3. Check if QC completed: skip if QC lock already applied
4. Apply TIME_LOCK:
   ```typescript
   {
     isLocked: true,
     lockType: 'TIME_LOCK',
     lockedAt: Timestamp.now(),
     lockedValue: currentCompletedToday,
     lockedUnit: currentUnit,
     lockDate: YYYY-MM-DD
   }
   ```

**Effect**: Supervisor can NO LONGER edit completedToday value for that day

**Code Reference**: Lines 58-114 in `completedTodayLock.ts`

---

### Phase 3: QC Interaction Lock
**Location**: `app/supervisor-task-detail.tsx` → `proceedWithSubmission()`

**Trigger**: When supervisor submits value AND QC has already completed inspection

**Detection**:
```typescript
const qcHasInteracted = previousData.qc?.status === 'completed';
```

**Process**:
1. Supervisor attempts to submit completedToday
2. System checks: `qc.status === 'completed'`
3. If true, apply QC_INTERACTION lock immediately:
   ```typescript
   {
     isLocked: true,
     lockType: 'QC_INTERACTION',
     lockedAt: Timestamp.now(),
     lockedValue: submittedValue,
     lockedUnit: submittedUnit,
     lockDate: YYYY-MM-DD
   }
   ```

**Priority**: QC_INTERACTION lock takes precedence over TIME_LOCK

**Effect**: Value is locked immediately upon submission, supervisor cannot edit

**Code Reference**: Lines 2012-2028 in `supervisor-task-detail.tsx`

---

### Phase 4: New Day Detection & Unlock
**Location**: `utils/completedTodayLock.ts` → `checkAndUnlockNewDay()`

**Trigger**: Called when supervisor opens task or activity loads

**Process**:
1. Check if activity is locked: `completedTodayLock.isLocked === true`
2. Get lock date: `completedTodayLock.lockDate`
3. Compare with today: `lockDate !== todayDate`
4. If different day detected:
   - Create history snapshot (see Phase 5)
   - Unlock activity
   - Reset for new day

**Code Reference**: Lines 181-328 in `completedTodayLock.ts`

---

### Phase 5: History Snapshot Creation
**Location**: `utils/completedTodayLock.ts` → `checkAndUnlockNewDay()` (lines 235-286)

**When**: Automatically when new day is detected

**Process**:
1. Calculate values:
   ```typescript
   completedValue = completedTodayLock.lockedValue || completedToday
   historicalSum = sum of all previous history entries
   newTotal = historicalSum + completedValue
   percentage = (completedValue / scopeValue) * 100
   unverifiedPercentage = (newTotal / scopeValue) * 100
   ```

2. Create history document:
   ```typescript
   Path: activities/{activityDocId}/history/{lockDate}
   Data: {
     date: lockDate,
     completedValue: completedValue,
     unit: unit,
     percentage: percentage,
     unverifiedPercentage: unverifiedPercentage,
     cumulativeCompleted: newTotal,
     scopeValue: scopeValue,
     scopeApproved: scopeApproved,
     qcStatus: qc.status,
     materialToggle: boolean,
     plantToggle: boolean,
     workersToggle: boolean,
     lockType: lockType,
     lockedAt: lockedAt,
     createdAt: Timestamp.now()
   }
   ```

3. Unlock activity:
   ```typescript
   {
     'completedTodayLock.isLocked': false,
     'completedTodayLock.lockType': null,
     'completedTodayLock.lockedAt': null,
     'completedTodayLock.lockedValue': null,
     'completedTodayLock.lockedUnit': null,
     'completedTodayLock.lockDate': null,
     'qc.status': 'not_requested',
     qcRequested: false,
     completedToday: 0,
     cumulativeCompleted: newTotal,
     unverifiedPercentage: unverifiedPercentage
   }
   ```

**Critical**: QC value (`qcValue`) is PRESERVED - it accumulates across days

**Code Reference**: Lines 225-327 in `completedTodayLock.ts`

---

## Lock Type Priority & Behavior

### QC_INTERACTION Lock
- **Higher Priority**: Takes precedence over TIME_LOCK
- **When Applied**: Immediately when QC completes inspection
- **Duration**: Until next day (24:00)
- **QC Toggle**: Locked until new day - supervisor cannot cancel QC request

### TIME_LOCK
- **Lower Priority**: Only applied if QC hasn't completed
- **When Applied**: At 23:55 daily
- **Duration**: Until next day (24:00)
- **QC Toggle**: Still available - supervisor can request QC

---

## UI States

### Unlocked State (Edit Mode)
**Component**: `CompletedTodayInput.tsx`

Display:
```
[Input Field] [Unit Selector]
[Submit Button]

Today's Submission: 150 m [Edit]
```

Behavior:
- Input enabled
- Can change unit
- Can submit/resubmit
- Edit button shows current value

### Locked State (Read-Only)
**Component**: `CompletedTodayInput.tsx`

Display:
```
🔒 Locked Value: 150 m
This value was locked by [QC interaction / time lock] and cannot be edited.
```

Behavior:
- No input field
- No submit button
- Yellow warning banner
- Clear lock reason displayed

**Code Reference**: Lines 35-48 in `CompletedTodayInput.tsx`

---

## Integration with QC System

### QC Request Flow
1. Supervisor submits completedToday value
2. Supervisor toggles "Request QC" switch
3. QC_REQUEST created in requests collection
4. QC receives request, schedules inspection
5. QC completes inspection → `qc.status = 'completed'`
6. QC updates `qcValue` (accumulated)
7. If supervisor tries to edit completedToday → LOCKED immediately

### QC Toggle Lock Check
**Function**: `isQCToggleLocked()`

Checks if supervisor can cancel QC request:
```typescript
isLocked && lockType === 'QC_INTERACTION' && lockDate === today
```

If true: QC toggle is DISABLED (supervisor cannot cancel)

**Code Reference**: Lines 145-179 in `completedTodayLock.ts`

---

## Common Scenarios

### Scenario 1: Normal Daily Workflow
1. **Morning**: Supervisor opens task, system checks and unlocks from previous day
2. **During Day**: Supervisor can edit/submit completedToday multiple times
3. **23:55**: TIME_LOCK automatically applied
4. **Next Morning**: System creates history snapshot and unlocks

### Scenario 2: QC Interaction During Day
1. **10:00**: Supervisor submits 100m
2. **11:00**: Supervisor requests QC
3. **14:00**: QC completes inspection, sets qc.status = 'completed'
4. **15:00**: Supervisor tries to update to 150m
5. **Result**: Value locked immediately as QC_INTERACTION, shows 150m locked

### Scenario 3: Edit Before QC Completes
1. **10:00**: Supervisor submits 100m
2. **11:00**: Supervisor requests QC  
3. **12:00**: Supervisor edits to 120m (QC not completed yet - ALLOWED)
4. **14:00**: QC completes on 120m value
5. **15:00**: Supervisor cannot edit (QC_INTERACTION lock)

---

## Error Handling & Edge Cases

### Missing Lock Date
- System skips unlock if `lockDate` is missing
- Logs warning but doesn't crash
- Activity remains in locked state until manual intervention

### QC Completed But Not Locked
- Function `isCompletedTodayLocked()` treats as locked
- Prevents edge case where QC completed but lock not applied
- Fail-safe protection

### Offline Mode
- Lock checks may be delayed
- Lock state cached locally
- Sync happens when back online

**Code Reference**: Lines 116-143 in `completedTodayLock.ts`

---

## Testing & Debugging

### Console Logs
All lock operations include detailed console logs:
- 🔒 Lock operations
- 🔓 Unlock operations  
- ⏰ Time lock checks
- 📊 History calculations
- ✅ Success messages
- ❌ Error messages

### Key Debug Points
1. Check `completedTodayLock.lockDate` vs current date
2. Check `qc.status` for QC interaction
3. Check time: >= 23:55 for time lock
4. Check history subcollection for snapshot creation
5. Check `completedToday` reset to 0 on new day

---

## Related Documentation
- `COMPLETED_TODAY_SUBMISSION_RULES.md` - Submission rules and guidelines
- QC Request workflow documentation
- Activity scope management
- Progress calculations

---

## Last Updated
2025-01-22
