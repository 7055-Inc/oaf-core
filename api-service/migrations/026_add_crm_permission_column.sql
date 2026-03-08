-- Migration 026: Add CRM Permission Column
-- Add 'crm' column to user_permissions table

ALTER TABLE user_permissions
ADD COLUMN crm TINYINT(1) DEFAULT 0 AFTER marketplace;

-- Grant CRM permission to benjamin@onlineartfestival.com for testing
INSERT INTO user_permissions (user_id, crm) 
VALUES (1000000007, 1) 
ON DUPLICATE KEY UPDATE crm = 1;

-- Verify the change
SELECT user_id, sites, vendor, marketplace, crm 
FROM user_permissions 
WHERE user_id = 1000000007;
