-- Fix confidence column to be NOT NULL with a default value
-- This column is required by validation but was set as nullable

-- First, set any existing NULL confidence values to a default (50)
UPDATE picks 
SET confidence = 50 
WHERE confidence IS NULL;

-- Make confidence NOT NULL
ALTER TABLE picks 
ALTER COLUMN confidence SET NOT NULL;

-- Optionally add a default value
ALTER TABLE picks 
ALTER COLUMN confidence SET DEFAULT 50;

-- Add a check constraint to ensure confidence is between 0 and 100
ALTER TABLE picks 
DROP CONSTRAINT IF EXISTS picks_confidence_check;

ALTER TABLE picks 
ADD CONSTRAINT picks_confidence_check 
CHECK (confidence >= 0 AND confidence <= 100);

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name = 'confidence';

-- Should show:
-- confidence | integer | NO | 50
