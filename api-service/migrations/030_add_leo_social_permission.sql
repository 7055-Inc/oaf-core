-- Migration 030: Add Leo Social Permission Column
-- Adds 'leo_social' permission for Social Central (AI Social Media Marketing)

ALTER TABLE user_permissions
ADD COLUMN leo_social TINYINT(1) DEFAULT 0 AFTER crm;

-- Grant leo_social permission to benjamin@onlineartfestival.com for testing
INSERT INTO user_permissions (user_id, leo_social) 
VALUES (1000000007, 1) 
ON DUPLICATE KEY UPDATE leo_social = 1;

-- Verify the change
SELECT user_id, sites, vendor, marketplace, crm, leo_social
FROM user_permissions 
WHERE user_id = 1000000007;
