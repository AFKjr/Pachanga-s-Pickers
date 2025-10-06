-- This script checks for team name format issues and provides fixes

-- 1. See what team names are currently in the database
SELECT DISTINCT team_name FROM team_stats_cache ORDER BY team_name;

-- 2. If you see full names like "Detroit Lions", "Tennessee Titans", etc.
-- but The Odds API uses short names like "Detroit", "Tennessee"
-- you need to UPDATE the team names to match

-- Example: Update to short names (uncomment and run if needed)
/*
UPDATE team_stats_cache SET team_name = 'Arizona' WHERE team_name = 'Arizona Cardinals';
UPDATE team_stats_cache SET team_name = 'Atlanta' WHERE team_name = 'Atlanta Falcons';
UPDATE team_stats_cache SET team_name = 'Baltimore' WHERE team_name = 'Baltimore Ravens';
UPDATE team_stats_cache SET team_name = 'Buffalo' WHERE team_name = 'Buffalo Bills';
UPDATE team_stats_cache SET team_name = 'Carolina' WHERE team_name = 'Carolina Panthers';
UPDATE team_stats_cache SET team_name = 'Chicago' WHERE team_name = 'Chicago Bears';
UPDATE team_stats_cache SET team_name = 'Cincinnati' WHERE team_name = 'Cincinnati Bengals';
UPDATE team_stats_cache SET team_name = 'Cleveland' WHERE team_name = 'Cleveland Browns';
UPDATE team_stats_cache SET team_name = 'Dallas' WHERE team_name = 'Dallas Cowboys';
UPDATE team_stats_cache SET team_name = 'Denver' WHERE team_name = 'Denver Broncos';
UPDATE team_stats_cache SET team_name = 'Detroit' WHERE team_name = 'Detroit Lions';
UPDATE team_stats_cache SET team_name = 'Green Bay' WHERE team_name = 'Green Bay Packers';
UPDATE team_stats_cache SET team_name = 'Houston' WHERE team_name = 'Houston Texans';
UPDATE team_stats_cache SET team_name = 'Indianapolis' WHERE team_name = 'Indianapolis Colts';
UPDATE team_stats_cache SET team_name = 'Jacksonville' WHERE team_name = 'Jacksonville Jaguars';
UPDATE team_stats_cache SET team_name = 'Kansas City' WHERE team_name = 'Kansas City Chiefs';
UPDATE team_stats_cache SET team_name = 'Las Vegas' WHERE team_name = 'Las Vegas Raiders';
UPDATE team_stats_cache SET team_name = 'Los Angeles Chargers' WHERE team_name = 'Los Angeles Chargers';
UPDATE team_stats_cache SET team_name = 'Los Angeles Rams' WHERE team_name = 'Los Angeles Rams';
UPDATE team_stats_cache SET team_name = 'Miami' WHERE team_name = 'Miami Dolphins';
UPDATE team_stats_cache SET team_name = 'Minnesota' WHERE team_name = 'Minnesota Vikings';
UPDATE team_stats_cache SET team_name = 'New England' WHERE team_name = 'New England Patriots';
UPDATE team_stats_cache SET team_name = 'New Orleans' WHERE team_name = 'New Orleans Saints';
UPDATE team_stats_cache SET team_name = 'New York Giants' WHERE team_name = 'New York Giants';
UPDATE team_stats_cache SET team_name = 'New York Jets' WHERE team_name = 'New York Jets';
UPDATE team_stats_cache SET team_name = 'Philadelphia' WHERE team_name = 'Philadelphia Eagles';
UPDATE team_stats_cache SET team_name = 'Pittsburgh' WHERE team_name = 'Pittsburgh Steelers';
UPDATE team_stats_cache SET team_name = 'San Francisco' WHERE team_name = 'San Francisco 49ers';
UPDATE team_stats_cache SET team_name = 'Seattle' WHERE team_name = 'Seattle Seahawks';
UPDATE team_stats_cache SET team_name = 'Tampa Bay' WHERE team_name = 'Tampa Bay Buccaneers';
UPDATE team_stats_cache SET team_name = 'Tennessee' WHERE team_name = 'Tennessee Titans';
UPDATE team_stats_cache SET team_name = 'Washington' WHERE team_name = 'Washington Commanders';
*/

-- 3. Verify the updates
SELECT team_name, offensive_yards_per_game, points_per_game FROM team_stats_cache ORDER BY team_name;
