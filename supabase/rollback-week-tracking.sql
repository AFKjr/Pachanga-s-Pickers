-- Rollback script for week tracking migration
-- Use this if you need to start over or revert changes

-- Step 1: Drop the composite primary key
ALTER TABLE team_stats_cache DROP CONSTRAINT IF EXISTS team_stats_cache_pkey;

-- Step 2: Drop the check constraint
ALTER TABLE team_stats_cache DROP CONSTRAINT IF EXISTS valid_week;

-- Step 3: Drop indexes
DROP INDEX IF EXISTS idx_team_stats_week;
DROP INDEX IF EXISTS idx_team_stats_season;
DROP INDEX IF EXISTS idx_team_stats_week_season;

-- Step 4: Drop the new columns
ALTER TABLE team_stats_cache DROP COLUMN IF EXISTS week;
ALTER TABLE team_stats_cache DROP COLUMN IF EXISTS season_year;

-- Step 5: Restore original primary key
ALTER TABLE team_stats_cache 
ADD CONSTRAINT team_stats_cache_pkey PRIMARY KEY (team_name);

-- Done! Table is back to original state
SELECT 'Rollback complete - team_stats_cache restored to original schema' AS status;
