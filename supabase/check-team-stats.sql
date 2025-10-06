-- Check what's actually in the team_stats_cache table
-- Run this in your Supabase SQL Editor to see current values

-- Sample check for a few teams
SELECT 
  team_name,
  games_played,
  offensive_yards_per_game,
  defensive_yards_allowed,
  points_per_game,
  points_allowed_per_game,
  turnover_differential,
  third_down_conversion_rate,
  red_zone_efficiency,
  source,
  last_updated
FROM team_stats_cache
WHERE team_name IN ('Detroit Lions', 'Houston Texans', 'Tennessee Titans', 'Green Bay Packers')
ORDER BY team_name;

-- Check all teams
SELECT 
  team_name,
  offensive_yards_per_game,
  points_per_game,
  third_down_conversion_rate,
  red_zone_efficiency
FROM team_stats_cache
ORDER BY team_name;

-- If values look wrong, you can delete all and re-import:
-- DELETE FROM team_stats_cache;
