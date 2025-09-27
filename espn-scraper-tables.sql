-- ESPN Scraper Database Tables for Supabase
-- Add these tables to your Supabase database to support the ESPN scraper extension

-- Enable Row Level Security and UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TEAM OFFENSIVE STATS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_stats_offense (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team VARCHAR(50) NOT NULL,
    points_per_game DECIMAL(5,2) DEFAULT 0,
    yards_per_game DECIMAL(6,1) DEFAULT 0,
    passing_yards_per_game DECIMAL(6,1) DEFAULT 0,
    rushing_yards_per_game DECIMAL(6,1) DEFAULT 0,
    turnovers_per_game DECIMAL(4,2) DEFAULT 0,
    scraped_from VARCHAR(50) DEFAULT 'espn_team_offense',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_team_offense_scrape UNIQUE (team, scraped_at),
    CONSTRAINT valid_team_name_offense CHECK (LENGTH(team) > 0),
    CONSTRAINT valid_points_offense CHECK (points_per_game >= 0),
    CONSTRAINT valid_yards_offense CHECK (yards_per_game >= 0)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_offense_team ON team_stats_offense (team);
CREATE INDEX IF NOT EXISTS idx_team_offense_scraped_at ON team_stats_offense (scraped_at DESC);

-- =====================================================
-- TEAM DEFENSIVE STATS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_stats_defense (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team VARCHAR(50) NOT NULL,
    points_allowed_per_game DECIMAL(5,2) DEFAULT 0,
    yards_allowed_per_game DECIMAL(6,1) DEFAULT 0,
    passing_yards_allowed DECIMAL(6,1) DEFAULT 0,
    rushing_yards_allowed DECIMAL(6,1) DEFAULT 0,
    forced_turnovers_per_game DECIMAL(4,2) DEFAULT 0,
    scraped_from VARCHAR(50) DEFAULT 'espn_team_defense',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_team_defense_scrape UNIQUE (team, scraped_at),
    CONSTRAINT valid_team_name_defense CHECK (LENGTH(team) > 0),
    CONSTRAINT valid_points_defense CHECK (points_allowed_per_game >= 0),
    CONSTRAINT valid_yards_defense CHECK (yards_allowed_per_game >= 0)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_defense_team ON team_stats_defense (team);
CREATE INDEX IF NOT EXISTS idx_team_defense_scraped_at ON team_stats_defense (scraped_at DESC);

-- =====================================================
-- INJURY REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS injury_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team VARCHAR(50) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    position VARCHAR(10),
    status VARCHAR(20), -- 'Out', 'Questionable', 'Doubtful', 'Probable', etc.
    injury_type VARCHAR(50), -- 'Knee', 'Ankle', 'Concussion', etc.
    scraped_from VARCHAR(50) DEFAULT 'espn_injuries',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_player_injury_scrape UNIQUE (team, player_name, scraped_at),
    CONSTRAINT valid_team_name_injury CHECK (LENGTH(team) > 0),
    CONSTRAINT valid_player_name CHECK (LENGTH(player_name) > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_injury_team ON injury_reports (team);
CREATE INDEX IF NOT EXISTS idx_injury_player ON injury_reports (player_name);
CREATE INDEX IF NOT EXISTS idx_injury_status ON injury_reports (status);
CREATE INDEX IF NOT EXISTS idx_injury_scraped_at ON injury_reports (scraped_at DESC);

-- =====================================================
-- BETTING LINES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS betting_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    away_team VARCHAR(50) NOT NULL,
    home_team VARCHAR(50) NOT NULL,
    spread DECIMAL(4,1), -- e.g., -3.5, +7.0
    over_under DECIMAL(4,1), -- e.g., 45.5, 52.0
    away_ml INTEGER, -- Moneyline for away team (e.g., +150, -200)
    home_ml INTEGER, -- Moneyline for home team
    game_date TIMESTAMPTZ, -- When the game is scheduled
    scraped_from VARCHAR(50) DEFAULT 'espn_sportsbook',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_game_betting_scrape UNIQUE (away_team, home_team, scraped_at),
    CONSTRAINT valid_away_team CHECK (LENGTH(away_team) > 0),
    CONSTRAINT valid_home_team CHECK (LENGTH(home_team) > 0),
    CONSTRAINT different_teams CHECK (away_team != home_team)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_betting_away_team ON betting_lines (away_team);
CREATE INDEX IF NOT EXISTS idx_betting_home_team ON betting_lines (home_team);
CREATE INDEX IF NOT EXISTS idx_betting_game_date ON betting_lines (game_date);
CREATE INDEX IF NOT EXISTS idx_betting_scraped_at ON betting_lines (scraped_at DESC);

-- =====================================================
-- SCRAPER METADATA TABLE (Optional - for tracking scraper performance)
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scrape_type VARCHAR(50) NOT NULL, -- 'team_offense', 'team_defense', 'injuries', 'betting_lines'
    records_scraped INTEGER DEFAULT 0,
    scrape_duration_ms INTEGER, -- How long the scrape took
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_scrape_type CHECK (scrape_type IN ('team_offense', 'team_defense', 'injuries', 'betting_lines')),
    CONSTRAINT valid_records_count CHECK (records_scraped >= 0)
);

-- Create index for performance tracking
CREATE INDEX IF NOT EXISTS idx_scraper_metadata_type ON scraper_metadata (scrape_type);
CREATE INDEX IF NOT EXISTS idx_scraper_metadata_date ON scraper_metadata (scraped_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE team_stats_offense ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats_defense ENABLE ROW LEVEL SECURITY;
ALTER TABLE injury_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_metadata ENABLE ROW LEVEL SECURITY;

-- Allow public read access to scraped data (since it's public ESPN data)
CREATE POLICY "Public read access for team offense stats" ON team_stats_offense
    FOR SELECT USING (true);

CREATE POLICY "Public read access for team defense stats" ON team_stats_defense
    FOR SELECT USING (true);

CREATE POLICY "Public read access for injury reports" ON injury_reports
    FOR SELECT USING (true);

CREATE POLICY "Public read access for betting lines" ON betting_lines
    FOR SELECT USING (true);

CREATE POLICY "Public read access for scraper metadata" ON scraper_metadata
    FOR SELECT USING (true);

-- Allow inserts/updates from the extension (authenticated users only)
-- Note: You may want to restrict this to admin users only for production
CREATE POLICY "Allow authenticated inserts for team offense" ON team_stats_offense
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for team defense" ON team_stats_defense
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for injuries" ON injury_reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for betting lines" ON betting_lines
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for scraper metadata" ON scraper_metadata
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow updates for data correction (authenticated users only)
CREATE POLICY "Allow authenticated updates for team offense" ON team_stats_offense
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for team defense" ON team_stats_defense
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for injuries" ON injury_reports
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for betting lines" ON betting_lines
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- HELPFUL VIEWS FOR DATA ANALYSIS
-- =====================================================

-- View for latest team stats (combines offense and defense)
CREATE OR REPLACE VIEW latest_team_stats AS
SELECT 
    COALESCE(o.team, d.team) AS team,
    o.points_per_game,
    o.yards_per_game,
    o.passing_yards_per_game,
    o.rushing_yards_per_game,
    o.turnovers_per_game,
    d.points_allowed_per_game,
    d.yards_allowed_per_game,
    d.passing_yards_allowed,
    d.rushing_yards_allowed,
    d.forced_turnovers_per_game,
    GREATEST(o.scraped_at, d.scraped_at) AS last_updated
FROM (
    SELECT DISTINCT ON (team) *
    FROM team_stats_offense
    ORDER BY team, scraped_at DESC
) o
FULL OUTER JOIN (
    SELECT DISTINCT ON (team) *
    FROM team_stats_defense
    ORDER BY team, scraped_at DESC
) d ON o.team = d.team;

-- View for current injury reports (latest per player)
CREATE OR REPLACE VIEW current_injuries AS
SELECT DISTINCT ON (team, player_name) *
FROM injury_reports
ORDER BY team, player_name, scraped_at DESC;

-- View for latest betting lines
CREATE OR REPLACE VIEW latest_betting_lines AS
SELECT DISTINCT ON (away_team, home_team) *
FROM betting_lines
ORDER BY away_team, home_team, scraped_at DESC;

-- =====================================================
-- FUNCTIONS FOR DATA CLEANUP
-- =====================================================

-- Function to clean up old scraped data (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_scraped_data()
RETURNS INTEGER AS $$
DECLARE
    rows_deleted INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up old team offense stats (keep last 30 days)
    DELETE FROM team_stats_offense 
    WHERE scraped_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old team defense stats
    DELETE FROM team_stats_defense 
    WHERE scraped_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old injury reports (keep last 14 days - more volatile)
    DELETE FROM injury_reports 
    WHERE scraped_at < NOW() - INTERVAL '14 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old betting lines (keep last 7 days - very volatile)
    DELETE FROM betting_lines 
    WHERE scraped_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old scraper metadata (keep last 90 days)
    DELETE FROM scraper_metadata 
    WHERE scraped_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EXAMPLE QUERIES FOR TESTING
-- =====================================================

/*
-- Test queries to verify your data after scraping:

-- Get latest team stats
SELECT * FROM latest_team_stats ORDER BY team;

-- Get current injuries by team
SELECT team, COUNT(*) as injury_count 
FROM current_injuries 
GROUP BY team 
ORDER BY injury_count DESC;

-- Get latest betting lines
SELECT away_team, home_team, spread, over_under 
FROM latest_betting_lines 
ORDER BY scraped_at DESC;

-- Check scraper performance
SELECT scrape_type, COUNT(*) as total_scrapes, 
       AVG(records_scraped) as avg_records,
       COUNT(*) FILTER (WHERE success = true) as successful_scrapes
FROM scraper_metadata 
WHERE scraped_at > NOW() - INTERVAL '24 hours'
GROUP BY scrape_type;
*/