-- Clear All Picks from Database
-- Run this in your Supabase SQL Editor to delete all picks

-- ⚠️ WARNING: This will permanently delete ALL picks from the database!
-- Make sure you have a backup if you need to restore the data later.

-- Option 1: Delete all picks (keeps table structure)
DELETE FROM picks;

-- Option 2: Truncate table (faster, resets auto-increment if any)
-- TRUNCATE TABLE picks RESTART IDENTITY;

-- Option 3: Delete only pending picks (keeps resolved ones)
-- DELETE FROM picks WHERE result = 'pending';

-- Verify the deletion
SELECT COUNT(*) as remaining_picks FROM picks;