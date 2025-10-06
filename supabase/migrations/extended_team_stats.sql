-- Extended Team Stats Schema Migration
-- Adds comprehensive NFL statistics for Monte Carlo simulations

-- Drop existing table and recreate with all stats
DROP TABLE IF EXISTS team_stats_cache CASCADE;

CREATE TABLE team_stats_cache (
  -- Primary Key
  team_name TEXT PRIMARY KEY,
  
  -- Basic Stats (existing)
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
  avg_time_of_possession NUMERIC DEFAULT 30.0, -- minutes per game
  
  -- Metadata
  source TEXT DEFAULT 'default', -- 'csv', 'manual', 'default', 'espn', 'historical'
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_source CHECK (source IN ('csv', 'manual', 'default', 'espn', 'historical'))
);

-- Create index on source for filtering
CREATE INDEX idx_team_stats_source ON team_stats_cache(source);
CREATE INDEX idx_team_stats_updated ON team_stats_cache(last_updated);

-- Add comment
COMMENT ON TABLE team_stats_cache IS 'Comprehensive NFL team statistics for Monte Carlo game simulations';
