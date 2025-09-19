-- Migration: Add week column to picks table
-- Run this to add week support to existing database

ALTER TABLE picks ADD COLUMN IF NOT EXISTS week INTEGER CHECK (week >= 1 AND week <= 18);

-- Update existing picks with week calculation based on game date
-- This is a fallback for picks created before week parsing was implemented
UPDATE picks
SET week = CASE
  WHEN game_info->>'game_date' IS NOT NULL THEN
    GREATEST(1, LEAST(18,
      FLOOR(EXTRACT(EPOCH FROM (game_info->>'game_date')::timestamp - '2025-09-05'::timestamp) / (7 * 24 * 60 * 60)) + 1
    ))
  ELSE 1
END
WHERE week IS NULL;

-- Sample data for testing the application
-- Run this after applying the database schema

-- No sample data included - use the admin interface to add real predictions