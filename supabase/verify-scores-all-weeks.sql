-- Verify that ALL picks across ALL weeks now have score fields
-- Run this in Supabase SQL Editor to check

-- Check picks grouped by week
SELECT 
    week,
    COUNT(*) as total_picks,
    COUNT(CASE WHEN game_info ? 'home_score' THEN 1 END) as picks_with_home_score,
    COUNT(CASE WHEN game_info ? 'away_score' THEN 1 END) as picks_with_away_score,
    COUNT(CASE WHEN (game_info->>'home_score')::int IS NOT NULL THEN 1 END) as picks_with_actual_scores
FROM picks
GROUP BY week
ORDER BY week;

-- Check a sample from each week
SELECT 
    week,
    game_info->>'home_team' as home,
    game_info->>'away_team' as away,
    game_info->>'home_score' as home_score,
    game_info->>'away_score' as away_score,
    result,
    created_at::date
FROM picks
ORDER BY week, created_at
LIMIT 50;

-- Summary statistics
SELECT 
    COUNT(*) as total_picks,
    COUNT(CASE WHEN game_info ? 'home_score' THEN 1 END) as have_score_fields,
    COUNT(CASE WHEN (game_info->>'home_score')::int IS NOT NULL THEN 1 END) as have_actual_scores,
    MIN(week) as earliest_week,
    MAX(week) as latest_week
FROM picks;
