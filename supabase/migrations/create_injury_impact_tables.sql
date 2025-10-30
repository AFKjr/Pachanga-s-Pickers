-- ============================================================================
-- INJURY IMPACT ANALYSIS SYSTEM TABLES
-- ============================================================================
-- This migration creates tables to store player injury data and calculated
-- injury impacts for NFL teams. Supports real-time injury tracking and
-- betting line adjustments based on player availability.
--
-- TABLES CREATED:
-- - player_injuries: Individual player injury reports
-- - team_injury_impact: Calculated injury impact summaries per team
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- PLAYER INJURIES TABLE
-- ============================================================================
-- Stores individual player injury reports with practice status and game status
-- Used for real-time injury tracking and impact calculations

CREATE TABLE IF NOT EXISTS player_injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Player identification
    player_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    position TEXT NOT NULL,

    -- Injury details
    injury_description TEXT,
    practice_participation TEXT, -- 'Full Participation', 'Limited Participation', 'Did Not Participate'
    game_status TEXT, -- 'Out', 'Doubtful', 'Questionable', 'Probable', 'Healthy'

    -- Player quality assessment
    player_tier TEXT NOT NULL CHECK (player_tier IN ('ELITE', 'ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE', 'POOR')),
    backup_tier TEXT NOT NULL CHECK (backup_tier IN ('ELITE', 'ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE', 'POOR')),

    -- Special designations
    is_green_dot_defender BOOLEAN DEFAULT FALSE, -- Defensive play caller
    is_starter BOOLEAN DEFAULT TRUE,

    -- Game context
    game_date DATE,
    opponent_team TEXT,
    week_number INTEGER,

    -- Metadata
    source TEXT DEFAULT 'ESPN', -- Data source (ESPN, NFL.com, etc.)
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0 confidence in data

    -- Unique constraint to prevent duplicate entries
    UNIQUE(player_name, team_name, game_date)
);

-- ============================================================================
-- TEAM INJURY IMPACT TABLE
-- ============================================================================
-- Stores calculated injury impact summaries for teams
-- Used for betting line adjustments and prediction modifications

CREATE TABLE IF NOT EXISTS team_injury_impact (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Team and game identification
    team_name TEXT NOT NULL,
    game_date DATE NOT NULL,
    opponent_team TEXT NOT NULL,
    week_number INTEGER NOT NULL,

    -- Injury impact calculations
    total_impact_points DECIMAL(5,2) DEFAULT 0.0, -- Total betting line adjustment
    base_impact DECIMAL(5,2) DEFAULT 0.0, -- Individual player impacts
    cluster_adjustment DECIMAL(5,2) DEFAULT 0.0, -- Cluster injury effects

    -- Position group impacts
    offensive_line_impact DECIMAL(5,2) DEFAULT 0.0,
    secondary_impact DECIMAL(5,2) DEFAULT 0.0,
    wide_receiver_impact DECIMAL(5,2) DEFAULT 0.0,
    linebacker_impact DECIMAL(5,2) DEFAULT 0.0,
    defensive_line_impact DECIMAL(5,2) DEFAULT 0.0,

    -- Injury counts by severity
    out_count INTEGER DEFAULT 0,
    doubtful_count INTEGER DEFAULT 0,
    questionable_count INTEGER DEFAULT 0,
    probable_count INTEGER DEFAULT 0,

    -- Detailed impact breakdown (JSONB for flexibility)
    individual_impacts JSONB DEFAULT '[]'::jsonb, -- Array of player impact objects
    cluster_multipliers JSONB DEFAULT '{}'::jsonb, -- Position group cluster effects

    -- Metadata
    calculation_version TEXT DEFAULT '1.0',
    data_source TEXT DEFAULT 'ESPN',
    confidence_score DECIMAL(3,2) DEFAULT 1.0,

    -- Unique constraint
    UNIQUE(team_name, game_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Player injuries indexes
CREATE INDEX IF NOT EXISTS idx_player_injuries_team_date ON player_injuries(team_name, game_date);
CREATE INDEX IF NOT EXISTS idx_player_injuries_player ON player_injuries(player_name);
CREATE INDEX IF NOT EXISTS idx_player_injuries_week ON player_injuries(week_number);
CREATE INDEX IF NOT EXISTS idx_player_injuries_status ON player_injuries(game_status);

-- Team injury impact indexes
CREATE INDEX IF NOT EXISTS idx_team_injury_impact_team_date ON team_injury_impact(team_name, game_date);
CREATE INDEX IF NOT EXISTS idx_team_injury_impact_week ON team_injury_impact(week_number);
CREATE INDEX IF NOT EXISTS idx_team_injury_impact_impact ON team_injury_impact(total_impact_points);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE player_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_injury_impact ENABLE ROW LEVEL SECURITY;

-- Policies for player_injuries
CREATE POLICY "Allow authenticated users to read player injuries" ON player_injuries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin users to manage player injuries" ON player_injuries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Policies for team_injury_impact
CREATE POLICY "Allow authenticated users to read team injury impact" ON team_injury_impact
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin users to manage team injury impact" ON team_injury_impact
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_player_injuries_updated_at
    BEFORE UPDATE ON player_injuries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_injury_impact_updated_at
    BEFORE UPDATE ON team_injury_impact
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA SEEDING (OPTIONAL)
-- ============================================================================
-- This section can be used to seed initial injury data if needed
-- For now, we'll rely on admin imports via the UI

-- Commit transaction
COMMIT;