# Progress Dashboard Time Range Filtering

## Overview

The Progress Dashboard supports flexible time range filtering, allowing users to view current week data, historical weekly data, and monthly aggregated data. This feature enables comprehensive progress tracking and historical analysis.

---

## Time Range Types

### 1. ALL_TIME
**Description:** Shows all recorded progress data without any time filtering.

**Use Case:** 
- View complete project history
- Analyze total cumulative progress
- Identify long-term trends

**Data Collection:**
- Queries all `activityHistory` records for the filtered scope
- No date filtering applied
- Aggregates all historical data

**Access:** Default view when dashboard loads

---

### 2. CURRENT_WEEK
**Description:** Shows progress data for the current week (Monday to Sunday).

**Use Case:**
- Monitor this week's progress
- Track current team performance
- Review ongoing work

**Data Collection:**
```typescript
// Week boundaries calculated from current date
const startOfWeek = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
const endOfWeek = endOfWeek(new Date(), { weekStartsOn: 1 });     // Sunday

// Query activityHistory
where('timestamp', '>=', startOfWeek)
where('timestamp', '<=', endOfWeek)
```

**Access:** Sidebar → Time Range → "Current Week"

---

### 3. CUSTOM_WEEK (Historical Week)
**Description:** Shows progress data for any selected historical week.

**Use Case:**
- Review past week's performance
- Compare week-over-week progress
- Audit historical data
- Generate weekly reports

**UI Interaction:**
1. User taps "Historical Week" in sidebar
2. Calendar date picker appears
3. User selects any date (system calculates that week's Monday-Sunday range)
4. Tap "Apply" to load data

**Data Collection:**
```typescript
// Calculate week boundaries from selected date
const selectedDate = userSelectedDate;
const startOfWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
const endOfWeek = endOfWeek(selectedDate, { weekStartsOn: 1 });

// Query activityHistory for that specific week
where('timestamp', '>=', startOfWeek)
where('timestamp', '<=', endOfWeek)
```

**Calendar Widget:**
- Platform: `@react-native-community/datetimepicker`
- Mode: Date selection
- Behavior: Selecting any date within a week loads that entire week's data
- Display: Shows selected week range (e.g., "Week of Dec 18-24, 2024")

**Access:** Sidebar → Time Range → "Historical Week" → Calendar Picker

---

### 4. MONTHLY
**Description:** Shows aggregated progress data for an entire month.

**Use Case:**
- Monthly performance reports
- Long-term progress tracking
- Budget and resource planning
- Monthly invoicing/billing

**UI Interaction:**
1. User taps "Monthly" in sidebar
2. Month/Year picker appears
3. User selects month and year (e.g., "January 2025")
4. Tap "Apply" to load data

**Data Collection:**
```typescript
// Calculate month boundaries from selected month/year
const startOfMonth = new Date(year, month - 1, 1);
const endOfMonth = new Date(year, month, 0, 23, 59, 59);

// Query activityHistory for entire month
where('timestamp', '>=', startOfMonth)
where('timestamp', '<=', endOfMonth)

// Aggregate data by week within month for chart display
```

**Month Picker:**
- Platform: `@react-native-community/datetimepicker`
- Mode: Month selection (iOS) / Date picker set to first of month (Android)
- Display: Shows selected month/year (e.g., "January 2025")

**Access:** Sidebar → Time Range → "Monthly" → Month Picker

---

## Sidebar UI Design

### Time Range Section

Located in Dashboard Filter Sidebar (`/components/DashboardFilterSidebar.tsx`)

```
┌─────────────────────────────────┐
│ ▼ Time Range                    │
│   ○ All Time                    │
│   ● Current Week                │
│   ○ Historical Week    [📅]     │
│   ○ Monthly            [📅]     │
└─────────────────────────────────┘
```

**Visual Indicators:**
- Selected option: Filled radio button (●) + highlighted background
- Unselected options: Empty radio button (○)
- Calendar icon ([📅]) appears next to Historical Week and Monthly
- Tapping calendar icon opens date picker modal

**Expandable Section:**
- Section header: "Time Range" with expand/collapse chevron
- Default state: Expanded
- Persists state during session

---

## Date Picker Modals

### Historical Week Picker

**Modal Design:**
```
┌──────────────────────────────────┐
│  Select Week                  ✕ │
│ ┌──────────────────────────────┐ │
│ │   [Calendar Widget]          │ │
│ │   December 2024              │ │
│ │   S  M  T  W  T  F  S        │ │
│ │                  1  2  3  4  │ │
│ │   5  6  7  8  9 10 11        │ │
│ │  12 13 14 [15] 16 17 18      │ │
│ │  19 20 21 22 23 24 25        │ │
│ └──────────────────────────────┘ │
│                                  │
│  Selected Week:                  │
│  Dec 11-17, 2024                │
│                                  │
│         [APPLY]                  │
└──────────────────────────────────┘
```

**Behavior:**
- Select any date → Entire week (Mon-Sun) highlights
- Display shows calculated week range
- "Apply" button commits selection
- "✕" button cancels and closes modal

### Monthly Picker

**Modal Design:**
```
┌──────────────────────────────────┐
│  Select Month                 ✕ │
│ ┌──────────────────────────────┐ │
│ │   [Month/Year Picker]        │ │
│ │                              │ │
│ │      January   2025          │ │
│ │         ↑         ↑          │ │
│ │         ↓         ↓          │ │
│ └──────────────────────────────┘ │
│                                  │
│  Selected Month:                 │
│  January 2025                    │
│                                  │
│         [APPLY]                  │
└──────────────────────────────────┘
```

**Behavior:**
- Scroll to select month
- Scroll to select year
- Display shows selected month/year
- "Apply" button commits selection
- "✕" button cancels and closes modal

---

## Data Queries and Indexes

### Activity History Collection

**Collection:** `activityHistory`

**Relevant Fields:**
```typescript
{
  id: string;
  activityId: string;
  taskId: string;
  siteId: string;
  pvArea?: string;
  blockArea?: string;
  supervisorId?: string;
  timestamp: Timestamp;        // Used for time filtering
  completedToday: number;
  completedTotal: number;
  scopeValue: number;
  unit: string;
  submittedBy: string;
}
```

### Required Firebase Indexes

**For Time-Range Queries:**

```json
[
  {
    "collectionGroup": "activityHistory",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "timestamp", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "activityHistory",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "pvArea", "order": "ASCENDING" },
      { "fieldPath": "timestamp", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "activityHistory",
    "fields": [
      { "fieldPath": "siteId", "order": "ASCENDING" },
      { "fieldPath": "blockArea", "order": "ASCENDING" },
      { "fieldPath": "timestamp", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "activityHistory",
    "fields": [
      { "fieldPath": "supervisorId", "order": "ASCENDING" },
      { "fieldPath": "timestamp", "order": "DESCENDING" }
    ]
  }
]
```

**Query Examples:**

**Current Week - All Site Data:**
```typescript
const q = query(
  collection(db, 'activityHistory'),
  where('siteId', '==', currentSiteId),
  where('timestamp', '>=', startOfWeek),
  where('timestamp', '<=', endOfWeek),
  orderBy('timestamp', 'desc')
);
```

**Historical Week - PV Area Filtered:**
```typescript
const q = query(
  collection(db, 'activityHistory'),
  where('siteId', '==', currentSiteId),
  where('pvArea', '==', selectedPvArea),
  where('timestamp', '>=', historicalWeekStart),
  where('timestamp', '<=', historicalWeekEnd),
  orderBy('timestamp', 'desc')
);
```

**Monthly - Supervisor Filtered:**
```typescript
const q = query(
  collection(db, 'activityHistory'),
  where('supervisorId', '==', selectedSupervisorId),
  where('timestamp', '>=', startOfMonth),
  where('timestamp', '<=', endOfMonth),
  orderBy('timestamp', 'desc')
);
```

---

## Data Aggregation and Display

### Weekly View (Current + Historical)

**Aggregation Logic:**
```typescript
// Group by day of week (Mon-Sun)
const dailyProgress = {};
activityHistory.forEach(record => {
  const dayKey = format(record.timestamp, 'yyyy-MM-dd');
  if (!dailyProgress[dayKey]) {
    dailyProgress[dayKey] = {
      date: dayKey,
      completedToday: 0,
      activities: []
    };
  }
  dailyProgress[dayKey].completedToday += record.completedToday;
  dailyProgress[dayKey].activities.push(record);
});
```

**Chart Display:**
- X-Axis: Days of week (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- Y-Axis: Completed units
- Bar Chart: Daily progress bars
- Tooltip: Shows exact values and unit

**Summary Cards:**
- Total Week Progress: Sum of all daily values
- Average Daily Progress: Total ÷ 7
- Best Performing Day: Highest daily value
- Activities Completed: Count of activities with progress

### Monthly View

**Aggregation Logic:**
```typescript
// Group by week within month
const weeklyProgress = {};
activityHistory.forEach(record => {
  const weekNumber = getWeek(record.timestamp);
  const weekKey = `Week ${weekNumber}`;
  if (!weeklyProgress[weekKey]) {
    weeklyProgress[weekKey] = {
      week: weekKey,
      completedTotal: 0,
      activities: []
    };
  }
  weeklyProgress[weekKey].completedTotal += record.completedToday;
  weeklyProgress[weekKey].activities.push(record);
});
```

**Chart Display:**
- X-Axis: Weeks of month (Week 1, Week 2, Week 3, Week 4, Week 5)
- Y-Axis: Completed units
- Bar Chart: Weekly aggregated progress
- Tooltip: Shows week range and values

**Summary Cards:**
- Total Month Progress: Sum of all weekly values
- Average Weekly Progress: Total ÷ number of weeks
- Best Performing Week: Highest weekly value
- Total Activities: Count of unique activities

---

## Integration with Existing Filters

### Combined Filtering

Time range filtering works **in combination with** existing dashboard filters:

**Filter Hierarchy:**
1. Site Selection (mandatory)
2. Spatial Filter (ALL / PV_AREA / PV_AREA_BLOCK)
3. Supervisor Filter (optional)
4. **Time Range Filter** (ALL_TIME / CURRENT_WEEK / CUSTOM_WEEK / MONTHLY)

**Example Combined Query:**
```
Show me:
- Site: Solar Farm Alpha (siteId filter)
- PV Area: PV-A1 (pvArea filter)
- Supervisor: John Smith (supervisorId filter)
- Time: Historical Week of Dec 11-17, 2024 (timestamp filter)
```

Results in:
```typescript
const q = query(
  collection(db, 'activityHistory'),
  where('siteId', '==', 'site123'),
  where('pvArea', '==', 'PV-A1'),
  where('supervisorId', '==', 'user456'),
  where('timestamp', '>=', Timestamp.fromDate(new Date('2024-12-11'))),
  where('timestamp', '<=', Timestamp.fromDate(new Date('2024-12-17'))),
  orderBy('timestamp', 'desc')
);
```

### Filter Persistence

**During Session:**
- Selected time range persists when changing spatial filters
- Selected time range persists when changing supervisors
- Resets to CURRENT_WEEK on site change

**Across Sessions:**
- Not persisted (resets to CURRENT_WEEK on app restart)
- Future enhancement: Save user preference to AsyncStorage

---

## Performance Considerations

### Query Optimization

**Best Practices:**
1. Always include siteId in queries (most selective)
2. Add time range filters to limit result set
3. Use composite indexes for multi-field queries
4. Paginate results if exceeding 1000 records

**Query Limits:**
```typescript
import { DEFAULT_QUERY_LIMITS } from '@/utils/firebaseQueryHelpers';

const q = query(
  collection(db, 'activityHistory'),
  where('siteId', '==', siteId),
  where('timestamp', '>=', startDate),
  where('timestamp', '<=', endDate),
  orderBy('timestamp', 'desc'),
  limit(DEFAULT_QUERY_LIMITS.MAX) // 100
);
```

### Caching Strategy

**Client-Side Cache:**
- Cache weekly data after first load
- Invalidate cache when new progress submitted
- Store in component state or React Query cache

**Example with React Query:**
```typescript
const { data: weeklyData } = useQuery({
  queryKey: ['activityHistory', siteId, 'week', weekStartDate],
  queryFn: () => fetchWeeklyData(siteId, weekStartDate),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});
```

---

## User Workflows

### Viewing Current Week Progress

**Steps:**
1. Navigate to Dashboard (home screen)
2. Default view shows "Current Week" data
3. Progress charts display this week's daily data
4. Summary cards show week-to-date totals

**What User Sees:**
- Current week date range in header (e.g., "Dec 18-24, 2024")
- Daily progress bars (Mon-Sun)
- Running totals and averages
- Activities in progress

### Reviewing Historical Week

**Steps:**
1. Open Dashboard Filter Sidebar
2. Expand "Time Range" section
3. Tap "Historical Week"
4. Calendar picker modal opens
5. Select any date from past week (e.g., Dec 10, 2024)
6. System calculates week range (Dec 9-15, 2024)
7. Tap "Apply"
8. Dashboard reloads with historical data

**What User Sees:**
- Selected week date range in header (e.g., "Dec 9-15, 2024")
- Historical daily progress bars
- Historical totals and averages
- Completed activities from that week

### Generating Monthly Report

**Steps:**
1. Open Dashboard Filter Sidebar
2. Expand "Time Range" section
3. Tap "Monthly"
4. Month picker modal opens
5. Select month and year (e.g., "January 2025")
6. Tap "Apply"
7. Dashboard reloads with monthly aggregated data

**What User Sees:**
- Selected month/year in header (e.g., "January 2025")
- Weekly progress bars for the month
- Monthly totals and averages
- All activities worked on during the month

### Comparing Weeks

**Steps:**
1. View Current Week data (note totals)
2. Switch to Historical Week (select previous week)
3. Compare charts and summary cards
4. Identify performance trends (improving/declining)
5. Take screenshots or export data for reporting

---

## Mobile Responsiveness

### Sidebar Behavior

**Mobile (< 768px width):**
- Sidebar overlays content
- Tap overlay to close sidebar
- Sidebar scrolls independently
- Bottom safe area padding applied (Android navigation bar)

**Tablet/Desktop (>= 768px width):**
- Sidebar always visible on left
- Content area adjusts to remaining width
- No overlay behavior

### Date Picker Behavior

**iOS:**
- Native iOS date picker appears
- Smooth scrolling wheels
- Month picker uses iOS-style wheel

**Android:**
- Calendar grid view appears
- Material Design date picker
- Month picker shows month grid

**Web:**
- HTML5 date input falls back to text input with placeholder
- Manual date entry with format validation
- Consider adding web-specific date picker library

---

## Error Handling

### No Data Available

**Scenario:** User selects time range with no recorded progress

**Behavior:**
```
┌─────────────────────────────────┐
│  No Data Available              │
│                                 │
│  No progress recorded for:      │
│  Week of Dec 9-15, 2024         │
│                                 │
│  Try selecting a different      │
│  time range or check if         │
│  progress was submitted.        │
│                                 │
│  [SELECT DIFFERENT WEEK]        │
└─────────────────────────────────┘
```

### Query Failures

**Scenario:** Firebase query fails or times out

**Behavior:**
- Show error toast notification
- Retain previous data on screen
- Provide retry button
- Log error for debugging

**Error Message:**
```
"Failed to load progress data. Please check your connection and try again."
[RETRY]
```

### Date Picker Errors

**Scenario:** User selects future date (not allowed for historical week)

**Behavior:**
- Show validation error
- Disable "Apply" button
- Display helper text: "Cannot select future dates"

---

## Future Enhancements

### Planned Features

1. **Date Range Picker**
   - Select custom start and end dates
   - Not limited to week boundaries
   - More flexible reporting

2. **Compare Mode**
   - Side-by-side week comparison
   - Highlight differences
   - Trend arrows (↑ ↓)

3. **Export Functionality**
   - Export filtered data to CSV
   - Generate PDF reports
   - Email monthly summaries

4. **Saved Filter Presets**
   - Save frequently used filter combinations
   - Quick access to "Last Month" or "Q4 2024"
   - Share presets with team

5. **Calendar Heat Map**
   - Visual calendar showing activity levels
   - Color-coded by productivity
   - Click date to view details

---

## Related Documentation

- [USER-GUIDE.md](./USER-GUIDE.md) - General user workflows
- [DUAL-ALLOCATION-SYSTEM.md](./DUAL-ALLOCATION-SYSTEM.md) - Asset/employee allocation
- [DATABASE-STRUCTURE.md](./DATABASE-STRUCTURE.md) - Firebase collections and indexes
- [FIREBASE-INDEXES.md](./FIREBASE-INDEXES.md) - Complete index list
- [OPTIMIZATION-IMPROVEMENTS.md](./OPTIMIZATION-IMPROVEMENTS.md) - Query optimization

---

**Last Updated:** January 3, 2026  
**Version:** 1.0
