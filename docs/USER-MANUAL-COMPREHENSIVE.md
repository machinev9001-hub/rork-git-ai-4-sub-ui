# MACHINE Business Tracker - Complete User Manual

**Version:** 2.0  
**Last Updated:** January 2026  
**App Name:** MACHINE Business Tracker  
**Platform:** iOS, Android, Web

---

## 📖 Table of Contents

### Part 1: Getting Started
1. [Introduction](#1-introduction)
2. [Installation & Setup](#2-installation--setup)
3. [Account Creation](#3-account-creation)
4. [Logging In](#4-logging-in)

### Part 2: User Roles
5. [Understanding Roles](#5-understanding-roles)
6. [Master User Guide](#6-master-user-guide)
7. [Admin Guide](#7-admin-guide)
8. [Manager Roles](#8-manager-roles)
9. [Field Worker Roles](#9-field-worker-roles)

### Part 3: Core Features
10. [Dashboard & Navigation](#10-dashboard--navigation)
11. [Company & User Management](#11-company--user-management)
12. [Project & Task Management](#12-project--task-management)
13. [Time Tracking](#13-time-tracking)
14. [Asset Management](#14-asset-management)

### Part 4: Specialized Features
15. [Quality Control](#15-quality-control)
16. [Progress Tracking](#16-progress-tracking)
17. [Request Workflows](#17-request-workflows)
18. [Messaging](#18-messaging)
19. [Offline Mode](#19-offline-mode)

### Part 5: Administration
20. [Admin Panel](#20-admin-panel)
21. [Reports & Analytics](#21-reports--analytics)
22. [Settings & Configuration](#22-settings--configuration)
23. [Troubleshooting](#23-troubleshooting)

---

# Part 1: Getting Started

## 1. Introduction

### What is MACHINE Business Tracker?

MACHINE Business Tracker is a comprehensive cross-platform mobile application designed for managing construction projects, business operations, and workforce tracking. Built with React Native and Expo, it provides native performance on iOS, Android, and web browsers.

### Key Capabilities

**Project Management:**
- Multi-site project tracking
- Task and activity management
- Progress monitoring and reporting
- Bill of Quantities (BOQ)
- Quality control workflows

**Workforce Management:**
- Multiple user roles with permissions
- Time tracking and timesheets
- Face recognition clock-in/out
- Employee onboarding
- Subcontractor management

**Asset & Equipment:**
- Plant and equipment tracking
- Asset allocation and scheduling
- QR code-based identification
- Maintenance tracking
- Equipment marketplace

**Business Operations:**
- Multi-tenant company support
- Financial tracking
- Document management
- Request and approval workflows
- Real-time messaging

**Field Operations:**
- Offline mode for remote work
- GPS tracking
- Photo documentation
- Daily diary entries
- Real-time updates

---

## 2. Installation & Setup

### System Requirements

**Mobile Devices:**
- **iOS:** iPhone/iPad running iOS 13.0 or later
- **Android:** Android 5.0 (Lollipop) or later
- **Storage:** 100MB minimum (500MB recommended)
- **Internet:** WiFi or mobile data

**Web Access:**
- Modern browser (Chrome, Safari, Firefox, Edge)
- Minimum resolution: 1024x768
- Stable internet connection

### Installation Steps

#### iOS (iPhone/iPad)
1. Open App Store
2. Search for "MACHINE Business Tracker" or "Rork"
3. Tap Get/Download
4. Authenticate and install
5. Open the app

#### Android
1. Open Google Play Store
2. Search for "MACHINE Business Tracker"
3. Tap Install
4. Accept permissions
5. Open the app

#### Web Browser
1. Navigate to your company's MACHINE URL
2. Bookmark for easy access
3. Log in with credentials

### Required Permissions

| Permission | Purpose | Required |
|------------|---------|----------|
| Camera | QR codes, photos, face recognition | Yes |
| Location | Site tracking, geofencing | Yes |
| Storage | Save photos, documents, offline data | Yes |
| Notifications | Alerts and messages | Recommended |

---

## 3. Account Creation

### Account Types

**Enterprise Account:**
- Full business features
- Unlimited users and sites
- Custom branding
- Requires activation code

**Free Account:**
- Basic features
- Up to 5 users, single site
- Auto-generated activation
- Instant setup

### Creating Master Account (Enterprise)

1. **Launch App** and tap "Create Master Account"
2. **Select Account Type:** Choose "Enterprise" or "Free"
3. **Enter Activation Code** (Enterprise only):
   - Format: XXXX-XXXX-XXXX-XXXX
   - Provided by MACHINE administrator
4. **Fill Account Details:**
   - Master Name: Your full name
   - National ID: Government ID number
   - User ID: Choose unique ID (e.g., 3002)
   - PIN: 4-6 digit secure PIN
   - Confirm PIN: Re-enter PIN
   - Site Name: Primary project/site name
5. **Tap "Create Master Account"**
6. **SAVE YOUR CREDENTIALS** - Write down:
   - User ID
   - PIN
   - Site Name
7. **Complete ID Verification:**
   - Upload ID document photo
   - Take selfie for face recognition
   - Wait for approval if required
8. **Set Up Company Profile:**
   - Go to Settings → Company Settings
   - Enter business details
   - Save configuration

---

## 4. Logging In

### Login Methods

#### 1. User ID + PIN (Standard)
1. Open MACHINE
2. Enter User ID
3. Enter PIN when prompted
4. Tap "Sign In"

#### 2. QR Code Scan (Fastest)
1. Open MACHINE
2. Tap QR Code icon
3. Scan your QR code badge
4. Auto-login to dashboard

#### 3. Face Recognition
1. Open MACHINE
2. Look at camera
3. Auto-login when recognized

### Login Troubleshooting

**"Invalid Credentials"**
- Check User ID and PIN
- Verify with administrator
- Ensure Caps Lock is off

**"Account Not Found"**
- Account not created yet
- Contact Master User
- Verify correct company/site

**QR Code Won't Scan**
- Ensure good lighting
- Clean camera lens
- Hold steady 2-3 seconds
- Try manual entry

---

# Part 2: User Roles

## 5. Understanding Roles

### Role Hierarchy

```
Master User (System Owner)
    ├── Admin (Operations)
    │   ├── Planner (Planning)
    │   │   └── Supervisor (Field)
    │   │       ├── QC Inspector
    │   │       └── Surveyor
    │   ├── Plant Manager
    │   ├── Staff Manager
    │   └── Logistics Manager
    └── Operator (Worker)
```

### Quick Reference

| Role | Access | Primary Functions |
|------|--------|-------------------|
| **Master** | Full | System admin, all features |
| **Admin** | High | Operations, reporting |
| **Planner** | Medium-High | Planning, task creation |
| **Supervisor** | Medium | Task oversight, progress |
| **QC** | Medium | Quality checks |
| **Surveyor** | Medium | Measurements, grid |
| **Plant Mgr** | Medium | Equipment management |
| **Staff Mgr** | Medium | HR, payroll |
| **Logistics** | Medium | Materials, supplies |
| **Operator** | Low | Assigned tasks, time |

---

## 6. Master User Guide

### Overview
Complete system control for business owners and administrators.

**Key Functions:**
- System setup and configuration
- User and company management
- All data access
- Full reporting
- Theme customization

### Main Features

#### User Management
**Location:** Settings → Manage Users

**Create New User:**
1. Tap "Add User" button
2. Enter user details:
   - Name
   - National ID
   - User ID (unique)
   - Role selection
   - Site assignment
3. Generate QR code
4. Share credentials with user

**Edit User:**
1. Find user in list
2. Tap to expand card
3. Tap "Edit"
4. Modify details
5. Save changes

**Print QR Codes:**
1. Select user
2. Tap "Print QR Code"
3. QR code displays
4. Print or save image
5. Laminate for durability

#### Company Settings
**Location:** Settings → Company Settings

**Required Information:**
- Legal Entity Name
- Company Alias
- Physical Address
- Contact Number
- Admin Contact Name/Email
- Company Registration Number
- VAT Number

**Setup Steps:**
1. Navigate to Company Settings
2. Expand "Company Details"
3. Fill all required fields
4. Upload company logo (optional)
5. Tap "SAVE"
6. Verify information

#### Theme Customization
**Location:** Settings → Theme Settings

**Available Themes:**
1. **Default (Machine):** White/black/grey with yellow accents
2. **Dark Mode:** Dark grey/black, reduced eye strain
3. **High Contrast:** Pure black/white, outdoor visibility
4. **Field Mode:** Light grey, larger text, outdoor work
5. **Blueprint Mode:** Blue background, technical look

**Theme Modes:**
- **Global:** One theme for entire app
- **Per-Role:** Different theme per user role

**Change Theme:**
1. Open Theme Settings
2. Select "Global" or "Per-Role" mode
3. Choose theme(s)
4. Tap "Save Theme Settings"
5. App reloads with new theme

---

## 7. Admin Guide

### Overview
Operational management and oversight.

**Key Functions:**
- Project oversight
- User management (limited)
- Report generation
- Approval workflows

### Main Features

#### Admin Panel
**Location:** Settings → Admin Panel

**Features:**
- Disputes & Verification
- System Monitoring
- User Activity Logs
- Data Management

#### Disputes & Verification
**Location:** Admin Panel → Disputes & Verification

**View Disputes:**
1. Tap "Disputes" tab
2. Browse fraud disputes
3. Tap dispute to view details
4. Review documents
5. Investigate as needed

**ID Verification:**
1. Tap "Verifications" tab
2. Find pending verification
3. Tap to view details
4. Click "View Document"
5. Verify ID authenticity
6. Tap "Approve" or "Reject"
7. Enter reason if rejecting
8. User permissions update automatically

---

## 8. Manager Roles

### Planner

**Primary Functions:**
- Create projects and tasks
- Assign work to teams
- Set deadlines and priorities
- Monitor project timelines

**Key Screens:**
- Planner Dashboard
- Create Task
- Task Management
- Progress Overview

**Typical Workflow:**
1. Create new project/scope
2. Break down into activities
3. Create tasks within activities
4. Assign to supervisors
5. Set deadlines
6. Monitor progress

### Supervisor

**Primary Functions:**
- Oversee field operations
- Manage task execution
- Track team progress
- Report to management

**Key Screens:**
- Supervisor Dashboard
- Task Details
- Team Progress
- Daily Reports

**Typical Workflow:**
1. View assigned tasks
2. Assign to operators
3. Monitor completion
4. Update progress
5. Submit reports
6. Handle issues

### Plant Manager

**Primary Functions:**
- Equipment tracking
- Asset allocation
- Maintenance schedules
- Equipment timesheets

**Key Screens:**
- Plant Manager Assets
- Allocation Dashboard
- Equipment Timesheets
- Maintenance Logs

### Staff Manager

**Primary Functions:**
- Employee onboarding
- HR management
- Payroll oversight
- Staff requests

**Key Screens:**
- Employee Management
- Onboarding Dashboard
- Payroll Processing
- Staff Requests

### Logistics Manager

**Primary Functions:**
- Materials management
- Supply tracking
- Delivery coordination
- Resource allocation

**Key Screens:**
- Materials Dashboard
- Delivery Schedule
- Inventory Management
- Resource Requests

---

## 9. Field Worker Roles

### Operator

**Primary Functions:**
- Complete assigned tasks
- Track time worked
- Submit progress updates
- Clock in/out

**Key Screens:**
- Operator Home
- My Tasks
- Time Tracking
- Checklist

**Daily Workflow:**
1. **Clock In:**
   - Open app
   - Tap "Clock In"
   - Face recognition or PIN
2. **View Tasks:**
   - Check assigned tasks
   - Review priorities
   - Note deadlines
3. **Work & Update:**
   - Start task
   - Take photos if needed
   - Update progress
   - Add notes
4. **Complete Task:**
   - Mark as complete
   - Submit final photos
   - Confirm completion
5. **Clock Out:**
   - Tap "Clock Out"
   - Confirm hours
   - Submit timesheet

### QC Inspector

**Primary Functions:**
- Quality control checks
- Inspection reports
- Pass/fail decisions
- Documentation

**Key Screens:**
- QC Dashboard
- Inspection Checklist
- QC Reports
- Failed Items

**Inspection Workflow:**
1. Receive QC request
2. Navigate to site/location
3. Perform inspection
4. Complete checklist
5. Take verification photos
6. Mark pass/fail
7. Submit report
8. Notify relevant parties

### Surveyor

**Primary Functions:**
- Site measurements
- Grid tracking
- PV installation tracking
- Survey reports

**Key Screens:**
- Surveyor Dashboard
- Grid Tracking
- Measurement Tools
- Survey Reports

---

# Part 3: Core Features

## 10. Dashboard & Navigation

### Dashboard Overview

Each role has a customized dashboard showing relevant information and quick actions.

**Common Elements:**
- Welcome message with user name
- Quick action buttons
- Recent activity feed
- Notifications badge
- Navigation menu

**Navigation Structure:**
- **Bottom Tabs:** Primary navigation (Home, Tasks, Messages, Settings)
- **Side Menu:** Secondary features
- **Quick Actions:** Floating action buttons
- **Back Button:** Return to previous screen

### Notifications

**Types:**
- Task assignments
- Approval requests
- Status updates
- Messages
- System alerts

**Managing Notifications:**
1. Tap bell icon
2. View all notifications
3. Tap to open related item
4. Swipe to dismiss
5. Clear all (if available)

---

## 11. Company & User Management

### Company Management

**Update Company Info:**
1. Settings → Company Settings
2. Expand relevant section
3. Edit details
4. Tap Save
5. Confirm changes

**Manage Sites:**
1. Settings → Site Management
2. View all sites
3. Add new site
4. Edit site details
5. Archive inactive sites

### User Management

**Add User (Master/Admin):**
1. Settings → Manage Users
2. Tap "Add User"
3. Fill form:
   - Personal details
   - Role assignment
   - Site access
   - Permissions
4. Generate QR code
5. Save user

**Edit User:**
1. Find user in list
2. Tap user card
3. Tap "Edit"
4. Modify information
5. Save changes

**Suspend/Delete User:**
1. Open user details
2. Tap "Suspend" or "Delete"
3. Confirm action
4. User access removed

---

## 12. Project & Task Management

### Create Project

1. Go to Planner Dashboard
2. Tap "Create Project"
3. Enter project details:
   - Project name
   - Site selection
   - Start/end dates
   - Description
4. Save project

### Create Task

1. Select project
2. Tap "Create Task"
3. Fill task form:
   - Task name
   - Description
   - Assigned to (user/role)
   - Priority (Low/Med/High/Critical)
   - Deadline
   - Checklist items
4. Attach documents/photos
5. Save task

### Track Progress

**View Progress:**
1. Open Progress Dashboard
2. Select project/site
3. View completion percentage
4. See task breakdown
5. Filter by status

**Update Progress:**
1. Open task
2. Tap "Update Progress"
3. Enter completion %
4. Add notes
5. Upload photos
6. Save update

---

## 13. Time Tracking

### Clock In/Out

**Mobile Clock In:**
1. Open app
2. Tap "Clock In"
3. Face recognition or PIN verify
4. Confirm site/location
5. Start time recorded

**Mobile Clock Out:**
1. Tap "Clock Out"
2. Confirm hours worked
3. Add notes if needed
4. Submit timesheet

**QR Code Clock:**
1. Scan site QR code
2. Automatic clock in/out
3. Location verified
4. Time recorded

### Timesheets

**View My Timesheet:**
1. Go to Time Tracking
2. Select date range
3. View hours worked
4. Check billable hours
5. Export if needed

**Submit Timesheet (Operator):**
1. Complete week's work
2. Review hours
3. Add notes if needed
4. Submit for approval
5. Wait for manager approval

**Approve Timesheet (Manager):**
1. Go to Timesheets Dashboard
2. View pending timesheets
3. Review each entry
4. Verify hours
5. Approve or reject
6. Add comments if needed

---

## 14. Asset Management

### Plant & Equipment Tracking

**View Assets:**
1. Go to Plant Manager Assets
2. Browse equipment list
3. Filter by:
   - Type
   - Status
   - Location
   - Availability

**Add New Asset:**
1. Tap "Add Asset"
2. Enter details:
   - Asset name
   - Type/category
   - Serial number
   - Purchase date
   - Value
3. Generate QR code
4. Take photos
5. Save asset

### Asset Allocation

**Allocate Equipment:**
1. Select asset
2. Tap "Allocate"
3. Choose:
   - Site
   - Operator
   - Start date
   - End date
4. Add notes
5. Confirm allocation

**Return Equipment:**
1. Open asset details
2. Tap "Return"
3. Verify condition
4. Add return notes
5. Take photos
6. Confirm return

### Equipment Hours

**Log Equipment Hours:**
1. Select equipment
2. Tap "Log Hours"
3. Enter:
   - Hours used
   - Operator
   - Purpose
   - Fuel used
4. Submit log

---

# Part 4: Specialized Features

## 15. Quality Control

### QC Inspections

**Create QC Request:**
1. Open QC Dashboard
2. Tap "New Inspection"
3. Select:
   - Inspection type
   - Location
   - Task/activity
4. Assign to QC inspector
5. Set deadline
6. Submit request

**Perform Inspection:**
1. Open QC request
2. Review requirements
3. Navigate to location
4. Complete checklist:
   - Visual inspection
   - Measurements
   - Test results
5. Take verification photos
6. Mark items pass/fail
7. Add notes
8. Submit report

**View QC Results:**
1. Go to QC Completed
2. Filter by:
   - Date
   - Inspector
   - Result (pass/fail)
3. Open report
4. Review details
5. Export if needed

---

## 16. Progress Tracking

### Progress Dashboard

**View Overall Progress:**
1. Open Progress Dashboard
2. Select project/site
3. View:
   - Completion percentage
   - Tasks by status
   - Timeline
   - Milestones
4. Filter by date range

**Per-User Progress:**
1. Go to User Progress
2. Select user
3. View their tasks
4. See completion rates
5. Track productivity

### Update Progress

**Task Progress Update:**
1. Open task
2. Tap "Update Progress"
3. Set completion %
4. Add description
5. Upload photos
6. Save update
7. Notify stakeholders

---

## 17. Request Workflows

### Types of Requests

- Task requests
- Material requests
- Staff requests
- Equipment requests
- QC requests
- Scope requests

### Submit Request

**General Workflow:**
1. Navigate to Requests
2. Select request type
3. Fill request form:
   - Details
   - Quantity/specs
   - Deadline
   - Priority
4. Attach documents
5. Submit request
6. Track status

### Approve/Reject Request

**Manager Workflow:**
1. Go to Pending Requests
2. Review request details
3. Check availability
4. Verify requirements
5. Tap "Approve" or "Reject"
6. Add comments
7. Submit decision
8. Requester notified

---

## 18. Messaging

### Send Message

1. Tap Messages
2. Tap "New Message"
3. Select recipient(s)
4. Type message
5. Attach files (optional)
6. Send

### View Messages

1. Open Messages
2. See conversations
3. Unread shown in bold
4. Tap to open
5. Read and reply

### Notifications

- Push notifications for new messages
- Badge count on Messages tab
- In-app notification banner

---

## 19. Offline Mode

### How Offline Mode Works

MACHINE automatically switches to offline mode when internet is unavailable. Your data is saved locally and syncs when connection returns.

**Offline Capabilities:**
- View cached data
- Create/edit tasks
- Log time
- Take photos
- Fill forms
- Clock in/out

**Auto-Sync:**
- Detects connection
- Uploads pending data
- Downloads updates
- Resolves conflicts
- Notifies completion

### Using Offline Mode

**Prepare for Offline Work:**
1. Open relevant screens while online
2. Data caches automatically
3. Navigate to offline location
4. Continue working as normal

**Offline Indicators:**
- "Offline" banner at top
- Cloud icon with X
- Queue status shown

**Manual Sync:**
1. Return to connectivity
2. App syncs automatically
3. Or tap "Sync Now"
4. Wait for completion
5. Verify data uploaded

---

# Part 5: Administration

## 20. Admin Panel

### Access Admin Panel

**Location:** Settings → Admin Panel
**Required Role:** Master or Admin

### Features

**Disputes & Verification:**
- View fraud disputes
- Review ID verifications
- Approve/reject documents
- Investigate issues

**User Management:**
- View all users
- Activity logs
- Permission audits
- Bulk operations

**System Monitoring:**
- App usage statistics
- Performance metrics
- Error logs
- System health

---

## 21. Reports & Analytics

### Available Reports

**Project Reports:**
- Progress by project
- Task completion rates
- Timeline analysis
- Budget tracking

**Time Reports:**
- Employee hours
- Overtime tracking
- Billable hours
- Payroll summaries

**Asset Reports:**
- Equipment utilization
- Maintenance history
- Allocation patterns
- Cost analysis

### Generate Report

1. Go to Reports section
2. Select report type
3. Set parameters:
   - Date range
   - Filters
   - Grouping
4. Tap "Generate"
5. View report
6. Export (PDF/Excel)

---

## 22. Settings & Configuration

### App Settings

**Personal Settings:**
- Profile information
- Password/PIN change
- Notification preferences
- Language selection
- Theme preference

**Company Settings (Master):**
- Company profile
- Business details
- Branding
- System configuration

**Privacy & Security:**
- Face recognition settings
- Login security
- Data privacy
- Session timeout

### Backup & Data

**Automatic Backup:**
- Cloud backup enabled
- Daily automated backups
- 30-day retention
- Encrypted storage

**Manual Backup:**
1. Settings → Backup
2. Tap "Backup Now"
3. Wait for completion
4. Verify backup created

**Restore Data:**
1. Settings → Restore
2. Select backup date
3. Confirm restore
4. App restarts
5. Data restored

---

## 23. Troubleshooting

### Common Issues

**App Crashes:**
1. Force close app
2. Clear cache
3. Restart device
4. Update to latest version
5. Reinstall if persists

**Login Problems:**
- Verify credentials
- Check internet connection
- Reset password/PIN
- Contact administrator
- Clear app data

**Sync Issues:**
- Check connectivity
- Manually trigger sync
- Clear offline queue
- Restart app
- Contact support

**QR Code Not Scanning:**
- Ensure good lighting
- Clean camera lens
- Check QR code quality
- Try manual entry
- Update app

**Face Recognition Fails:**
- Ensure good lighting
- Remove glasses (if applicable)
- Re-register face
- Use PIN instead
- Check permissions

### Performance Issues

**App Running Slow:**
1. Close unused apps
2. Clear cache
3. Free up storage space
4. Update app
5. Restart device

**High Battery Usage:**
1. Reduce screen brightness
2. Disable background refresh
3. Turn off unused features
4. Update app
5. Check battery health

### Getting Help

**In-App Support:**
1. Go to Settings → Help
2. Browse FAQ
3. Search knowledge base
4. Submit support ticket

**Contact Support:**
- Email: support@machine-app.com
- Phone: [Your support number]
- Live Chat: Available in app
- Hours: Monday-Friday, 8am-6pm

**Community:**
- User forums
- Video tutorials
- Knowledge base
- Feature requests

---

## Appendix A: Keyboard Shortcuts (Web)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New task/item |
| `Ctrl/Cmd + S` | Save |
| `Ctrl/Cmd + F` | Search |
| `Ctrl/Cmd + ,` | Settings |
| `Esc` | Close modal |

## Appendix B: QR Code Format

MACHINE QR codes contain:
- User ID
- Company ID
- Timestamp
- Signature

Format: `MACHINE://user/[userid]/[companyid]/[timestamp]/[signature]`

## Appendix C: Glossary

**Activity:** Group of related tasks within a project
**Allocation:** Assignment of equipment/resources
**BOQ:** Bill of Quantities - project cost breakdown
**Clock In/Out:** Record work start/end time
**EPH:** Employee Per Hour - hourly rate agreements
**Master User:** System owner with full access
**Plant:** Heavy equipment and machinery
**QC:** Quality Control inspection
**Scope:** Project work package
**Surveyor:** Person performing measurements
**Timesheet:** Record of hours worked

---

## Document Information

**Version:** 2.0  
**Last Updated:** January 2026  
**Maintained By:** MACHINE Development Team  
**Feedback:** docs@machine-app.com  

**Related Documentation:**
- [Technical Guide](./TECHNICAL-GUIDE.md)
- [API Reference](./API-REFERENCE.md)
- [Firebase Indexes](./FIREBASE-INDEXES.md)
- [Authentication System](./AUTHENTICATION.md)
- [Offline System](./OFFLINE-SYSTEM.md)

---

**© 2026 MACHINE Business Tracker. All rights reserved.**
