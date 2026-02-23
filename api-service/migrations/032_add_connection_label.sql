-- Migration 032: Add label column to social_connections
-- Allows admin-assigned nicknames for corporate connections
-- e.g. "Primary TikTok", "Affiliate TikTok #1", "Supporting Pinterest"

ALTER TABLE social_connections
  ADD COLUMN label VARCHAR(100) DEFAULT NULL AFTER account_name;
