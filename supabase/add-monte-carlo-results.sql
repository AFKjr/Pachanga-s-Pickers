-- Add monte_carlo_results JSONB column to picks table
-- This stores all probability data from the Monte Carlo simulation

ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS monte_carlo_results JSONB;

-- Add comment explaining the structure
COMMENT ON COLUMN picks.monte_carlo_results IS 'JSON object containing: moneyline_probability, spread_probability, total_probability, home_win_probability, away_win_probability, spread_cover_probability, over_probability, under_probability, predicted_home_score, predicted_away_score';
