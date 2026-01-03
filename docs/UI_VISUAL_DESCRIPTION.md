# Admin Disputes & Verification UI - Visual Description

## Screen Layout

### Header Section
```
┌─────────────────────────────────────────────────────┐
│ 🛡️  Disputes & Verification                    [X] │
│ Manage duplicate account disputes and ID verification│
└─────────────────────────────────────────────────────┘
```
- **Background**: Blue gradient (#1e3a8a → #3b82f6 → #60a5fa)
- **Icon**: Shield icon (security)
- **Title**: "Disputes & Verification"
- **Subtitle**: Descriptive text
- **Close Button**: X icon in top-right

### Tab Navigation
```
┌──────────────────────┬──────────────────────┐
│ ⚠️  Disputes (5)     │  📄 Verifications (3)│
└──────────────────────┴──────────────────────┘
```
- **Active Tab**: Blue background (#3b82f6), white text
- **Inactive Tab**: Gray text (#64748b)
- **Icons**: Alert triangle for disputes, file for verifications
- **Count**: Shows number of items in each tab

### Search Bar
```
┌─────────────────────────────────────────────────────┐
│ 🔍  Search by ID number or name...                  │
└─────────────────────────────────────────────────────┘
```
- **Icon**: Magnifying glass
- **Placeholder**: "Search by ID number or name..."
- **Background**: White with subtle shadow

## Disputes Tab

### Dispute Card Example
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Duplicate ID Dispute        [PENDING] 🟠       │
│                                                      │
│ National ID:    987-654-3210                        │
│ Reported By:    John Smith                          │
│ Existing Acc:   ABC Construction Ltd                │
│ New Account:    XYZ Builders Inc                    │
│ Priority:       [HIGH] 🟧                           │
└─────────────────────────────────────────────────────┘
```

**Color Codes:**
- 🟢 Green: Resolved
- 🔴 Red: Dismissed
- 🟠 Orange: Pending
- 🔵 Blue: Under Investigation

**Priority Badges:**
- 🟥 Critical (Dark Red)
- 🟧 High (Orange)
- 🟦 Medium (Blue)
- ⬜ Low (Gray)

### Dispute Detail Modal
```
┌─────────────────────────────────────────────────────┐
│ Dispute Details                              [X]    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ DISPUTE INFORMATION                                 │
│ Status:         [PENDING] 🟠                        │
│ Priority:       [HIGH] 🟧                           │
│ Dispute Type:   duplicate_id                        │
│ National ID:    987-654-3210                        │
│                                                      │
│ PARTIES INVOLVED                                    │
│ Reported By:    John Smith                          │
│ Email:          john@example.com                    │
│ Existing Acc:   ABC Construction Ltd                │
│ New Account:    XYZ Builders Inc                    │
│                                                      │
│ EXPLANATION                                         │
│ This is my legitimate ID. The other account         │
│ appears to be fraudulent. I have documents...       │
│                                                      │
│ SUPPORTING DOCUMENTS                                │
│ 📄 national_id_front.jpg          ⬇️              │
│ 📄 national_id_back.jpg           ⬇️              │
│ 📄 proof_of_address.pdf           ⬇️              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Verifications Tab

### Verification Card Example
```
┌─────────────────────────────────────────────────────┐
│ 📄 ID Verification        ⏰ [PENDING REVIEW]       │
│                                                      │
│ National ID:    123-456-7890                        │
│ Document Type:  NATIONAL ID                         │
│ Master Account: master_xyz123                       │
│ Submitted:      Jan 2, 2026                         │
│                                                      │
│ [👁️  View Document]                                 │
└─────────────────────────────────────────────────────┘
```

### Verification Detail Modal
```
┌─────────────────────────────────────────────────────┐
│ Verification Details                         [X]    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ VERIFICATION INFORMATION                            │
│ Status:         ⏰ [PENDING REVIEW]                 │
│ National ID:    123-456-7890                        │
│ Document Type:  NATIONAL ID                         │
│ Master Acc ID:  master_xyz123                       │
│ Submitted At:   Jan 2, 2026 10:30 AM               │
│                                                      │
│ DOCUMENT PREVIEW                                    │
│ ┌─────────────────────────────────────────────┐    │
│ │                                              │    │
│ │          📄                                  │    │
│ │     national_id.jpg                          │    │
│ │     Tap to open                              │    │
│ │                                              │    │
│ └─────────────────────────────────────────────┘    │
│                                                      │
│ [✅ Approve]              [❌ Reject]                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Empty States

### No Disputes
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│                    ⚠️                                │
│                                                      │
│              No disputes found                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### No Verifications
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│                    📄                                │
│                                                      │
│          No verifications found                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Loading State
```
┌─────────────────────────────────────────────────────┐
│                                                      │
│                    ⏳                                │
│                                                      │
│                 Loading...                           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Interactive Elements

### Buttons
- **Approve** (Green): ✅ Approve
- **Reject** (Red): ❌ Reject
- **View Document** (Blue): 👁️ View Document
- **Download** (Blue): ⬇️

### Status Indicators
- 🟢 Verified / Resolved
- 🔴 Rejected / Dismissed
- 🟠 Pending / Pending Review
- 🔵 Under Investigation
- ⏰ Pending (with clock icon)
- ✅ Approved (with checkmark)
- ❌ Rejected (with X mark)

## Color Palette

### Primary Colors
- **Blue Gradient**: #1e3a8a → #3b82f6 → #60a5fa (Header)
- **White**: #ffffff (Cards, Background)
- **Light Gray**: #f8fafc (Page background)

### Status Colors
- **Success/Approved**: #10b981 (Green)
- **Error/Rejected**: #ef4444 (Red)
- **Warning/Pending**: #f59e0b (Orange)
- **Info**: #3b82f6 (Blue)
- **Neutral**: #6b7280 (Gray)

### Priority Colors
- **Critical**: #dc2626 (Dark Red)
- **High**: #f59e0b (Orange)
- **Medium**: #3b82f6 (Blue)
- **Low**: #6b7280 (Gray)

### Text Colors
- **Primary**: #1e293b (Dark)
- **Secondary**: #64748b (Medium Gray)
- **Disabled**: #94a3b8 (Light Gray)

## Typography

### Headers
- **Screen Title**: 24px, Bold, White
- **Section Title**: 16px, Semibold, Dark
- **Card Title**: 16px, Semibold, Dark

### Body Text
- **Label**: 14px, Medium, Gray
- **Value**: 14px, Regular, Dark
- **Subtitle**: 13px, Regular, Gray

## Spacing

- **Card Padding**: 16px
- **Card Margin**: 12px bottom
- **Section Spacing**: 24px
- **Element Gap**: 8px - 12px

## Shadows & Elevations

- **Cards**: Subtle shadow (0, 2, 0.1, 4)
- **Modals**: Stronger shadow (0, 4, 0.1, 8)
- **Buttons**: No shadow (flat design)

## Responsive Behavior

### Mobile (< 768px)
- Single column layout
- Full-width cards
- Stack buttons vertically in modals

### Tablet (768px - 1024px)
- Single column with wider cards
- Horizontal button layout
- Larger touch targets

### Desktop (> 1024px)
- Can show multiple columns (future enhancement)
- Sidebar navigation (future enhancement)
- Hover states on cards

## Accessibility Features

- High contrast text
- Large touch targets (min 44x44pt)
- Clear visual hierarchy
- Status icons + color (not color alone)
- Readable font sizes
- Proper label associations

## Animation & Transitions

- **Modal**: Slide up from bottom
- **Card Press**: Subtle scale (0.98)
- **Tab Switch**: Fade transition
- **Loading**: Spinner rotation

---

This visual description helps understand the layout and design of the Admin Disputes & Verification UI without needing actual screenshots.
