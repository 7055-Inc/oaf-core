# Drip Campaign API Endpoints - Build Specification

## Context

We need RESTful API endpoints for a drip email campaign system. The database schema is already created with 9 tables (see migration: `database/migrations/012_drip_campaigns_system.sql`).

### System Overview

**Purpose:** Automated email drip campaigns with behavior-based triggers, frequency management, and conversion tracking.

**Key Features:**
- Admin creates system campaigns (marketplace)
- Users enable/disable campaigns
- Behavior triggers from ClickHouse tracker
- Frequency limits: 6 emails/day, 2hr gaps, 10hr pause on limit
- Per-email expiry dates
- Conversion goal tracking
- Comprehensive analytics

### Database Tables

1. `drip_campaigns` - Campaign definitions
2. `drip_steps` - Email sequences
3. `drip_triggers` - Trigger rules
4. `drip_enrollments` - User journeys
5. `drip_events` - Email events
6. `drip_conversions` - Conversion tracking
7. `drip_analytics` - Aggregated metrics
8. `user_drip_preferences` - User campaign settings
9. `drip_frequency_tracking` - Daily limits

### Module Structure

Create module at: `/api-service/src/modules/drip-campaigns/`

```
/api-service/src/modules/drip-campaigns/
├── index.js           # Module entry point
├── routes.js          # API routes
└── services/
    ├── campaigns.js   # Campaign CRUD
    ├── enrollments.js # Enrollment management
    ├── frequency.js   # Frequency manager
    └── analytics.js   # Analytics aggregation
```

---

## API Endpoints Required

### ADMIN ENDPOINTS (require `manage_system` permission)

#### Campaign Management

**1. Get All Campaigns**
```
GET /api/v2/drip-campaigns/admin/campaigns
Query params:
  - category: string (optional)
  - is_system: boolean (optional)
  - is_active: boolean (optional)
  - page: number (default 1)
  - limit: number (default 50)

Response:
{
  "success": true,
  "data": {
    "campaigns": [...],
    "pagination": { "page": 1, "limit": 50, "total": 10 }
  }
}
```

**2. Get Single Campaign**
```
GET /api/v2/drip-campaigns/admin/campaigns/:id
Include: steps, triggers, analytics summary

Response:
{
  "success": true,
  "data": {
    "campaign": {...},
    "steps": [...],
    "triggers": [...],
    "analytics": {...}
  }
}
```

**3. Create Campaign**
```
POST /api/v2/drip-campaigns/admin/campaigns
Body:
{
  "campaign_key": "unique-key",
  "name": "Campaign Name",
  "description": "...",
  "category": "marketing",
  "is_system": true,
  "priority_level": 3,
  "conversion_goal_type": "purchase",
  "conversion_goal_config": {...},
  "steps": [
    {
      "step_number": 1,
      "template_key": "template-1",
      "delay_amount": 0,
      "delay_unit": "days",
      "delay_from": "enrollment"
    }
  ],
  "triggers": [
    {
      "trigger_type": "event",
      "event_name": "user_signup"
    }
  ]
}

Response:
{
  "success": true,
  "data": { "campaign": {...}, "steps": [...], "triggers": [...] }
}
```

**4. Update Campaign**
```
PUT /api/v2/drip-campaigns/admin/campaigns/:id
Body: Same as create (partial updates allowed)

Response: Same as create
```

**5. Delete Campaign**
```
DELETE /api/v2/drip-campaigns/admin/campaigns/:id

Response:
{
  "success": true,
  "message": "Campaign deleted"
}
```

**6. Publish/Unpublish Campaign**
```
POST /api/v2/drip-campaigns/admin/campaigns/:id/publish
POST /api/v2/drip-campaigns/admin/campaigns/:id/unpublish

Response:
{
  "success": true,
  "data": { "campaign": {...} }
}
```

#### Step Management

**7. Add Step to Campaign**
```
POST /api/v2/drip-campaigns/admin/campaigns/:campaignId/steps
Body:
{
  "step_number": 2,
  "template_key": "template-2",
  "delay_amount": 3,
  "delay_unit": "days",
  "expires_after_enrollment_days": 7,
  "conversion_goal_type": "event_application"
}
```

**8. Update Step**
```
PUT /api/v2/drip-campaigns/admin/steps/:id
Body: Same as add step
```

**9. Delete Step**
```
DELETE /api/v2/drip-campaigns/admin/steps/:id
```

**10. Reorder Steps**
```
POST /api/v2/drip-campaigns/admin/campaigns/:campaignId/steps/reorder
Body:
{
  "step_ids": [3, 1, 2] // New order
}
```

#### Trigger Management

**11. Add Trigger**
```
POST /api/v2/drip-campaigns/admin/campaigns/:campaignId/triggers
Body:
{
  "trigger_type": "behavior_threshold",
  "behavior_type": "product_view",
  "behavior_rule": {
    "filter": { "artist_id": "same" },
    "threshold": 5,
    "timeframe": "7 days"
  }
}
```

**12. Update Trigger**
```
PUT /api/v2/drip-campaigns/admin/triggers/:id
```

**13. Delete Trigger**
```
DELETE /api/v2/drip-campaigns/admin/triggers/:id
```

#### Enrollment Management

**14. Get Campaign Enrollments**
```
GET /api/v2/drip-campaigns/admin/campaigns/:campaignId/enrollments
Query params:
  - status: string (optional)
  - user_id: number (optional)
  - page: number
  - limit: number

Response: List of enrollments with user info
```

**15. Get User's Enrollments**
```
GET /api/v2/drip-campaigns/admin/users/:userId/enrollments
Response: All campaigns user is enrolled in
```

**16. Manually Enroll User**
```
POST /api/v2/drip-campaigns/admin/enroll
Body:
{
  "user_id": 123,
  "campaign_id": 456,
  "context_data": { "artist_id": 789 }
}
```

**17. Exit User from Campaign**
```
POST /api/v2/drip-campaigns/admin/enrollments/:id/exit
Body:
{
  "exit_reason": "manual_exit"
}
```

**18. Pause/Resume Enrollment**
```
POST /api/v2/drip-campaigns/admin/enrollments/:id/pause
POST /api/v2/drip-campaigns/admin/enrollments/:id/resume
```

#### Analytics

**19. Get Campaign Analytics**
```
GET /api/v2/drip-campaigns/admin/campaigns/:campaignId/analytics
Query params:
  - start_date: date (optional)
  - end_date: date (optional)
  - breakdown: step|user|time (optional)

Response:
{
  "success": true,
  "data": {
    "overview": {
      "total_enrollments": 1000,
      "active_enrollments": 750,
      "completion_rate": 65.5,
      "emails_sent": 5000,
      "open_rate": 45.2,
      "click_rate": 12.3,
      "conversion_rate": 8.5,
      "total_revenue": 125000.00
    },
    "by_step": [...],
    "timeline": [...]
  }
}
```

**20. Get All Campaigns Analytics Summary**
```
GET /api/v2/drip-campaigns/admin/analytics/summary
Response: Performance summary of all campaigns
```

**21. Get Conversion Report**
```
GET /api/v2/drip-campaigns/admin/analytics/conversions
Query params:
  - campaign_id: number (optional)
  - conversion_type: string (optional)
  - start_date: date
  - end_date: date
```

**22. Get Frequency Analytics**
```
GET /api/v2/drip-campaigns/admin/analytics/frequency
Response: Suppression stats, daily limit impacts, pause frequency
```

---

### USER ENDPOINTS (authenticated users)

**23. Get Available Campaigns**
```
GET /api/v2/drip-campaigns/campaigns
Response: System campaigns user can enable (filtered by tier)
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": 1,
        "name": "...",
        "description": "...",
        "category": "...",
        "is_enabled": true,
        "is_enrolled": true
      }
    ]
  }
}
```

**24. Get User's Active Campaigns**
```
GET /api/v2/drip-campaigns/my-campaigns
Response: Campaigns user is enrolled in with progress
```

**25. Enable Campaign**
```
POST /api/v2/drip-campaigns/campaigns/:campaignId/enable
Response: Adds to user_drip_preferences, triggers enrollment if applicable
```

**26. Disable Campaign**
```
POST /api/v2/drip-campaigns/campaigns/:campaignId/disable
Response: Exits active enrollment, updates preferences
```

**27. Get My Campaign Analytics**
```
GET /api/v2/drip-campaigns/my-campaigns/:campaignId/analytics
Response: Limited analytics (opens, clicks, conversions for this user)
```

**28. Unsubscribe from Campaign**
```
POST /api/v2/drip-campaigns/enrollments/:id/unsubscribe
Response: Exits campaign, records unsubscribe event
```

---

### INTERNAL/SERVICE ENDPOINTS (no auth, used by cron/services)

**29. Process Queue**
```
POST /api/v2/drip-campaigns/internal/process-queue
Body: None (called by cron job)
Logic:
  - Find enrollments ready to send (status=active, next_send_at <= NOW)
  - Check frequency limits (daily cap, 2hr gap)
  - Apply priority ordering
  - Send emails via EmailService
  - Update enrollment progress
  - Record events
  - Check exit conditions
  - Update analytics

Response:
{
  "success": true,
  "data": {
    "processed": 50,
    "sent": 45,
    "suppressed": 3,
    "expired": 2,
    "errors": 0
  }
}
```

**30. Handle Behavior Trigger**
```
POST /api/v2/drip-campaigns/internal/trigger
Body:
{
  "trigger_type": "behavior",
  "user_id": 123,
  "behavior_type": "product_view",
  "behavior_data": { "artist_id": 456, "count": 5 }
}

Logic:
  - Find matching triggers
  - Check if user eligible (not already enrolled)
  - Enroll user with context_data
  - Schedule first email

Response:
{
  "success": true,
  "data": {
    "enrollments_created": 1,
    "campaigns": ["artist-interest-nurture"]
  }
}
```

**31. Track Email Event**
```
POST /api/v2/drip-campaigns/internal/track-event
Body:
{
  "enrollment_id": 123,
  "event_type": "opened",
  "event_data": { "device_type": "mobile" }
}

Logic:
  - Record in drip_events
  - Update drip_analytics
  - Check for conversions (if click event)

Response: { "success": true }
```

**32. Track Conversion**
```
POST /api/v2/drip-campaigns/internal/track-conversion
Body:
{
  "user_id": 123,
  "conversion_type": "purchase",
  "conversion_value": 99.99,
  "conversion_data": { "order_id": 456 }
}

Logic:
  - Find active enrollments for user
  - Check attribution window
  - Attribute to last clicked email
  - Record in drip_conversions
  - Update analytics
  - Check exit conditions (goal reached)

Response: { "success": true }
```

**33. Update Analytics**
```
POST /api/v2/drip-campaigns/internal/update-analytics
Body:
{
  "campaign_id": 123,
  "step_number": 2 (optional)
}

Logic:
  - Recalculate aggregated metrics from drip_events
  - Update drip_analytics table
  - Calculate rates, averages, timing metrics

Response: { "success": true }
```

---

## Service Classes Required

### 1. CampaignService (`services/campaigns.js`)

```javascript
class CampaignService {
  async getAllCampaigns(filters, pagination)
  async getCampaignById(id)
  async createCampaign(campaignData)
  async updateCampaign(id, updates)
  async deleteCampaign(id)
  async publishCampaign(id)
  async unpublishCampaign(id)
  
  // Steps
  async addStep(campaignId, stepData)
  async updateStep(id, updates)
  async deleteStep(id)
  async reorderSteps(campaignId, stepIds)
  
  // Triggers
  async addTrigger(campaignId, triggerData)
  async updateTrigger(id, updates)
  async deleteTrigger(id)
  async getActiveTriggers(triggerType)
}
```

### 2. EnrollmentService (`services/enrollments.js`)

```javascript
class EnrollmentService {
  async enrollUser(userId, campaignId, contextData = {})
  async exitEnrollment(enrollmentId, reason)
  async pauseEnrollment(enrollmentId)
  async resumeEnrollment(enrollmentId)
  
  async getUserEnrollments(userId, filters)
  async getCampaignEnrollments(campaignId, filters)
  
  async advanceStep(enrollmentId)
  async checkExitConditions(enrollmentId)
  async processNextSend(enrollment)
  
  async getEnrollmentsReadyToSend()
}
```

### 3. FrequencyManager (`services/frequency.js`)

```javascript
class FrequencyManager {
  async canSendToUser(userId)
  async recordEmailSent(userId, campaignId, enrollmentId)
  async applyPause(userId, reason)
  async checkPauseStatus(userId)
  
  async getDailyCount(userId, date)
  async getLastSendTime(userId)
  async calculateNextAvailableSend(userId, minGapHours)
  
  async prioritizeQueue(enrollments)
  async suppressLowPriority(userId, campaignId)
}
```

### 4. AnalyticsService (`services/analytics.js`)

```javascript
class AnalyticsService {
  async aggregateMetrics(campaignId, stepNumber = null)
  async getCampaignAnalytics(campaignId, options)
  async getConversionReport(filters)
  async getFrequencyAnalytics()
  
  async calculateEngagementRates(campaignId, stepNumber)
  async calculateTimingMetrics(campaignId, stepNumber)
  async getTimelineData(campaignId, startDate, endDate)
  
  async trackEvent(enrollmentId, eventType, eventData)
  async trackConversion(userId, conversionType, value, data)
  async attributeConversion(userId, conversionTimestamp)
}
```

---

## Business Logic Requirements

### Frequency Management

```javascript
// In process-queue logic:
1. Check drip_frequency_tracking for user's today
2. If drip_emails_sent_today >= 6: Skip (suppress)
3. If is_paused AND paused_until > NOW: Skip (suppressed)
4. If last_drip_sent_at within 2 hours: Skip (suppressed)
5. On 6th email: Set is_paused=1, paused_until = NOW + 10 hours
6. Record suppression in drip_events table
```

### Priority Handling

```javascript
// When multiple enrollments ready for same user:
1. Order by campaign.priority_level DESC
2. Send highest priority first
3. Suppress others if daily limit reached
4. Track suppression_count in enrollment
```

### Expiry Handling

```javascript
// Before sending each email:
1. Check step.expires_at (absolute date)
2. Check step.expires_after_enrollment_days + enrolled_at
3. If expired: Skip email, record in drip_events (event_type='expired')
4. Continue to next step
```

### Exit Conditions

```javascript
// After each email sent:
1. Evaluate step.exit_conditions (JSON)
2. Check campaign-level exit triggers
3. If conditions met: 
   - Set enrollment.status = 'exited'
   - Set exit_reason, exit_step
   - Stop processing
```

### Conversion Attribution

```javascript
// When conversion tracked:
1. Find user's active enrollments
2. Check attribution_window_hours for each
3. Find last email opened/clicked within window
4. Create record in drip_conversions
5. Link to drip_events.id for attribution
6. Update drip_analytics
```

---

## Integration Points

### Email Service Integration

```javascript
// Import existing EmailService
const EmailService = require('../../services/emailService');

// Send drip email
const emailService = new EmailService();
const result = await emailService.sendEmail(
  userId,
  step.template_key,
  templateData,
  { priority: campaign.priority_level }
);

// Record in email_log, link in drip_events
```

### Behavior Tracker Integration

```javascript
// Hook into ClickHouse behavior events
// When behavior threshold met, POST to /internal/trigger

// Example: In behavior module
if (productViewCount >= 5 && sameArtist) {
  await axios.post('/api/v2/drip-campaigns/internal/trigger', {
    trigger_type: 'behavior',
    user_id: userId,
    behavior_type: 'product_view',
    behavior_data: { artist_id, count: 5 }
  });
}
```

---

## Error Handling

All endpoints should handle:
- Invalid campaign/enrollment IDs (404)
- Permission errors (403)
- Validation errors (400)
- Database errors (500)
- Already enrolled errors (409)
- Frequency limit errors (429)

Standard response format:
```javascript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: 'Error message', code: 'ERROR_CODE' }
```

---

## Testing Endpoints Needed

Add these for development/testing:

```
POST /api/v2/drip-campaigns/test/reset-frequency/:userId
POST /api/v2/drip-campaigns/test/trigger-campaign/:campaignId/:userId
POST /api/v2/drip-campaigns/test/simulate-behavior
```

---

## Notes

- Use existing auth middleware: `verifyToken`, `requirePermission`
- Follow existing module pattern (see `/api-service/src/modules/email/`)
- Use mysql2/promise with db connection from `config/db`
- Add JSDoc comments for all service methods
- Include proper error logging with `console.error`
- Transaction support for multi-table operations
- Add route validation with express-validator or similar

## Expected Files

```
/api-service/src/modules/drip-campaigns/
├── index.js                     # Module exports
├── routes.js                    # Express router with all endpoints
├── services/
│   ├── campaigns.js            # Campaign CRUD service
│   ├── enrollments.js          # Enrollment management
│   ├── frequency.js            # Frequency manager
│   └── analytics.js            # Analytics aggregation
└── README.md                    # Module documentation
```

Then integrate in `/api-service/src/app.js`:
```javascript
const dripCampaigns = require('./modules/drip-campaigns');
app.use('/api/v2/drip-campaigns', dripCampaigns.router);
```
