-- ============================================================================
-- ADD ALL TEAM STATS COLUMNS TO team_stats_cache TABLE
-- ============================================================================
-- This migration adds all statistics from the cleaned CSV format
-- Based on Week 7 Offense and Defense CSVs with descriptive column names
-- 
-- OFFENSE CSV: 27 columns
-- DEFENSE CSV: 24 columns
-- TOTAL NEW FIELDS: ~50 fields
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- OFFENSE STATISTICS (from offense CSV)
-- ============================================================================

-- Core game stats (may already exist)
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS games_played INTEGER;
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS points_per_game DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS offensive_yards_per_game DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS total_plays DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS yards_per_play DECIMAL(10,2);

-- Turnover stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS turnovers_lost DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS fumbles_lost DECIMAL(10,2);

-- First downs
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS first_downs DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS pass_first_downs DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS rush_first_downs DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS penalty_first_downs DECIMAL(10,2);

-- Passing stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS pass_completions DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS pass_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS passing_yards DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS passing_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS interceptions_thrown DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS yards_per_pass_attempt DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS pass_completion_pct DECIMAL(10,2);

-- Rushing stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS rushing_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS rushing_yards DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS rushing_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS yards_per_rush DECIMAL(10,2);

-- Penalty stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS penalties DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS penalty_yards DECIMAL(10,2);

-- Drive efficiency stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS scoring_percentage DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS turnover_percentage DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS expected_points_offense DECIMAL(10,2);

-- ============================================================================
-- DEFENSE STATISTICS (from defense CSV)
-- ============================================================================

-- Core defensive stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS points_allowed_per_game DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS defensive_yards_allowed DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_total_plays DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_yards_per_play_allowed DECIMAL(10,2);

-- Defensive turnovers
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS turnovers_forced DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS fumbles_forced DECIMAL(10,2);

-- Defensive first downs
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_first_downs_allowed DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_pass_first_downs DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_rush_first_downs DECIMAL(10,2);

-- Defensive passing stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_pass_completions_allowed DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_pass_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_passing_yards_allowed DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_passing_tds_allowed DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_interceptions DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_net_yards_per_pass DECIMAL(10,2);

-- Defensive rushing stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_rushing_attempts_allowed DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_rushing_yards_allowed DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_rushing_tds_allowed DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_yards_per_rush_allowed DECIMAL(10,2);

-- Defensive efficiency stats
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_scoring_percentage DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_turnover_percentage DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS expected_points_defense DECIMAL(10,2);

-- ============================================================================
-- CALCULATED/DERIVED STATISTICS
-- ============================================================================

ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS turnover_differential DECIMAL(10,2);

-- ============================================================================
-- METADATA COLUMNS
-- ============================================================================

ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'csv';
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW();

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN team_stats_cache.pass_first_downs IS '1st downs by passing';
COMMENT ON COLUMN team_stats_cache.rush_first_downs IS '1st downs by rushing';
COMMENT ON COLUMN team_stats_cache.penalty_first_downs IS '1st downs by penalty';
COMMENT ON COLUMN team_stats_cache.scoring_percentage IS 'Percentage of drives ending in a score';
COMMENT ON COLUMN team_stats_cache.turnover_percentage IS 'Percentage of drives ending in a turnover';
COMMENT ON COLUMN team_stats_cache.expected_points_offense IS 'Expected points contributed by all offense';
COMMENT ON COLUMN team_stats_cache.turnovers_forced IS 'Takeaways by defense';
COMMENT ON COLUMN team_stats_cache.fumbles_forced IS 'Fumbles caused by defense';
COMMENT ON COLUMN team_stats_cache.def_scoring_percentage IS 'Percentage of opponent drives ending in a score';
COMMENT ON COLUMN team_stats_cache.def_turnover_percentage IS 'Percentage of opponent drives ending in a turnover';
COMMENT ON COLUMN team_stats_cache.expected_points_defense IS 'Expected points contributed by defense';
COMMENT ON COLUMN team_stats_cache.turnover_differential IS 'Calculated: turnovers_forced - turnovers_lost';

-- ============================================================================
-- CREATE INDEXES FOR COMMON QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_team_stats_team_week_season 
  ON team_stats_cache(team_name, week, season_year);

CREATE INDEX IF NOT EXISTS idx_team_stats_week_season 
  ON team_stats_cache(week, season_year);

CREATE INDEX IF NOT EXISTS idx_team_stats_team_name 
  ON team_stats_cache(team_name);

-- ============================================================================
-- ADD CONSTRAINTS
-- ============================================================================

-- Ensure unique combination of team, week, and season
ALTER TABLE team_stats_cache 
  DROP CONSTRAINT IF EXISTS unique_team_week_season;

ALTER TABLE team_stats_cache 
  ADD CONSTRAINT unique_team_week_season 
  UNIQUE (team_name, week, season_year);

-- Commit transaction
COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify all columns were added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'team_stats_cache'
ORDER BY ordinal_position;

-- ============================================================================
-- SUMMARY OF COLUMNS
-- ============================================================================
-- 
-- OFFENSE (27 fields):
-- ├─ Core: games_played, points_per_game, offensive_yards_per_game, total_plays, yards_per_play
-- ├─ Turnovers: turnovers_lost, fumbles_lost
-- ├─ First Downs: first_downs, pass_first_downs, rush_first_downs, penalty_first_downs
-- ├─ Passing: pass_completions, pass_attempts, passing_yards, passing_tds, interceptions_thrown,
-- │          yards_per_pass_attempt, pass_completion_pct
-- ├─ Rushing: rushing_attempts, rushing_yards, rushing_tds, yards_per_rush
-- ├─ Penalties: penalties, penalty_yards
-- └─ Efficiency: scoring_percentage, turnover_percentage, expected_points_offense
--
-- DEFENSE (24 fields):
-- ├─ Core: points_allowed_per_game, defensive_yards_allowed, def_total_plays, def_yards_per_play_allowed
-- ├─ Turnovers: turnovers_forced, fumbles_forced
-- ├─ First Downs: def_first_downs_allowed, def_pass_first_downs, def_rush_first_downs
-- ├─ Passing: def_pass_completions_allowed, def_pass_attempts, def_passing_yards_allowed,
-- │          def_passing_tds_allowed, def_interceptions, def_net_yards_per_pass
-- ├─ Rushing: def_rushing_attempts_allowed, def_rushing_yards_allowed, def_rushing_tds_allowed,
-- │          def_yards_per_rush_allowed
-- └─ Efficiency: def_scoring_percentage, def_turnover_percentage, expected_points_defense
--
-- CALCULATED (1 field):
-- └─ turnover_differential
--
-- METADATA (2 fields):
-- └─ source, last_updated
--
-- TOTAL: ~53 columns
-- ============================================================================
