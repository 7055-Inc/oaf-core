# Step 2: Create Event Blocklist Table

## Objective
Create a table to track events that have been red-flagged for removal, preventing them from being re-scraped or re-contacted.

## Database Changes Required

### Create `event_blocklist` Table

```sql
CREATE TABLE `event_blocklist` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_id` bigint DEFAULT NULL COMMENT 'Reference to original event if it exists',
  `event_name` varchar(255) NOT NULL,
  `event_location` varchar(255) DEFAULT NULL,
  `promoter_email` varchar(255) DEFAULT NULL,
  `promoter_name` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `reason` enum('not_my_event','event_cancelled','duplicate_listing','spam','other') DEFAULT 'other',
  `reason_details` text,
  `source_url` varchar(500) DEFAULT NULL COMMENT 'Where the event was originally found',
  `blocked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `blocked_by` bigint DEFAULT NULL COMMENT 'User who requested removal, NULL if system-generated',
  `notes` text COMMENT 'Admin notes about this blocklist entry',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_lookup` (`event_name`,`event_location`),
  KEY `idx_promoter_email` (`promoter_email`),
  KEY `idx_date_range` (`start_date`,`end_date`),
  KEY `idx_blocked_at` (`blocked_at`),
  KEY `fk_blocklist_event_id` (`event_id`),
  KEY `fk_blocklist_blocked_by` (`blocked_by`),
  CONSTRAINT `fk_blocklist_event_id` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_blocklist_blocked_by` FOREIGN KEY (`blocked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
COMMENT='Tracks removed events to prevent re-scraping and re-contact';
```

## Field Definitions

### Core Identification Fields
- **`event_id`**: Links to original event if it exists in database (NULL if never created)
- **`event_name`**: Name of blocked event (required for matching)
- **`event_location`**: City, State for geographic matching
- **`promoter_email`**: Email to never contact again
- **`promoter_name`**: Promoter/organization name

### Date Fields
- **`start_date`** / **`end_date`**: Event date range for fuzzy matching
- Helps identify same event in different years or duplicate listings

### Reason Tracking
- **`reason`**: Enum of common removal reasons
  - `not_my_event` - Wrong contact/organizer
  - `event_cancelled` - Event no longer happening
  - `duplicate_listing` - Already exists elsewhere
  - `spam` - Fraudulent/spam listing
  - `other` - Other reason (explain in details)
- **`reason_details`**: Free text explanation
- **`source_url`**: Where event was originally scraped from

### Audit Fields
- **`blocked_at`**: When entry was created
- **`blocked_by`**: User ID who requested removal (NULL if system/admin)
- **`notes`**: Admin internal notes
- **`created_at`** / **`updated_at`**: Standard timestamps

### Foreign Keys
- **`event_id`**: SET NULL if event deleted (we keep blocklist record)
- **`blocked_by`**: SET NULL if user deleted (we keep blocklist record)

## Index Strategy

### Primary Lookups (Scraper Uses These)
```sql
KEY `idx_event_lookup` (`event_name`,`event_location`)
-- For: "Is this event blocked?" queries
-- Used by: Scraping node before creating events

KEY `idx_promoter_email` (`promoter_email`)
-- For: "Has this email been blocked?" queries  
-- Used by: Email sequence before sending
```

### Date-Based Matching
```sql
KEY `idx_date_range` (`start_date`,`end_date`)
-- For: Finding events by date overlap
-- Used by: Fuzzy matching same event across years
```

### Admin Queries
```sql
KEY `idx_blocked_at` (`blocked_at`)
-- For: Recent removals, stats, reporting
-- Used by: Admin dashboard
```

## Usage Patterns

### 1. Check Before Scraping
```javascript
// In scraping node before creating event
const blocked = await db.query(`
  SELECT id FROM event_blocklist 
  WHERE LOWER(event_name) LIKE LOWER(?)
  AND event_location LIKE ?
  LIMIT 1
`, [`%${eventName}%`, `%${location}%`]);

if (blocked.length > 0) {
  console.log('Event blocked, skipping');
  return;
}
```

### 2. Check Before Emailing
```javascript
// Before sending claim email
const emailBlocked = await db.query(`
  SELECT id FROM event_blocklist 
  WHERE promoter_email = ?
  LIMIT 1
`, [promoterEmail]);

if (emailBlocked.length > 0) {
  console.log('Email blocked, skipping outreach');
  return;
}
```

### 3. Add to Blocklist (On Removal Request)
```javascript
// When event status changed to red_flag_removal
await db.query(`
  INSERT INTO event_blocklist (
    event_id, event_name, event_location,
    promoter_email, promoter_name,
    start_date, end_date,
    reason, reason_details,
    source_url, blocked_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  eventId, eventName, location,
  promoterEmail, promoterName,
  startDate, endDate,
  reason, reasonDetails,
  sourceUrl, userId
]);
```

## API Endpoint Needed

### Check Blocklist (For Scraping Node)

**Endpoint:** `POST /api/events/check-blocklist`

**Request Body:**
```json
{
  "event_name": "Springfield Art Festival",
  "event_location": "Springfield, IL",
  "start_date": "2025-06-15",
  "end_date": "2025-06-16",
  "promoter_email": "info@springfieldarts.org"
}
```

**Response:**
```json
{
  "blocked": true,
  "reason": "not_my_event",
  "blocked_at": "2025-01-10T15:30:00Z"
}
```

**Implementation Location:** `/var/www/main/api-service/src/routes/events.js`

**Logic:**
```javascript
// POST /api/events/check-blocklist
router.post('/check-blocklist', async (req, res) => {
  const { event_name, event_location, start_date, end_date, promoter_email } = req.body;
  
  try {
    // Check by name + location (fuzzy match)
    const nameMatch = await db.query(`
      SELECT * FROM event_blocklist 
      WHERE LOWER(event_name) LIKE LOWER(?)
      AND (event_location LIKE ? OR event_location IS NULL)
      LIMIT 1
    `, [`%${event_name}%`, `%${event_location}%`]);
    
    if (nameMatch.length > 0) {
      return res.json({
        blocked: true,
        reason: nameMatch[0].reason,
        blocked_at: nameMatch[0].blocked_at
      });
    }
    
    // Check by promoter email
    if (promoter_email) {
      const emailMatch = await db.query(`
        SELECT * FROM event_blocklist 
        WHERE promoter_email = ?
        LIMIT 1
      `, [promoter_email]);
      
      if (emailMatch.length > 0) {
        return res.json({
          blocked: true,
          reason: emailMatch[0].reason,
          blocked_at: emailMatch[0].blocked_at
        });
      }
    }
    
    // Not blocked
    res.json({ blocked: false });
    
  } catch (error) {
    console.error('Blocklist check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Admin Interface Additions

### Blocklist Management Page

**Location:** `/var/www/main/components/dashboard/admin/components/EventBlocklist.js` (new file)

**Features Needed:**
1. **List View**: Show all blocked events
   - Sortable by date, reason, event name
   - Filter by reason type
   - Search by event name or email

2. **Detail View**: Click to see full blocklist entry
   - All fields visible
   - Admin notes editable
   - Link to original event (if exists)

3. **Actions**:
   - **Un-block**: Remove from blocklist (with confirmation)
   - **Add Manual Entry**: Block an event/email manually
   - **Edit Notes**: Update admin notes

4. **Stats Widget**: Show on admin dashboard
   - Total blocked events
   - Blocks this week/month
   - Most common reasons

### Navigation Update

**File:** `/var/www/main/components/dashboard/admin/AdminNav.js` (or wherever admin nav is)

**Add menu item:**
```javascript
{
  label: 'Event Blocklist',
  href: '/dashboard/admin/event-blocklist',
  icon: <ShieldXIcon />
}
```

## Testing Checklist

After implementing:

- [ ] Table created successfully with all fields
- [ ] Can insert blocklist entries manually
- [ ] Foreign keys work (event_id, blocked_by)
- [ ] Indexes created and queryable
- [ ] API endpoint `/api/events/check-blocklist` returns correct results
- [ ] Fuzzy name matching works (case-insensitive, partial match)
- [ ] Email matching works (exact match)
- [ ] Admin interface shows blocklist entries
- [ ] Can add/remove blocklist entries via admin
- [ ] Blocklist persists even if event or user deleted

## Integration Points

### When Event Set to `red_flag_removal`

**File:** `/var/www/main/api-service/src/routes/events.js` (in event update route)

**Add logic:**
```javascript
// When updating event status to red_flag_removal
if (event_status === 'red_flag_removal' && oldEvent.event_status !== 'red_flag_removal') {
  // Add to blocklist
  await db.query(`
    INSERT INTO event_blocklist (
      event_id, event_name, event_location,
      promoter_email, start_date, end_date,
      reason, reason_details, blocked_by
    ) SELECT 
      id, title, CONCAT(city, ', ', state),
      promoter_email, start_date, end_date,
      ?, ?, ?
    FROM events WHERE id = ?
  `, [removal_reason || 'other', removal_details, userId, eventId]);
}
```

## Next Steps (After This Is Complete)

Once blocklist table is working:
- Step 3: Build email sequence automation (cron job)
- Step 4: Create promoter claim workflow enhancements
- Step 5: Build scraping node

---

**Implementation Time Estimate:** 1-2 hours

**Risk Level:** Low (new table, no impact on existing data)

**Dependencies:** Step 1 must be complete (needs red_flag_removal status)
