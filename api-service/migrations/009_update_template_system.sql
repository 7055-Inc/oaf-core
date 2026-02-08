-- Migration 009: Update Template System for Dynamic CSS Loading
-- Sprint 6: Implement Dynamic Template System
-- Date: 2025-02-07
-- Purpose: Update website_templates table with correct CSS paths and ensure all sites have valid template IDs

-- Update the Classic Gallery template with the correct CSS file path
UPDATE website_templates 
SET css_file_path = '/templates/classic-gallery/styles.css',
    updated_at = NOW()
WHERE template_slug = 'classic-gallery';

-- Ensure all sites have a valid template_id (set to 1 for Classic Gallery if NULL or 0)
UPDATE sites 
SET template_id = 1,
    updated_at = NOW()
WHERE template_id IS NULL OR template_id = 0;

-- Verify the updates (these are SELECT statements for validation)
-- Run these manually after applying the migration to verify success:
-- SELECT id, template_name, template_slug, css_file_path FROM website_templates WHERE template_slug = 'classic-gallery';
-- SELECT COUNT(*) as sites_without_template FROM sites WHERE template_id IS NULL OR template_id = 0;
