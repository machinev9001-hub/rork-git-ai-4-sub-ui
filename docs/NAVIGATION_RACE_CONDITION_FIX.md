# Navigation Race Condition Fix

## Problem

The app was crashing with the error:
```
"Attempted to navigate before mounting the Root Layout component"
```

This error occurs when the app tries to navigate to a different screen before the Expo Router navigation system is fully initialized and ready to handle navigation commands.

## Root Cause

A **race condition** between two asynchronous processes:

1. **Authentication Initialization** (in `AuthContext.tsx`)
   - Loads user data from AsyncStorage
   - Sets `authInitializing = false` when complete
   
2. **Navigator Mounting** (in `app/_layout.tsx`)
   - Renders the `<Stack>` component
   - Takes time to fully mount and become ready

### The Race Condition Timeline

**Before the fix:**
```
Time 0ms:   App starts
Time 50ms:  Auth loading completes → authInitializing = false
Time 55ms:  Navigation logic triggers → router.replace('/tabs')
Time 60ms:  ❌ Stack navigator still mounting → CRASH
Time 100ms: Stack finally ready (but too late)
```

## Solution

Added a **navigation readiness flag** (`isNavigatorReady`) that ensures navigation only happens when BOTH conditions are met:

1. ✅ Authentication is initialized (`authInitializing === false`)
2. ✅ Navigator is mounted and ready (`isNavigatorReady === true`)

### Implementation

**File: `app/_layout.tsx`**

```typescript
// 1. Added state to track navigator readiness
const [isNavigatorReady, setIsNavigatorReady] = useState(false);

// 2. Added useEffect to mark navigator as ready after mounting
useEffect(() => {
  // Use InteractionManager to wait for all interactions and animations to complete
  // This is more reliable than a fixed timeout as it waits for actual readiness
  const interaction = InteractionManager.runAfterInteractions(() => {
    setIsNavigatorReady(true);
    onReady();
  });
  
  return () => interaction.cancel();
}, [onReady]);

// 3. Added guard in navigation logic
useEffect(() => {
  if (authInitializing || isLoading) {
    return; // Wait for auth
  }
  
  if (!isNavigatorReady) {
    return; // Wait for navigator to be ready
  }
  
  // Now safe to navigate!
  router.replace(destination);
}, [user, masterAccount, isLoading, authInitializing, pathname, isNavigatorReady]);
```

### Fixed Timeline

**After the fix:**
```
Time 0ms:   App starts
Time 50ms:  Auth loading completes → authInitializing = false
Time 55ms:  Navigation logic checks isNavigatorReady → false, waits
Time 90ms:  All interactions complete (InteractionManager callback)
Time 95ms:  Navigator ready → isNavigatorReady = true
Time 100ms: Navigation logic triggers → router.replace('/tabs')
Time 105ms: ✅ Navigation succeeds!
```

## Testing

### Manual Testing
To verify the fix works:

1. **Cold Start Test**
   - Close app completely
   - Reopen app
   - Should navigate to appropriate screen without crash

2. **Login Flow Test**
   - Start from logged-out state
   - Log in with credentials
   - Should navigate to home screen without crash

3. **Company Selection Test** (for master accounts)
   - Log in as master account
   - Select a company
   - Should navigate to tabs without crash

### Console Logs

You should see this sequence in the console:
```
[RootLayoutNav] Auth initializing or loading, waiting...
[RootLayoutNav] Navigator not ready yet, deferring navigation
[RootLayoutNav] Navigator marked as ready
[RootLayout] ✅ Master has selected company and site → Routing to /(tabs)
[RootLayout] Navigation to /(tabs) completed
```

## Key Changes

| File | Lines Changed | Description |
|------|---------------|-------------|
| `app/_layout.tsx` | 3 | Added `useState` import |
| `app/_layout.tsx` | 143 | Added `isNavigatorReady` state |
| `app/_layout.tsx` | 163-172 | Added navigator ready useEffect |
| `app/_layout.tsx` | 181-184 | Added navigator ready guard |
| `app/_layout.tsx` | 160, 323 | Updated dependency arrays |

## Related Issues

This fix addresses the common Expo Router error when:
- App initialization is very fast (auth completes quickly)
- Navigator mounting is slower (complex nested routing)
- Navigation commands are triggered immediately after auth

## Prevention

To prevent similar issues in the future:

1. ✅ Always check navigator readiness before programmatic navigation
2. ✅ Use proper timing controls (setTimeout, useEffect)
3. ✅ Add comprehensive logging for debugging race conditions
4. ✅ Test cold starts and various auth states

## References

- Expo Router Documentation: https://docs.expo.dev/router/
- React Navigation Timing: https://reactnavigation.org/docs/navigating
- Race Condition Patterns: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop
