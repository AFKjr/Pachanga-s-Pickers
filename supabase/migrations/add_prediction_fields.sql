-- Add spread_prediction and ou_prediction columns to picks table
-- These store the text predictions for spread and over/under bets

-- Add spread_prediction column (optional text field)
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS spread_prediction TEXT;

-- Add ou_prediction column (optional text field)
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS ou_prediction TEXT;

-- Add comments for documentation
COMMENT ON COLUMN picks.spread_prediction IS 'Text prediction for spread bet (e.g., "Cardinals -3.5 to cover")';
COMMENT ON COLUMN picks.ou_prediction IS 'Text prediction for over/under bet (e.g., "Over 45.5")';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name IN ('spread_prediction', 'ou_prediction');
