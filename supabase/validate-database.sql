-- Database Validation Queries
-- Run these in Supabase SQL Editor to verify your setup

-- ========================================
-- 1. Check if team_stats_cache table exists
-- ========================================
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'team_stats_cache'
) AS table_exists;

-- ========================================
-- 2. Check table structure (all columns)
-- ========================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'team_stats_cache'
ORDER BY ordinal_position;

-- ========================================
-- 3. Check primary key
-- ========================================
SELECT 
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'team_stats_cache' 
  AND tc.constraint_type = 'PRIMARY KEY';

-- ========================================
-- 4. Check indexes
-- ========================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'team_stats_cache';

-- ========================================
-- 5. Check data - count by week and season
-- ========================================
SELECT 
  season_year,
  week,
  COUNT(*) as team_count
FROM team_stats_cache
GROUP BY season_year, week
ORDER BY season_year DESC, week DESC;

-- ========================================
-- 6. Check Week 6 data specifically
-- ========================================
SELECT 
  team_name,
  week,
  season_year,
  games_played,
  points_per_game,
  offensive_yards_per_game,
  defensive_yards_allowed,
  third_down_conversion_rate,
  red_zone_efficiency
FROM team_stats_cache
WHERE week = 6 AND season_year = 2025
ORDER BY team_name;

-- Expected: 32 NFL teams

-- ========================================
-- 7. Check for NULL values in critical fields
-- ========================================
SELECT 
  COUNT(*) as total_records,
  COUNT(week) as has_week,
  COUNT(season_year) as has_season,
  COUNT(points_per_game) as has_ppg,
  COUNT(offensive_yards_per_game) as has_offense,
  COUNT(defensive_yards_allowed) as has_defense
FROM team_stats_cache;

-- ========================================
-- 8. Verify composite key uniqueness
-- ========================================
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as duplicate_count
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1;

-- Expected: No rows (no duplicates)

-- ========================================
-- 9. Sample data from one team
-- ========================================
SELECT *
FROM team_stats_cache
WHERE team_name = 'Kansas City'
  AND season_year = 2025
ORDER BY week DESC
LIMIT 5;

-- ========================================
-- 10. Check week range (should be 1-18)
-- ========================================
SELECT 
  MIN(week) as min_week,
  MAX(week) as max_week,
  COUNT(DISTINCT week) as distinct_weeks
FROM team_stats_cache
WHERE season_year = 2025;

-- Expected: min=1, max<=18

-- ========================================
-- SUMMARY VALIDATION
-- ========================================
-- If all queries return expected results:
-- ✅ Table structure is correct
-- ✅ Primary key is set
-- ✅ Indexes exist
-- ✅ Week 6 data is present
-- ✅ No duplicates
-- ✅ Data is clean

SELECT 
  '✅ Database validation complete!' as status,
  COUNT(*) as total_records,
  COUNT(DISTINCT team_name) as unique_teams,
  COUNT(DISTINCT week) as unique_weeks,
  MIN(week) as earliest_week,
  MAX(week) as latest_week
FROM team_stats_cache
WHERE season_year = 2025;
