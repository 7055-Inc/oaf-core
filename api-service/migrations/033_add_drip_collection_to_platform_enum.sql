-- Migration 033: Add 'drip' and 'collection' to social_connections.platform enum
-- Enables internal toggles for Drip Campaigns and Product Collections
-- as admin-side campaign builder channels on the Corp Connections page.

ALTER TABLE social_connections
  MODIFY COLUMN platform ENUM('instagram','facebook','tiktok','twitter','pinterest','google','bing','email','drip','collection') NOT NULL;
