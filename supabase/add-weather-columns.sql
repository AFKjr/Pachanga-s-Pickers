-- Add weather columns to picks table
-- Run this in Supabase SQL Editor

ALTER TABLE picks
ADD COLUMN IF NOT EXISTS weather JSONB,
ADD COLUMN IF NOT EXISTS weather_impact TEXT;

-- Add comment for documentation
COMMENT ON COLUMN picks.weather IS 'Weather conditions for the game (temperature, wind, condition, impact rating)';
COMMENT ON COLUMN picks.weather_impact IS 'Human-readable weather impact summary';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'picks'
AND column_name IN ('weather', 'weather_impact')
ORDER BY column_name;