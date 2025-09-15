-- Sample data for testing the application
-- Run this after applying the database schema

-- Insert sample picks
INSERT INTO picks (game_info, prediction, confidence, reasoning, result, user_id, is_pinned) VALUES
(
  '{"home_team": "Kansas City Chiefs", "away_team": "Buffalo Bills", "league": "NFL", "game_date": "2025-09-15T20:20:00Z"}',
  'Chiefs -3.5',
  85,
  'Chiefs have been dominant at home and Mahomes is playing at an elite level this season.',
  'pending',
  null,
  true
),
(
  '{"home_team": "Los Angeles Lakers", "away_team": "Golden State Warriors", "league": "NBA", "game_date": "2025-09-16T03:00:00Z"}',
  'Warriors +2.5',
  75,
  'Warriors have been underperforming but Steph Curry can carry them in big games.',
  'pending',
  null,
  false
),
(
  '{"home_team": "New York Yankees", "away_team": "Boston Red Sox", "league": "MLB", "game_date": "2025-09-15T19:05:00Z"}',
  'Yankees ML',
  80,
  'Yankees have the best lineup in baseball and are playing at home.',
  'pending',
  null,
  false
);

-- Insert sample posts (forum threads)
INSERT INTO posts (title, content, pick_id, user_id) VALUES
(
  'Chiefs vs Bills Prediction Thread',
  'What do you think about this matchup? Chiefs look strong but Bills defense is elite.',
  (SELECT id FROM picks WHERE prediction = 'Chiefs -3.5' LIMIT 1),
  null
),
(
  'Lakers vs Warriors - Game Analysis',
  'Breaking down the key matchups and what to expect from this Western Conference showdown.',
  (SELECT id FROM picks WHERE prediction = 'Warriors +2.5' LIMIT 1),
  null
);

-- Insert sample comments
INSERT INTO comments (content, post_id, user_id) VALUES
(
  'I agree with the Chiefs pick. Mahomes has been unstoppable lately.',
  (SELECT id FROM posts WHERE title = 'Chiefs vs Bills Prediction Thread' LIMIT 1),
  null
),
(
  'Warriors might surprise everyone. Their defense has been underrated.',
  (SELECT id FROM posts WHERE title = 'Lakers vs Warriors - Game Analysis' LIMIT 1),
  null
);