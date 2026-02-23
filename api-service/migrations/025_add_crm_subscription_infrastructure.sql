-- Migration 025: Add CRM/Email Marketing Subscription Infrastructure
-- CRM is a full subscription type (like websites, marketplace, shipping_labels)
-- Email Collection addon REQUIRES CRM subscription
-- Each site tags collected emails → all flow into ONE user-level CRM

-- ============================================================================
-- 1. Add 'crm' to subscription_type enum and create CRM terms
-- ============================================================================

-- First, add 'crm' to the enum
ALTER TABLE terms_versions
MODIFY COLUMN subscription_type ENUM(
    'general',
    'verification',
    'verified',
    'shipping_labels',
    'marketplace',
    'website',
    'websites',
    'sites',
    'wholesale',
    'addons',
    'crm'
) DEFAULT 'general';

-- Now insert CRM terms
INSERT INTO terms_versions (
    subscription_type, 
    version,
    title,
    content,
    is_current,
    created_at
) VALUES (
    'crm',
    '1.0',
    'CRM & Email Marketing Terms of Service',
    '# CRM & Email Marketing Terms of Service

## 1. Service Description
The Brakebee CRM & Email Marketing service allows you to collect, manage, and communicate with your subscriber lists.

## 2. Email Collection
- You may collect subscriber emails through forms on your artist websites
- All emails are tagged by site but managed in one unified CRM
- You must comply with CAN-SPAM Act and GDPR requirements
- You must provide clear opt-in and opt-out mechanisms

## 3. Email Sending
- You may send marketing emails to subscribers who have opted in
- You must honor unsubscribe requests immediately
- You may not send spam or unsolicited commercial email
- Abuse of the email system may result in account termination

## 4. Data Privacy
- Subscriber data is your responsibility
- You must maintain appropriate privacy policies
- You must protect subscriber information
- Brakebee is the data processor, you are the data controller

## 5. Usage Limits
### Beginner Tier ($25/month)
- Up to 1,000 subscribers
- Up to 10,000 emails per month
- Basic drip campaigns (up to 3 sequences)
- Standard analytics

### Pro Tier ($45/month)
- Up to 10,000 subscribers
- Up to 100,000 emails per month
- Unlimited drip campaigns
- Advanced analytics & A/B testing
- Priority support

## 6. Billing
- Subscription fees are billed monthly
- Overage fees apply if limits are exceeded
- You may upgrade or downgrade at any time
- Cancellation takes effect at end of billing period

## 7. Acceptable Use
You may not use the CRM service to:
- Send spam or unsolicited emails
- Phish, scam, or defraud recipients
- Send malware or malicious content
- Violate any laws or regulations
- Impersonate others or misrepresent your identity

## 8. Termination
We may suspend or terminate service for:
- Violation of these terms
- Abuse of the email system
- Non-payment of fees
- Illegal activity

By subscribing to the CRM service, you agree to these terms.',
    1,  -- is_current
    NOW()
) ON DUPLICATE KEY UPDATE
    content = VALUES(content),
    is_current = VALUES(is_current);

-- ============================================================================
-- 2. Update email-collection addon to require CRM subscription
-- ============================================================================

UPDATE website_addons
SET 
    description = 'Add email signup forms to your artist sites. Collected emails flow into your CRM for unified management. REQUIRES CRM Subscription (sold separately).',
    tier_required = 'free',  -- Available on all website tiers (but requires CRM subscription)
    monthly_price = 0.00,  -- Included with CRM subscription
    is_active = 1,
    updated_at = NOW()
WHERE addon_slug = 'email-collection';

-- ============================================================================
-- 3. Add CRM permission to user_permissions (for reference)
-- ============================================================================
-- Note: Permissions are granted via backend when subscription is activated
-- This is just documentation of the expected permission value

-- Expected permission value: 'crm'
-- Users with active CRM subscription will have 'crm' in their permissions array

-- ============================================================================
-- 4. Verify the setup
-- ============================================================================

SELECT 'CRM Terms Created' as step, COUNT(*) as count 
FROM terms_versions 
WHERE subscription_type = 'crm';

SELECT 'Email Collection Addon Updated' as step, 
       addon_slug, monthly_price, tier_required, is_active
FROM website_addons 
WHERE addon_slug = 'email-collection';

SELECT 'Marketplace Connectors Check' as step,
       addon_slug, user_level, category
FROM website_addons
WHERE category = 'marketplace'
ORDER BY addon_slug;
