-- Bulk update scores for multiple picks at once
-- Use this template to quickly update historical game scores

-- Example: Week 1 scores (replace with actual scores)
UPDATE picks
SET game_info = jsonb_set(
    jsonb_set(game_info, '{home_score}', to_jsonb(28::int), true),
    '{away_score}', to_jsonb(21::int), true
)
WHERE game_info->>'home_team' = 'Cardinals'
  AND game_info->>'away_team' = 'Titans'
  AND week = 1;

-- Template for batch updates (edit with actual data)
-- Week 1 Games
UPDATE picks SET game_info = jsonb_set(jsonb_set(game_info, '{home_score}', '28', true), '{away_score}', '21', true) WHERE game_info->>'home_team' = 'Team1' AND game_info->>'away_team' = 'Team2' AND week = 1;
UPDATE picks SET game_info = jsonb_set(jsonb_set(game_info, '{home_score}', '24', true), '{away_score}', '20', true) WHERE game_info->>'home_team' = 'Team3' AND game_info->>'away_team' = 'Team4' AND week = 1;

-- Week 2 Games
UPDATE picks SET game_info = jsonb_set(jsonb_set(game_info, '{home_score}', '31', true), '{away_score}', '27', true) WHERE game_info->>'home_team' = 'Team5' AND game_info->>'away_team' = 'Team6' AND week = 2;

-- Or use this format to update multiple games at once
WITH game_scores AS (
  SELECT * FROM (VALUES
    ('Cardinals', 'Titans', 1, 28, 21),
    ('Packers', '49ers', 1, 24, 20),
    ('Eagles', 'Broncos', 2, 31, 27)
    -- Add more rows here (home_team, away_team, week, home_score, away_score)
  ) AS t(home_team, away_team, week, home_score, away_score)
)
UPDATE picks p
SET game_info = jsonb_set(
    jsonb_set(p.game_info, '{home_score}', to_jsonb(gs.home_score::int), true),
    '{away_score}', to_jsonb(gs.away_score::int), true
)
FROM game_scores gs
WHERE p.game_info->>'home_team' = gs.home_team
  AND p.game_info->>'away_team' = gs.away_team
  AND p.week = gs.week;

-- Verify updates
SELECT 
    week,
    game_info->>'away_team' || ' @ ' || game_info->>'home_team' as matchup,
    game_info->>'away_score' as away_score,
    game_info->>'home_score' as home_score
FROM picks
WHERE (game_info->>'home_score')::int IS NOT NULL
ORDER BY week, created_at;
