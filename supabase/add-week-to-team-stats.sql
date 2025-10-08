-- Add week tracking to team_stats_cache table
-- This allows storing stats for specific weeks rather than cumulative season stats

-- Add week column to team_stats_cache
ALTER TABLE team_stats_cache 
ADD COLUMN IF NOT EXISTS week INTEGER;

-- Add season_year column for future-proofing
ALTER TABLE team_stats_cache 
ADD COLUMN IF NOT EXISTS season_year INTEGER DEFAULT 2025;

-- Update the primary key to include week (requires recreation)
-- Step 1: Drop the existing primary key constraint
ALTER TABLE team_stats_cache DROP CONSTRAINT IF EXISTS team_stats_cache_pkey;

-- Step 2: Add new composite primary key
ALTER TABLE team_stats_cache 
ADD CONSTRAINT team_stats_cache_pkey PRIMARY KEY (team_name, week, season_year);

-- Step 3: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_stats_week ON team_stats_cache(week);
CREATE INDEX IF NOT EXISTS idx_team_stats_season ON team_stats_cache(season_year);
CREATE INDEX IF NOT EXISTS idx_team_stats_week_season ON team_stats_cache(week, season_year);

-- Step 4: Add check constraint for valid weeks (1-18 for regular season)
ALTER TABLE team_stats_cache 
ADD CONSTRAINT valid_week CHECK (week >= 1 AND week <= 18);

-- Add comment
COMMENT ON COLUMN team_stats_cache.week IS 'NFL week number (1-18 for regular season)';
COMMENT ON COLUMN team_stats_cache.season_year IS 'NFL season year (e.g., 2025)';

-- Update existing records to have default week if NULL
-- This is for any existing data that doesn't have a week assigned
UPDATE team_stats_cache 
SET week = 1 
WHERE week IS NULL;

-- Update existing records to have season_year if NULL
UPDATE team_stats_cache 
SET season_year = 2025 
WHERE season_year IS NULL;
