-- ============================================================================
-- REMOVE DUPLICATE TEAMS FROM team_stats_cache
-- ============================================================================
-- This script identifies and removes duplicate team entries that may be
-- lowering prediction accuracy. It keeps only the most recent entry for
-- each team_name/week/season combination.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: IDENTIFY DUPLICATES
-- ============================================================================

-- Check for duplicates (run this first to see what we're dealing with)
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as duplicate_count,
  STRING_AGG(COALESCE(last_updated::text, 'NULL'), ', ') as updated_dates
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1
ORDER BY team_name, week;

-- ============================================================================
-- STEP 2: BACKUP EXISTING DATA
-- ============================================================================

-- Create backup table before making changes
DROP TABLE IF EXISTS team_stats_cache_backup_duplicates;
CREATE TABLE team_stats_cache_backup_duplicates AS 
SELECT * FROM team_stats_cache;

SELECT 'Backup created with ' || COUNT(*) || ' records' as backup_status
FROM team_stats_cache_backup_duplicates;

-- ============================================================================
-- STEP 3: REMOVE DUPLICATES (Keep most recent entry)
-- ============================================================================

-- Delete duplicates, keeping only one entry for each team/week/season
-- Uses PostgreSQL's ctid (internal row identifier) for simplicity
DELETE FROM team_stats_cache
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM team_stats_cache
  GROUP BY team_name, week, season_year
);

-- ============================================================================
-- STEP 4: ENSURE UNIQUE CONSTRAINT EXISTS
-- ============================================================================

-- Drop the old constraint if it exists (may have wrong column names)
ALTER TABLE team_stats_cache 
  DROP CONSTRAINT IF EXISTS unique_team_week_season;

ALTER TABLE team_stats_cache 
  DROP CONSTRAINT IF EXISTS team_stats_cache_team_name_week_season_key;

-- Add the correct unique constraint
ALTER TABLE team_stats_cache 
  ADD CONSTRAINT unique_team_week_season 
  UNIQUE (team_name, week, season_year);

-- ============================================================================
-- STEP 5: VERIFY CLEANUP
-- ============================================================================

-- This should return 0 rows if duplicates are removed
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as count
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1;

-- Show total records remaining
SELECT 
  'Total records: ' || COUNT(*) as status,
  'Unique teams: ' || COUNT(DISTINCT team_name) as teams,
  'Weeks covered: ' || COUNT(DISTINCT week) as weeks,
  'Seasons covered: ' || COUNT(DISTINCT season_year) as seasons
FROM team_stats_cache;

-- Show records per team/week for verification
SELECT 
  team_name,
  week,
  season_year,
  last_updated,
  source
FROM team_stats_cache
ORDER BY team_name, week, season_year;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if something goes wrong)
-- ============================================================================

-- To restore from backup if needed:
-- BEGIN;
-- DELETE FROM team_stats_cache;
-- INSERT INTO team_stats_cache SELECT * FROM team_stats_cache_backup_duplicates;
-- COMMIT;
-- DROP TABLE team_stats_cache_backup_duplicates;
