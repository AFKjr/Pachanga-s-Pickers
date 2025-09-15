# NFL Schedule Integration Setup

This document explains how to set up the ESPN API integration for fetching NFL game schedules.

## Database Setup

### 1. Create the game_schedules table

Run the following SQL in your Supabase SQL editor:

```sql
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
```

### 2. Alternative: Use the migration file

If you have Supabase CLI set up, you can run the migration file:

```bash
supabase db push
```

The migration file is located at: `supabase_migrations/create_game_schedules.sql`

## How It Works

### Hybrid Approach

The system implements a **hybrid approach** for fetching game schedules:

1. **Automatic Loading**: On app startup, the system attempts to load cached schedules from the database
2. **Fresh Data**: If no cached data exists or it's older than 1 hour, it fetches fresh data from ESPN
3. **Manual Refresh**: Users can manually refresh schedules using the "Generate Schedules" button

### ESPN API Integration

- **Source**: Uses ESPN's public API endpoints
- **Data**: Fetches current week NFL games with teams, dates, venues, and weather
- **Caching**: Stores schedules in Supabase for 1-hour cache validity
- **Error Handling**: Graceful fallbacks if API is unavailable

### Features

- ✅ **Automatic schedule loading** on app startup
- ✅ **Manual schedule refresh** via "Generate Schedules" button
- ✅ **Database caching** to reduce API calls
- ✅ **Weather data integration** for game conditions
- ✅ **Real-time game selection** from fetched schedules
- ✅ **Error handling** with user-friendly messages

## Usage

### In the Admin Panel

1. **Automatic**: Games load automatically when you open the admin panel
2. **Manual Refresh**: Click "Generate Schedules" to fetch the latest games
3. **Game Selection**: Choose from the dropdown of available games
4. **Generate Predictions**: Click "Generate Prediction" to analyze the selected game

### API Endpoints Used

- `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/weeks/{week}/events`
- Fetches detailed game information including teams, venues, and weather

## Data Structure

### ESPNGame Interface
```typescript
interface ESPNGame {
  id: string;
  name: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  location: string;
  weather?: {
    temperature: number;
    condition: string;
    windSpeed: number;
  };
}
```

### Database Schema
- `week`: NFL week number
- `season`: NFL season year
- `games`: JSON array of game objects
- `last_updated`: Timestamp of last API fetch

## Troubleshooting

### No Games Loading
- Check your internet connection
- Verify ESPN API is accessible
- Check browser console for error messages

### Database Errors
- Ensure the `game_schedules` table exists
- Verify RLS policies are set up correctly
- Check Supabase connection

### API Rate Limits
- The system caches data for 1 hour to minimize API calls
- Manual refresh is available if needed

## Future Enhancements

- [ ] Add odds integration from ESPN
- [ ] Implement schedule notifications
- [ ] Add game status updates (live scores)
- [ ] Support for multiple weeks/seasons
- [ ] Add team logos and additional metadata