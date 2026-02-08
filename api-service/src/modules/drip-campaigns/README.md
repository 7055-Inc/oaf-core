# Drip Campaigns Module

Automated email drip campaign system with behavior-based triggers, frequency management, and conversion tracking.

## Features

- **Campaign Management**: Create and manage email sequences
- **Behavior Triggers**: Automatic enrollment based on user behavior
- **Frequency Limits**: 6 emails/day max, 2hr gaps, 10hr pause
- **Priority Queue**: Priority-based email sending
- **Conversion Tracking**: Attribution and goal tracking
- **Comprehensive Analytics**: Metrics, rates, and reporting

## API Endpoints

### Admin Endpoints (24)
- Campaign CRUD operations
- Step management
- Trigger configuration
- Enrollment management
- Analytics and reporting

### User Endpoints (6)
- View available campaigns
- Enable/disable campaigns
- Track personal progress
- View limited analytics
- Unsubscribe

### Internal Endpoints (5)
- Process queue (cron)
- Handle behavior triggers
- Track email events
- Track conversions
- Update analytics

## Services

### CampaignService
- Campaign CRUD
- Step management
- Trigger management

### EnrollmentService
- User enrollment
- Progress tracking
- Step advancement

### FrequencyManager
- Daily limits (6 emails/day)
- Minimum gaps (2 hours)
- Priority queue management
- Pause management (10 hours)

### AnalyticsService
- Metrics aggregation
- Conversion tracking
- Reporting

## Database Tables

1. `drip_campaigns` - Campaign definitions
2. `drip_steps` - Email sequences
3. `drip_triggers` - Trigger rules
4. `drip_enrollments` - User journeys
5. `drip_events` - Email events
6. `drip_conversions` - Conversion tracking
7. `drip_analytics` - Aggregated metrics
8. `user_drip_preferences` - User settings
9. `drip_frequency_tracking` - Daily limits

## Integration

### Email Service
```javascript
const emailService = new EmailService();
await emailService.sendEmail(userId, templateKey, data, options);
```

### Behavior Tracking
```javascript
// POST to /api/v2/drip-campaigns/internal/trigger
{
  "trigger_type": "behavior",
  "user_id": 123,
  "behavior_type": "product_view",
  "behavior_data": { "artist_id": 456 }
}
```

### Cron Job (Queue Processing)
```bash
# Run every 5 minutes
*/5 * * * * curl -X POST http://localhost:3013/api/v2/drip-campaigns/internal/process-queue
```

## Usage Examples

### Create Campaign
```javascript
POST /api/v2/drip-campaigns/admin/campaigns
{
  "campaign_key": "welcome-series",
  "name": "Welcome Series",
  "category": "onboarding",
  "is_system": true,
  "priority_level": 4,
  "steps": [
    {
      "step_number": 1,
      "template_key": "welcome-email",
      "delay_amount": 0,
      "delay_unit": "days"
    },
    {
      "step_number": 2,
      "template_key": "getting-started",
      "delay_amount": 2,
      "delay_unit": "days"
    }
  ],
  "triggers": [
    {
      "trigger_type": "event",
      "event_name": "user_signup"
    }
  ]
}
```

### Enroll User
```javascript
POST /api/v2/drip-campaigns/admin/enroll
{
  "user_id": 123,
  "campaign_id": 1,
  "context_data": { "artist_id": 456 }
}
```

### Track Conversion
```javascript
POST /api/v2/drip-campaigns/internal/track-conversion
{
  "user_id": 123,
  "conversion_type": "purchase",
  "conversion_value": 99.99,
  "conversion_data": { "order_id": 789 }
}
```

## Testing

### Reset Frequency Limits
```bash
POST /api/v2/drip-campaigns/test/reset-frequency/:userId
```

### Trigger Test Enrollment
```bash
POST /api/v2/drip-campaigns/test/trigger-campaign/:campaignId/:userId
```

## Files Structure

```
/api-service/src/modules/drip-campaigns/
├── index.js                     # Module exports
├── routes.js                    # All API endpoints
├── services/
│   ├── campaigns.js            # Campaign CRUD
│   ├── enrollments.js          # Enrollment management
│   ├── frequency.js            # Frequency manager
│   └── analytics.js            # Analytics aggregation
└── README.md                    # This file
```

## Dependencies

- `express` - Routing
- `mysql2/promise` - Database
- `../auth/middleware` - Authentication
- `../../services/emailService` - Email sending

## Permissions

- **Admin**: `manage_system` permission required
- **User**: `requireAuth` for user endpoints
- **Internal**: No auth (service-to-service)

## Notes

- All JSON fields are automatically parsed/stringified
- Transactions used for multi-table operations
- Comprehensive error logging
- Attribution window defaults to 7 days (168 hours)
- Priority levels: 1 (low) to 5 (high), default 3
