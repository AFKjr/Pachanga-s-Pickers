-- Add edge value columns to picks table
-- Run this migration in Supabase SQL Editor

-- Add edge value columns
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS moneyline_edge DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS spread_edge DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ou_edge DECIMAL(5,2);

-- Add odds columns to game_info JSONB
-- Note: These are stored in the game_info JSONB field, no schema change needed
-- But we'll add a comment for documentation
COMMENT ON COLUMN picks.game_info IS 'JSONB containing game information including: league, home_team, away_team, game_date, spread, over_under, home_ml_odds, away_ml_odds, spread_odds, over_odds, under_odds, home_score, away_score';

-- Create indexes for edge-based queries
CREATE INDEX IF NOT EXISTS idx_picks_moneyline_edge ON picks(moneyline_edge) WHERE moneyline_edge IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_picks_spread_edge ON picks(spread_edge) WHERE spread_edge IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_picks_ou_edge ON picks(ou_edge) WHERE ou_edge IS NOT NULL;

-- Create a view for high-edge picks (optional, useful for analytics)
CREATE OR REPLACE VIEW high_edge_picks AS
SELECT 
  id,
  prediction,
  spread_prediction,
  ou_prediction,
  confidence,
  moneyline_edge,
  spread_edge,
  ou_edge,
  result,
  ats_result,
  ou_result,
  game_info,
  week,
  created_at
FROM picks
WHERE 
  (moneyline_edge >= 2 OR spread_edge >= 2 OR ou_edge >= 2)
  AND result = 'pending'
ORDER BY 
  GREATEST(
    COALESCE(moneyline_edge, 0),
    COALESCE(spread_edge, 0),
    COALESCE(ou_edge, 0)
  ) DESC;

-- Grant access to the view
GRANT SELECT ON high_edge_picks TO authenticated;
GRANT SELECT ON high_edge_picks TO anon;

COMMENT ON VIEW high_edge_picks IS 'Picks with edge >= 2% on any bet type, useful for identifying the strongest betting opportunities';
