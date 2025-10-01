-- Quick Migration: Add score fields to picks table
-- Run this in your Supabase SQL Editor

-- Step 1: Add home_score and away_score to all existing picks (set to NULL)
UPDATE picks
SET game_info = jsonb_set(
    jsonb_set(
        game_info,
        '{home_score}',
        'null'::jsonb,
        true
    ),
    '{away_score}',
    'null'::jsonb,
    true
)
WHERE NOT (game_info ? 'home_score' AND game_info ? 'away_score');

-- Step 2: Add constraint to ensure scores are valid when provided
ALTER TABLE picks DROP CONSTRAINT IF EXISTS check_game_info_scores;
ALTER TABLE picks ADD CONSTRAINT check_game_info_scores
CHECK (
    (game_info->>'home_score' IS NULL OR 
     (game_info->>'home_score' ~ '^[0-9]+$' AND (game_info->>'home_score')::int >= 0))
    AND
    (game_info->>'away_score' IS NULL OR 
     (game_info->>'away_score' ~ '^[0-9]+$' AND (game_info->>'away_score')::int >= 0))
);

-- Step 3: Verify the changes
SELECT 
    id, 
    game_info->>'home_team' as home_team, 
    game_info->>'away_team' as away_team,
    game_info->>'home_score' as home_score, 
    game_info->>'away_score' as away_score,
    result
FROM picks
ORDER BY created_at DESC
LIMIT 10;
