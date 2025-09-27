-- Additional ESPN Scraper Database Tables for Supabase
-- Add these tables to support the expanded ESPN scraper functionality

-- Enable Row Level Security and UUID extension (if not already done)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SPECIAL TEAMS STATS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_stats_special (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team VARCHAR(50) NOT NULL,
    field_goal_pct DECIMAL(5,2) DEFAULT 0,
    extra_point_pct DECIMAL(5,2) DEFAULT 0,
    punt_avg DECIMAL(5,2) DEFAULT 0,
    return_avg DECIMAL(5,2) DEFAULT 0,
    scraped_from VARCHAR(50) DEFAULT 'espn_special_teams',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_team_special_scrape UNIQUE (team, scraped_at),
    CONSTRAINT valid_team_name_special CHECK (LENGTH(team) > 0),
    CONSTRAINT valid_fg_pct CHECK (field_goal_pct >= 0 AND field_goal_pct <= 100),
    CONSTRAINT valid_ep_pct CHECK (extra_point_pct >= 0 AND extra_point_pct <= 100)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_special_team ON team_stats_special (team);
CREATE INDEX IF NOT EXISTS idx_team_special_scraped_at ON team_stats_special (scraped_at DESC);

-- =====================================================
-- TURNOVERS STATS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_stats_turnovers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team VARCHAR(50) NOT NULL,
    turnovers_lost INTEGER DEFAULT 0,
    turnovers_gained INTEGER DEFAULT 0,
    turnover_differential INTEGER DEFAULT 0,
    scraped_from VARCHAR(50) DEFAULT 'espn_turnovers',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_team_turnovers_scrape UNIQUE (team, scraped_at),
    CONSTRAINT valid_team_name_turnovers CHECK (LENGTH(team) > 0),
    CONSTRAINT valid_turnovers_lost CHECK (turnovers_lost >= 0),
    CONSTRAINT valid_turnovers_gained CHECK (turnovers_gained >= 0)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_turnovers_team ON team_stats_turnovers (team);
CREATE INDEX IF NOT EXISTS idx_team_turnovers_scraped_at ON team_stats_turnovers (scraped_at DESC);

-- =====================================================
-- GAME SCORES TABLE (Scoreboard)
-- =====================================================
CREATE TABLE IF NOT EXISTS game_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    away_team VARCHAR(50) NOT NULL,
    home_team VARCHAR(50) NOT NULL,
    away_score INTEGER,
    home_score INTEGER,
    game_status VARCHAR(20) DEFAULT 'final', -- 'final', 'in_progress', 'scheduled'
    week INTEGER,
    season INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    scraped_from VARCHAR(50) DEFAULT 'espn_scoreboard',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_game_score_scrape UNIQUE (away_team, home_team, scraped_at),
    CONSTRAINT valid_away_team_score CHECK (LENGTH(away_team) > 0),
    CONSTRAINT valid_home_team_score CHECK (LENGTH(home_team) > 0),
    CONSTRAINT different_teams_score CHECK (away_team != home_team),
    CONSTRAINT valid_scores CHECK (away_score >= 0 AND home_score >= 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_game_scores_away_team ON game_scores (away_team);
CREATE INDEX IF NOT EXISTS idx_game_scores_home_team ON game_scores (home_team);
CREATE INDEX IF NOT EXISTS idx_game_scores_week ON game_scores (week, season);
CREATE INDEX IF NOT EXISTS idx_game_scores_scraped_at ON game_scores (scraped_at DESC);

-- =====================================================
-- TEAM STANDINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_standings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team VARCHAR(50) NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    win_pct DECIMAL(5,3) DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    division VARCHAR(20),
    conference VARCHAR(10),
    season INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    scraped_from VARCHAR(50) DEFAULT 'espn_standings',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_team_standings_scrape UNIQUE (team, season, scraped_at),
    CONSTRAINT valid_team_name_standings CHECK (LENGTH(team) > 0),
    CONSTRAINT valid_wins CHECK (wins >= 0),
    CONSTRAINT valid_losses CHECK (losses >= 0),
    CONSTRAINT valid_ties CHECK (ties >= 0),
    CONSTRAINT valid_win_pct CHECK (win_pct >= 0 AND win_pct <= 1)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_standings_team ON team_standings (team);
CREATE INDEX IF NOT EXISTS idx_team_standings_season ON team_standings (season);
CREATE INDEX IF NOT EXISTS idx_team_standings_conference ON team_standings (conference);
CREATE INDEX IF NOT EXISTS idx_team_standings_scraped_at ON team_standings (scraped_at DESC);

-- =====================================================
-- QB RATINGS TABLE (QBR)
-- =====================================================
CREATE TABLE IF NOT EXISTS qb_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    team VARCHAR(50),
    qbr_rating DECIMAL(5,2) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    position VARCHAR(10) DEFAULT 'QB',
    season INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    scraped_from VARCHAR(50) DEFAULT 'espn_qbr',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_qb_rating_scrape UNIQUE (player_name, team, scraped_at),
    CONSTRAINT valid_player_name_qbr CHECK (LENGTH(player_name) > 0),
    CONSTRAINT valid_qbr_rating CHECK (qbr_rating >= 0 AND qbr_rating <= 100),
    CONSTRAINT valid_games_played CHECK (games_played >= 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_qb_ratings_player ON qb_ratings (player_name);
CREATE INDEX IF NOT EXISTS idx_qb_ratings_team ON qb_ratings (team);
CREATE INDEX IF NOT EXISTS idx_qb_ratings_rating ON qb_ratings (qbr_rating DESC);
CREATE INDEX IF NOT EXISTS idx_qb_ratings_scraped_at ON qb_ratings (scraped_at DESC);

-- =====================================================
-- POWER INDEX TABLE (FPI)
-- =====================================================
CREATE TABLE IF NOT EXISTS power_index (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team VARCHAR(50) NOT NULL,
    fpi_rating DECIMAL(6,2) DEFAULT 0,
    offensive_fpi DECIMAL(6,2) DEFAULT 0,
    defensive_fpi DECIMAL(6,2) DEFAULT 0,
    special_teams_fpi DECIMAL(6,2) DEFAULT 0,
    season INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    scraped_from VARCHAR(50) DEFAULT 'espn_fpi',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_team_fpi_scrape UNIQUE (team, season, scraped_at),
    CONSTRAINT valid_team_name_fpi CHECK (LENGTH(team) > 0)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_power_index_team ON power_index (team);
CREATE INDEX IF NOT EXISTS idx_power_index_rating ON power_index (fpi_rating DESC);
CREATE INDEX IF NOT EXISTS idx_power_index_season ON power_index (season);
CREATE INDEX IF NOT EXISTS idx_power_index_scraped_at ON power_index (scraped_at DESC);

-- =====================================================
-- POWER RANKINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS power_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team VARCHAR(50) NOT NULL,
    power_ranking INTEGER NOT NULL,
    week INTEGER,
    season INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    ranking_notes TEXT,
    scraped_from VARCHAR(50) DEFAULT 'espn_power_rankings',
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_team_power_ranking_scrape UNIQUE (team, week, season, scraped_at),
    CONSTRAINT valid_team_name_power CHECK (LENGTH(team) > 0),
    CONSTRAINT valid_power_ranking CHECK (power_ranking >= 1 AND power_ranking <= 32)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_power_rankings_team ON power_rankings (team);
CREATE INDEX IF NOT EXISTS idx_power_rankings_ranking ON power_rankings (power_ranking);
CREATE INDEX IF NOT EXISTS idx_power_rankings_week ON power_rankings (week, season);
CREATE INDEX IF NOT EXISTS idx_power_rankings_scraped_at ON power_rankings (scraped_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE team_stats_special ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats_turnovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_rankings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to scraped data (since it's public ESPN data)
CREATE POLICY "Public read access for special teams stats" ON team_stats_special
    FOR SELECT USING (true);

CREATE POLICY "Public read access for turnovers stats" ON team_stats_turnovers
    FOR SELECT USING (true);

CREATE POLICY "Public read access for game scores" ON game_scores
    FOR SELECT USING (true);

CREATE POLICY "Public read access for team standings" ON team_standings
    FOR SELECT USING (true);

CREATE POLICY "Public read access for qb ratings" ON qb_ratings
    FOR SELECT USING (true);

CREATE POLICY "Public read access for power index" ON power_index
    FOR SELECT USING (true);

CREATE POLICY "Public read access for power rankings" ON power_rankings
    FOR SELECT USING (true);

-- Allow inserts/updates from the extension (authenticated users only)
CREATE POLICY "Allow authenticated inserts for special teams" ON team_stats_special
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for turnovers" ON team_stats_turnovers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for game scores" ON game_scores
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for standings" ON team_standings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for qb ratings" ON qb_ratings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for power index" ON power_index
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts for power rankings" ON power_rankings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow updates for data correction (authenticated users only)
CREATE POLICY "Allow authenticated updates for special teams" ON team_stats_special
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for turnovers" ON team_stats_turnovers
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for game scores" ON game_scores
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for standings" ON team_standings
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for qb ratings" ON qb_ratings
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for power index" ON power_index
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates for power rankings" ON power_rankings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- HELPFUL VIEWS FOR COMPREHENSIVE DATA ANALYSIS
-- =====================================================

-- View for latest comprehensive team stats (combines all team-level data)
CREATE OR REPLACE VIEW latest_comprehensive_team_stats AS
SELECT 
    COALESCE(o.team, d.team, s.team, t.team) AS team,
    -- Offense
    o.points_per_game,
    o.yards_per_game,
    o.passing_yards_per_game,
    o.rushing_yards_per_game,
    o.turnovers_per_game,
    -- Defense
    d.points_allowed_per_game,
    d.yards_allowed_per_game,
    d.passing_yards_allowed,
    d.rushing_yards_allowed,
    d.forced_turnovers_per_game,
    -- Special Teams
    s.field_goal_pct,
    s.extra_point_pct,
    s.punt_avg,
    s.return_avg,
    -- Turnovers
    t.turnovers_lost,
    t.turnovers_gained,
    t.turnover_differential,
    -- Latest update timestamp
    GREATEST(
        COALESCE(o.scraped_at, '1970-01-01'::timestamptz), 
        COALESCE(d.scraped_at, '1970-01-01'::timestamptz),
        COALESCE(s.scraped_at, '1970-01-01'::timestamptz),
        COALESCE(t.scraped_at, '1970-01-01'::timestamptz)
    ) AS last_updated
FROM (
    SELECT DISTINCT ON (team) *
    FROM team_stats_offense
    ORDER BY team, scraped_at DESC
) o
FULL OUTER JOIN (
    SELECT DISTINCT ON (team) *
    FROM team_stats_defense
    ORDER BY team, scraped_at DESC
) d ON o.team = d.team
FULL OUTER JOIN (
    SELECT DISTINCT ON (team) *
    FROM team_stats_special
    ORDER BY team, scraped_at DESC  
) s ON COALESCE(o.team, d.team) = s.team
FULL OUTER JOIN (
    SELECT DISTINCT ON (team) *
    FROM team_stats_turnovers
    ORDER BY team, scraped_at DESC
) t ON COALESCE(o.team, d.team, s.team) = t.team;

-- View for current season standings with rankings
CREATE OR REPLACE VIEW current_season_standings AS
SELECT DISTINCT ON (team) 
    team,
    wins,
    losses,
    ties,
    win_pct,
    points_for,
    points_against,
    (points_for - points_against) AS point_differential,
    division,
    conference,
    season,
    scraped_at
FROM team_standings
WHERE season = EXTRACT(YEAR FROM NOW())
ORDER BY team, scraped_at DESC;

-- View for latest power metrics (FPI + Power Rankings)
CREATE OR REPLACE VIEW latest_power_metrics AS
SELECT 
    COALESCE(f.team, pr.team) AS team,
    f.fpi_rating,
    f.offensive_fpi,
    f.defensive_fpi,
    f.special_teams_fpi,
    pr.power_ranking,
    pr.week AS ranking_week,
    GREATEST(
        COALESCE(f.scraped_at, '1970-01-01'::timestamptz),
        COALESCE(pr.scraped_at, '1970-01-01'::timestamptz)
    ) AS last_updated
FROM (
    SELECT DISTINCT ON (team) *
    FROM power_index
    ORDER BY team, scraped_at DESC
) f
FULL OUTER JOIN (
    SELECT DISTINCT ON (team) *
    FROM power_rankings
    ORDER BY team, scraped_at DESC
) pr ON f.team = pr.team;

-- View for top QBs by rating
CREATE OR REPLACE VIEW top_quarterbacks AS
SELECT DISTINCT ON (player_name, team) 
    player_name,
    team,
    qbr_rating,
    games_played,
    season,
    scraped_at
FROM qb_ratings
WHERE season = EXTRACT(YEAR FROM NOW())
ORDER BY player_name, team, scraped_at DESC;

-- =====================================================
-- UPDATED CLEANUP FUNCTION FOR ALL TABLES
-- =====================================================

-- Function to clean up old scraped data (updated to include all tables)
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
    
    -- Clean up old special teams stats
    DELETE FROM team_stats_special 
    WHERE scraped_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old turnovers stats
    DELETE FROM team_stats_turnovers 
    WHERE scraped_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old game scores (keep last 14 days)
    DELETE FROM game_scores 
    WHERE scraped_at < NOW() - INTERVAL '14 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old standings (keep last 7 days - updated frequently)
    DELETE FROM team_standings 
    WHERE scraped_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old QBR data (keep last 30 days)
    DELETE FROM qb_ratings 
    WHERE scraped_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old FPI data (keep last 30 days)
    DELETE FROM power_index 
    WHERE scraped_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    rows_deleted := rows_deleted + temp_count;
    
    -- Clean up old power rankings (keep last 60 days - weekly updates)
    DELETE FROM power_rankings 
    WHERE scraped_at < NOW() - INTERVAL '60 days';
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