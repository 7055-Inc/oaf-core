# Drip Campaigns - Quick Reference

**Status:** ✅ Deployed to staging-api.brakebee.com  
**Module:** `/api-service/src/modules/drip-campaigns/`  
**Base URL:** `/api/v2/drip-campaigns`

---

## 🚀 Quick Start

### Create Campaign
```bash
curl -X POST \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_key": "welcome-series",
    "name": "Welcome Series",
    "category": "onboarding",
    "is_system": true,
    "priority_level": 4,
    "steps": [{
      "step_number": 1,
      "template_key": "welcome-email",
      "delay_amount": 0,
      "delay_unit": "days"
    }],
    "triggers": [{
      "trigger_type": "event",
      "event_name": "user_signup"
    }]
  }' \
  https://staging-api.brakebee.com/api/v2/drip-campaigns/admin/campaigns
```

### Enroll User
```bash
curl -X POST \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 5, "campaign_id": 1}' \
  https://staging-api.brakebee.com/api/v2/drip-campaigns/admin/enroll
```

### Process Queue (Cron)
```bash
curl -X POST https://staging-api.brakebee.com/api/v2/drip-campaigns/internal/process-queue
```

---

## 📂 File Locations

### Service Classes
```
/api-service/src/modules/drip-campaigns/services/
├── campaigns.js     # Campaign CRUD (600 lines)
├── enrollments.js   # Enrollment management (500 lines)
├── frequency.js     # Frequency limits (400 lines)
└── analytics.js     # Analytics (500 lines)
```

### Routes & Config
```
/api-service/src/modules/drip-campaigns/
├── routes.js        # 35 API endpoints (1,000 lines)
├── index.js         # Module exports
└── README.md        # Module documentation
```

### Database
```
/database/migrations/012_drip_campaigns_system.sql  # 9 tables
```

### Documentation
```
/docs/DRIP_CAMPAIGNS_IMPLEMENTATION.md     # Full implementation docs
/docs/DRIP_CAMPAIGNS_QUICK_REFERENCE.md    # This file
/docs/DRIP_CAMPAIGNS_API_SPEC.md           # Original spec
```

---

## 🗄️ Database Tables (9)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `drip_campaigns` | Campaign definitions | campaign_key, priority_level |
| `drip_steps` | Email sequences | step_number, template_key, delay_* |
| `drip_triggers` | Trigger rules | trigger_type, event_name, behavior_rule |
| `drip_enrollments` | User journeys | user_id, campaign_id, current_step, status |
| `drip_events` | Email events | event_type, enrollment_id |
| `drip_conversions` | Conversions | conversion_type, conversion_value |
| `drip_analytics` | Aggregated metrics | campaign_id, step_number, metrics |
| `user_drip_preferences` | User settings | user_id, campaign_id, is_enabled |
| `drip_frequency_tracking` | Daily limits | user_id, drip_emails_sent_today, is_paused |

---

## 🔌 API Endpoints (35)

### Admin (24 endpoints)

**Campaigns:**
- `GET    /admin/campaigns` - List campaigns
- `GET    /admin/campaigns/:id` - Get campaign details
- `POST   /admin/campaigns` - Create campaign
- `PUT    /admin/campaigns/:id` - Update campaign
- `DELETE /admin/campaigns/:id` - Delete campaign
- `POST   /admin/campaigns/:id/publish` - Publish
- `POST   /admin/campaigns/:id/unpublish` - Unpublish

**Steps:**
- `POST   /admin/campaigns/:campaignId/steps` - Add step
- `PUT    /admin/steps/:id` - Update step
- `DELETE /admin/steps/:id` - Delete step
- `POST   /admin/campaigns/:campaignId/steps/reorder` - Reorder steps

**Triggers:**
- `POST   /admin/campaigns/:campaignId/triggers` - Add trigger
- `PUT    /admin/triggers/:id` - Update trigger
- `DELETE /admin/triggers/:id` - Delete trigger

**Enrollments:**
- `GET  /admin/campaigns/:campaignId/enrollments` - Campaign enrollments
- `GET  /admin/users/:userId/enrollments` - User enrollments
- `POST /admin/enroll` - Manual enrollment
- `POST /admin/enrollments/:id/exit` - Exit enrollment
- `POST /admin/enrollments/:id/pause` - Pause enrollment
- `POST /admin/enrollments/:id/resume` - Resume enrollment

**Analytics:**
- `GET /admin/campaigns/:campaignId/analytics` - Campaign analytics
- `GET /admin/analytics/summary` - All campaigns summary
- `GET /admin/analytics/conversions` - Conversion report
- `GET /admin/analytics/frequency` - Frequency stats

### User (6 endpoints)
- `GET  /campaigns` - Available campaigns
- `GET  /my-campaigns` - My active campaigns
- `POST /campaigns/:campaignId/enable` - Enable campaign
- `POST /campaigns/:campaignId/disable` - Disable campaign
- `GET  /my-campaigns/:campaignId/analytics` - My campaign stats
- `POST /enrollments/:id/unsubscribe` - Unsubscribe

### Internal (5 endpoints)
- `POST /internal/process-queue` - Process queue (cron)
- `POST /internal/trigger` - Handle behavior trigger
- `POST /internal/track-event` - Track email event
- `POST /internal/track-conversion` - Track conversion
- `POST /internal/update-analytics` - Update analytics

### Testing (2 endpoints)
- `POST /test/reset-frequency/:userId` - Reset frequency limits
- `POST /test/trigger-campaign/:campaignId/:userId` - Manual trigger

---

## ⚙️ Key Features

### Frequency Limits
- **6 emails/day max** per user
- **2-hour minimum gap** between emails
- **10-hour pause** after hitting daily limit
- Automatic tracking and enforcement

### Priority Queue
- Priority levels: 1 (low) to 5 (high)
- When multiple campaigns ready for same user:
  - Send highest priority first
  - Suppress lower priority
  - Track suppression count

### Trigger Types
- `event` - User actions (signup, purchase)
- `behavior_threshold` - Behavior counts (view product 5×)
- `manual` - Admin-triggered
- `scheduled` - Time-based

### Expiry Rules
- **Absolute:** `expires_at` (specific date)
- **Relative:** `expires_after_enrollment_days` (from signup)
- Checked before each send

### Conversion Tracking
- Attribution window: 7 days default
- Links to last opened/clicked email
- Automatic goal checking → exit campaign

---

## 🔍 Common Queries

### Active Enrollments
```sql
SELECT de.id, u.username, dc.name, de.current_step, de.next_send_at
FROM drip_enrollments de
JOIN users u ON de.user_id = u.id
JOIN drip_campaigns dc ON de.campaign_id = dc.id
WHERE de.status = 'active'
ORDER BY de.next_send_at ASC;
```

### Today's Frequency Status
```sql
SELECT user_id, drip_emails_sent_today, is_paused, paused_until
FROM drip_frequency_tracking
WHERE tracking_date = CURDATE() AND drip_emails_sent_today > 0;
```

### Campaign Performance
```sql
SELECT 
  dc.name,
  COUNT(DISTINCT de.id) as enrollments,
  SUM(CASE WHEN dev.event_type = 'sent' THEN 1 ELSE 0 END) as emails_sent,
  SUM(CASE WHEN dev.event_type = 'opened' THEN 1 ELSE 0 END) as opens,
  COUNT(DISTINCT dconv.id) as conversions
FROM drip_campaigns dc
LEFT JOIN drip_enrollments de ON dc.id = de.campaign_id
LEFT JOIN drip_events dev ON de.id = dev.enrollment_id
LEFT JOIN drip_conversions dconv ON dc.id = dconv.campaign_id
GROUP BY dc.id;
```

---

## 🔧 Service Management

### Restart Service
```bash
pm2 restart staging-api
```

### Check Service Status
```bash
pm2 status staging-api
```

### View Logs
```bash
pm2 logs staging-api --lines 50
```

### Health Check
```bash
curl https://staging-api.brakebee.com/health
```

---

## 🧪 Testing Commands

### List Campaigns
```bash
curl -H "Authorization: Bearer {token}" \
  https://staging-api.brakebee.com/api/v2/drip-campaigns/admin/campaigns
```

### Get Campaign
```bash
curl -H "Authorization: Bearer {token}" \
  https://staging-api.brakebee.com/api/v2/drip-campaigns/admin/campaigns/1
```

### Enroll User
```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 5, "campaign_id": 1, "context_data": {"artist_id": 10}}' \
  https://staging-api.brakebee.com/api/v2/drip-campaigns/admin/enroll
```

### Track Conversion
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"user_id": 5, "conversion_type": "purchase", "conversion_value": 99.99}' \
  https://staging-api.brakebee.com/api/v2/drip-campaigns/internal/track-conversion
```

### Reset Frequency (Testing)
```bash
curl -X POST \
  -H "Authorization: Bearer {admin_token}" \
  https://staging-api.brakebee.com/api/v2/drip-campaigns/test/reset-frequency/5
```

---

## 📊 Integration Examples

### Cron Job (Every 5 minutes)
```bash
*/5 * * * * curl -X POST http://localhost:3013/api/v2/drip-campaigns/internal/process-queue
```

### Behavior Trigger (ClickHouse)
```javascript
// When user views 5 products from same artist
await axios.post('http://localhost:3013/api/v2/drip-campaigns/internal/trigger', {
  trigger_type: 'behavior',
  user_id: 123,
  behavior_type: 'product_view',
  behavior_data: { artist_id: 456, count: 5 }
});
```

### Email Event (Webhook)
```javascript
// When email opened
await axios.post('http://localhost:3013/api/v2/drip-campaigns/internal/track-event', {
  enrollment_id: 1,
  event_type: 'opened',
  event_data: { device_type: 'mobile' }
});
```

### Conversion Tracking (Checkout)
```javascript
// On purchase completion
await axios.post('http://localhost:3013/api/v2/drip-campaigns/internal/track-conversion', {
  user_id: 123,
  conversion_type: 'purchase',
  conversion_value: 99.99,
  conversion_data: { order_id: 789 }
});
```

---

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check PM2 logs
pm2 logs staging-api --lines 100

# Check for syntax errors
cd /var/www/staging/api-service/src/modules/drip-campaigns
node -c routes.js
```

### No Emails Sending
```bash
# 1. Check enrollments ready to send
mysql> SELECT COUNT(*) FROM drip_enrollments 
       WHERE status='active' AND next_send_at <= NOW();

# 2. Check frequency limits
mysql> SELECT * FROM drip_frequency_tracking 
       WHERE tracking_date = CURDATE() AND is_paused = 1;

# 3. Manually run queue processor
curl -X POST http://localhost:3013/api/v2/drip-campaigns/internal/process-queue
```

### Module Not Loading
```bash
# Check if module exists
ls -la /var/www/staging/api-service/src/modules/drip-campaigns/

# Check server.js integration
grep drip-campaigns /var/www/staging/api-service/src/server.js

# Restart service
pm2 restart staging-api
```

---

## 📈 Performance Tips

### Database Indexes
- All critical foreign keys indexed
- `next_send_at` indexed for queue queries
- `tracking_date` + `user_id` indexed for frequency

### Queue Optimization
- Process in batches (50-100 at a time)
- Use priority ordering
- Skip paused/suppressed users early

### Analytics
- Use aggregation tables for reporting
- Cache frequent queries (Redis)
- Run heavy analytics in background jobs

---

## 🎯 Next Steps

1. **Set up cron job** for queue processing
2. **Integrate behavior triggers** from ClickHouse
3. **Wire up email webhooks** for event tracking
4. **Add conversion tracking** in checkout flow
5. **Build admin UI** for campaign management
6. **Test end-to-end** with real campaigns

---

**For detailed documentation, see:**
- Full Implementation: `/docs/DRIP_CAMPAIGNS_IMPLEMENTATION.md`
- Original Spec: `/docs/DRIP_CAMPAIGNS_API_SPEC.md`
- Module README: `/api-service/src/modules/drip-campaigns/README.md`

**Status:** ✅ DEPLOYED AND READY  
**Service:** staging-api.brakebee.com  
**Health:** Online ✅
