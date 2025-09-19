-- Remove Duplicate Picks (Keep Latest)
-- Run this in Supabase SQL Editor to clean up duplicate picks

-- First, identify duplicates (same game, different pick IDs)
WITH duplicates AS (
  SELECT
    game_info->>'away_team' as away_team,
    game_info->>'home_team' as home_team,
    COUNT(*) as pick_count,
    ARRAY_AGG(id ORDER BY created_at DESC) as pick_ids
  FROM picks
  GROUP BY game_info->>'away_team', game_info->>'home_team'
  HAVING COUNT(*) > 1
)
SELECT
  away_team || '@' || home_team as game,
  pick_count as duplicates,
  pick_ids[1] as keep_id,
  pick_ids[2:] as delete_ids
FROM duplicates;

-- Delete duplicate picks (keeping only the most recent one)
-- ⚠️ BACKUP YOUR DATA FIRST!
DELETE FROM picks
WHERE id IN (
  SELECT unnest(pick_ids[2:]) -- Delete all except the first (most recent)
  FROM (
    SELECT
      ARRAY_AGG(id ORDER BY created_at DESC) as pick_ids
    FROM picks
    GROUP BY game_info->>'away_team', game_info->>'home_team'
    HAVING COUNT(*) > 1
  ) as duplicates
);

-- Verify cleanup
SELECT
  game_info->>'away_team' as away_team,
  game_info->>'home_team' as home_team,
  COUNT(*) as remaining_picks
FROM picks
GROUP BY game_info->>'away_team', game_info->>'home_team'
HAVING COUNT(*) > 1;