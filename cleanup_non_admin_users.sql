-- Cleanup Script: Remove All Non-Admin Users
-- Database: oaf
-- Date: 2025-11-05
-- Purpose: Clean out test users while preserving admin accounts

-- IMPORTANT: This will delete all non-admin users and their related data
-- Admins (user_type = 'admin') will be preserved

-- Step 1: Show what will be deleted (VERIFICATION - run this first)
SELECT 'Users to be deleted:' as action;
SELECT id, username, user_type, status, created_at
FROM users 
WHERE user_type != 'admin';

SELECT 'Admin users that will be kept:' as action;
SELECT id, username, user_type, status, created_at
FROM users 
WHERE user_type = 'admin';

-- Step 2: Delete related records for non-admin users (UNCOMMENT TO RUN)
-- Delete from artist_profiles
-- DELETE FROM artist_profiles 
-- WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete from vendor_settings
-- DELETE FROM vendor_settings 
-- WHERE vendor_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete from user_permissions
-- DELETE FROM user_permissions 
-- WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete from promoter_profiles (if exists)
-- DELETE FROM promoter_profiles 
-- WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete from wp_artifacts
-- DELETE FROM wp_artifacts 
-- WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete from firebase_users
-- DELETE FROM firebase_users 
-- WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete from user_sessions
-- DELETE FROM user_sessions 
-- WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete from user_announcements
-- DELETE FROM user_announcements 
-- WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Delete from custom_sites (where user is owner)
-- DELETE FROM custom_sites 
-- WHERE user_id IN (SELECT id FROM users WHERE user_type != 'admin');

-- Step 3: Delete the non-admin users themselves (UNCOMMENT TO RUN)
-- DELETE FROM users WHERE user_type != 'admin';

-- Step 4: Verification queries (UNCOMMENT TO RUN)
-- SELECT 'Cleanup Complete' as status;
-- SELECT 'Remaining users:' as info;
-- SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type;
-- SELECT 'Total users remaining:' as info, COUNT(*) as count FROM users;

