# Email Infrastructure Analysis

## 1. Existing Cron Jobs ✅

### Current Cron Schedule
```bash
# Active cron jobs (from crontab -l):
* * * * * node /var/www/main/api-service/scripts/notify_media_server.js >> /var/www/main/api-service/logs/notify_media_server.log 2>&1

* * * * * cd /var/www/main && node api-service/cron/process-email-queue.js >> /var/www/main/api-service/logs/email-queue.log 2>&1
0 */4 * * * cd /var/www/main && node /var/www/main/api-service/scripts/check-delivery-status.js >> /var/log/delivery-checker.log 2>&1
*/5 * * * * cd /var/www/main/api-service && node scripts/replace-temp-urls.js >> /var/www/main/api-service/logs/url-replacement.log 2>&1
```

### Cron Job Files
**Location:** `/var/www/main/api-service/cron/`
- ✅ `process-email-queue.js` - **Runs every minute** - Processes pending emails
- ✅ `process-event-reminders.js` - Event booth fee reminders (not in crontab yet)
- ✅ `series-automation.js` - Series event automation
- ✅ `external-marketplace-sync.js` - Marketplace synchronization
- ✅ `internal-marketplace-sync.js` - Internal marketplace sync

### Setup Scripts
- `/var/www/main/api-service/setup-cron.sh`
- `/var/www/main/api-service/setup-event-cron.sh`
- `/var/www/main/api-service/setup-url-replacement-cron.sh`

## 2. Email System Architecture ✅

### Email Service Class
**File:** `/var/www/main/api-service/src/services/emailService.js`

**Features:**
- ✅ **Nodemailer-based** SMTP transport
- ✅ **Template system** with database-stored templates
- ✅ **User preferences** and notification settings
- ✅ **Bounce management** and blacklist handling
- ✅ **Queue processing** with retry logic
- ✅ **Priority levels** (1-5, lower = higher priority)

**Usage Example:**
```javascript
const EmailService = require('../services/emailService');
const emailService = new EmailService();

// Send template-based email
await emailService.sendEmail(
  userId, 
  'template_key', 
  templateData,
  {
    replyTo: 'custom@email.com' // Optional
  }
);
```

### Event-Specific Email Service
**File:** `/var/www/main/api-service/src/services/eventEmailService.js`
- ✅ Specialized for event booth fee reminders
- ✅ Auto-decline functionality for overdue payments
- ✅ Automated reminder sequences

## 3. Email Database Tables ✅

### `email_templates` Table
```sql
CREATE TABLE `email_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `template_key` varchar(100) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `priority_level` tinyint NOT NULL DEFAULT 3,
  `can_compile` tinyint(1) NOT NULL DEFAULT 1,
  `is_transactional` tinyint(1) NOT NULL DEFAULT 0,
  `subject_template` text NOT NULL,
  `body_template` text NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `layout_key` varchar(100) DEFAULT 'default'
);
```

**Example Templates:**
- `order_confirmation` (transactional)
- `vendor_order_notification`
- `booth_fee_reminder`
- `booth_fee_overdue`
- `product_update`
- `digest_email`

### `email_queue` Table
```sql
CREATE TABLE `email_queue` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `template_id` bigint NOT NULL,
  `priority` tinyint NOT NULL DEFAULT 3,
  `data` json NOT NULL,
  `scheduled_for` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','processing','sent','failed') DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT 0
);
```

**Queue Processing:**
- ✅ Processes 50 emails per minute
- ✅ Max 3 retry attempts
- ✅ Priority-based ordering (ASC = higher priority first)
- ✅ Scheduled delivery support

### `email_log` Table
```sql
CREATE TABLE `email_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `email_address` varchar(255) NOT NULL,
  `template_id` bigint NOT NULL,
  `subject` varchar(255) NOT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('sent','failed','bounced') NOT NULL,
  `attempt_count` int NOT NULL DEFAULT 1,
  `error_message` varchar(500) DEFAULT NULL,
  `smtp_response` text DEFAULT NULL
);
```

### Supporting Tables
- ✅ `email_layouts` - Email layout templates
- ✅ `email_tracking` - Email open/click tracking
- ✅ `email_automation_rules` - Automated email rules
- ✅ `user_email_preferences` - User notification preferences
- ✅ `user_email_preference_log` - Preference change history
- ✅ `application_email_log` - Event application email tracking

## 4. Users Table Structure ✅

### Contact-Related Fields
```sql
-- Primary identifier (also used as email)
`username` varchar(255) NOT NULL UNIQUE,

-- Email verification status  
`email_verified` enum('yes','no') DEFAULT 'no',

-- User classification
`user_type` enum('artist','promoter','community','admin','Draft','wholesale') NOT NULL,

-- Account status
`status` enum('active','inactive','suspended','draft','deleted') DEFAULT 'draft',
```

**Key Points:**
- ✅ **`username` field serves as email address** (unique constraint)
- ✅ **Email verification tracking** via `email_verified` field
- ✅ **User types include `promoter`** for event organizers
- ✅ **Status field** for account management

### Additional User Fields
- `created_at`, `updated_at` - Standard timestamps
- `last_login` - Login tracking
- `user_type` - Role-based access
- `onboarding_completed` - Onboarding status
- `cookie_consent_accepted` - GDPR compliance

## 5. Email Queue Infrastructure ✅

### Queue Processing Flow
1. **Email Creation** → `email_queue` table
2. **Cron Job** (every minute) → `process-email-queue.js`
3. **Template Rendering** → `email_templates` + user data
4. **SMTP Delivery** → Nodemailer transport
5. **Logging** → `email_log` table
6. **Retry Logic** → Max 3 attempts for failed emails

### Queue Features
- ✅ **Priority levels** (1-5, lower number = higher priority)
- ✅ **Scheduled delivery** via `scheduled_for` timestamp
- ✅ **User preferences** integration (frequency, enabled/disabled)
- ✅ **Retry mechanism** with attempt counting
- ✅ **Status tracking** (pending → processing → sent/failed)

### SMTP Configuration
**Environment Variables Required:**
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USERNAME` - SMTP authentication username
- `SMTP_PASSWORD` - SMTP authentication password

## 6. Email Usage Examples ✅

### Contact Form Email (Transactional)
```javascript
// File: /var/www/main/api-service/src/routes/addons.js
await emailService.sendEmail(
  site.user_id, 
  'contact_form_notification', 
  templateData,
  {
    replyTo: sanitizedEmail // Allow direct reply to sender
  }
);
```

### Event Reminder System
```javascript
// File: /var/www/main/api-service/cron/process-event-reminders.js
const EventEmailService = require('../src/services/eventEmailService');
const emailService = new EventEmailService();

// Process automated reminders
const reminderResults = await emailService.processAutomatedReminders();
```

### Admin Email Service Usage
```javascript
// File: /var/www/main/api-service/src/routes/admin.js
const EmailService = require('../services/emailService');
const emailService = new EmailService();
```

## 7. Integration Points for Step 3 ✅

### For Promoter Claim Email Sequence:

**Template Creation Needed:**
- `promoter_claim_initial` - First contact email
- `promoter_claim_reminder_1` - 3-day follow-up
- `promoter_claim_reminder_2` - 7-day follow-up
- `promoter_claim_final` - 14-day final notice

**Queue Integration:**
```javascript
// Add to email queue with scheduling
await db.execute(`
  INSERT INTO email_queue (user_id, template_id, priority, data, scheduled_for)
  VALUES (?, ?, ?, ?, ?)
`, [userId, templateId, 2, JSON.stringify(templateData), scheduledDate]);
```

**Cron Job Pattern:**
- ✅ Use existing `/var/www/main/api-service/cron/` directory
- ✅ Follow existing logging pattern (`>> logs/filename.log 2>&1`)
- ✅ Use existing database connection pattern
- ✅ Add to crontab via setup script

### Ready Infrastructure:
- ✅ **Email queue system** operational
- ✅ **Template system** ready for new templates
- ✅ **Cron job framework** established
- ✅ **User contact data** available (`username` as email)
- ✅ **Logging infrastructure** in place
- ✅ **SMTP transport** configured

**Next Step:** Create promoter claim email sequence using existing infrastructure!
