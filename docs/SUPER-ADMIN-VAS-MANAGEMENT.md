# Super Admin Access & VAS Management

## Overview

This document describes the super admin access system and VAS (Value-Added Services) subscription management interface for the MACHINE Business Tracker application.

## Super Admin Login

### Credentials
- **Username**: `admin`
- **Password**: `3002`

### How to Login
1. Open the app and go to the login screen
2. Enter username: `admin`
3. Enter password: `3002`
4. You will be logged in as Super Admin with full access

### Features
- Same login page as all other users
- Hardcoded authentication (no database lookup)
- Grants Admin role with full system access
- Access to all admin panels and management screens

## VAS & Subscription Management

### Accessing the UI
1. Login as super admin (username: `admin`, password: `3002`)
2. Navigate to **Admin Panel**
3. Tap **"VAS & Subscriptions"** button
4. The VAS Management screen will open

### Dashboard Overview

The dashboard shows key metrics at the top:
- **Total MRR**: Monthly Recurring Revenue from all accounts
- **Accounts**: Total number of master accounts
- **Enterprise**: Number of enterprise accounts
- **Free**: Number of free accounts

### Two Tabs

#### Accounts Tab
- View all master accounts
- See account type (Free/Enterprise)
- View VAS features enabled
- Calculate MRR per account
- Search by master ID, name, or national ID

#### Companies Tab
- View all companies
- See subscription tier
- View VAS features enabled
- Calculate MRR per company
- Search by company name or alias

### Managing an Account

1. **Open Account Details**
   - Tap any account card to open management modal

2. **Change Account Type**
   - Tap "Free" or "Enterprise" button
   - Changes apply immediately
   - Account type syncs across all sessions

3. **Toggle VAS Features**
   - Tap any VAS feature row to toggle on/off
   - Green checkmark = enabled
   - Gray X = disabled
   - Confirmation dialog appears before change
   - MRR updates automatically

### VAS Features Available

| Feature | Price | Description |
|---------|-------|-------------|
| Plant Manager | $79/mo | Asset tracking, timesheets, allocation |
| Staff Manager | $79/mo | Employee tracking, site allocations |
| Logistics | $59/mo | Material requests, delivery coordination |
| Operations Bundle | $149/mo | Planner, Supervisor, and QC modules |
| Analytics | $49/mo | Advanced analytics and insights |
| Reporting | $39/mo | Custom reports and exports |
| Data Exports | $29/mo | Export data in various formats |
| Marketplace | $99/mo | Access to plant asset marketplace |

### Search & Filter

- **Search bar** at top of screen
- Filter by:
  - Master ID or name (Accounts tab)
  - National ID number (Accounts tab)
  - Company name or alias (Companies tab)
- Real-time filtering as you type

### MRR Calculation

- **Monthly Recurring Revenue (MRR)** is calculated automatically
- Based on all active VAS features
- Shown on account cards and in detail modal
- Total MRR shown in dashboard stats

## Technical Details

### Files Modified/Created
- **contexts/AuthContext.tsx** - Added super admin login check
- **app/admin-vas-management.tsx** - New VAS management screen (NEW)
- **app/admin-panel.tsx** - Added navigation button

### Data Flow
1. Super admin logs in with hardcoded credentials
2. VAS management screen loads all master accounts and companies
3. Admin can view and modify VAS features
4. Changes are saved to Firestore `masterAccounts` collection
5. Updates include `vasFeatures` array and `accountType` field

### Firestore Updates
When VAS features are toggled:
```typescript
{
  vasFeatures: ['plant_manager_access', 'staff_manager_access'],
  updatedAt: serverTimestamp()
}
```

When account type is changed:
```typescript
{
  accountType: 'enterprise' | 'free',
  updatedAt: serverTimestamp()
}
```

## Security Considerations

### Current Implementation
- **Hardcoded credentials**: Username and password are hardcoded in AuthContext
- **Super admin role**: Has Admin role with full access
- **No additional authentication**: No 2FA or additional security layers

### Recommended Improvements
1. Move credentials to environment variables
2. Add audit logging for all subscription changes
3. Implement 2FA for super admin access
4. Add IP whitelisting
5. Create dedicated super admin role (separate from regular Admin)
6. Add rate limiting on VAS changes

## Usage Examples

### Example 1: Upgrade Account to Enterprise
1. Login as super admin
2. Go to VAS & Subscriptions
3. Search for account by master ID
4. Tap account card
5. Tap "Enterprise" button
6. Account type changes immediately

### Example 2: Add Plant Manager Feature
1. Login as super admin
2. Go to VAS & Subscriptions
3. Find target account
4. Tap account card
5. Scroll to VAS Features section
6. Tap "Plant Manager" row
7. Confirm in dialog
8. Feature is enabled and MRR updates

### Example 3: View Total Revenue
1. Login as super admin
2. Go to VAS & Subscriptions
3. Check "Total MRR" stat at top
4. Shows sum of all active subscriptions

## Troubleshooting

### Cannot Login as Super Admin
- Verify username is exactly: `admin` (lowercase)
- Verify password is exactly: `3002`
- Ensure using the same login page as other users

### VAS Changes Not Saving
- Check internet connection
- Verify Firestore security rules allow admin write access
- Check console for error messages

### MRR Not Calculating
- Ensure VAS features have prices defined
- Check account.vasFeatures array in Firestore
- Verify feature IDs match VAS_FEATURES array

## Future Enhancements

Potential improvements:
1. **Billing Integration**: Connect to Stripe or other payment processor
2. **Automated Invoicing**: Generate invoices based on active subscriptions
3. **Usage Metrics**: Track feature usage per account
4. **Subscription History**: View subscription change history
5. **Bulk Actions**: Enable/disable features for multiple accounts
6. **Email Notifications**: Notify users of subscription changes
7. **Grace Periods**: Allow grace period before feature deactivation
8. **Trial Periods**: Offer trial periods for VAS features
9. **Custom Pricing**: Set custom prices per account
10. **Analytics**: Revenue forecasting and churn analysis

## Related Documentation

- [Admin Disputes & Verification UI](./ADMIN-DISPUTES-VERIFICATION-UI.md)
- [VAS Management (User-facing)](./VAS-MANAGEMENT.md)
- [Account Types Guide](./ACCOUNT_TYPES_GUIDE.md)
- [Master Account System](./MASTER_ACCOUNT_SYSTEM_README.md)

## Support

For issues with super admin access or VAS management:
1. Verify credentials are correct
2. Check Firestore security rules
3. Review console logs for errors
4. Contact system administrator

---

**Last Updated**: January 2026  
**Version**: 1.0.0
