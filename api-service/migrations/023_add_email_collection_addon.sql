-- Migration 023: Update Email Collection Addon
-- Date: 2026-02-08
-- Description: Updates email collection addon for Email Marketing Module integration

-- Update email-collection addon (already exists as ID 1)
UPDATE website_addons 
SET 
  addon_name = 'Email Collection Forms',
  description = 'Add email signup forms to your artist site with customizable styling. Includes inline and popup forms, auto-tagging, double opt-in support, and full CRM integration for managing your subscriber list.',
  addon_script_path = '/addons/email-collection/script.js',
  tier_required = 'basic',
  monthly_price = 9.99,
  display_order = 70,
  category = 'site_features',
  is_active = 1,
  updated_at = NOW()
WHERE addon_slug = 'email-collection';

-- Verify update
SELECT 
  id,
  addon_name,
  addon_slug,
  tier_required,
  monthly_price,
  is_active,
  addon_script_path,
  description
FROM website_addons 
WHERE addon_slug = 'email-collection';
