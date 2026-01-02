# Admin Disputes & Verification Management UI

## Overview

This document describes the administrative UI for managing duplicate account disputes and ID verification requests in the MACHINE Business Tracker application.

## Purpose

The Disputes & Verification Management UI provides administrators with tools to:
- Review and manage fraud disputes related to duplicate national ID numbers
- Review ID verification submissions from master accounts
- Approve or reject ID verification requests
- View supporting documentation uploaded by users
- Track dispute resolution status and priority

## Accessing the UI

### Navigation Path
1. Log in as an administrator
2. Navigate to **Admin Panel** screen
3. Tap on **"Disputes & Verification"** button
4. The Disputes & Verification screen will open

### Direct Route
The screen is accessible at: `/admin-disputes-verification`

## Features

### 1. Tab-Based Interface

The screen provides two main tabs:

#### Disputes Tab
- Displays all fraud disputes for duplicate national IDs
- Shows dispute status, priority, and involved parties
- Allows filtering and searching by ID number or account names

#### Verifications Tab
- Lists all ID verification requests
- Shows verification status and document type
- Provides document preview and download capabilities
- Allows approval/rejection of pending verifications

### 2. Dispute Management

Each dispute card displays:
- **National ID Number**: The disputed ID number
- **Status**: Current dispute state (pending, under_investigation, resolved, dismissed)
- **Priority**: Urgency level (critical, high, medium, low)
- **Reported By**: Name of the person reporting the dispute
- **Existing Account**: The original account holder
- **New Account**: The account attempting to use the same ID

#### Dispute Actions
- Tap any dispute card to view full details
- View explanation and supporting documents
- Download supporting documentation

### 3. ID Verification Management

Each verification card displays:
- **National ID Number**: The ID being verified
- **Document Type**: Type of ID document (national_id, passport, drivers_license, other)
- **Status**: Current verification state (pending_review, verified, rejected)
- **Master Account ID**: The account requesting verification
- **Submitted Date**: When the request was submitted

#### Verification Actions
For pending verifications:
- **Approve**: Grant verification and unlock account capabilities
  - User gains `canOwnCompanies`, `canReceivePayouts`, and `canApproveOwnershipChanges` permissions
  - Account status updated to "verified"
- **Reject**: Deny verification request
  - Requires rejection reason
  - Account remains restricted

### 4. Document Viewing

- Tap **"View Document"** button to open uploaded ID documents
- Documents open in system default viewer
- Supports images and PDF files
- Secure storage path tracking

### 5. Search and Filter

- **Search Bar**: Filter by national ID number, account names, or account IDs
- **Status Filter** (coming soon): Filter by dispute/verification status
- Real-time filtering as you type

## Data Flow

### Disputes
1. User reports duplicate ID via `reportFraudDispute()` utility
2. Dispute appears in admin UI "Disputes" tab
3. Admin reviews dispute details and supporting documents
4. Resolution status tracked in Firestore `fraudDisputes` collection

### Verifications
1. User submits ID verification via `submitIdVerification()` utility
2. Verification request appears in admin UI "Verifications" tab
3. Admin reviews document and account details
4. Admin approves or rejects using `approveIdVerification()` or `rejectIdVerification()`
5. User permissions updated automatically upon approval

## Technical Details

### File Locations
- **Main Screen**: `app/admin-disputes-verification.tsx`
- **Tests**: `__tests__/adminDisputesVerification.test.tsx`
- **Utilities**: `utils/masterIdVerification.ts`
- **Types**: `types/index.ts` (FraudDispute, MasterIDVerification)

### Firestore Collections Used
- `fraudDisputes` - Stores all fraud dispute records
- `masterIDVerification` - Stores ID verification requests
- `masterAccounts` - Updated with verification status
- `masterAccountAuditLogs` - Tracks admin actions

### Key Functions
```typescript
// Load disputes
loadDisputes(): Promise<DisputeWithId[]>

// Load verifications  
loadVerifications(): Promise<VerificationWithId[]>

// Approve verification
handleApproveVerification(verificationId: string): Promise<void>

// Reject verification
handleRejectVerification(verificationId: string): Promise<void>

// Open document
openDocument(url: string): Promise<void>
```

## UI Components

### Status Badges
- Color-coded by status (pending: orange, verified: green, rejected: red, etc.)
- Include status icons for quick visual identification

### Priority Badges
- Critical: Dark red
- High: Orange
- Medium: Blue
- Low: Gray

### Modal Dialogs
- **Dispute Detail Modal**: Full dispute information and documents
- **Verification Detail Modal**: Full verification info with approve/reject actions

## Security Considerations

1. **Admin Only**: This screen should only be accessible to authenticated administrators
2. **Document Access**: Document URLs are Firebase Storage URLs with security rules
3. **Audit Trail**: All approval/rejection actions are logged to `masterAccountAuditLogs`
4. **Permission Changes**: Verification approval automatically updates account permissions

## Best Practices

### For Administrators

1. **Review Thoroughly**: Always check all supporting documents before approving
2. **Provide Reasons**: When rejecting, always provide clear rejection reasons
3. **Priority Handling**: Address high-priority and critical disputes first
4. **Document Verification**: Ensure ID documents are clear, valid, and match the account holder

### For Developers

1. **Error Handling**: All Firebase operations include try-catch blocks
2. **Loading States**: Show loading indicators during async operations
3. **Optimistic Updates**: Refresh data after admin actions
4. **Type Safety**: All data structures are properly typed with TypeScript

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Actions**: Select multiple verifications for batch approval/rejection
2. **Advanced Filtering**: Filter by date range, document type, priority
3. **Dispute Resolution Actions**: Direct resolution tools within the UI
4. **Notification System**: Notify users when their verification is approved/rejected
5. **Analytics Dashboard**: Statistics on verification rates and dispute patterns
6. **Comment System**: Allow admins to add notes on disputes/verifications
7. **Image Cropping/Zoom**: Better document preview with zoom and crop tools
8. **OCR Integration**: Automatic ID number extraction from documents
9. **Duplicate Detection**: Highlight potential duplicate faces or IDs

## Troubleshooting

### No Disputes/Verifications Showing
- Check Firestore security rules allow admin read access
- Verify Firestore indexes are deployed (`fraudDisputes`, `masterIDVerification`)
- Check console for error messages

### Document Won't Open
- Verify Firebase Storage security rules
- Check document URL is valid and not expired
- Ensure device has appropriate app to open document type

### Approval/Rejection Not Working
- Check admin user permissions
- Verify Firebase connection
- Check console logs for error details
- Ensure Firestore security rules allow admin write access

## Related Documentation

- [Master Account System README](./MASTER_ACCOUNT_SYSTEM_README.md)
- [Master Account Ownership Guide](./MASTER_ACCOUNT_OWNERSHIP_GUIDE.md)
- [Firestore Indexes Setup](./FIRESTORE_INDEXES_SETUP.md)
- [Database Structure](./DATABASE-STRUCTURE.md)

## Support

For issues or questions about the Disputes & Verification UI:
1. Check console logs for detailed error messages
2. Review Firestore security rules
3. Verify all required indexes are deployed
4. Contact system administrator

---

**Last Updated**: January 2026  
**Version**: 1.0.0
