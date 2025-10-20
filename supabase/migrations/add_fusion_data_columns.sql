-- ============================================================================
-- ADD FUSION DATA COLUMNS TO team_stats_cache TABLE
-- ============================================================================
-- This migration adds all additional statistics from the NFL stats fusion script
-- These fields support advanced situational analysis, special teams, and drive efficiency
--
-- NEW FIELDS ADDED: ~45 additional columns
-- TOTAL FIELDS AFTER MIGRATION: ~98 columns
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- SITUATIONAL OFFENSE STATISTICS
-- ============================================================================

-- Third down efficiency
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS third_down_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS third_down_conversions DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS fourth_down_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS fourth_down_conversions DECIMAL(10,2);

-- Red zone efficiency
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS red_zone_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS red_zone_touchdowns DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS red_zone_scoring_pct DECIMAL(10,2);

-- ============================================================================
-- ADVANCED OFFENSE BREAKDOWN
-- ============================================================================

-- First down breakdown
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS pass_first_downs DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS rush_first_downs DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS penalty_first_downs DECIMAL(10,2);

-- ============================================================================
-- SPECIAL TEAMS OFFENSE
-- ============================================================================

-- Field goals
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS field_goal_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS field_goals_made DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS field_goal_pct DECIMAL(10,2);

-- Extra points
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS extra_point_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS extra_points_made DECIMAL(10,2);

-- Kickoffs
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS kickoffs DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS touchbacks DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS touchback_pct DECIMAL(10,2);

-- Punting
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punt_yards DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punt_net_yards DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punt_net_yards_per_punt DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punts_inside_20 DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punts_blocked DECIMAL(10,2);

-- Returns
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS kick_returns DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS kick_return_yards DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS kick_return_yards_per_return DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punt_returns DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punt_return_yards DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punt_return_yards_per_return DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS all_purpose_yards DECIMAL(10,2);

-- ============================================================================
-- SCORING BREAKDOWN
-- ============================================================================

ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS receiving_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS total_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS two_point_conversions DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS punt_return_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS kick_return_tds DECIMAL(10,2);

-- ============================================================================
-- SITUATIONAL DEFENSE STATISTICS
-- ============================================================================

-- Third/Fourth down defense
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_third_down_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_third_down_conversions DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_fourth_down_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_fourth_down_conversions DECIMAL(10,2);

-- Red zone defense
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_red_zone_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_red_zone_touchdowns DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_red_zone_scoring_pct DECIMAL(10,2);

-- ============================================================================
-- PASS RUSH METRICS
-- ============================================================================

ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS qb_hurries DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS qb_hits DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS blitzes DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS blitz_pct DECIMAL(10,2);

-- ============================================================================
-- DEFENSIVE SPECIAL TEAMS
-- ============================================================================

-- Defensive field goals
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_field_goal_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_field_goals_made DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_field_goal_pct DECIMAL(10,2);

-- Defensive extra points
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_extra_point_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_extra_points_made DECIMAL(10,2);

-- Defensive punting
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_punts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_punt_yards DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_punts_blocked DECIMAL(10,2);

-- Defensive returns
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_kick_returns DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_kick_return_yards DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_punt_returns DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_punt_return_yards DECIMAL(10,2);

-- ============================================================================
-- DEFENSIVE SCORING BREAKDOWN
-- ============================================================================

ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_rushing_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_receiving_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_total_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_two_point_conversions DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_punt_return_tds DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_kick_return_tds DECIMAL(10,2);

-- ============================================================================
-- DRIVE-LEVEL STATISTICS
-- ============================================================================

-- Offensive drives
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS total_drives DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS drive_scoring_pct DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS drive_turnover_pct DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS drive_start_avg DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS drive_time_avg DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS drive_points_avg DECIMAL(10,2);

-- Defensive drives
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_total_drives DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_drive_scoring_pct DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_drive_turnover_pct DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_drive_start_avg DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_drive_time_avg DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS def_drive_points_avg DECIMAL(10,2);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN team_stats_cache.third_down_attempts IS 'Third down conversion attempts';
COMMENT ON COLUMN team_stats_cache.third_down_conversions IS 'Third down conversions made';
COMMENT ON COLUMN team_stats_cache.red_zone_scoring_pct IS 'Percentage of red zone trips resulting in TDs';
COMMENT ON COLUMN team_stats_cache.field_goal_pct IS 'Field goal percentage';
COMMENT ON COLUMN team_stats_cache.two_point_conversions IS 'Successful two-point conversions';
COMMENT ON COLUMN team_stats_cache.qb_hurries IS 'Quarterback hurries by pass rush';
COMMENT ON COLUMN team_stats_cache.blitz_pct IS 'Percentage of plays with blitz';
COMMENT ON COLUMN team_stats_cache.drive_scoring_pct IS 'Percentage of drives ending in points';
COMMENT ON COLUMN team_stats_cache.def_drive_scoring_pct IS 'Percentage of opponent drives ending in points';

-- ============================================================================
-- UPDATE METADATA
-- ============================================================================

UPDATE team_stats_cache
SET last_updated = NOW(), source = 'fusion'
WHERE last_updated IS NULL OR source IS NULL;

-- ============================================================================
-- CREATE ADDITIONAL INDEXES FOR FUSION QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_team_stats_drive_scoring_pct
  ON team_stats_cache(drive_scoring_pct);

CREATE INDEX IF NOT EXISTS idx_team_stats_def_drive_scoring_pct
  ON team_stats_cache(def_drive_scoring_pct);

CREATE INDEX IF NOT EXISTS idx_team_stats_red_zone_scoring_pct
  ON team_stats_cache(red_zone_scoring_pct);

CREATE INDEX IF NOT EXISTS idx_team_stats_field_goal_pct
  ON team_stats_cache(field_goal_pct);

-- Commit transaction
COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify all fusion columns were added
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'team_stats_cache'
  AND column_name LIKE '%drive%'
  OR column_name LIKE '%red_zone%'
  OR column_name LIKE '%field_goal%'
  OR column_name LIKE '%qb_hurr%'
  OR column_name LIKE '%blitz%'
  OR column_name LIKE '%third_down%'
  OR column_name LIKE '%fourth_down%'
  OR column_name LIKE '%punt%'
  OR column_name LIKE '%kick_return%'
  OR column_name LIKE '%two_point%'
ORDER BY column_name;

-- ============================================================================
-- SUMMARY OF NEW FUSION COLUMNS
-- ============================================================================
--
-- SITUATIONAL OFFENSE (7 fields):
-- ├─ third_down_attempts, third_down_conversions, fourth_down_attempts, fourth_down_conversions
-- ├─ red_zone_attempts, red_zone_touchdowns, red_zone_scoring_pct
--
-- ADVANCED OFFENSE (3 fields):
-- └─ pass_first_downs, rush_first_downs, penalty_first_downs
--
-- SPECIAL TEAMS OFFENSE (15 fields):
-- ├─ Field Goals: field_goal_attempts, field_goals_made, field_goal_pct
-- ├─ Extra Points: extra_point_attempts, extra_points_made
-- ├─ Kickoffs: kickoffs, touchbacks, touchback_pct
-- ├─ Punting: punts, punt_yards, punt_net_yards, punt_net_yards_per_punt, punts_inside_20, punts_blocked
-- └─ Returns: kick_returns, kick_return_yards, kick_return_yards_per_return, punt_returns, punt_return_yards, punt_return_yards_per_return, all_purpose_yards
--
-- SCORING BREAKDOWN (5 fields):
-- └─ receiving_tds, total_tds, two_point_conversions, punt_return_tds, kick_return_tds
--
-- SITUATIONAL DEFENSE (7 fields):
-- ├─ def_third_down_attempts, def_third_down_conversions, def_fourth_down_attempts, def_fourth_down_conversions
-- └─ def_red_zone_attempts, def_red_zone_touchdowns, def_red_zone_scoring_pct
--
-- PASS RUSH (4 fields):
-- └─ qb_hurries, qb_hits, blitzes, blitz_pct
--
-- DEFENSIVE SPECIAL TEAMS (9 fields):
-- ├─ def_field_goal_attempts, def_field_goals_made, def_field_goal_pct
-- ├─ def_extra_point_attempts, def_extra_points_made
-- ├─ def_punts, def_punt_yards, def_punts_blocked
-- └─ def_kick_returns, def_kick_return_yards, def_punt_returns, def_punt_return_yards
--
-- DEFENSIVE SCORING (6 fields):
-- └─ def_rushing_tds, def_receiving_tds, def_total_tds, def_two_point_conversions, def_punt_return_tds, def_kick_return_tds
--
-- DRIVE STATISTICS (12 fields):
-- ├─ Offensive: total_drives, drive_scoring_pct, drive_turnover_pct, drive_start_avg, drive_time_avg, drive_points_avg
-- └─ Defensive: def_total_drives, def_drive_scoring_pct, def_drive_turnover_pct, def_drive_start_avg, def_drive_time_avg, def_drive_points_avg
--
-- TOTAL NEW FIELDS: ~45 columns
-- TOTAL TABLE COLUMNS: ~98 columns
-- ============================================================================</content>
<parameter name="filePath">c:\Users\wilmc\Mobile Apps\SportsBettingForum\supabase\migrations\add_fusion_data_columns.sql