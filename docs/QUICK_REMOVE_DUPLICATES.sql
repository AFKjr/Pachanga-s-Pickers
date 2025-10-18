-- ============================================================================
-- QUICK DUPLICATE REMOVAL FOR team_stats_cache
-- ============================================================================
-- Copy and paste these queries ONE AT A TIME into Supabase SQL Editor
-- ============================================================================

-- QUERY 1: Check for duplicates (run this first to see the problem)
-- ----------------------------------------------------------------------------
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as duplicate_count
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, team_name, week;

-- Expected: Should show teams with multiple entries for same week/season
-- If this returns rows, you have duplicates that need cleaning


-- QUERY 2: Remove duplicates (keeps most recent entry)
-- ----------------------------------------------------------------------------
-- WARNING: This will delete duplicate rows. Run Query 1 first to see what will be deleted.
-- This uses PostgreSQL's ctid (internal row identifier) to delete duplicates
DELETE FROM team_stats_cache
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM team_stats_cache
  GROUP BY team_name, week, season_year
);

-- Expected: Returns "DELETE X" where X is the number of duplicate rows removed
-- Note: This keeps one arbitrary row per team/week/season combination


-- QUERY 3: Add unique constraint to prevent future duplicates
-- ----------------------------------------------------------------------------
ALTER TABLE team_stats_cache 
  DROP CONSTRAINT IF EXISTS unique_team_week_season;

ALTER TABLE team_stats_cache 
  ADD CONSTRAINT unique_team_week_season 
  UNIQUE (team_name, week, season_year);

-- Expected: "ALTER TABLE" success message


-- QUERY 4: Verify cleanup (should return no rows)
-- ----------------------------------------------------------------------------
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as count
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1;

-- Expected: No rows (meaning no duplicates remain)


-- QUERY 5: Summary stats
-- ----------------------------------------------------------------------------
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT team_name) as unique_teams,
  COUNT(DISTINCT week) as weeks_covered,
  COUNT(DISTINCT season_year) as seasons_covered,
  MIN(week) as earliest_week,
  MAX(week) as latest_week
FROM team_stats_cache;

-- Expected: Shows your database stats with no duplicate entries
