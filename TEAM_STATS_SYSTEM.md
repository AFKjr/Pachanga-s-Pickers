# Team Stats Management System

## Overview
Added comprehensive team statistics management system for NFL teams, allowing admins to view, edit, and bulk refresh team stats from ESPN API. These stats are used in Monte Carlo simulations for game predictions.

## Files Created

### 1. `api/refresh-team-stats.ts`
**Purpose**: Vercel serverless function to bulk refresh team stats from ESPN API

**Features**:
- Fetches stats for all 32 NFL teams from ESPN API
- Team ID mapping for ESPN endpoints
- Sequential processing to avoid rate limiting (500ms delay between teams)
- Admin authentication required
- Saves to `team_stats_cache` Supabase table
- Returns detailed success/failure report

**Stats Retrieved**:
- Offensive Yards Per Game
- Defensive Yards Allowed
- Points Per Game
- Points Allowed Per Game
- Turnover Differential
- 3rd Down Conversion Rate
- Red Zone Efficiency

**ESPN API Endpoint**:
```
https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}/statistics
```

**Response Format**:
```json
{
  "success": true,
  "updated": 32,
  "failed": 0,
  "failedTeams": [],
  "message": "Refreshed 32 teams from ESPN API. 0 teams failed."
}
```

### 2. `src/components/AdminTeamStats.tsx`
**Purpose**: Admin component for viewing and managing team statistics

**Features**:
- **Table Display**: Shows all 32 teams with their stats
- **Color-Coded Sources**:
  - 🟢 ESPN (green) - Real-time from ESPN API
  - 🔵 Manual (blue) - Manually entered by admin
  - 🟡 Historical (yellow) - Historical season data
  - 🔴 Default (red) - League averages (unreliable)
- **Bulk Refresh**: Button to refresh all teams from ESPN
- **Inline Editing**: Click edit button to modify any team's stats
- **Real-time Updates**: Auto-reloads after bulk refresh
- **Source Tracking**: Automatically marks manually edited teams as "manual"

**Database Table**: `team_stats_cache`
```sql
CREATE TABLE team_stats_cache (
  team_name TEXT PRIMARY KEY,
  offensive_yards_per_game NUMERIC,
  defensive_yards_allowed NUMERIC,
  points_per_game NUMERIC,
  points_allowed_per_game NUMERIC,
  turnover_differential NUMERIC,
  third_down_conversion_rate NUMERIC,
  red_zone_efficiency NUMERIC,
  source TEXT, -- 'espn', 'manual', 'default', 'historical'
  last_updated TIMESTAMPTZ
);
```

### 3. `src/pages/admin/TeamStatsPage.tsx`
**Purpose**: Admin page wrapper with educational content

**Features**:
- Wraps `AdminTeamStats` component
- **Educational Section**: Explains how stats impact predictions
  - Monte Carlo simulation usage
  - Offensive/defensive strength calculations
  - Turnover differential impact
  - 3rd down and red zone importance
- **Warning Section**: Alerts about unreliable default stats

### 4. Updated `src/layouts/AdminLayout.tsx`
**Changes**:
- Added "Team Stats" navigation item with 📈 icon
- Route: `/admin/team-stats`
- Added icons to all navigation items for consistency
- Added home icon (🏠) to "Back to Site" link

### 5. Updated `src/App.tsx`
**Changes**:
- Added lazy-loaded `TeamStatsPage` import
- Added route: `/admin/team-stats` → `<TeamStatsPage />`
- Maintains existing admin layout structure

## Usage Flow

### For Admins:
1. Navigate to **Admin → Team Stats** (📈)
2. View current stats for all 32 teams with source indicators
3. **Bulk Refresh**:
   - Click "🔄 Refresh All from ESPN" button
   - Wait 15-20 seconds for all teams to update
   - Success message shows how many teams updated
4. **Manual Edit**:
   - Click "✏️ Edit" on any team
   - Modify any stat values
   - Click "✓ Save" (automatically marks as "manual" source)
   - Click "✕ Cancel" to discard changes

### For Predictions:
- `api/generate-predictions.ts` uses these stats in Monte Carlo simulations
- Stats influence:
  - **Offensive Strength** = f(points/game, yards/game, 3rd%, RZ%, TO diff)
  - **Defensive Strength** = f(points allowed, yards allowed, 3rd%, RZ%, TO diff)
  - **Scoring Probability** = Offensive / (Offensive + Defensive)

## Integration with Existing System

### Monte Carlo Simulation
The existing `generate-predictions.ts` function can be updated to fetch team stats from the cache:

```typescript
// Instead of getDefaultTeamStats():
async function getTeamStats(teamName: string): Promise<TeamStats> {
  const { data } = await supabase
    .from('team_stats_cache')
    .select('*')
    .eq('team_name', teamName)
    .single();
    
  if (data) {
    return {
      team: teamName,
      offensiveYardsPerGame: data.offensive_yards_per_game,
      defensiveYardsAllowed: data.defensive_yards_allowed,
      pointsPerGame: data.points_per_game,
      pointsAllowedPerGame: data.points_allowed_per_game,
      turnoverDifferential: data.turnover_differential,
      thirdDownConversionRate: data.third_down_conversion_rate,
      redZoneEfficiency: data.red_zone_efficiency
    };
  }
  
  // Fallback to defaults
  return getDefaultTeamStats(teamName);
}
```

## NFL Team ID Mapping
Complete mapping of all 32 teams to ESPN API IDs:
```typescript
const TEAM_ID_MAP = {
  'Arizona Cardinals': 22,
  'Atlanta Falcons': 1,
  'Baltimore Ravens': 33,
  'Buffalo Bills': 2,
  // ... (all 32 teams)
};
```

## Environment Variables
No new environment variables needed - uses existing:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Error Handling
- **API Failures**: Individual team failures don't stop bulk refresh
- **Timeout**: 8-second timeout per ESPN API call
- **Rate Limiting**: 500ms delay between teams
- **Authentication**: Verifies admin status before allowing operations
- **Validation**: Type checking on all numeric inputs

## Benefits
1. **Real Data**: Use actual team performance stats instead of league averages
2. **Accuracy**: More realistic Monte Carlo simulations
3. **Control**: Admins can override ESPN data if needed
4. **Transparency**: Clear source tracking shows data reliability
5. **Easy Maintenance**: One-click bulk refresh keeps data current

## Future Enhancements
- [ ] Schedule automatic weekly refreshes
- [ ] Add historical comparison (week-over-week changes)
- [ ] Team performance trends visualization
- [ ] Export stats to CSV
- [ ] Import stats from CSV
- [ ] API rate limit monitoring
