-- Migration 036: Add brand_voice JSON column to users table
-- Stores per-user brand voice configuration for AI content generation:
--   voice_tone, writing_style, brand_personality, emoji_usage,
--   banned_phrases (array), example_posts (array)

ALTER TABLE users
  ADD COLUMN brand_voice JSON DEFAULT NULL AFTER email_confirmed;
