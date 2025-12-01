# Event Review System - Complete Documentation

## 📋 Overview

The Event Review System allows separate review streams for **Artists** (who attended) and **Community** (general public) with weighted calculations based on event age and series history.

---

## 🗄️ Database Schema

### 1. `reviews` Table (Modified)
Added columns for event-specific review tracking:

```sql
-- New columns added:
reviewer_type ENUM('artist', 'community') NULL
series_sequence INT NULL  -- For weight calculation
weight_factor DECIMAL(3,2) DEFAULT 1.00  -- Calculated weight (0.20 - 1.00)
```

### 2. `pending_reviews` Table (NEW)
Stores reviews by email before user accounts exist:

```sql
CREATE TABLE pending_reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  reviewer_email VARCHAR(255) NOT NULL,
  reviewer_type ENUM('artist', 'community') NOT NULL,
  rating DECIMAL(2,1) NOT NULL,
  title VARCHAR(255) NOT NULL,
  review_text TEXT NOT NULL,
  verified_transaction TINYINT(1) DEFAULT 0,
  created_by_admin_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  associated_at TIMESTAMP NULL,
  associated_user_id BIGINT NULL,
  INDEX idx_email (reviewer_email),
  INDEX idx_event (event_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

### 3. `event_review_tokens` Table (NEW)
Unique tokens for artist QR code reviews:

**Token Format:** 6-character alphanumeric codes (e.g., `XBF3P2`, `TNMTY7`)
- Uses characters: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- Excludes confusing characters: `0`, `O`, `I`, `1`
- Easy to type manually if QR scan fails

```sql
CREATE TABLE event_review_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,  -- Stores 6-char codes
  valid_from DATE NOT NULL,  -- Event start_date
  valid_until DATE NOT NULL,  -- Event end_date + 6 months
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event (event_id),
  INDEX idx_token (token),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

---

## 🔧 Backend API

### Review Endpoints

#### **GET /api/reviews/summary**
Get review summary for any entity. For events, returns dual summaries:

```javascript
// Request
GET /api/reviews/summary?type=event&id=577

// Response (Events only - dual summary)
{
  "artist": {
    "count": 15,
    "weighted_average": "4.3",
    "raw_average": "4.2",
    "verified_count": 12,
    "rating_distribution": { "5": 8, "4": 4, "3": 2, "2": 1, "1": 0 }
  },
  "community": {
    "count": 42,
    "weighted_average": "4.7",
    "raw_average": "4.7",
    "verified_count": 0,
    "rating_distribution": { "5": 30, "4": 10, "3": 2, "2": 0, "1": 0 }
  }
}
```

#### **POST /api/reviews**
Create a review (enhanced for events):

```javascript
// Artist Review (with token)
POST /api/reviews
Authorization: Bearer {token}
{
  "reviewable_type": "event",
  "reviewable_id": 577,
  "rating": 5,
  "title": "Amazing event!",
  "review_text": "Great organization and fantastic artists.",
  "display_as_anonymous": false,
  "token": "XBF3P2"  // 6-character review code
}

// Community Review (no token)
POST /api/reviews
Authorization: Bearer {token}
{
  "reviewable_type": "event",
  "reviewable_id": 577,
  "rating": 4,
  "title": "Fun experience",
  "review_text": "Great atmosphere and variety.",
  "display_as_anonymous": false
}
```

**Backend Logic:**
- If `token` provided → Validates artist user type + token validity
- If no `token` → Validates community user type + 6-month window
- Calculates `weight_factor` based on event age in series
- Prevents users from reviewing as both types

#### **GET /api/reviews/event-token/:eventId**
Get review token URL for an event (promoters only):

```javascript
// Request
GET /api/reviews/event-token/577
Authorization: Bearer {promoter_token}

// Response
{
  "token": "XBF3P2",
  "url": "https://brakebee.com/events/577?token=XBF3P2",
  "valid_from": "2025-03-29",
  "valid_until": "2025-09-30"
}
```

#### **POST /api/reviews/validate-token**
Validate an artist review token:

```javascript
// Request
POST /api/reviews/validate-token
Authorization: Bearer {token}
{
  "token": "XBF3P2",
  "eventId": 577
}

// Response
{
  "valid": true,
  "userType": "artist"
}
```

#### **POST /api/reviews/admin/pending**
Manually enter a review by email (admin only):

```javascript
// Request
POST /api/reviews/admin/pending
Authorization: Bearer {admin_token}
{
  "event_id": 577,
  "reviewer_email": "artist@example.com",
  "reviewer_type": "artist",
  "rating": 5,
  "title": "Excellent event",
  "review_text": "Very well organized.",
  "verified_transaction": true
}

// Response
{
  "success": true,
  "pending_review_id": 123,
  "message": "Pending review created. Will be associated when user creates account."
}
```

#### **GET /api/reviews/admin/pending**
List all pending reviews (admin only):

```javascript
// Request
GET /api/reviews/admin/pending
Authorization: Bearer {admin_token}

// Response
[
  {
    "id": 123,
    "event_id": 577,
    "event_title": "San Tan Art and Wine Festival",
    "reviewer_email": "artist@example.com",
    "reviewer_type": "artist",
    "rating": 5,
    "title": "Excellent event",
    "review_text": "Very well organized.",
    "created_at": "2025-11-14T19:00:00.000Z",
    "admin_username": "admin"
  }
]
```

### Event Token Auto-Generation

**Tokens are automatically generated/updated in 3 scenarios:**

#### 1. **Event Creation** (POST /api/events)
```javascript
// After event INSERT, automatically generates 6-character token:
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude 0, O, I, 1
let token = '';
for (let i = 0; i < 6; i++) {
  token += chars.charAt(Math.floor(Math.random() * chars.length));
}
// Example: "XBF3P2"

const validFrom = start_date;
const validUntil = new Date(end_date);
validUntil.setMonth(validUntil.getMonth() + 6);

INSERT INTO event_review_tokens (event_id, token, valid_from, valid_until)
VALUES (?, ?, ?, ?)
```

#### 2. **Event Update** (PUT /api/events/:id)
```javascript
// If dates changed, updates validity window:
if (start_date && end_date) {
  const validUntil = new Date(end_date);
  validUntil.setMonth(validUntil.getMonth() + 6);
  
  UPDATE event_review_tokens 
  SET valid_from = ?, valid_until = ?
  WHERE event_id = ?
}
```

#### 3. **Event Renewal** (POST /api/events/:id/renew)
```javascript
// Creates NEW 6-character token for renewed event:
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let token = '';
for (let i = 0; i < 6; i++) {
  token += chars.charAt(Math.floor(Math.random() * chars.length));
}

INSERT INTO event_review_tokens (event_id, token, valid_from, valid_until)
VALUES (new_event_id, token, new_start_date, new_end_date + 6 months)
```

---

## 🎯 Review Flow Logic

### Artist Review Flow
1. **Promoter** copies token URL from dashboard
2. **QR Code** created externally from URL
3. **Artist** scans QR → redirected to event page with `?token=XBF3P2`
   - **OR** manually types 6-character code if QR fails
4. **System validates:**
   - User logged in
   - User type is `artist`
   - Token matches event
   - Current date within validity (start → end + 6 months)
   - User hasn't already reviewed
5. **Review form** shows with artist context
6. **On submit:** Review stored with `reviewer_type='artist'` and calculated `weight_factor`

### Community Review Flow
1. **User** visits event page (no token needed)
2. **System validates:**
   - User logged in
   - User type is `community` or `customer`
   - Current date within validity (start → end + 6 months)
   - User hasn't already reviewed
3. **Review form** shows with community context
4. **On submit:** Review stored with `reviewer_type='community'`

### Weight Calculation (Recurring Events)

Events in a series have weight decay applied:

```javascript
function calculateEventReviewWeight(sequenceNumber) {
  if (sequenceNumber === null) return 1.0;  // Not in series
  
  const sequence = parseInt(sequenceNumber);
  
  if (sequence >= 0) return 1.0;   // Current year
  if (sequence === -1) return 0.8; // 1 year ago
  if (sequence === -2) return 0.6; // 2 years ago
  if (sequence === -3) return 0.4; // 3 years ago
  if (sequence === -4) return 0.2; // 4 years ago
  
  return null; // 5+ years - excluded
}
```

**Example:**
- 2025 event (current): Reviews weighted at 100%
- 2024 event: Reviews weighted at 80%
- 2023 event: Reviews weighted at 60%
- 2019 event: Reviews excluded

**Weighted Average Calculation:**
```sql
AVG(rating * weight_factor)
```

---

## 🎨 Frontend Components

### 1. **EventReviews.js**
Main component displaying dual review streams on event pages.

**Location:** `/components/EventReviews.js`

**Props:**
- `eventId` (number) - Event ID
- `currentUserId` (number) - Logged in user ID
- `userType` (string) - User type ('artist', 'community', etc.)

**Features:**
- Reads `?token=xxx` from URL
- Validates token for artist reviews
- Shows separate sections:
  - "What Attending Artists Thought"
  - "What The Community Thought"
- Smart form that adapts to user type + token presence
- Real-time review submission and refresh

**Usage:**
```jsx
import EventReviews from '../../components/EventReviews';

<EventReviews 
  eventId={id} 
  currentUserId={user?.id || null}
  userType={user?.user_type || null}
/>
```

### 2. **AdminEventReviews.js**
Admin panel for manual review entry.

**Location:** `/components/dashboard/admin/AdminEventReviews.js`

**Features:**
- Form to enter reviews by email
- Event selector dropdown
- Reviewer type selector (artist/community)
- Star rating interface
- Lists all pending reviews
- Shows association status

**Access:** Dashboard → Admin → Event Reviews

### 3. **EventsIOwn.js** (Modified)
Promoter event management with token URLs.

**Location:** `/components/dashboard/my-events/components/EventsIOwn.js`

**New Column:** "Artist Review Link"
- Displays full token URL in readonly input
- Copy button with visual feedback
- Auto-fetches tokens for all events on load

**Access:** Dashboard → My Events → Events I Own

---

## 🔐 Security & Validation

### Token Validation
```javascript
// Checks performed:
1. Token exists in database
2. Token matches event ID
3. Current date >= valid_from (event start)
4. Current date <= valid_until (event end + 6 months)
5. User is logged in
6. User type is 'artist'
```

### Review Window Enforcement
```javascript
// For ALL event reviews:
1. Event has started (date >= start_date)
2. Within 6 months of completion (date <= end_date + 6 months)
3. User hasn't already reviewed
4. User is not the event promoter
```

### Dual Type Prevention
```javascript
// Users cannot review same event as both types:
SELECT id FROM reviews 
WHERE reviewer_id = ? 
  AND reviewable_type = 'event' 
  AND reviewable_id = ?
  AND reviewer_type != ?  // Different from current attempt

// If exists → Error: "You have already reviewed this event as a different user type"
```

---

## 📊 Review Display

### Separate Ratings
Events show TWO distinct ratings on the event page:

```jsx
<div className="artist-reviews">
  <h3>What Attending Artists Thought</h3>
  <div className="rating">4.3 ★ (15 reviews)</div>
  <!-- Artist reviews list -->
</div>

<div className="community-reviews">
  <h3>What The Community Thought</h3>
  <div className="rating">4.7 ★ (42 reviews)</div>
  <!-- Community reviews list -->
</div>
```

### Weight Indication
Reviews from past years can optionally show a "historical" badge.

---

## 🔄 Auto-Association Flow

When a user creates an account:

```javascript
// Called after user registration:
matchPendingReviews(email, userId)

// Logic:
1. Find all pending_reviews with LOWER(reviewer_email) = LOWER(email)
2. For each pending review:
   a. Check if user already reviewed that event → skip
   b. Calculate weight_factor based on series
   c. Move to reviews table with user_id
   d. Mark pending_review as associated
3. Return count of reviews matched
```

---

## 🎫 QR Code Workflow

### For Promoters:
1. Login to dashboard
2. Go to "My Events" → "Events I Own"
3. Find event in table
4. Click "Copy" button in "Artist Review Link" column
5. Use external QR code generator (e.g., qr-code-generator.com)
6. Print and distribute at event
7. **OR** simply share the 6-character code verbally/printed

### For Artists:
1. **Scan QR code** at event OR **manually enter 6-character code**
2. Redirected to: `brakebee.com/events/{id}?token=XBF3P2`
3. Prompted to login (if not already)
4. Review form appears (if valid)
5. Submit review
6. Review appears immediately in "What Attending Artists Thought"

### Manual Code Entry:
- Token format: **6 uppercase letters/numbers** (e.g., `XBF3P2`)
- Excludes confusing characters: `0`, `O`, `I`, `1`
- Easy to write on signage or communicate verbally

---

## 🐛 Troubleshooting

### "Invalid review token"
- Token doesn't match event ID
- Token has been regenerated (dates changed)
- Solution: Get new token from promoter dashboard

### "Review period has not started yet"
- Trying to review before event start_date
- Solution: Wait until event begins

### "Review period has ended"
- More than 6 months after event end_date
- Solution: Reviews are closed for this event

### "This feature is only for registered artist users"
- User type is not 'artist'
- Trying to use QR token as community user
- Solution: Use event page directly (no token) or contact support to change account type

### "Artist users must use the review link provided"
- Artist user trying to review without token
- Solution: Get QR link from promoter or event page

### "You have already reviewed this event"
- User already submitted a review (either as artist OR community)
- Solution: Edit existing review instead (future feature)

---

## 📈 Future Enhancements

### Planned Features:
- [ ] Review editing
- [ ] Review media uploads
- [ ] Reviewer reputation scores
- [ ] Review moderation flags
- [ ] Export reviews to CSV
- [ ] Email notifications for new reviews
- [ ] Review response from promoters
- [ ] Trending events based on recent reviews

---

## 🎯 Testing Checklist

### Database:
- [x] Reviews table has new columns
- [x] Pending_reviews table created
- [x] Event_review_tokens table created
- [x] Tokens auto-generate on event create
- [x] Tokens update on event date change
- [x] Tokens generate on event renewal

### Backend:
- [x] Event summary returns dual ratings
- [x] Token validation endpoint works
- [x] Review submission enforces 6-month window
- [x] Review submission enforces user type
- [x] Weight calculation works correctly
- [x] Admin can create pending reviews
- [x] Pending reviews auto-associate

### Frontend:
- [x] Event page shows EventReviews component
- [x] Token in URL triggers artist validation
- [x] Community users see form without token
- [x] Dual ratings display correctly
- [x] Promoters see token URLs in dashboard
- [x] Copy button works
- [x] Admin can access manual entry form

### User Flows:
- [ ] Create test event → verify token generated
- [ ] Visit event with token → verify artist form
- [ ] Visit event without token → verify community form
- [ ] Submit artist review → verify appears in artist section
- [ ] Submit community review → verify appears in community section
- [ ] Admin enters review by email → verify pending
- [ ] Create account with pending email → verify auto-association

---

## 📝 Example Token URLs

```
Artist Review (with 6-char code):
https://brakebee.com/events/577?token=XBF3P2

Community Review (Direct):
https://brakebee.com/events/577

API Endpoint:
GET https://api.brakebee.com/api/reviews/event-token/577

Manual Entry Example:
"Visit brakebee.com/events/577 and enter code: XBF3P2"
```

---

## 🏁 Summary

**Event Review System Status: ✅ COMPLETE**

- **Database:** 3 tables (1 modified, 2 new)
- **Backend:** 9 helper functions, 5 new endpoints
- **Frontend:** 3 components (2 new, 1 modified)
- **Features:** Dual review streams, QR tokens, weight decay, auto-association
- **Security:** Token validation, window enforcement, type separation
- **Auto-generation:** Tokens created on event save/update/renew

**Ready for Production Testing!**

