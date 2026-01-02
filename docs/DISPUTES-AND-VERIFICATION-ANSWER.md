# How to View Disputes and Verification Files in MACHINE

## Quick Answer

**YES**, MACHINE now has its own UI for viewing duplicate account disputes and verification files!

## Accessing Disputes & Verification Information

### Where to Find It

1. **Log into Admin Panel**
   - Navigate to the Admin Panel (restricted to admin users)
   
2. **Open Disputes & Verification Screen**
   - Tap on "Disputes & Verification" button in the Admin Panel
   - This opens the dedicated management interface

3. **View Information**
   - **Disputes Tab**: See all duplicate account disputes
   - **Verifications Tab**: Review ID verification requests and documents

## What You Can See

### For Duplicate Account Disputes

When duplicate accounts are detected, you can view:

- **National ID Number**: The disputed ID that's being used by multiple accounts
- **Dispute Status**: Whether it's pending, under investigation, resolved, or dismissed
- **Priority Level**: Critical, high, medium, or low
- **Reporter Information**: Who reported the duplicate
- **Account Details**: Both the existing account and the new account attempting to use the same ID
- **Explanation**: Detailed explanation from the person reporting
- **Supporting Documents**: Any files uploaded to support the dispute claim

### For ID Verification Requests

When users submit ID verification, you can review:

- **National ID Number**: The ID being verified
- **Document Type**: Passport, National ID, Driver's License, etc.
- **Verification Status**: Pending review, verified, or rejected
- **Account Information**: Which master account submitted the request
- **Submission Date**: When the verification was requested
- **Uploaded Document**: View and download the actual ID document file

## What Actions Can You Take

### For Verifications

✅ **Approve Verification**
- Grants user full account capabilities
- Enables company ownership rights
- Allows financial payouts
- Unlocks ownership approval permissions

❌ **Reject Verification**
- Requires providing a rejection reason
- Keeps account restrictions in place
- User must resubmit with correct documents

### For Disputes

👁️ **View Full Details**
- See complete dispute information
- Review all supporting documents
- Track resolution status
- View investigation notes

📥 **Download Documents**
- Access all uploaded supporting files
- View ID verification documents
- Review evidence for disputes

## File Verification Process

### How Documents Are Stored

1. **Upload**: Users upload ID documents through the app
2. **Storage**: Files stored securely in Firebase Storage
3. **Access**: Only admins can view verification documents
4. **Security**: Storage paths and URLs tracked for audit

### Supported Document Types

- National ID cards
- Passports
- Driver's Licenses
- Other government-issued IDs

### Viewing Files

- **In-App Preview**: Documents open directly from the UI
- **Document Details**: Filename, file size, and upload date visible
- **Download Option**: Save files locally for detailed review
- **Secure Access**: All document access is logged in audit trail

## Security & Privacy

### Who Can Access

- **Admin Users Only**: Restricted to authorized administrators
- **Audit Logged**: All views and actions are tracked
- **Secure Storage**: Documents protected by Firebase security rules

### What's Protected

- Personal identification documents
- National ID numbers
- Account holder information
- Dispute explanations and evidence

## User Interface Features

### Search & Filter

- Search by national ID number
- Search by account name
- Filter by status (pending, approved, rejected)
- Real-time results as you type

### Visual Indicators

- **Color-coded status badges**: Quick status identification
- **Priority markers**: See which disputes need immediate attention
- **Status icons**: Visual representation of verification states
- **Document preview buttons**: Easy access to files

### Responsive Design

- Works on mobile, tablet, and web
- Touch-optimized for tablets
- Scrollable lists for many items
- Modal dialogs for detailed views

## Example Workflow

### Handling a Duplicate Account Dispute

1. Open Admin Panel → Disputes & Verification
2. Select "Disputes" tab
3. Review the list of reported disputes
4. Tap on a dispute to see full details
5. View the explanation and supporting documents
6. Download any evidence files if needed
7. Take appropriate action based on your investigation

### Approving an ID Verification

1. Open Admin Panel → Disputes & Verification
2. Select "Verifications" tab
3. Find pending verification requests
4. Tap on a verification to review
5. Click "View Document" to see the uploaded ID
6. Verify the document is legitimate and matches the account
7. Tap "Approve" to grant verification (or "Reject" with reason)
8. User automatically gains appropriate permissions

## Technical Details

### New Files Added

- **UI Screen**: `app/admin-disputes-verification.tsx`
- **Documentation**: `docs/ADMIN-DISPUTES-VERIFICATION-UI.md`
- **Tests**: `__tests__/adminDisputesVerification.test.tsx`

### Backend Integration

- Uses existing `utils/masterIdVerification.ts` utilities
- Reads from `fraudDisputes` Firestore collection
- Reads from `masterIDVerification` Firestore collection
- Updates `masterAccounts` with verification status
- Logs all actions to `masterAccountAuditLogs`

### Data Models

- **FraudDispute**: Type definition for duplicate account disputes
- **MasterIDVerification**: Type definition for ID verification requests
- **DuplicateIDStatus**: Status tracking for duplicate detection

## Summary

**Question**: "How do we get the info for when the disputes for duplicate accounts happen, how do we see the files for verification do we have our own UI for MACHINE?"

**Answer**: 
✅ **YES** - MACHINE now has a dedicated admin UI for viewing disputes and verification files  
✅ **Accessible** - Through Admin Panel → "Disputes & Verification"  
✅ **Complete** - Shows all dispute details, verification requests, and uploaded documents  
✅ **Actionable** - Approve/reject verifications directly from the UI  
✅ **Secure** - Admin-only access with full audit logging  

## Need Help?

For more detailed information, see:
- [Admin Disputes & Verification UI Guide](./ADMIN-DISPUTES-VERIFICATION-UI.md)
- [Master Account System README](./MASTER_ACCOUNT_SYSTEM_README.md)

---

**Last Updated**: January 2026
