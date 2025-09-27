-- Test query to verify ESPN scraper tables are accessible
-- Run this in your Supabase SQL Editor to check if the scraper can write to tables

-- Insert a test record to team_stats_offense table
INSERT INTO team_stats_offense (
    team, 
    points_per_game, 
    yards_per_game, 
    scraped_from, 
    scraped_at
) VALUES (
    'TEST_TEAM', 
    25.5, 
    350.0, 
    'manual_test', 
    NOW()
);

-- Check if the test record was inserted
SELECT * FROM team_stats_offense WHERE team = 'TEST_TEAM';

-- Check if table is empty (should show 0 or 1 if test worked)
SELECT COUNT(*) as total_records FROM team_stats_offense;

-- Clean up test record
DELETE FROM team_stats_offense WHERE team = 'TEST_TEAM';