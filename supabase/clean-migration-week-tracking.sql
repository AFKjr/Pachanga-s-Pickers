-- CLEAN MIGRATION: Add week tracking to team_stats_cache
-- Run this if you're starting fresh or after rollback

-- Option A: If you have important data, use the safe migration
-- Option B: If you can start fresh, use the clean migration below

-- ============================================
-- OPTION B: CLEAN START (RECOMMENDED)
-- ============================================

-- Step 1: Drop and recreate the table with new schema
DROP TABLE IF EXISTS team_stats_cache CASCADE;

CREATE TABLE team_stats_cache (
  -- Composite Primary Key
  team_name TEXT NOT NULL,
  week INTEGER NOT NULL DEFAULT 1,
  season_year INTEGER NOT NULL DEFAULT 2025,
  
  -- Basic Stats
  games_played INTEGER DEFAULT 0,
  offensive_yards_per_game NUMERIC DEFAULT 0,
  defensive_yards_allowed NUMERIC DEFAULT 0,
  points_per_game NUMERIC DEFAULT 0,
  points_allowed_per_game NUMERIC DEFAULT 0,
  turnover_differential NUMERIC DEFAULT 0,
  third_down_conversion_rate NUMERIC DEFAULT 40.0,
  red_zone_efficiency NUMERIC DEFAULT 55.0,
  
  -- Offensive Passing Stats
  pass_completions NUMERIC DEFAULT 0,
  pass_attempts NUMERIC DEFAULT 0,
  pass_completion_pct NUMERIC DEFAULT 0,
  passing_yards NUMERIC DEFAULT 0,
  passing_tds NUMERIC DEFAULT 0,
  interceptions_thrown NUMERIC DEFAULT 0,
  sacks_allowed NUMERIC DEFAULT 0,
  sack_yards_lost NUMERIC DEFAULT 0,
  qb_rating NUMERIC DEFAULT 0,
  yards_per_pass_attempt NUMERIC DEFAULT 0,
  
  -- Offensive Rushing Stats
  rushing_attempts NUMERIC DEFAULT 0,
  rushing_yards NUMERIC DEFAULT 0,
  rushing_tds NUMERIC DEFAULT 0,
  yards_per_rush NUMERIC DEFAULT 0,
  
  -- Offensive Total Stats
  total_plays NUMERIC DEFAULT 0,
  yards_per_play NUMERIC DEFAULT 0,
  first_downs NUMERIC DEFAULT 0,
  
  -- Penalties
  penalties NUMERIC DEFAULT 0,
  penalty_yards NUMERIC DEFAULT 0,
  
  -- Scoring/Kicking
  field_goals_made NUMERIC DEFAULT 0,
  field_goals_attempted NUMERIC DEFAULT 0,
  field_goal_pct NUMERIC DEFAULT 0,
  extra_points_made NUMERIC DEFAULT 0,
  extra_points_attempted NUMERIC DEFAULT 0,
  
  -- Defensive Passing Stats
  def_pass_completions_allowed NUMERIC DEFAULT 0,
  def_pass_attempts NUMERIC DEFAULT 0,
  def_passing_yards_allowed NUMERIC DEFAULT 0,
  def_passing_tds_allowed NUMERIC DEFAULT 0,
  def_interceptions NUMERIC DEFAULT 0,
  def_sacks NUMERIC DEFAULT 0,
  def_sack_yards NUMERIC DEFAULT 0,
  
  -- Defensive Rushing Stats
  def_rushing_attempts_allowed NUMERIC DEFAULT 0,
  def_rushing_yards_allowed NUMERIC DEFAULT 0,
  def_rushing_tds_allowed NUMERIC DEFAULT 0,
  
  -- Defensive Total Stats
  def_total_plays NUMERIC DEFAULT 0,
  def_yards_per_play_allowed NUMERIC DEFAULT 0,
  def_first_downs_allowed NUMERIC DEFAULT 0,
  
  -- Turnovers
  turnovers_forced NUMERIC DEFAULT 0,
  turnovers_lost NUMERIC DEFAULT 0,
  fumbles_forced NUMERIC DEFAULT 0,
  fumbles_lost NUMERIC DEFAULT 0,
  
  -- Time of Possession
  avg_time_of_possession NUMERIC DEFAULT 30.0,
  
  -- Metadata
  source TEXT DEFAULT 'default',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Primary Key
  PRIMARY KEY (team_name, week, season_year),
  
  -- Constraints
  CONSTRAINT valid_week CHECK (week >= 1 AND week <= 18),
  CONSTRAINT valid_source CHECK (source IN ('csv', 'manual', 'default', 'espn', 'historical'))
);

-- Create indexes
CREATE INDEX idx_team_stats_source ON team_stats_cache(source);
CREATE INDEX idx_team_stats_updated ON team_stats_cache(last_updated);
CREATE INDEX idx_team_stats_week ON team_stats_cache(week);
CREATE INDEX idx_team_stats_season ON team_stats_cache(season_year);
CREATE INDEX idx_team_stats_week_season ON team_stats_cache(week, season_year);

-- Add comments
COMMENT ON TABLE team_stats_cache IS 'Comprehensive NFL team statistics with weekly tracking for Monte Carlo game simulations';
COMMENT ON COLUMN team_stats_cache.week IS 'NFL week number (1-18 for regular season)';
COMMENT ON COLUMN team_stats_cache.season_year IS 'NFL season year (e.g., 2025)';
COMMENT ON COLUMN team_stats_cache.team_name IS 'Team name (e.g., Detroit, Kansas City)';

-- Success message
SELECT 'Team stats cache table created successfully with week tracking!' AS status;
