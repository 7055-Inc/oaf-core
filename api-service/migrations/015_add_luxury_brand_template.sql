-- Migration 015: Add Luxury Brand Template
-- Sprint 11D: Additional CSS Templates
-- Date: 2026-02-07
-- Purpose: Add Luxury Brand premium template to website_templates table

-- Insert Luxury Brand template
INSERT INTO website_templates (
  template_name,
  template_slug,
  description,
  css_file_path,
  preview_image_url,
  tier_required,
  display_order,
  is_active
) VALUES (
  'Luxury Brand',
  'luxury-brand',
  'Premium dark-themed template with modern commerce styling and video support. Perfect for high-end artists and luxury brands.',
  '/templates/luxury-brand/styles.css',
  '/templates/luxury-brand/preview.svg',
  'pro',
  11,
  true
)
ON CONFLICT (template_slug) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  description = EXCLUDED.description,
  css_file_path = EXCLUDED.css_file_path,
  preview_image_url = EXCLUDED.preview_image_url,
  tier_required = EXCLUDED.tier_required,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify the insertion
SELECT id, template_name, template_slug, tier_required, display_order 
FROM website_templates 
WHERE template_slug = 'luxury-brand';
