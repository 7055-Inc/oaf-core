-- Migration 020: Add Product Slider Addon
-- Date: 2026-02-08
-- Description: Adds product slider addon - converts product grids to horizontal carousels

-- Insert product-slider addon
INSERT INTO website_addons (
  addon_name,
  addon_slug,
  description,
  addon_script_path,
  tier_required,
  is_active,
  monthly_price,
  display_order,
  user_level,
  category,
  created_at,
  updated_at
) VALUES (
  'Product Slider',
  'product-slider',
  'Convert product grids into horizontal carousels with navigation arrows, touch/swipe support, optional auto-play, and responsive design. Shows N products per slide with smooth transitions.',
  '/addons/product-slider/script.js',
  'basic',
  1,
  9.99,
  50,
  0,
  'site_features',
  NOW(),
  NOW()
);

-- Verify insertion
SELECT 
  id,
  addon_name,
  addon_slug,
  tier_required,
  monthly_price,
  is_active
FROM website_addons 
WHERE addon_slug = 'product-slider';
