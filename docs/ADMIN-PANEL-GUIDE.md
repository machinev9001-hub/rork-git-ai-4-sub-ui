# Admin Panel User Guide

## Overview

The MACHINE app includes a hidden admin panel for system administrators to manage activation codes, subscriptions, and other administrative tasks. Access is restricted by a PIN code.

## Accessing the Admin Panel

### Step 1: Long Press the Logo
On the login screen, **long press** (hold for 2 seconds) the MACHINE logo at the top of the screen.

### Step 2: Enter Admin PIN
- A red screen will appear requesting the admin PIN
- Enter: `3002`
- Click "Verify"

### Step 3: Access Admin Features
You'll be redirected to the Admin Panel with access to:
- ✅ Generate Activation Codes
- ✅ View All Activation Codes
- ✅ VAS & Subscriptions Management
- ✅ Disputes & Verification
- ✅ Site Data Diagnostic

## Admin Panel Features

### 1. Generate Activation Code

**Purpose:** Create new activation codes for companies to sign up

**Fields:**
- **Company Name (Optional):** Pre-fills the company name during signup
- **Expiry (Days):** Set how many days until the code expires (default: 365)
  - Leave empty for no expiry

**Process:**
1. Enter company name (optional but recommended)
2. Set expiry days (or leave blank)
3. Click "Generate Code"
4. Code is created and saved to database
5. Copy or Share the code to send to the company

**Generated Code Features:**
- Each code is unique and traceable
- Shows NEW badge for recently created codes
- Can copy code to clipboard
- Can share via system share menu
- Displays expiry date if set

### 2. View All Activation Codes

**Purpose:** Monitor and manage all activation codes across the system

**Features:**
- **Search:** Type to filter by code, company name, or account name
- **Filter by Status:**
  - All: Shows everything
  - Active: Codes ready to use
  - Redeemed: Codes that have been used
  - Expired: Codes past their expiry date
- **Pull to Refresh:** Drag down to reload latest data
- **Auto-Expire:** Codes are automatically marked expired if past their date

**Information Displayed:**
| Field | Description |
|-------|-------------|
| Status Badge | Active (green), Redeemed (blue), Expired (orange), Revoked (red) |
| Code | The activation code itself |
| Company | Company name assigned to this code |
| Redeemed By | Master account that used this code |
| Creation Date | When the code was generated |
| Redemption Date | When the code was redeemed |
| Expiry Date | When the code expires |
| Usage Stats | Shows X/Y redemptions (e.g., 1/1) |

**Example Card:**
```
┌─────────────────────────────────────┐
│ [REDEEMED] Blue Badge    2024-01-15 │
│                                     │
│        ABC-123-DEF-456              │
│                                     │
│ 🏢 Company: ACME Construction      │
│ 👤 Redeemed by: John Smith         │
│ 📅 Redeemed: 2024-01-20            │
│ ⏰ Expires: 2025-01-15             │
│ ─────────────────────────────────  │
│        Used: 1 / 1                 │
└─────────────────────────────────────┘
```

### 3. VAS & Subscriptions Management

**Purpose:** Manage value-added services and subscription plans

**Features:**
- View active subscriptions
- Manage VAS features for accounts
- Update subscription tiers
- Track subscription revenue

### 4. Disputes & Verification

**Purpose:** Handle duplicate account disputes and ID verification

**Features:**
- Review duplicate ID number reports
- Verify national ID submissions
- Resolve account ownership disputes
- Approve or reject verification requests

### 5. Site Data Diagnostic

**Purpose:** Check for site data isolation issues

**Features:**
- Verify site data is properly isolated
- Check for data leakage between sites
- Diagnose permission issues
- Validate data integrity

## Use Cases

### Use Case 1: Creating Code for New Client

**Scenario:** A new construction company wants to sign up

**Steps:**
1. Long press logo → Enter PIN 3002
2. In "Generate Activation Code" section:
   - Company Name: "ABC Construction"
   - Expiry: 365 days
3. Click "Generate Code"
4. Code appears: `CONSTR-2024-XYZ123`
5. Click "Share" and send to client via WhatsApp/Email
6. Client uses code during signup

### Use Case 2: Checking If Code Was Used

**Scenario:** Client says they didn't receive their code, need to verify if it was used

**Steps:**
1. Long press logo → Enter PIN 3002
2. Click "View All Activation Codes"
3. Search for company name: "ABC Construction"
4. Check status:
   - **ACTIVE** (green) = Not used yet, can share again
   - **REDEEMED** (blue) = Already used, check "Redeemed by" name

### Use Case 3: Finding Expired Codes

**Scenario:** Need to find all expired codes to clean up

**Steps:**
1. Long press logo → Enter PIN 3002
2. Click "View All Activation Codes"
3. Click "Expired" filter button
4. View list of all expired codes
5. Check if any need to be regenerated for legitimate companies

### Use Case 4: Auditing Recent Signups

**Scenario:** Review which companies have signed up this week

**Steps:**
1. Long press logo → Enter PIN 3002
2. Click "View All Activation Codes"
3. Click "Redeemed" filter
4. Check redemption dates
5. See which master accounts (users) signed up

## Best Practices

### For Activation Codes

1. **Always set company name** - Makes tracking easier
2. **Use appropriate expiry** - 365 days for standard, shorter for trials
3. **Keep records** - Screenshot or note which codes you give to which clients
4. **Monitor redemption** - Check if codes are being used
5. **Don't reuse codes** - Each company should get a unique code

### For Security

1. **Protect the PIN** - Never share the admin PIN (3002)
2. **Change PIN in production** - Update the hardcoded PIN for live deployments
3. **Log admin actions** - Monitor who accesses admin panel
4. **Regular audits** - Check activation codes monthly
5. **Close panel when done** - Always close/exit admin panel after use

### For Client Communication

**When sending activation code:**
```
Welcome to MACHINE App!

Your activation code: ABC-123-DEF-456
Expiry date: December 31, 2024

To activate:
1. Download MACHINE App
2. Click "Create New Account"
3. Enter this code when prompted
4. Complete your company setup

Need help? Contact support@machine.app
```

## Troubleshooting

### Problem: Can't access admin panel
- **Solution:** Ensure you're long-pressing (2+ seconds) the logo, not just tapping
- **Check:** Logo is visible on login screen only

### Problem: PIN doesn't work
- **Solution:** Verify you're entering exactly: `3002`
- **Check:** No spaces, correct numbers

### Problem: No codes showing in list
- **Solution:** 
  - Pull down to refresh
  - Check your internet connection
  - Verify Firestore database is accessible

### Problem: Code status not updating
- **Solution:**
  - Pull down to refresh the list
  - Auto-expiry happens on load, not real-time

### Problem: Can't search for specific code
- **Solution:**
  - Make sure code is spelled correctly
  - Search is case-insensitive
  - Try searching by company name instead

## Technical Details

### Data Storage

Activation codes are stored in Firestore collection: `activation_codes`

**Document Structure:**
```javascript
{
  code: "ABC-123-DEF-456",
  companyName: "ACME Construction",
  companyId: "company_1234567890",
  status: "active" | "redeemed" | "expired" | "revoked",
  expiryDate: Timestamp,
  redeemedAt: Timestamp,
  redeemedBy: "masterAccountId",
  createdAt: Timestamp,
  maxRedemptions: 1,
  currentRedemptions: 0,
  accountType: "enterprise"
}
```

### Permissions

Only users who know the admin PIN (3002) can access these features. There are no role-based restrictions in the app - the PIN is the security mechanism.

For production deployments:
1. Change the hardcoded PIN in `app/admin-pin-verify.tsx` line 18
2. Consider adding rate limiting for PIN attempts
3. Add audit logging for admin actions
4. Consider 2FA for admin access

## Future Enhancements

Planned features for future versions:

- [ ] Edit/extend code expiry dates
- [ ] Revoke codes manually
- [ ] Bulk code generation
- [ ] Export codes to CSV/Excel
- [ ] Email codes directly to clients
- [ ] View full master account details
- [ ] View subscription payment history
- [ ] Generate usage reports
- [ ] Code usage analytics
- [ ] Auto-cleanup of old codes

## Support

For technical support with the admin panel:
- Check console logs for detailed error messages
- Verify Firebase connection is active
- Ensure you have admin privileges
- Contact system administrator if issues persist
