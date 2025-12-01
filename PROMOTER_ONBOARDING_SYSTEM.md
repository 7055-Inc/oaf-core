# Promoter Onboarding System - Complete Implementation

## Overview

A fully automated promoter onboarding system that allows admins to create draft promoter accounts with pre-configured events. Promoters receive an email with a claim link to activate their account, set their password, and immediately start managing their event.

---

## System Architecture

```
Admin Creates Promoter → Draft User + Event + Token → Email Sent
                                                            ↓
                                                   Promoter Clicks Link
                                                            ↓
                                    Claim Page: Set Password + Activate
                                                            ↓
                                          Auto-Login + Redirect to Event
                                                            ↓
                                    Enrolled in Drip Campaign (9 emails)
                                                            ↓
                                      Feature-Based Email Logic
```

---

## Components Built

### 1. Database Schema ✅
**Location:** `/var/www/main/migrations/promoter_onboarding_system.sql`

**Tables Created:**
- `promoter_claim_tokens` - Secure tokens for account claiming (6-month expiry)
- `onboarding_campaigns` - Campaign definitions
- `onboarding_email_templates` - Email sequence templates
- `user_campaign_enrollments` - User progress tracking
- `user_campaign_emails` - Email send/skip logging

**Table Modifications:**
- `users` - Added `created_by_admin_id`, `email_confirmed`
- `events` - Added `created_by_admin_id`, `claim_status`

### 2. Admin Interface ✅

**Add Promoter Form:**
- **Location:** `/var/www/main/components/dashboard/manage-system/components/AddPromoter.js`
- **Access:** Dashboard → Manage System → Add Promoter
- **Features:**
  - Real-time email duplicate checking
  - Promoter info: email, name, business name
  - Event info: title, dates, venue, location
  - Automatic claim email sending

**Unclaimed Events Dashboard:**
- **Location:** `/var/www/main/components/dashboard/manage-system/components/UnclaimedEvents.js`
- **Access:** Dashboard → Manage System → Unclaimed Events
- **Features:**
  - List all pending claims with days pending
  - Statistics dashboard (total, >30 days, >90 days)
  - Resend claim email button
  - Delete unclaimed event button
  - Confirmation dialogs for safety

### 3. API Endpoints ✅

**Admin Endpoints** (`/api/admin/promoters/*`):
- `GET /check-email` - Check if promoter exists
- `POST /create` - Create draft promoter, event, and send email
- `GET /unclaimed-events` - List all unclaimed events
- `POST /resend-claim` - Regenerate and resend claim email
- `DELETE /unclaimed-events/:id` - Delete unclaimed event and draft user

**Public Claim Endpoints** (`/api/promoters/*`):
- `GET /verify-claim/:token` - Verify token validity and return event details
- `POST /claim/:token` - Activate account, set password, claim event, enroll in campaign

**Files:**
- `/var/www/main/api-service/src/routes/admin/promoter-onboarding.js`
- `/var/www/main/api-service/src/routes/promoter-claim.js`

### 4. Claim Page ✅

**Location:** `/var/www/main/pages/promoters/claim/[token].js`

**Features:**
- Token verification and validation
- Display event details to promoter
- Password setup form (8+ characters, confirmation)
- Account activation with Firebase integration
- Custom token generation for auto-login
- Automatic redirect to event editor
- Error handling for expired/invalid tokens

### 5. Email Templates ✅

**Location:** `/var/www/main/migrations/promoter_onboarding_email_templates.sql`

**Templates Created:**

1. **`promoter_claim_invitation`** - Initial claim email (transactional, priority 1)
2. **`onboarding_welcome`** - Day 0: Welcome email
3. **`onboarding_complete_event`** - Day 1: Complete event profile (skip if published)
4. **`onboarding_publish_event`** - Day 3: Publish your event (skip if published)
5. **`onboarding_add_photos`** - Day 5: Add event photos (skip if has photos)
6. **`onboarding_accept_applications`** - Day 7: Start accepting applications (skip if accepting)
7. **`onboarding_create_tickets`** - Day 10: Set up ticket sales (skip if has tickets)
8. **`onboarding_review_applications`** - Day 14: Tips for reviewing (skip if reviewed)
9. **`onboarding_marketing_materials`** - Day 21: Order marketing materials (always send)
10. **`onboarding_advanced_features`** - Day 30: Advanced features guide (always send)

### 6. Feature Check System ✅

**Location:** `/var/www/main/api-service/src/lib/featureChecks.js`

**Functions:**
- `event_is_published(userId)` - Check if user has published events
- `event_has_photos(userId)` - Check if events have photos
- `event_accepting_applications(userId)` - Check if accepting applications
- `event_has_tickets(userId)` - Check if event has ticket tiers
- `promoter_has_reviewed_applications(userId)` - Check if promoter reviewed apps
- `checkFeature(functionName, userId, params)` - Generic dispatcher

### 7. Cron Jobs ✅

**Drip Campaign Processor:**
- **Location:** `/var/www/main/api-service/src/cron/promoter-drip-campaign.js`
- **Schedule:** Daily
- **Function:** `processDripCampaign()`
- **Features:**
  - Processes all active campaign enrollments
  - Checks days since enrollment
  - Runs feature checks before sending
  - Logs skipped emails with reasons
  - Marks campaigns as completed
  - Error handling with stats logging

**Cleanup Unclaimed Accounts:**
- **Location:** `/var/www/main/api-service/src/cron/cleanup-unclaimed-accounts.js`
- **Schedule:** Weekly
- **Function:** `cleanupUnclaimedAccounts()`
- **Features:**
  - Deletes accounts unclaimed after 180 days
  - Removes events, profiles, tokens
  - Deletes Firebase users
  - Transaction-safe with rollback
  - Detailed logging and stats
  - Alternative: `markExpiredUnclaimedEvents()` for soft delete

---

## How to Use

### Admin Creates Promoter

1. Navigate to **Dashboard → Manage System → Add Promoter**
2. Fill in promoter information:
   - Email (required - checks for duplicates)
   - First name, last name (required)
   - Business name (optional)
3. Fill in event information:
   - Event title (required)
   - Start and end dates (required)
   - Venue details (optional)
   - Description (optional)
4. Click **"Create Promoter & Send Claim Email"**
5. System creates:
   - Draft Firebase user (disabled, no password)
   - Draft database user (status='draft')
   - User profiles
   - Draft event (claim_status='pending_claim')
   - Claim token (6-month expiry)
   - Sends claim invitation email

### Promoter Claims Account

1. Promoter receives email with "Claim Your Event" button
2. Clicks link → `/promoters/claim/{token}`
3. Sees event details and account information
4. Sets password (8+ characters)
5. Clicks **"Activate Account & Claim Event"**
6. System:
   - Sets Firebase password
   - Enables Firebase account
   - Updates user status to 'active'
   - Marks email as confirmed
   - Updates event claim_status to 'claimed'
   - Marks token as claimed
   - Enrolls in drip campaign
   - Sends welcome email
   - Auto-logs user in
   - Redirects to event editor

### Drip Campaign Flow

**Automatic Email Sequence:**
- Day 0: Welcome email (sent immediately after claim)
- Day 1: Complete event profile
- Day 3: Publish event
- Day 5: Add photos
- Day 7: Start accepting applications
- Day 10: Set up tickets
- Day 14: Review applications tips
- Day 21: Marketing materials
- Day 30: Advanced features

**Smart Skipping:**
- If feature already used, email is skipped
- Logged in `user_campaign_emails` with skip reason
- Campaign progresses to next email
- No spam - only relevant emails sent

---

## Cron Setup

Add to your cron configuration (crontab):

```bash
# Daily drip campaign processor (runs at 9 AM daily)
0 9 * * * cd /var/www/main/api-service && node src/cron/promoter-drip-campaign.js >> /var/log/drip-campaign.log 2>&1

# Weekly cleanup (runs at 2 AM every Sunday)
0 2 * * 0 cd /var/www/main/api-service && node src/cron/cleanup-unclaimed-accounts.js >> /var/log/cleanup.log 2>&1
```

**Manual Testing:**
```bash
# Test drip campaign
cd /var/www/main/api-service
node src/cron/promoter-drip-campaign.js

# Test cleanup (mark only - doesn't delete)
node src/cron/cleanup-unclaimed-accounts.js --mark-only

# Test cleanup (actual deletion)
node src/cron/cleanup-unclaimed-accounts.js
```

---

## Security Features

1. **Token Security:**
   - 32-byte hex tokens (64 characters)
   - 6-month expiration
   - Single-use (marked as claimed)
   - Server-side validation only

2. **Email Verification:**
   - No Firebase email verification needed
   - Claiming link serves as verification
   - `email_confirmed` flag set on claim

3. **Account Safety:**
   - Duplicate email checking prevents conflicts
   - Transaction-safe database operations
   - Firebase user disabled until claimed
   - Password requirements enforced (8+ chars)

4. **Admin Audit Trail:**
   - `created_by_admin_id` tracks who created accounts
   - Claim tokens track `created_by_admin_id`
   - All actions logged in database

---

## Database Queries for Monitoring

### Check Pending Claims
```sql
SELECT 
  e.title,
  u.username,
  e.created_at,
  DATEDIFF(NOW(), e.created_at) as days_pending
FROM events e
JOIN users u ON e.promoter_id = u.id
WHERE e.claim_status = 'pending_claim'
ORDER BY e.created_at DESC;
```

### Campaign Progress
```sql
SELECT 
  u.username,
  oc.name as campaign,
  uce.current_step,
  uce.enrolled_at,
  COUNT(cem.id) as emails_sent
FROM user_campaign_enrollments uce
JOIN users u ON uce.user_id = u.id
JOIN onboarding_campaigns oc ON uce.campaign_id = oc.id
LEFT JOIN user_campaign_emails cem ON uce.id = cem.enrollment_id
WHERE uce.completed_at IS NULL
GROUP BY uce.id;
```

### Email Stats
```sql
SELECT 
  oet.template_key,
  COUNT(CASE WHEN cem.skipped = 0 THEN 1 END) as sent,
  COUNT(CASE WHEN cem.skipped = 1 THEN 1 END) as skipped
FROM onboarding_email_templates oet
LEFT JOIN user_campaign_emails cem ON oet.id = cem.template_id
GROUP BY oet.id
ORDER BY oet.sequence_order;
```

---

## Troubleshooting

### Email Not Received
1. Check `email_log` table for send status
2. Check `bounce_tracking` for bounces
3. Resend from "Unclaimed Events" dashboard
4. Verify SMTP configuration

### Claim Link Not Working
1. Check token expiration in `promoter_claim_tokens`
2. Verify token hasn't been claimed already
3. Check browser console for errors
4. Verify API endpoint is accessible

### Drip Emails Not Sending
1. Check cron job is running: `ps aux | grep drip-campaign`
2. Check logs: `/var/log/drip-campaign.log`
3. Verify campaign is active in database
4. Check user enrollment status

### Cleanup Not Running
1. Check cron schedule: `crontab -l`
2. Check logs: `/var/log/cleanup.log`
3. Manually test: `node src/cron/cleanup-unclaimed-accounts.js --mark-only`

---

## Future Enhancements

Potential improvements:
1. Multiple campaigns (different sequences for different event types)
2. A/B testing for email templates
3. Custom email delays per template
4. Webhook notifications for claims
5. Admin dashboard for campaign analytics
6. SMS notifications option
7. Multi-event claim in single email
8. Customizable cleanup threshold per account

---

## Files Summary

### Frontend
- `/pages/promoters/claim/[token].js` - Claim page
- `/pages/promoters/claim/claim.module.css` - Claim page styles
- `/components/dashboard/manage-system/components/AddPromoter.js` - Admin form
- `/components/dashboard/manage-system/components/UnclaimedEvents.js` - Admin dashboard
- `/components/dashboard/manage-system/ManageSystemMenu.js` - Menu integration
- `/pages/dashboard/index.js` - Dashboard integration

### Backend
- `/api-service/src/routes/admin/promoter-onboarding.js` - Admin API routes
- `/api-service/src/routes/promoter-claim.js` - Public claim API routes
- `/api-service/src/routes/admin.js` - Admin router integration
- `/api-service/src/server.js` - Server routes registration
- `/api-service/src/lib/featureChecks.js` - Feature detection functions
- `/api-service/src/cron/promoter-drip-campaign.js` - Daily drip processor
- `/api-service/src/cron/cleanup-unclaimed-accounts.js` - Weekly cleanup

### Database
- `/migrations/promoter_onboarding_system.sql` - Schema and initial data
- `/migrations/promoter_onboarding_email_templates.sql` - Email templates

---

## Complete! ✅

All 11 tasks completed:
1. ✅ Database schema
2. ✅ Admin form component
3. ✅ Admin API endpoints
4. ✅ Claim invitation email template
5. ✅ Claim page with password setup
6. ✅ Claim API endpoints with auto-login
7. ✅ All 10 drip campaign email templates
8. ✅ Feature check functions
9. ✅ Drip campaign cron job
10. ✅ Unclaimed events dashboard
11. ✅ Cleanup cron job

**System Status:** Fully operational and ready for use!

