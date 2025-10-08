-- Add week tracking to team_stats_cache table
-- This allows storing stats for specific weeks rather than cumulative season stats

-- Step 1: Add week column (nullable first)
ALTER TABLE team_stats_cache 
ADD COLUMN IF NOT EXISTS week INTEGER;

-- Step 2: Add season_year column (nullable first)
ALTER TABLE team_stats_cache 
ADD COLUMN IF NOT EXISTS season_year INTEGER;

-- Step 3: Update existing records to have default values
-- This prevents NULL constraint violations
UPDATE team_stats_cache 
SET week = 1 
WHERE week IS NULL;

UPDATE team_stats_cache 
SET season_year = 2025 
WHERE season_year IS NULL;

-- Step 4: Now make columns NOT NULL with defaults
ALTER TABLE team_stats_cache 
ALTER COLUMN week SET DEFAULT 1,
ALTER COLUMN week SET NOT NULL;

ALTER TABLE team_stats_cache 
ALTER COLUMN season_year SET DEFAULT 2025,
ALTER COLUMN season_year SET NOT NULL;

-- Step 5: Drop the existing primary key constraint
ALTER TABLE team_stats_cache DROP CONSTRAINT IF EXISTS team_stats_cache_pkey;

-- Step 6: Add new composite primary key
ALTER TABLE team_stats_cache 
ADD CONSTRAINT team_stats_cache_pkey PRIMARY KEY (team_name, week, season_year);

-- Step 7: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_stats_week ON team_stats_cache(week);
CREATE INDEX IF NOT EXISTS idx_team_stats_season ON team_stats_cache(season_year);
CREATE INDEX IF NOT EXISTS idx_team_stats_week_season ON team_stats_cache(week, season_year);

-- Step 8: Add check constraint for valid weeks (1-18 for regular season)
ALTER TABLE team_stats_cache 
ADD CONSTRAINT valid_week CHECK (week >= 1 AND week <= 18);

-- Step 9: Add comments
COMMENT ON COLUMN team_stats_cache.week IS 'NFL week number (1-18 for regular season)';
COMMENT ON COLUMN team_stats_cache.season_year IS 'NFL season year (e.g., 2025)';
