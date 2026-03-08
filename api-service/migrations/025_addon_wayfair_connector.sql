-- Migration 025: Add Wayfair Connector to website_addons
-- The other marketplace connectors (Walmart, TikTok, Etsy) already exist.
-- Wayfair connector page exists but the addon definition was missing.

INSERT INTO website_addons (
  addon_name, addon_slug, description, addon_script_path,
  tier_required, monthly_price, display_order, user_level, category, is_active
) VALUES (
  'Wayfair Connector',
  'wayfair-connector',
  'List your products on Wayfair.com through Brakebee\'s supplier account',
  '/addons/wayfair-connector.js',
  'professional',
  25.00,
  8,
  1,
  'marketplace',
  1
) ON DUPLICATE KEY UPDATE
  addon_name = VALUES(addon_name),
  user_level = 1,
  category = 'marketplace';
