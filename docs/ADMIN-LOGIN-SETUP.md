# Admin Login Setup Guide

## Super Admin Account

The app includes a hardcoded super admin account for managing VAS (Value-Added Services) and system administration.

### Credentials

- **User ID:** `admin`
- **PIN:** `3002`

### Login Process

1. Open the app login screen
2. Enter User ID: `admin`
3. Enter PIN: `3002`
4. Click "Sign In"

The super admin will be logged in with full enterprise-level access.

## Reserved IDs

The following IDs are reserved and cannot be used when creating master accounts:

- `admin`
- `root`
- `system`
- `superadmin`
- `administrator`

If you attempt to create a master account with any of these IDs, you'll receive an error: "The ID '[id]' is reserved and cannot be used. Please choose a different ID."

## Debugging Login Issues

If you encounter issues logging in as admin, check the browser/app console for detailed logs:

### Successful Login Logs

```
[Auth] Login attempt - userId: admin userIdLower: admin
[Auth] ⭐ Super admin login detected
[Auth]   userId input: admin
[Auth]   normalized: admin
[Auth]   lowercase: admin
[Auth]   PIN provided: YES
[Auth]   Checking PIN...
[Auth] ✅ Super admin PIN correct
[Auth] ✅ Super admin user object created
[Auth]   Saving to AsyncStorage...
[Auth]   Setting user state...
[Auth] ✅ SUPER ADMIN LOGIN SUCCESSFUL
```

### Failed Login - No PIN

```
[Auth] ⭐ Super admin login detected
[Auth] ❌ Super admin - no PIN provided
```

### Failed Login - Incorrect PIN

```
[Auth] ⭐ Super admin login detected
[Auth]   Checking PIN...
[Auth] ❌ Super admin - incorrect PIN (expected: 3002, got: [your_pin])
```

## Firestore Indexes

### Required Indexes for Login

All necessary indexes for login are already in `firestore.indexes.json`:

- `masterAccounts.masterId` - For finding master accounts
- `users.employeeIdNumber` - For finding users by ID number
- `employees.employeeIdNumber` - For finding employees by ID number

### Deploying Indexes

After any changes to `firestore.indexes.json`, deploy them to Firebase:

```bash
# Deploy indexes
firebase deploy --only firestore:indexes

# Or deploy everything
firebase deploy
```

This will create/update the composite indexes in your Firestore database. The deployment may take several minutes for large datasets.

### New Indexes Added (Post-Login Operations)

These indexes were added to support operations after login:

1. **sites.name + companyId** - For checking duplicate site names per company when creating sites
2. **users.siteId + role + masterAccountId** - For finding/creating master users when opening sites

## Troubleshooting

### Issue: "User not found" error

**Possible Causes:**
1. Typing error in username or PIN
2. A master account was created with ID "admin" (now prevented)
3. Firestore connection issues

**Solutions:**
1. Verify you're entering exactly: `admin` (lowercase) and `3002`
2. Check browser console for detailed error logs
3. Ensure internet connection for Firestore access
4. Try clearing browser cache/app data

### Issue: Cannot create master account with desired ID

**Cause:** The ID you're trying to use is reserved for system use.

**Solution:** Choose a different ID. Reserved IDs: admin, root, system, superadmin, administrator

### Issue: Firestore permission denied errors

**Cause:** Security rules may have been modified.

**Solution:** Verify `firestore.rules` allows read access to:
- `masterAccounts` collection
- `users` collection  
- `employees` collection

These collections must allow unauthenticated read for login to work since the app uses custom authentication (not Firebase Auth).

## Security Considerations

1. **Change the Super Admin PIN:** For production deployments, change the hardcoded PIN from `3002` to a secure value in `contexts/AuthContext.tsx` (line 810)

2. **Restrict Reserved IDs:** You can add more reserved IDs to the list in `contexts/AuthContext.tsx` (line 618) if needed

3. **Monitor Admin Access:** Consider adding audit logging for super admin actions

4. **Firestore Rules:** The current rules allow unauthenticated read access for login collections. This is necessary for the custom auth system but should be monitored.

## Admin Capabilities

The super admin account has:

- Full enterprise account type
- Access to all VAS features
- No company/site restrictions
- No disabled menus
- Admin role permissions

Use this account carefully and only for system administration tasks.
