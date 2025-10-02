-- Complete migration: Add all missing columns to picks table
-- Run this in Supabase SQL Editor if you haven't added these columns yet

-- Add spread_prediction and ou_prediction columns
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS spread_prediction TEXT,
ADD COLUMN IF NOT EXISTS ou_prediction TEXT;

-- Add schedule_id column if needed
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS schedule_id TEXT;

-- Update existing picks to ensure week and result have proper values
-- (This is safe to run even if values already exist)
UPDATE picks 
SET result = 'pending' 
WHERE result IS NULL;

-- Verify all columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name IN ('spread_prediction', 'ou_prediction', 'schedule_id', 'week', 'result')
ORDER BY column_name;
