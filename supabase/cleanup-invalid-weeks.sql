-- Cleanup script for picks with invalid dates or weeks
-- Run this in your Supabase SQL Editor to fix the week 59, 58, 57, etc. issue

-- 1. First, let's see what we have (diagnostic query)
SELECT 
  id,
  week,
  game_info->>'game_date' as game_date,
  game_info->>'home_team' as home_team,
  game_info->>'away_team' as away_team,
  created_at
FROM picks
WHERE 
  week IS NOT NULL 
  AND (week < 1 OR week > 18)
ORDER BY week DESC;

-- 2. Check for picks with dates outside 2025 NFL season (Sep 4, 2025 - Jan 5, 2026)
SELECT 
  id,
  week,
  game_info->>'game_date' as game_date,
  game_info->>'home_team' as home_team,
  game_info->>'away_team' as away_team
FROM picks
WHERE 
  (game_info->>'game_date')::date < '2025-09-04'::date
  OR (game_info->>'game_date')::date > '2026-01-05'::date
ORDER BY (game_info->>'game_date')::date;

-- 3. DELETE picks with invalid weeks (CAUTION: This will permanently delete data!)
-- Uncomment the line below after reviewing the diagnostic queries above
-- DELETE FROM picks WHERE week IS NOT NULL AND (week < 1 OR week > 18);

-- 4. DELETE picks with dates outside 2025 season (CAUTION: This will permanently delete data!)
-- Uncomment the line below after reviewing the diagnostic queries above
-- DELETE FROM picks WHERE (game_info->>'game_date')::date < '2025-09-04'::date OR (game_info->>'game_date')::date > '2026-01-05'::date;

-- 5. Set week to NULL for picks that need recalculation (safer than deleting)
-- This will force the app to recalculate weeks from game dates
-- Uncomment the line below if you want to reset weeks instead of deleting
-- UPDATE picks SET week = NULL WHERE week IS NOT NULL AND (week < 1 OR week > 18);
