# Step 1: Add New Event Statuses

## Objective
Add three new event statuses to support the promoter recruitment workflow: `unclaimed`, `pre-draft`, and `red_flag_removal`.

## Database Changes Required

### 1. Modify `events` Table - Add New Status Values

**Current enum:** `enum('draft','active','archived')`

**New enum:** `enum('draft','active','archived','unclaimed','pre-draft','red_flag_removal')`

**SQL Migration:**
```sql
ALTER TABLE events 
MODIFY COLUMN event_status 
ENUM('draft','active','archived','unclaimed','pre-draft','red_flag_removal') 
DEFAULT 'draft';
```

### 2. Add New Database Column for Removal Tracking

**Add to `events` table:**
```sql
ALTER TABLE events 
ADD COLUMN removal_requested_at TIMESTAMP NULL AFTER event_status,
ADD COLUMN removal_reason VARCHAR(100) NULL AFTER removal_requested_at,
ADD COLUMN removal_token VARCHAR(255) NULL AFTER removal_reason;
```

## Status Definitions

### `pre-draft`
- **Purpose:** Scraped events awaiting admin review before publication
- **Visibility:** Admin-only (not in public queries)
- **Next Status:** `unclaimed` (when admin publishes)

### `unclaimed`
- **Purpose:** Event is live/public but promoter has not claimed ownership
- **Visibility:** Public (artists can see it, add to calendar)
- **Next Status:** `active` (when promoter claims and completes details)

### `red_flag_removal`
- **Purpose:** Event removed by request, permanently hidden
- **Visibility:** Hidden from ALL public queries, admin-only view
- **Next Status:** Rarely changes (requires manual admin restoration)

## Code Changes Required

### 1. Update API Route - Event Queries

**File:** `api-service/src/routes/events.js`

**Modify all public event queries** to exclude `red_flag_removal` status by default.

**Current pattern:**
```javascript
if (event_status) {
  const statuses = event_status.split(',');
  query += ` AND e.event_status IN (${statuses.map(() => '?').join(',')})`;
  params.push(...statuses);
}
```

**Add a global filter** before any status filtering:
```javascript
// Add to base query (around line 60-65)
// Exclude red-flagged events from all public queries
query += ` AND e.event_status != 'red_flag_removal'`;

// Then continue with existing status filtering logic
if (event_status) {
  const statuses = event_status.split(',');
  query += ` AND e.event_status IN (${statuses.map(() => '?').join(',')})`;
  params.push(...statuses);
}
```

**IMPORTANT:** Only apply this filter to PUBLIC endpoints. Do NOT add it to admin endpoints (they need to see red-flagged events).

### 2. Update Frontend - Events Index Page

**File:** `pages/events/index.js`

**Current query (line 24-26):**
```javascript
const queryParams = new URLSearchParams({
  event_status: 'active,draft'
});
```

**Update to include `unclaimed`:**
```javascript
const queryParams = new URLSearchParams({
  event_status: 'active,unclaimed' // Show active and unclaimed events
  // Note: Removed 'draft' - we'll use unclaimed for public events without promoter
});
```

### 3. Update Frontend Status Display Logic

**File:** `pages/events/index.js` (around lines 65-76)

**Add handling for `unclaimed` status:**
```javascript
const getEventStatus = (event) => {
  // Handle unclaimed events
  if (event.event_status === 'unclaimed') {
    return 'unclaimed';
  }
  
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

**Add UI badge for unclaimed events** (where status is displayed):
```javascript
{getEventStatus(event) === 'unclaimed' && (
  <span className="badge badge-warning">
    Unclaimed - Help us verify this event
  </span>
)}
```

### 4. Update Dashboard - My Events

**File:** `components/dashboard/my-events/components/EventsIOwn.js`

**Current queries (lines 25, 33):**
```javascript
// Current events
const currentResponse = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&event_status=draft,active`));

// Archived events
const archivedResponse = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&event_status=archived`));
```

**Update to include unclaimed → active flow:**
```javascript
// Current events (include unclaimed that belong to this promoter)
const currentResponse = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&event_status=draft,active,unclaimed`));

// Archived events (unchanged)
const archivedResponse = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&event_status=archived`));
```

### 5. Admin Interface Updates

**File:** `components/dashboard/admin/components/ManageEvents.js`

**Add filter options for new statuses** (around status dropdown/filter area):
```javascript
const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pre-draft', label: 'Pre-Draft (Needs Review)' },
  { value: 'unclaimed', label: 'Unclaimed' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'red_flag_removal', label: 'Removed (Red Flag)' }
];
```

**For admin queries:** Remove the `red_flag_removal` filter so admins CAN see them.

## Testing Checklist

After implementing these changes, test:

- [ ] Can manually set event to `pre-draft` status via admin
- [ ] `pre-draft` events do NOT appear in public event listings
- [ ] Can manually set event to `unclaimed` status via admin
- [ ] `unclaimed` events DO appear in public event listings
- [ ] Can manually set event to `red_flag_removal` status via admin
- [ ] `red_flag_removal` events do NOT appear in ANY public queries
- [ ] `red_flag_removal` events ARE visible in admin interface
- [ ] Frontend displays unclaimed badge correctly
- [ ] Dashboard filters work with new statuses
- [ ] Comma-separated status filtering still works (`?event_status=active,unclaimed`)

## Notes for Implementation

1. **Migration Safety:** Run the ALTER TABLE commands during low-traffic time or create a proper migration script
2. **Backwards Compatibility:** Existing events with 'draft', 'active', or 'archived' statuses are unaffected
3. **Default Behavior:** New events still default to 'draft' per schema, but API creates as 'active' (unchanged)
4. **Frontend Badge Styling:** Use existing badge classes or create new ones for unclaimed status
5. **Admin Permissions:** Ensure only admin users can see/modify `red_flag_removal` events

## Next Steps (After This Is Complete)

Once these status changes are working:
- Step 2: Create `event_blocklist` table for red-flagged event tracking
- Step 3: Build email sequence automation for unclaimed events
- Step 4: Create promoter claim workflow
- Step 5: Build scraping node

---

**Implementation Time Estimate:** 1-2 hours

**Risk Level:** Low (additive changes, existing statuses unaffected)
