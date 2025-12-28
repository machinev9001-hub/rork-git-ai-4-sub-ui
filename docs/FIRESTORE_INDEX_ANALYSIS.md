# Firestore Index Analysis - Account Type Changes

**Date:** 2025-12-28  
**Issue:** Do we need index changes for user subscription type changes (free vs enterprise accounts)?  
**Conclusion:** ❌ **NO INDEX CHANGES REQUIRED**

## Background

Recent changes (PR #2) added support for two account types:
- **Enterprise**: Full access to all features (default for backward compatibility)
- **Free**: Limited access with optional Value-Added Services (VAS)

### New Fields Added

#### User Collection (`users`)
```typescript
{
  accountType?: 'enterprise' | 'free',  // Optional, defaults to 'enterprise'
  vasFeatures?: string[],               // Optional, array of VAS feature IDs
}
```

#### MasterAccount Collection (`masterAccounts`)
```typescript
{
  accountType?: 'enterprise' | 'free',  // Optional, defaults to 'enterprise'
  vasFeatures?: string[],               // Optional, array of VAS feature IDs
}
```

## Analysis

### 1. Query Pattern Review

**Searched for:** Firestore queries using `accountType` or `vasFeatures` fields

**Results:**
- ✅ **Zero compound queries** found using these fields
- ✅ All existing queries use previously indexed fields (siteId, role, masterId, etc.)
- ✅ No `where()` clauses filtering by `accountType` or `vasFeatures`
- ✅ No `orderBy()` clauses sorting by these fields

### 2. Usage Pattern

The new fields are used **exclusively for client-side feature flag evaluation**:

```typescript
// Example usage - NO Firestore query involved
const { user } = useAuth();
const accountType = user?.accountType || 'enterprise';
const features = getFeatureFlags(accountType, user?.vasFeatures);
```

**How it works:**
1. User/MasterAccount document is fetched using existing queries (by masterId, siteId, etc.)
2. The full document (including `accountType` and `vasFeatures`) is loaded into memory
3. Feature flags are computed client-side using these values
4. No additional database queries are needed

### 3. Existing Indexes Review

#### Users Collection (6 indexes)
```json
[
  { "siteId": "ASC", "role": "ASC", "isActive": "ASC" },
  { "employeeIdNumber": "ASC", "__name__": "ASC" },
  { "currentCompanyId": "ASC", "role": "ASC" },
  { "siteId": "ASC", "name": "ASC" },
  { "siteId": "ASC", "name": "ASC", "__name__": "ASC" },
  { "masterAccountId": "ASC", "name": "ASC" }
]
```

#### MasterAccounts Collection (3 indexes)
```json
[
  { "masterId": "ASC" },
  { "activationCodeId": "ASC", "createdAt": "DESC" },
  { "companyId": "ASC", "createdAt": "DESC" }
]
```

**Analysis:**
- ✅ No existing indexes use `accountType` or `vasFeatures`
- ✅ All current queries are properly indexed
- ✅ New fields don't require additional indexes

### 4. Future-Proofing Considerations

**Potential future queries that WOULD need indexes:**

1. **Query all free accounts:**
   ```typescript
   // Would need index: accountType + createdAt
   query(collection(db, 'users'), 
     where('accountType', '==', 'free'),
     orderBy('createdAt', 'desc')
   )
   ```

2. **Query users by VAS feature:**
   ```typescript
   // Would need index: vasFeatures (array-contains) + accountType
   query(collection(db, 'users'),
     where('vasFeatures', 'array-contains', 'analytics'),
     where('accountType', '==', 'free')
   )
   ```

3. **Admin dashboard queries:**
   ```typescript
   // Would need index: masterAccountId + accountType + createdAt
   query(collection(db, 'users'),
     where('masterAccountId', '==', accountId),
     where('accountType', '==', 'free'),
     orderBy('createdAt', 'desc')
   )
   ```

**Current Status:** None of these queries exist in the codebase.

## Documentation References

From `docs/ACCOUNT_TYPES_UPDATE.md`:
> ### Firestore Indexes
> No new indexes required. The optional fields use simple equality queries.

This statement is accurate because:
1. No queries currently filter by these fields
2. When documents are fetched, the entire document (including these fields) is retrieved
3. Filtering happens client-side via feature flag hooks

## Recommendations

### ✅ Current State (No Action Required)
- No index changes needed for the current implementation
- Existing indexes are sufficient for all current queries
- Client-side feature flag system works without database queries

### 🔮 Future Considerations

**IF** you later need to query by account type (e.g., for admin dashboards, billing, or analytics), add indexes at that time:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accountType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "masterAccounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "accountType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Files Analyzed

- `firestore.indexes.json` - Current index configuration
- `types/index.ts` - Type definitions for AccountType and VASFeatureId
- `contexts/AuthContext.tsx` - User authentication and data loading
- `utils/featureFlags.ts` - Feature flag logic (client-side only)
- `utils/hooks/useFeatureFlags.ts` - React hooks for feature access
- `docs/ACCOUNT_TYPES_UPDATE.md` - Implementation documentation
- All TypeScript/TSX files (8 files reference accountType/vasFeatures)

## Security Considerations

From `firestore.rules`:
```javascript
match /masterAccounts/{accountId} {
  allow read: if true;  // Open for login
  allow create: if true; // Allow signup
}

match /users/{userId} {
  allow read: if true;  // Open for login
}
```

**Note:** Current security rules allow public read access for login purposes. The app uses custom authentication (not Firebase Auth), so role-based security is enforced at the application level after login, not at the database level.

**Implication:** No security concerns with the new fields since:
1. They're already readable by all users (per existing rules)
2. Feature enforcement is client-side (appropriate for a mobile app)
3. Server-side enforcement would be needed for backend APIs (future consideration)

## Summary

**Question:** Do we need index changes for account type fields?  
**Answer:** **No**

**Rationale:**
1. No Firestore queries filter or sort by `accountType` or `vasFeatures`
2. Fields are used only for client-side feature flag evaluation
3. Documents are fetched using existing indexed fields
4. All current queries remain properly indexed

**Action Items:**
- ✅ No immediate action required
- 📝 Document findings (this file)
- 🔮 Monitor for future query patterns that might need indexes
- ⚠️ Add indexes if admin/analytics features are built that query by account type

---

**Reviewed by:** GitHub Copilot Agent  
**Status:** Analysis Complete ✅
