# Subscription Cancellation System

## Overview
This system allows users to cancel their subscriptions while retaining access until the end of their current billing period. The cancellation is processed automatically by a daily cron job.

## Components

### 1. Cancel Endpoints (Backend)
Located in:
- `/api-service/src/routes/subscriptions/websites.js`
- `/api-service/src/routes/subscriptions/shipping.js`
- `/api-service/src/routes/subscriptions/verified.js`

**Endpoints:**
- `POST /api/subscriptions/websites/cancel`
- `POST /api/subscriptions/shipping/cancel`
- `POST /api/subscriptions/verified/cancel`

**What they do:**
- Set `cancel_at_period_end = 1`
- Record `canceled_at = NOW()`
- Keep `status = 'active'` (user retains access)
- Return confirmation with expiration date

### 2. Frontend Integration
Located in: `/components/dashboard/my-subscriptions/components/ManageSubscriptions.js`

**What it does:**
- Shows confirmation dialog
- Calls the appropriate cancel endpoint
- Displays success message with access expiration date
- Refreshes subscription list

### 3. Cron Job (Automated Cancellation Processor)
Located in: `/api-service/scripts/process-subscription-cancellations.js`

**What it does:**
- Runs daily to find subscriptions where:
  - `cancel_at_period_end = 1`
  - `current_period_end` < NOW()
  - `status = 'active'`
- For each matched subscription:
  - Sets `status = 'canceled'`
  - Revokes associated permissions
  - Logs the action

**Permission Mapping:**
- `websites` → revokes `sites` permission
- `shipping_labels` → revokes `shipping` permission
- `verification` (Verified Artist) → revokes `verified` permission
- `verification` (Marketplace Seller) → revokes `verified` AND `marketplace` permissions

## Installation

### 1. Test the Cron Job
```bash
cd /var/www/main
node api-service/scripts/process-subscription-cancellations.js
```

You should see:
```
[DATE] Starting subscription cancellation processor...
Finding subscriptions to cancel...
Found 0 subscriptions to cancel
No subscriptions to process. Exiting.
Database connection closed
[DATE] Subscription cancellation processor completed successfully
```

### 2. Add to Crontab
Run daily at 2 AM:

```bash
crontab -e
```

Add this line:
```
0 2 * * * /usr/bin/node /var/www/main/api-service/scripts/process-subscription-cancellations.js >> /var/log/subscription-cancellations.log 2>&1
```

### 3. Create Log File
```bash
sudo touch /var/log/subscription-cancellations.log
sudo chown $(whoami):$(whoami) /var/log/subscription-cancellations.log
```

### 4. Monitor Logs
```bash
tail -f /var/log/subscription-cancellations.log
```

## User Experience Flow

### When User Clicks "Cancel"
1. Confirmation dialog appears:
   > "Are you sure you want to cancel your [type] subscription?
   > 
   > Note: You'll keep access until the end of your current billing period, but your subscription won't renew."

2. If confirmed, API is called:
   - Database updated with cancellation flag
   - User receives success message with expiration date

3. User continues to have full access until period ends

### When Billing Period Ends
1. Daily cron job runs (2 AM)
2. Finds all expired cancellations
3. Revokes permissions automatically
4. Sets subscription status to 'canceled'
5. User loses access to features

### On Next Login After Period Ends
- User sees "Subscribe Now" buttons instead of "Cancel" buttons
- Dashboard shows subscription as inactive
- Feature gates prevent access to subscription features

## Database Schema

### Key Columns in `user_subscriptions`
```sql
cancel_at_period_end TINYINT(1) DEFAULT 0  -- Flag for pending cancellation
canceled_at TIMESTAMP NULL                  -- When user requested cancellation
current_period_end TIMESTAMP NULL           -- When billing period ends
status ENUM('active','canceled',...)        -- Current status
```

## Testing

### Test Cancellation Flow
1. Subscribe to a service (e.g., Websites)
2. Go to Dashboard > My Subscriptions > Manage
3. Click "Cancel" on the subscription
4. Verify you still have access
5. Check database:
```sql
SELECT cancel_at_period_end, canceled_at, current_period_end, status 
FROM user_subscriptions 
WHERE user_id = YOUR_USER_ID;
```

### Test Cron Job Processing
1. Manually set a subscription to expire:
```sql
UPDATE user_subscriptions 
SET cancel_at_period_end = 1,
    canceled_at = NOW(),
    current_period_end = NOW() - INTERVAL 1 DAY
WHERE user_id = YOUR_USER_ID 
  AND subscription_type = 'websites';
```

2. Run the cron job manually:
```bash
node api-service/scripts/process-subscription-cancellations.js
```

3. Verify:
   - Status changed to 'canceled'
   - Permission removed from `user_permissions`
   - You see output in console

4. Test access is revoked in the UI

## Troubleshooting

### Cron Job Not Running
```bash
# Check crontab is set
crontab -l

# Check cron service is running
sudo systemctl status cron

# Check logs for errors
tail -50 /var/log/subscription-cancellations.log
```

### Permissions Not Revoked
Check the permission mapping in the cron job script matches your database structure:
- `user_permissions.sites` for websites
- `user_permissions.shipping` for shipping
- `user_permissions.verified` for verification
- `user_permissions.marketplace` for marketplace

### User Still Has Access After Period Ends
1. Check if cron job ran:
```bash
ls -la /var/log/subscription-cancellations.log
```

2. Run manually to see errors:
```bash
node api-service/scripts/process-subscription-cancellations.js
```

3. Check database:
```sql
SELECT * FROM user_subscriptions 
WHERE cancel_at_period_end = 1 
  AND current_period_end < NOW();
```

## Future Enhancements
- Email notification when cancellation is processed
- Email notification 7 days before cancellation
- Option to reactivate before period ends
- Webhook to notify other services of cancellation
- Grace period for failed payments before cancellation

