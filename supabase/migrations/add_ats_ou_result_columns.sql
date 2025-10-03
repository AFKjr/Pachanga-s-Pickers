-- Migration: Add ATS and O/U result columns to picks table
-- This allows storing calculated results directly in the database for better performance

-- Add ats_result column (Against The Spread result)
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS ats_result TEXT CHECK (ats_result IN ('win', 'loss', 'push', 'pending'));

-- Add ou_result column (Over/Under result)
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS ou_result TEXT CHECK (ou_result IN ('win', 'loss', 'push', 'pending'));

-- Set default values for existing picks
UPDATE picks 
SET ats_result = 'pending' 
WHERE ats_result IS NULL;

UPDATE picks 
SET ou_result = 'pending' 
WHERE ou_result IS NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_picks_ats_result ON picks(ats_result);
CREATE INDEX IF NOT EXISTS idx_picks_ou_result ON picks(ou_result);
CREATE INDEX IF NOT EXISTS idx_picks_week_ats ON picks(week, ats_result);
CREATE INDEX IF NOT EXISTS idx_picks_week_ou ON picks(week, ou_result);

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name IN ('result', 'ats_result', 'ou_result')
ORDER BY column_name;
