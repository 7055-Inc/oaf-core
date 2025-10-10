# Event Status Database Analysis

## 1. Events Table Schema - Status Column Details

### Primary Status Column: `event_status`
- **Type**: `enum('draft','active','archived')`
- **Default**: `'draft'`
- **Nullable**: YES

### Secondary Status Column: `application_status`
- **Type**: `enum('not_accepting','accepting','closed','jurying','artists_announced','event_completed')`
- **Default**: `'not_accepting'`
- **Nullable**: YES

### Current Data Distribution
```sql
SELECT event_status, COUNT(*) as count FROM events GROUP BY event_status;
```
**Results:**
- `active`: 9 events
- `draft`: 0 events (currently)
- `archived`: 0 events (currently)

## 2. Event Status Query Examples

### Example 1: Frontend Events List (Public View)
**File**: `pages/events/index.js` (lines 24-26)
```javascript
const queryParams = new URLSearchParams({
  event_status: 'active,draft' // Show active and upcoming events
});
```

### Example 2: API Route with Status Filtering
**File**: `api-service/src/routes/events.js` (lines 66-70)
```javascript
if (event_status) {
  const statuses = event_status.split(',');
  query += ` AND e.event_status IN (${statuses.map(() => '?').join(',')})`;
  params.push(...statuses);
}
```

### Example 3: Dashboard - Current vs Archived Events
**File**: `components/dashboard/my-events/components/EventsIOwn.js` (lines 25, 33)
```javascript
// Fetch current events (draft and active)
const currentResponse = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&event_status=draft,active`));

// Fetch archived events
const archivedResponse = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&event_status=archived`));
```

## 3. Event Status Transitions

### Creation (Draft → Active)
**File**: `api-service/src/routes/events.js` (line 185)
```javascript
const event_status = 'active'; // Auto-set to active
```
**Note**: New events are automatically created as 'active', NOT 'draft' as the schema default suggests.

### Manual Status Updates
**File**: `api-service/src/routes/events.js` (lines 318-319)
```javascript
UPDATE events SET 
  event_status = ?, // Can be updated via PUT /api/events/:id
```

### Admin Interface Status Management
**File**: `components/dashboard/admin/components/ManageEvents.js` (line 218)
```javascript
event_status: event?.event_status || 'draft', // Form defaults to draft
```

### Archiving (Active → Archived)
**File**: `api-service/src/routes/events.js` (lines 347-355)
- Archive endpoint exists but implementation shows it's a "soft delete" that sets status to 'archived'

## 4. Status Logic Patterns

### Frontend Status Display Logic
**File**: `pages/events/index.js` (lines 65-76)
```javascript
const getEventStatus = (event) => {
  if (event.event_status === 'active') {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'happening';
    return 'ended';
  }
  return event.event_status;
};
```

### Event Filtering by Computed Status
**File**: `pages/events/index.js` (lines 79-85)
```javascript
const upcomingEvents = events.filter(event => {
  const status = getEventStatus(event);
  return status === 'upcoming' || status === 'draft';
});

const happeningEvents = events.filter(event => getEventStatus(event) === 'happening');
const endedEvents = events.filter(event => getEventStatus(event) === 'ended');
```

## 5. Key Observations

1. **Inconsistent Creation Behavior**: Schema defaults to 'draft' but API creates events as 'active'
2. **No Automated Transitions**: Status changes appear to be manual only
3. **Date-Based Display Logic**: Frontend computes display status based on dates, not just DB status
4. **Dual Status System**: Both `event_status` and `application_status` exist for different purposes
5. **Soft Delete Pattern**: 'archived' status used instead of hard deletion

## 6. Potential Integration Points

- Events are filtered by status in multiple frontend components
- API supports comma-separated status filtering
- Admin interface allows manual status changes
- No automated workflow for status transitions based on dates
- Status affects visibility in public listings and dashboard views
