-- Migration 034: Add metadata column to pending_images
-- Stores composition specs (platform, operations, post title) for marketing media
-- The processing VM ignores unknown columns, so this is safe.

ALTER TABLE pending_images
  ADD COLUMN metadata JSON DEFAULT NULL AFTER thumbnail_url;
