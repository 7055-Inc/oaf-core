-- Migration 031: Add 'email' to social_connections.platform enum
-- Enables CRM email system as a campaign channel in Social Central

ALTER TABLE social_connections 
  MODIFY COLUMN platform ENUM('instagram','facebook','tiktok','twitter','pinterest','google','bing','email') NOT NULL;
