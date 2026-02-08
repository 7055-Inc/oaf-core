-- Migration 010: Standardize Addon Tiers
-- Purpose: Align website_addons.tier_required ENUM values with tierConfig.js
-- Changes: 'pro' and 'premium' → 'professional'

-- Step 1: Add 'professional' to the ENUM (keeping old values temporarily)
ALTER TABLE website_addons 
MODIFY COLUMN tier_required ENUM('free', 'basic', 'pro', 'premium', 'professional') 
NOT NULL DEFAULT 'free';

-- Step 2: Update existing records to use 'professional'
UPDATE website_addons 
SET tier_required = 'professional' 
WHERE tier_required IN ('pro', 'premium');

-- Step 3: Remove old ENUM values, leaving only the standardized ones
ALTER TABLE website_addons 
MODIFY COLUMN tier_required ENUM('free', 'basic', 'professional') 
NOT NULL DEFAULT 'free';

-- Verification query (to run manually after migration):
-- SELECT tier_required, COUNT(*) as count 
-- FROM website_addons 
-- GROUP BY tier_required;
