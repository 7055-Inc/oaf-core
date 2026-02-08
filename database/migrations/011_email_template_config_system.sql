/**
 * Email Template Config System Migration
 * 
 * Sets up email templates to use config file defaults by setting body_template
 * and subject_template to NULL, which triggers loading from config files.
 * 
 * This implements the hybrid config + database system where:
 * - Config files = system defaults (version controlled)
 * - Database NULL = use config default
 * - Database value = custom override
 */

-- Step 1: Modify schema to allow NULL values
ALTER TABLE email_templates MODIFY COLUMN subject_template TEXT NULL;
ALTER TABLE email_templates MODIFY COLUMN body_template LONGTEXT NULL;

-- Step 2: Reset all existing templates to use config defaults
-- This preserves template records but makes them load content from config files

UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'affiliate_commission_cancelled';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'affiliate_commission_earned';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'affiliate_payout_processed';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'application_fee_refunded';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'application_submitted';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'artist_event_claimed_confirmation';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'artist-contact-admin-copy';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'artist-contact-notification';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'booth_fee_confirmation';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'booth_fee_invoice';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'booth_fee_overdue';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'booth_fee_reminder';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'contact_form_notification';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'digest_email';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'gift_card_received';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'gift_card_redeemed';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'gift_card_sent_confirmation';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'marketplace_application_approved';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'marketplace_application_denied';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'marketplace_application_submitted';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'new_product';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_accept_applications';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_add_photos';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_advanced_features';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_complete_event';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_create_tickets';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_marketing_materials';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_publish_event';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_review_applications';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'onboarding_welcome';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'order_confirmation';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'order_delivered';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'order_shipped';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'product_low_stock';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'product_update';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'promoter_claim_day14';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'promoter_claim_day30';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'promoter_claim_day7';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'promoter_claim_initial';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'promoter_claim_invitation';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'promoter_event_notification';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'series_completion_notice';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'series_deadline_reminder';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'series_event_created';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'series_renewal_reminder';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'ticket_purchase_confirmation';
UPDATE email_templates SET subject_template = NULL, body_template = NULL WHERE template_key = 'vendor_order_notification';

-- Create any missing standard templates (these don't exist in your DB but are useful)
INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('password-reset', 'Password Reset', NULL, NULL, 1, 5, 'default', 0);

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('welcome', 'Welcome to Brakebee', NULL, NULL, 1, 4, 'default', 0);

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('payment-received', 'Payment Received', NULL, NULL, 1, 5, 'default', 0);

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('shipping-notification', 'Shipping Notification', NULL, NULL, 1, 4, 'default', 0);

INSERT IGNORE INTO email_templates (template_key, name, subject_template, body_template, is_transactional, priority_level, layout_key, can_compile)
VALUES ('account-verification', 'Account Verification', NULL, NULL, 1, 5, 'default', 0);

-- Note: All templates will now load their content from config files in /config/email-templates/
-- Admins can customize templates via the UI, which will create database overrides
-- "Reset to Default" button will set fields back to NULL to revert to config
