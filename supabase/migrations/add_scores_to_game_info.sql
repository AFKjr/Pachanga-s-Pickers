-- Migration: Add home_score and away_score to game_info JSONB field
-- Created: 2025-10-01
-- Description: Adds score tracking fields to the picks table for ATS/O/U calculations

-- Since game_info is a JSONB field, we don't need to ALTER the table structure
-- The JSONB field can already accept these new properties
-- This migration adds the fields with NULL values to existing records for consistency

-- Update existing picks to include home_score and away_score fields (set to NULL initially)
-- Only update records that don't already have these fields
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

-- Add a comment to document the new fields
COMMENT ON COLUMN picks.game_info IS 'Game information including teams, date, spread, over_under, home_score, and away_score (JSONB)';

-- Create an index on picks where scores exist for faster filtering
-- This helps when querying picks that have completed scores
CREATE INDEX IF NOT EXISTS idx_picks_with_scores 
ON picks ((game_info->>'home_score'))
WHERE game_info->>'home_score' IS NOT NULL;

-- Optional: Add a check to ensure scores are valid numbers when provided
-- This creates a constraint to validate that if scores exist, they must be non-negative integers
ALTER TABLE picks DROP CONSTRAINT IF EXISTS check_game_info_scores;
ALTER TABLE picks ADD CONSTRAINT check_game_info_scores
CHECK (
    -- If home_score exists, it must be a non-negative number
    (game_info->>'home_score' IS NULL OR 
     (game_info->>'home_score' ~ '^[0-9]+$' AND 
      (game_info->>'home_score')::int >= 0))
    AND
    -- If away_score exists, it must be a non-negative number
    (game_info->>'away_score' IS NULL OR 
     (game_info->>'away_score' ~ '^[0-9]+$' AND 
      (game_info->>'away_score')::int >= 0))
);

-- Example query to verify the update
-- SELECT id, game_info->>'home_team' as home_team, game_info->>'away_team' as away_team, 
--        game_info->>'home_score' as home_score, game_info->>'away_score' as away_score
-- FROM picks
-- LIMIT 10;
