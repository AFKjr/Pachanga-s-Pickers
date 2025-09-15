-- Create game_schedules table for storing NFL game schedules
CREATE TABLE IF NOT EXISTS game_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week INTEGER NOT NULL,
  season INTEGER NOT NULL,
  games JSONB NOT NULL, -- Array of game objects
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week, season)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE game_schedules ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users
CREATE POLICY "Allow read access for authenticated users" ON game_schedules
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow insert/update for authenticated users (for admin functionality)
CREATE POLICY "Allow write access for authenticated users" ON game_schedules
  FOR ALL USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_schedules_week_season ON game_schedules(week, season);
CREATE INDEX IF NOT EXISTS idx_game_schedules_last_updated ON game_schedules(last_updated DESC);