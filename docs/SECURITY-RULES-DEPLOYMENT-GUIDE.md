# Firebase Security Rules - Production Deployment Guide

## Overview
This guide walks you through deploying production-ready Firebase security rules with proper authentication, company isolation, and account type restrictions.

## Prerequisites

### 1. Install Firebase Tools (Do this NOW)
```bash
npm install -g firebase-tools
npm install --save-dev @firebase/rules-unit-testing
```

### 2. Enable Firebase Authentication

**IMPORTANT**: You MUST enable Firebase Authentication in the Firebase Console before deploying rules.

#### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Authentication** in the left menu
4. Click **Get Started**
5. Enable at least one sign-in method (recommended: **Anonymous** for testing)
6. This allows `request.auth` to be populated in security rules

**Why this is required**: The new security rules use `request.auth.token.companyId`, `request.auth.token.role`, etc. These custom claims require Firebase Authentication to be enabled.

## What Changed

### 1. Type System Updates ✅ COMPLETE
- `Company` type now includes required `accountType: AccountType` field
- Company creation automatically sets `accountType` from master account
- Company selector handles missing `accountType` with fallback to 'enterprise'

### 2. User Creation Verification ✅ COMPLETE
- Users are created with: `role`, `companyId` (via currentCompanyId), `siteId`
- All required fields are present for security rules

### 3. Document Field Requirements ✅ COMPLETE
- Companies: Have `accountType` field
- Users: Have `role`, `companyId`, `siteId` fields
- Employees: Have `companyId` field
- Sites: Have `companyId` and `masterAccountId` fields

## Testing Before Deployment

### Run Unit Tests
```bash
# Start the Firebase Emulator
firebase emulators:start --only firestore

# In another terminal, run tests
npm test -- __tests__/firestore.rules.test.ts
```

The tests verify:
- ✅ Unauthenticated users cannot access data
- ✅ Company-level isolation works
- ✅ Users cannot change their `companyId`
- ✅ Account type restrictions (free vs enterprise)
- ✅ Role-based access (Admin, Supervisor, etc.)
- ✅ Required field validation
- ✅ Master account multi-company access

## Setting Up Custom Claims

Your app uses custom authentication, so you need to set custom claims on user tokens. Add this to your authentication flow:

```typescript
// When user logs in, set custom claims in Firebase Auth
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Create a Cloud Function to set custom claims
const setCustomClaims = httpsCallable(getFunctions(), 'setCustomClaims');

await setCustomClaims({
  uid: user.id,
  claims: {
    companyId: user.currentCompanyId,
    role: user.role,
    accountType: user.accountType || 'enterprise',
    siteId: user.siteId,
  }
});
```

**Alternative**: If you're not using Cloud Functions yet, you can use Firebase Admin SDK:
```typescript
// Server-side only
import * as admin from 'firebase-admin';

await admin.auth().setCustomUserClaims(userId, {
  companyId: 'company123',
  role: 'Admin',
  accountType: 'enterprise',
  siteId: 'site456',
});
```

## Deployment Steps

### Step 1: Login to Firebase
```bash
firebase login
```

### Step 2: Initialize Firebase (if not done)
```bash
firebase init firestore
```
- Select your project
- Accept default rules file: `firestore.rules`
- Accept default indexes file: `firestore.indexes.json`

### Step 3: Deploy New Rules
```bash
# Copy production rules to firestore.rules
cp firestore-production.rules firestore.rules

# Deploy
firebase deploy --only firestore:rules
```

### Step 4: Verify Deployment
Check Firebase Console:
1. Go to **Firestore Database** → **Rules**
2. Verify the rules are active
3. Check the timestamp to confirm they deployed

## Migration Strategy (IMPORTANT)

Since your app is already in use, follow this migration path:

### Phase 1: Enable Authentication (Do First)
1. Enable Firebase Authentication in console
2. Set up custom claims for existing users
3. Test in development environment

### Phase 2: Test Rules Locally
```bash
# Run emulator with new rules
firebase emulators:start --only firestore

# Run your app against emulator
# Set FIRESTORE_EMULATOR_HOST in your code
```

### Phase 3: Deploy to Production
```bash
firebase deploy --only firestore:rules
```

### Phase 4: Monitor
- Watch Firebase Console for denied requests
- Check application logs for permission errors
- Have rollback plan ready

## Rollback Plan

If you need to rollback:
```bash
# Restore old rules
cp firestore.rules firestore.rules.backup
cp firestore-old.rules firestore.rules

# Deploy
firebase deploy --only firestore:rules
```

## Current vs New Rules Comparison

### Current Rules (firestore.rules)
- ❌ Login collections open for read (security risk)
- ❌ No company isolation
- ❌ No account type restrictions
- ❌ No role-based access control
- ✅ Everything requires `isAuthenticated()` (but it's always true)

### New Rules (firestore-production.rules)
- ✅ Requires real Firebase Authentication
- ✅ Company-level data isolation
- ✅ Account type enforcement (free vs enterprise)
- ✅ Role-based permissions (Admin, Supervisor, etc.)
- ✅ Field validation (required fields)
- ✅ Prevents `companyId` tampering
- ✅ Master account multi-company access

## Security Checklist

Before deploying:
- [ ] Firebase Authentication is enabled
- [ ] At least one sign-in method is active
- [ ] Custom claims are set for all users
- [ ] Tests pass locally
- [ ] Backup of current rules exists
- [ ] Team is notified of deployment
- [ ] Monitoring is in place

## Post-Deployment Verification

### Test These Scenarios
1. **Login Flow**: Users can log in successfully
2. **Company Isolation**: Users only see their company data
3. **Master Accounts**: Can access all their companies
4. **Admin Actions**: Admins can create users
5. **Free Accounts**: Cannot access enterprise features
6. **Field Protection**: Cannot modify `companyId`

### Monitor These Metrics
- Authentication success rate
- Permission denied errors
- API latency changes
- User-reported issues

## Common Issues

### Issue: "Missing or insufficient permissions"
**Solution**: Check custom claims are set correctly
```typescript
const user = auth.currentUser;
const token = await user?.getIdTokenResult(true);
console.log('Custom claims:', token?.claims);
```

### Issue: "request.auth is null"
**Solution**: Firebase Authentication not enabled or user not signed in

### Issue: "Cannot read users collection"
**Solution**: User's custom claims don't match their actual companyId

## Support

If you encounter issues:
1. Check Firebase Console → Firestore → Rules → Activity logs
2. Review application logs for specific permission errors
3. Verify custom claims: `auth.currentUser.getIdTokenResult()`
4. Test with Firebase Emulator first

## Next Steps

After successful deployment:
1. ✅ Monitor for 24 hours
2. ✅ Verify all user roles work correctly
3. ✅ Test account type restrictions
4. ✅ Document any custom claim setup for new users
5. ✅ Update onboarding docs with security requirements
