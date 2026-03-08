# Email Marketing Module - Quick Reference

**Status:** ✅ Deployed to staging-api.brakebee.com  
**Module:** `/api-service/src/modules/email-marketing/`  
**Base URL:** `/api/v2/email-marketing`

---

## 📂 File Locations

### Service Classes
```
/api-service/src/modules/email-marketing/services/
├── subscribers.js   # Subscriber CRUD, import/export (500 lines)
├── tags.js          # Tag management (300 lines)
├── forms.js         # Form management (350 lines)
├── campaigns.js     # Single blast campaigns (450 lines)
└── analytics.js     # Analytics tracking (700 lines)
```

### Utilities
```
/api-service/src/modules/email-marketing/utils/
├── emailHash.js     # SHA256 hashing (100 lines)
└── validation.js    # Input validation (100 lines)
```

### Routes
```
/api-service/src/modules/email-marketing/
├── routes.js        # 33 API endpoints (750 lines)
└── index.js         # Module exports
```

---

## 🔌 Quick Endpoint Reference

### Subscribers
```bash
GET    /subscribers              # List
POST   /subscribers              # Add
PUT    /subscribers/:id          # Update
DELETE /subscribers/:id          # Remove
POST   /subscribers/import       # CSV import
GET    /subscribers/export       # CSV export
```

### Tags
```bash
GET    /tags                     # List all tags
POST   /subscribers/:id/tags     # Add tags
DELETE /subscribers/:id/tags     # Remove tags
POST   /subscribers/bulk-tag     # Bulk tag
```

### Forms
```bash
GET    /forms                    # List forms
POST   /forms                    # Create form
GET    /forms/:id/embed-code     # Get embed code
POST   /public/subscribe/:formId # Public submission (NO AUTH)
```

### Campaigns
```bash
POST /campaigns/single-blast     # Create
POST /campaigns/:id/send-now     # Send immediately
GET  /campaigns/:id/recipients   # Preview recipients
```

### Analytics
```bash
GET /analytics/overview          # Summary stats
GET /analytics/campaigns/:id     # Campaign stats
```

### Webhooks (NO AUTH)
```bash
POST /webhooks/email/open        # Track opens
POST /webhooks/email/click       # Track clicks
POST /webhooks/email/bounce      # Track bounces
POST /webhooks/email/spam        # Track spam
```

---

## 🚀 Quick Start Examples

### Add Subscriber
```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","first_name":"John","tags":["vip"]}' \
  https://staging-api.brakebee.com/api/v2/email-marketing/subscribers
```

### Import CSV
```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "csv_data": [
      {"email":"user1@example.com","first_name":"User1"},
      {"email":"user2@example.com","first_name":"User2"}
    ],
    "options": {"auto_tags":["imported"]}
  }' \
  https://staging-api.brakebee.com/api/v2/email-marketing/subscribers/import
```

### Create Form
```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "form_name":"Newsletter Signup",
    "form_title":"Join Our List",
    "auto_tags":["newsletter"],
    "require_double_optin":true
  }' \
  https://staging-api.brakebee.com/api/v2/email-marketing/forms
```

### Send Campaign
```bash
# 1. Create campaign
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"January Update",
    "template_key":"monthly-newsletter",
    "target_list_filter":{"tags":["newsletter"]}
  }' \
  https://staging-api.brakebee.com/api/v2/email-marketing/campaigns/single-blast

# 2. Send immediately
curl -X POST \
  -H "Authorization: Bearer {token}" \
  https://staging-api.brakebee.com/api/v2/email-marketing/campaigns/1/send-now
```

---

## 🗄️ Database Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `email_subscribers` | Global email pool | Dedup by email_hash, global flags |
| `user_email_lists` | User-subscriber links | Tags (JSON), custom fields, engagement |
| `email_campaign_analytics` | Event tracking | Opens, clicks, bounces, device info |
| `email_collection_forms` | Form configs | Auto-tags, double opt-in, styling |
| `drip_campaigns` (extended) | Campaigns | Added single_blast type support |

---

## 🔑 Key Concepts

### Email Deduplication
- SHA256 hash of lowercase email
- One global `email_subscribers` entry per email
- Multiple `user_email_lists` entries (one per user)
- Each user has own tags, custom fields, engagement tracking

### Tag System
- JSON array storage: `["tag1", "tag2"]`
- Query with `JSON_CONTAINS(tags, '"tag1"')`
- Bulk operations supported
- Tag statistics available

### Global vs List-Specific
- **Global flags:** `global_unsubscribe`, `global_bounce`, `global_spam_complaint`
- **List-specific:** `status`, `tags`, `custom_fields`, engagement
- Global flags prevent re-adding across all users

---

## 🧪 Testing Commands

### Test Auth
```bash
curl https://staging-api.brakebee.com/api/v2/email-marketing/subscribers
# Expected: {"success":false,"error":{"code":"NO_TOKEN",...}}
```

### Test Public Endpoint
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  https://staging-api.brakebee.com/api/v2/email-marketing/public/subscribe/1
# Expected: Form validation or subscription success
```

### Test Webhook
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"analytics_id":1}' \
  https://staging-api.brakebee.com/api/v2/email-marketing/webhooks/email/open
# Expected: {"success":true}
```

---

## 📊 SQL Query Examples

### Find All Subscribers for User
```sql
SELECT 
  es.email,
  es.first_name,
  uel.tags,
  uel.status,
  uel.total_opens,
  uel.total_clicks
FROM user_email_lists uel
JOIN email_subscribers es ON uel.subscriber_id = es.id
WHERE uel.user_id = 5 AND uel.status = 'subscribed';
```

### Find Subscribers with Tag
```sql
SELECT es.email, uel.tags
FROM user_email_lists uel
JOIN email_subscribers es ON uel.subscriber_id = es.id
WHERE uel.user_id = 5
  AND JSON_CONTAINS(uel.tags, '"vip"');
```

### Check for Duplicate Email
```sql
SELECT id FROM email_subscribers 
WHERE email_hash = SHA2(LOWER('user@example.com'), 256);
```

### Campaign Performance
```sql
SELECT 
  dc.name,
  COUNT(*) as emails_sent,
  SUM(eca.opened) as total_opens,
  SUM(eca.clicked) as total_clicks,
  ROUND(SUM(eca.opened) / COUNT(*) * 100, 2) as open_rate
FROM email_campaign_analytics eca
JOIN drip_campaigns dc ON eca.campaign_id = dc.id
WHERE dc.created_by = 5
GROUP BY dc.id;
```

---

## 🔧 Service Management

### Restart Service
```bash
pm2 restart staging-api
```

### Check Logs
```bash
pm2 logs staging-api --lines 50
```

### Health Check
```bash
curl https://staging-api.brakebee.com/health
```

---

## 🎯 Common Use Cases

### Use Case 1: Manual Subscriber Management
1. Add subscriber → `POST /subscribers`
2. Add tags → `POST /subscribers/:id/tags`
3. Update custom fields → `PUT /subscribers/:id`
4. Export list → `GET /subscribers/export?tags[]=vip`

### Use Case 2: Form-Based Collection
1. Create form → `POST /forms`
2. Get embed code → `GET /forms/:id/embed-code`
3. User submits → `POST /public/subscribe/:formId` (frontend)
4. View submissions → `GET /subscribers?source=form-submission`

### Use Case 3: Single Blast Campaign
1. Create campaign → `POST /campaigns/single-blast`
2. Preview → `GET /campaigns/:id/recipients`
3. Send → `POST /campaigns/:id/send-now`
4. Track → Webhooks fire automatically
5. View stats → `GET /analytics/campaigns/:id`

### Use Case 4: CSV Import
1. Upload CSV → Frontend parses to JSON
2. Import → `POST /subscribers/import`
3. Review results → `{ imported: 450, skipped: 50, errors: [...] }`
4. View imported → `GET /subscribers?tags[]=imported`

---

## 🚨 Troubleshooting

### Issue: "Email has globally unsubscribed"
**Cause:** Subscriber previously unsubscribed globally  
**Solution:** Cannot re-add. User must opt-in via form with double opt-in

### Issue: No recipients for campaign
**Cause:** No subscribers match `target_list_filter`  
**Check:** `GET /campaigns/:id/recipients` to preview

### Issue: Form submission fails
**Check:**
1. Form is active: `is_active = 1`
2. Email is valid format
3. Not globally unsubscribed/bounced/spam

---

**For detailed implementation docs:**
- `/docs/EMAIL_MARKETING_MODULE_IMPLEMENTATION.md`
- `/api-service/src/modules/email-marketing/README.md`

**Status:** ✅ DEPLOYED AND READY FOR FRONTEND  
**Service:** staging-api.brakebee.com  
**Module:** `/api/v2/email-marketing`
