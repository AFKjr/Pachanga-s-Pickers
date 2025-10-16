-- ============================================
-- VERIFICATION QUERIES FOR BUG FIXES
-- Run these in Supabase SQL Editor
-- ============================================

-- Query 1: Check for NaN values (Bug #4 verification)
-- Expected: 0 results
SELECT COUNT(*) as critical_nan_count 
FROM picks 
WHERE (week = 7 OR week = 8)
AND created_at > NOW() - INTERVAL '2 hours'
AND (
  monte_carlo_results::text LIKE '%NaN%' 
  OR game_info::text LIKE '%NaN%'
);

-- Query 2: Verify all predictions have edge scores
-- Expected: 28 (or total number of generated predictions)
SELECT COUNT(*) as predictions_with_edges 
FROM picks 
WHERE (week = 7 OR week = 8)
AND created_at > NOW() - INTERVAL '2 hours'
AND monte_carlo_results->>'spread_probability' IS NOT NULL;

-- Query 3: Check total predictions generated
-- Expected: Week 7: 11, Week 8: 16, Week 9: 1
SELECT 
  week,
  COUNT(*) as total_predictions
FROM picks 
WHERE (week = 7 OR week = 8 OR week = 9)
AND created_at > NOW() - INTERVAL '2 hours'
GROUP BY week
ORDER BY week;

-- Query 4: Verify road favorite spread picks (Bug #3 verification)
-- Check that spread predictions favor the correct team
SELECT 
  game_info->>'away_team' as away_team,
  game_info->>'home_team' as home_team,
  game_info->>'favorite_team' as favorite,
  game_info->>'favorite_is_home' as fav_is_home,
  spread_prediction,
  monte_carlo_results->>'favorite_cover_probability' as fav_cover_prob
FROM picks 
WHERE (week = 7 OR week = 8)
AND created_at > NOW() - INTERVAL '2 hours'
AND game_info->>'favorite_is_home' = 'false'
ORDER BY game_info->>'game_date';

-- Query 5: Verify odds are present for all games
-- Expected: All games should have valid odds
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  game_info->>'home_ml_odds' as home_ml,
  game_info->>'away_ml_odds' as away_ml,
  game_info->>'spread' as spread,
  game_info->>'over_under' as total
FROM picks 
WHERE (week = 7 OR week = 8)
AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY game_info->>'game_date';

-- Query 6: Check Monte Carlo results completeness
-- All fields should be present
SELECT 
  game_info->>'home_team' as home,
  monte_carlo_results->>'moneyline_probability' as ml_prob,
  monte_carlo_results->>'spread_probability' as spread_prob,
  monte_carlo_results->>'total_probability' as total_prob,
  monte_carlo_results->>'predicted_home_score' as pred_home,
  monte_carlo_results->>'predicted_away_score' as pred_away
FROM picks 
WHERE (week = 7 OR week = 8)
AND created_at > NOW() - INTERVAL '2 hours'
LIMIT 10;

-- Query 7: Summary report with all data quality checks
SELECT 
  week,
  COUNT(*) as total_predictions,
  COUNT(CASE WHEN monte_carlo_results IS NOT NULL THEN 1 END) as with_monte_carlo,
  COUNT(CASE WHEN spread_prediction IS NOT NULL THEN 1 END) as with_spread,
  COUNT(CASE WHEN ou_prediction IS NOT NULL THEN 1 END) as with_ou,
  COUNT(CASE WHEN game_info->>'home_ml_odds' IS NOT NULL THEN 1 END) as with_ml_odds,
  COUNT(CASE WHEN game_info->>'spread' IS NOT NULL THEN 1 END) as with_spread_odds,
  COUNT(CASE WHEN game_info->>'over_under' IS NOT NULL THEN 1 END) as with_total_odds
FROM picks 
WHERE (week = 7 OR week = 8)
AND created_at > NOW() - INTERVAL '2 hours'
GROUP BY week
ORDER BY week;

-- Query 8: Check for any NULL or invalid values
SELECT 
  id,
  game_info->>'home_team' as game,
  CASE 
    WHEN monte_carlo_results IS NULL THEN 'Missing Monte Carlo'
    WHEN spread_prediction IS NULL THEN 'Missing Spread'
    WHEN ou_prediction IS NULL THEN 'Missing O/U'
    WHEN game_info->>'home_ml_odds' IS NULL THEN 'Missing ML Odds'
    ELSE 'Complete'
  END as status
FROM picks 
WHERE (week = 7 OR week = 8)
AND created_at > NOW() - INTERVAL '2 hours'
ORDER BY status, game_info->>'game_date';
