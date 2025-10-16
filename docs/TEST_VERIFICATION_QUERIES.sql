-- Test Verification Queries for NFL Week 7 Predictions
-- Run these queries in Supabase SQL Editor after generating predictions

-- ============================================================================
-- QUERY 1: Check if Week 7 predictions were generated
-- ============================================================================
SELECT 
  COUNT(*) as total_predictions,
  COUNT(DISTINCT game_info->>'home_team') as unique_home_teams,
  COUNT(DISTINCT game_info->>'away_team') as unique_away_teams,
  MIN(created_at) as first_prediction,
  MAX(created_at) as last_prediction
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour';

-- Expected: Should show ~16 predictions (typical NFL week)

-- ============================================================================
-- QUERY 2: Verify NO NaN values exist (Bug #4 test)
-- ============================================================================
SELECT COUNT(*) as nan_count
FROM picks
WHERE week = 7
  AND (
    monte_carlo_results::text LIKE '%NaN%'
    OR game_info::text LIKE '%NaN%'
  );

-- Expected: 0 (no NaN values)

-- ============================================================================
-- QUERY 3: Check all predictions have edge scores calculated
-- ============================================================================
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  spread_prediction,
  monte_carlo_results->>'spread_probability' as spread_prob,
  monte_carlo_results->>'moneyline_probability' as ml_prob,
  monte_carlo_results->>'total_probability' as total_prob,
  CASE 
    WHEN game_info->>'spread' IS NULL THEN '❌ Missing spread'
    WHEN monte_carlo_results->>'spread_probability' IS NULL THEN '❌ Missing spread prob'
    ELSE '✅ Has all data'
  END as validation_status
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Expected: All rows should show "✅ Has all data"

-- ============================================================================
-- QUERY 4: Verify spread picks are correct (Bug #3 test)
-- ============================================================================
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  game_info->>'favorite_team' as favorite,
  game_info->>'favorite_is_home' as fav_is_home,
  CAST(game_info->>'spread' as numeric) as spread,
  spread_prediction,
  CAST(monte_carlo_results->>'favorite_cover_probability' as numeric) as fav_cover_prob,
  CASE 
    WHEN CAST(monte_carlo_results->>'favorite_cover_probability' as numeric) > 50 
      AND spread_prediction NOT LIKE '%' || game_info->>'favorite_team' || '%'
    THEN '❌ WRONG: Should pick favorite'
    WHEN CAST(monte_carlo_results->>'favorite_cover_probability' as numeric) <= 50 
      AND spread_prediction LIKE '%' || game_info->>'favorite_team' || '%'
    THEN '❌ WRONG: Should pick underdog'
    ELSE '✅ Correct'
  END as spread_pick_validation
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Expected: All rows should show "✅ Correct"

-- ============================================================================
-- QUERY 5: Check for road favorites (Bug #3 specific test)
-- ============================================================================
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  game_info->>'favorite_team' as favorite,
  game_info->>'favorite_is_home' as fav_is_home,
  game_info->>'spread' as spread,
  spread_prediction,
  CASE 
    WHEN game_info->>'favorite_is_home' = 'false' THEN '🚨 Road Favorite - Check spread pick!'
    ELSE 'Home Favorite'
  END as scenario
FROM picks
WHERE week = 7
  AND game_info->>'favorite_is_home' = 'false'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Expected: Spread picks for road favorites should show away team with negative spread

-- ============================================================================
-- QUERY 6: Verify odds validation (Bug #1, #2 test)
-- ============================================================================
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  game_info->>'home_ml_odds' as home_ml,
  game_info->>'away_ml_odds' as away_ml,
  game_info->>'spread' as spread,
  game_info->>'over_under' as total,
  CASE 
    WHEN game_info->>'home_ml_odds' IS NULL THEN '⚠️ Missing home ML'
    WHEN game_info->>'away_ml_odds' IS NULL THEN '⚠️ Missing away ML'
    WHEN game_info->>'spread' IS NULL THEN '⚠️ Missing spread'
    WHEN game_info->>'over_under' IS NULL THEN '⚠️ Missing total'
    ELSE '✅ All odds present'
  END as odds_status
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Expected: All should have odds (even if estimated)

-- ============================================================================
-- QUERY 7: Check date consistency (Bug #6 test)
-- ============================================================================
SELECT 
  game_info->>'game_date' as game_date,
  COUNT(*) as games_on_date,
  MIN(game_info->>'home_team' || ' vs ' || game_info->>'away_team') as sample_game
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY game_info->>'game_date'
ORDER BY game_info->>'game_date';

-- Expected: Dates should be consistent (Sunday games on Sunday, not Monday)

-- ============================================================================
-- QUERY 8: Summary Report
-- ============================================================================
SELECT 
  '🎯 Total Predictions' as metric,
  COUNT(*)::text as value
FROM picks
WHERE week = 7 AND created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  '✅ Predictions with All Data' as metric,
  COUNT(*)::text as value
FROM picks
WHERE week = 7 
  AND created_at > NOW() - INTERVAL '1 hour'
  AND monte_carlo_results->>'spread_probability' IS NOT NULL
  AND monte_carlo_results->>'moneyline_probability' IS NOT NULL

UNION ALL

SELECT 
  '❌ NaN Values Found' as metric,
  COUNT(*)::text as value
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour'
  AND (monte_carlo_results::text LIKE '%NaN%' OR game_info::text LIKE '%NaN%')

UNION ALL

SELECT 
  '🏈 Unique Teams' as metric,
  COUNT(DISTINCT game_info->>'home_team')::text as value
FROM picks
WHERE week = 7 AND created_at > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- QUERY 9: Edge Score Verification (Main Test Goal)
-- ============================================================================
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  spread_prediction,
  ROUND(CAST(monte_carlo_results->>'spread_probability' as numeric), 2) as spread_prob,
  ROUND(CAST(monte_carlo_results->>'moneyline_probability' as numeric), 2) as ml_prob,
  ROUND(CAST(monte_carlo_results->>'total_probability' as numeric), 2) as total_prob,
  CASE 
    WHEN monte_carlo_results->>'spread_probability' IS NOT NULL 
      AND monte_carlo_results->>'moneyline_probability' IS NOT NULL
      AND monte_carlo_results->>'total_probability' IS NOT NULL
    THEN '✅ Edge scores calculated'
    ELSE '❌ Missing edge data'
  END as edge_status
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Expected: All rows should show "✅ Edge scores calculated"

-- ============================================================================
-- QUICK TEST: Run this first to see if anything was generated
-- ============================================================================
SELECT 
  COUNT(*) as predictions_in_last_hour,
  MAX(created_at) as most_recent
FROM picks
WHERE created_at > NOW() - INTERVAL '1 hour';

-- If this returns 0, predictions haven't been generated yet
