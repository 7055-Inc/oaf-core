# Tier Enforcement Testing Guide

This guide provides step-by-step instructions for testing the tier enforcement system for both sites and addons.

## Overview

The tier enforcement system ensures that:
1. **Site Limits**: Users can't have more active sites than their tier allows
2. **Addon Tiers**: Users can't have addons that require a higher tier than they have
3. **Immediate Enforcement**: Changes take effect instantly on subscription changes
4. **Nightly Backup**: Cron job catches any edge cases at 2:30 AM daily

## Quick Reference

### Tier Limits
- **Free**: 1 site max
- **Basic**: 3 sites max
- **Professional**: 999 sites max (unlimited)

### Tier Hierarchy (for addons)
- **Free** (level 0): Can only use free-tier addons
- **Basic** (level 1): Can use free + basic-tier addons
- **Professional** (level 2): Can use all addons

## Test Scenarios

### Test 1: Cron Script Dry Run

Test the cron script without making any changes.

```bash
cd /var/www/staging
node api-service/cron/enforce-tier-limits.js --dry-run
```

**Expected Output:**
- Connection to database successful
- List of users processed
- Summary statistics (users, sites, addons)
- "DRY RUN MODE: No changes were made" message
- Exit code 0

### Test 2: Downgrade Professional → Basic

**Scenario**: User has 5 sites and professional addons, downgrades to Basic.

**Setup:**
1. Create test user with Professional tier
2. Create 5 active sites for the user
3. Install "Amazon Connector" addon (requires Professional)
4. Install "Email Collection" addon (requires Basic)

**Test API Call:**
```bash
# Use your API endpoint for tier change
curl -X POST http://localhost:3000/api/websites/subscription/change-tier \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_tier_name": "Professional Plan",
    "new_tier_price": 9.99
  }'
```

**Expected Results:**
- ✅ API returns success
- ✅ `sites_deactivated: 2` (5 total - 3 limit = 2 deactivated)
- ✅ 2 oldest sites set to `status='draft'`
- ✅ 3 newest sites remain `status='active'`
- ✅ `addons_disabled: 1` (Amazon Connector)
- ✅ Amazon Connector: `is_active=0`, `deactivated_at` set
- ✅ Email Collection: `is_active=1` (still active)

**Database Verification:**
```sql
-- Check sites
SELECT id, site_name, status, created_at 
FROM sites 
WHERE user_id = YOUR_TEST_USER_ID 
ORDER BY created_at DESC;

-- Check addons
SELECT sa.id, wa.addon_name, wa.tier_required, sa.is_active, sa.deactivated_at
FROM site_addons sa
JOIN website_addons wa ON sa.addon_id = wa.id
JOIN sites s ON sa.site_id = s.id
WHERE s.user_id = YOUR_TEST_USER_ID;
```

### Test 3: Cancel Subscription

**Scenario**: User cancels their subscription, all sites and addons should be deactivated.

**Setup:**
1. Use the test user from Test 2
2. Ensure they have some active sites and addons

**Test API Call:**
```bash
curl -X POST http://localhost:3000/api/websites/subscription/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Results:**
- ✅ API returns success
- ✅ `sites_deactivated` count matches total active sites
- ✅ All sites set to `status='draft'`
- ✅ `addons_disabled` count matches total active addons
- ✅ All addons: `is_active=0`, `deactivated_at` set

**Database Verification:**
```sql
-- All sites should be draft or deleted
SELECT COUNT(*) as active_sites 
FROM sites 
WHERE user_id = YOUR_TEST_USER_ID AND status = 'active';
-- Should return: 0

-- All addons should be inactive
SELECT COUNT(*) as active_addons
FROM site_addons sa
JOIN sites s ON sa.site_id = s.id
WHERE s.user_id = YOUR_TEST_USER_ID AND sa.is_active = 1;
-- Should return: 0
```

### Test 4: Edge Cases

#### 4.1: User Already Under Limit
**Setup**: User has Basic tier (3 sites limit) and only 2 sites

**Test**: Run cron script or trigger enforcement

**Expected**: No sites deactivated, no addons disabled

#### 4.2: Admin User
**Setup**: User has `user_type='admin'` with 100 sites

**Test**: Run enforcement

**Expected**: No enforcement applied (admins have unlimited sites)

#### 4.3: Mixed Addon Tiers
**Setup**: Basic user with:
- Free addon: "Social Media Links"
- Basic addon: "Email Collection"
- Professional addon: "Amazon Connector"

**Test**: Run enforcement

**Expected**: 
- ✅ Social Media Links: active
- ✅ Email Collection: active
- ✅ Amazon Connector: deactivated

### Test 5: Cron Script Live Run

Run the cron script with actual enforcement.

```bash
cd /var/www/staging
node api-service/cron/enforce-tier-limits.js
```

**Expected Output:**
- Processing each user with website subscription
- Details of sites/addons deactivated
- Summary statistics
- Exit code 0

**Monitor Output:**
- Look for any error messages
- Verify counts make sense
- Check that enforcement logic is correct

### Test 6: Cron Schedule Installation

Install the cron job to run nightly.

```bash
# Edit crontab (as root or with sudo)
sudo crontab -e

# Add this line:
30 2 * * * cd /var/www/staging && /usr/bin/node api-service/cron/enforce-tier-limits.js >> /var/log/tier-enforcement.log 2>&1

# Create log file
sudo touch /var/log/tier-enforcement.log
sudo chmod 666 /var/log/tier-enforcement.log
```

**Verification:**
```bash
# List crontab
sudo crontab -l

# Wait for scheduled run or trigger manually
sudo run-parts /etc/cron.daily

# Check logs next day
tail -50 /var/log/tier-enforcement.log
```

## Database Queries for Manual Testing

### Check User's Current Tier
```sql
SELECT 
  u.id, 
  u.email, 
  us.tier, 
  us.status,
  us.subscription_type
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'test@example.com';
```

### Count User's Active Sites
```sql
SELECT 
  user_id,
  COUNT(*) as active_sites,
  (SELECT tier FROM user_subscriptions WHERE user_id = sites.user_id AND subscription_type = 'websites' LIMIT 1) as tier
FROM sites
WHERE user_id = YOUR_TEST_USER_ID AND status = 'active'
GROUP BY user_id;
```

### Check User's Active Addons vs Tier
```sql
SELECT 
  u.email,
  s.site_name,
  wa.addon_name,
  wa.tier_required,
  sa.is_active,
  us.tier as user_tier
FROM users u
JOIN user_subscriptions us ON u.id = us.user_id
JOIN sites s ON u.id = s.user_id
JOIN site_addons sa ON s.id = sa.site_id
JOIN website_addons wa ON sa.addon_id = wa.id
WHERE u.id = YOUR_TEST_USER_ID
  AND us.subscription_type = 'websites'
ORDER BY s.site_name, wa.addon_name;
```

### Find Users Over Their Site Limit
```sql
SELECT 
  u.id,
  u.email,
  us.tier,
  COUNT(s.id) as active_sites,
  CASE 
    WHEN us.tier = 'free' THEN 1
    WHEN us.tier = 'basic' THEN 3
    WHEN us.tier = 'professional' THEN 999
    ELSE 1
  END as site_limit
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.subscription_type = 'websites'
LEFT JOIN sites s ON u.id = s.user_id AND s.status = 'active'
GROUP BY u.id, u.email, us.tier
HAVING active_sites > site_limit;
```

### Find Users with Unauthorized Addons
```sql
SELECT 
  u.id,
  u.email,
  us.tier as user_tier,
  s.site_name,
  wa.addon_name,
  wa.tier_required
FROM users u
JOIN user_subscriptions us ON u.id = us.user_id AND us.subscription_type = 'websites'
JOIN sites s ON u.id = s.user_id
JOIN site_addons sa ON s.id = sa.site_id AND sa.is_active = 1
JOIN website_addons wa ON sa.addon_id = wa.id
WHERE 
  (us.tier = 'free' AND wa.tier_required != 'free')
  OR (us.tier = 'basic' AND wa.tier_required = 'professional')
ORDER BY u.email, s.site_name, wa.addon_name;
```

## Troubleshooting

### Cron Script Won't Run
**Check:**
- Node.js path correct: `which node`
- Script has execute permissions: `ls -la /var/www/staging/api-service/cron/enforce-tier-limits.js`
- Database connection working
- Log file writable

### Enforcement Not Working
**Check:**
- Database credentials correct in script
- User's tier value in database (not null, proper format)
- Sites table has correct status values
- site_addons table has is_active column

### API Returns Error
**Check:**
- tierEnforcement.js properly exported
- Subscription service imports correctly
- Database queries working
- Error logs in application

## Success Criteria

✅ **Cron Script:**
- Runs without errors in dry-run mode
- Processes all users with website subscriptions
- Correctly identifies sites to deactivate
- Correctly identifies addons to disable
- Logs comprehensive summary
- Exits with code 0

✅ **API Enforcement:**
- Tier downgrades immediately enforce limits
- Cancellations immediately deactivate all sites/addons
- API responses include enforcement details
- No subscription changes fail due to enforcement errors

✅ **Database State:**
- Excess sites set to draft status
- Unauthorized addons set to inactive
- Proper timestamps on deactivation
- No orphaned or inconsistent data

✅ **Cron Schedule:**
- Crontab entry correct
- Logs being written
- Nightly runs complete successfully
- No missed executions

## Rollback Plan

If enforcement causes issues:

1. **Disable Cron:**
   ```bash
   sudo crontab -e
   # Comment out the line with #
   ```

2. **Revert Subscription Service:**
   ```bash
   cd /var/www/staging
   git checkout HEAD -- api-service/src/modules/websites/services/subscription.js
   pm2 restart staging-api
   ```

3. **Restore Sites/Addons (if needed):**
   ```sql
   -- Reactivate specific sites
   UPDATE sites SET status = 'active' WHERE id IN (1, 2, 3);
   
   -- Reactivate specific addons
   UPDATE site_addons SET is_active = 1, deactivated_at = NULL WHERE id IN (1, 2, 3);
   ```

## Post-Deployment Monitoring

**First 3 Days:**
- Check logs daily: `tail -100 /var/log/tier-enforcement.log`
- Monitor for unexpected deactivations
- Check user support tickets for complaints
- Verify cron execution: `grep CRON /var/log/syslog`

**First Week:**
- Review enforcement statistics
- Check for any edge cases
- Adjust logging if needed
- Document any issues found

**Ongoing:**
- Review logs weekly
- Monitor for errors
- Keep documentation updated
- Plan improvements as needed
