# CSV Import with Week Tracking - Implementation Guide

## Overview
The CSV import system now tracks NFL weeks and seasons, allowing you to store weekly snapshots of team statistics rather than just cumulative season stats.

## Database Changes

### New Schema
The `team_stats_cache` table now includes:
- `week` (INTEGER): NFL week number (1-18)
- `season_year` (INTEGER): NFL season year (e.g., 2025)
- **Composite Primary Key**: `(team_name, week, season_year)`

This allows storing separate stat entries for each team, each week, each season.

### Migration SQL
Run `supabase/add-week-to-team-stats.sql` in your Supabase SQL Editor to apply the changes.

## CSV File Format

### Required Metadata Headers
Add these lines at the top of your CSV files:

```csv
# NFL Week 6 Offensive Stats
# Week: 6
# Season: 2025
# Date Range: 2025-10-09 to 2025-10-13
# Source: ESPN/NFL
```

### Metadata Fields
- **Week**: NFL week number (1-18)
- **Season**: Season year (4 digits)
- **Date Range**: Optional, for reference
- **Source**: Optional, data source identifier

### Example Structure
```csv
# NFL Week 6 Offensive Stats
# Week: 6
# Season: 2025
# Date Range: 2025-10-09 to 2025-10-13
# Source: ESPN/NFL
,,,,,Tot Yds & TO,Tot Yds & TO,Tot Yds & TO,,,Passing,Passing...
Rk,Tm,G,PF,Yds,Ply,Y/P,TO,FL,1stD,Cmp,Att,Yds,TD,Int,NY/A...
1,Detroit Lions,5,174,1825,306,6.0,3,1,104,110,146,1151,13...
2,Indianapolis Colts,5,163,1906,303,6.3,3,1,116,108,153...
```

## How It Works

### 1. Week Detection
The CSV parser automatically extracts week information from:

**Priority 1: Metadata Lines**
```csv
# Week: 6
# Season: 2025
```
Parser searches for lines starting with `#` and extracts week/season numbers.

**Priority 2: Filename**
```
week 6 offense.csv  → Week 6
week_10_defense.csv → Week 10
```
Parser uses regex to extract week number from filename.

**Fallback: Default**
If neither method works, defaults to Week 1, Season 2025.

### 2. Data Storage
When importing:
```typescript
{
  team_name: 'Detroit',
  week: 6,
  season_year: 2025,
  games_played: 5,
  points_per_game: 34.8,
  // ... other stats
}
```

### 3. Upsert Logic
The system uses `onConflict: 'team_name,week,season_year'` to:
- **Update** existing stats if team/week/season combo exists
- **Insert** new record if it's a new combination

This allows you to:
- Re-import a week to update stats
- Import different weeks without overwriting
- Track stats progression week by week

## UI Features

### Week Detection Display
When CSV files are loaded, the UI shows:
```
📅 Detected: Week 6, Season 2025
```

This confirms the parser correctly identified the week before importing.

### Import Confirmation
Success message includes week information:
```
✅ Successfully imported 32 teams for Week 6, Season 2025
```

## Use Cases

### 1. Weekly Stat Updates
Import new stats each week:
```
Week 1: Import week 1 offense.csv + week 1 defense.csv
Week 2: Import week 2 offense.csv + week 2 defense.csv
...
Week 6: Import week 6 offense.csv + week 6 defense.csv
```

Each import creates separate database records.

### 2. Historical Analysis
Query stats for specific weeks:
```sql
-- Get Week 6 stats
SELECT * FROM team_stats_cache 
WHERE week = 6 AND season_year = 2025;

-- Compare team performance across weeks
SELECT week, points_per_game, offensive_yards_per_game
FROM team_stats_cache
WHERE team_name = 'Detroit' AND season_year = 2025
ORDER BY week;
```

### 3. Prediction Generation
API can fetch stats for specific weeks:
```typescript
// Get most recent week stats for predictions
const { data } = await supabase
  .from('team_stats_cache')
  .select('*')
  .eq('season_year', 2025)
  .order('week', { ascending: false })
  .limit(32); // One record per team for latest week
```

## File Organization

### Recommended Structure
```
2025/
  Weekly Stats Offense/
    week 1 offense.csv
    week 2 offense.csv
    week 3 offense.csv
    week 4 offense.csv
    week 5 offense.csv
    week 6 offense.csv  ← Current
  Weekly Stats Defense/
    week 1 defense.csv
    week 2 defense.csv
    week 3 defense.csv
    week 4 defense.csv
    week 5 defense.csv
    week 6 defense.csv  ← Current
```

### Naming Convention
- **Format**: `week {number} {type}.csv`
- **Type**: `offense` or `defense`
- **Example**: `week 6 offense.csv`, `week 10 defense.csv`

## Database Queries

### Get Current Week Stats
```sql
SELECT * FROM team_stats_cache
WHERE week = (
  SELECT MAX(week) 
  FROM team_stats_cache 
  WHERE season_year = 2025
)
AND season_year = 2025;
```

### Get Team Stats by Week
```sql
SELECT 
  week,
  points_per_game,
  offensive_yards_per_game,
  defensive_yards_allowed,
  turnover_differential
FROM team_stats_cache
WHERE team_name = 'Detroit'
  AND season_year = 2025
ORDER BY week;
```

### Delete Specific Week (if needed)
```sql
DELETE FROM team_stats_cache
WHERE week = 6 AND season_year = 2025;
```

## Troubleshooting

### Week Not Detected
**Problem**: UI shows "Week 1" when it should be Week 6

**Solutions**:
1. Check CSV has metadata headers at top
2. Verify filename includes "week X" pattern
3. Check for typos in metadata (e.g., "Weak:" instead of "Week:")

### Import Fails
**Problem**: Error when importing CSV

**Solutions**:
1. Run `add-week-to-team-stats.sql` migration first
2. Check database has composite primary key
3. Verify week number is 1-18

### Duplicate Data
**Problem**: Same team appears multiple times for same week

**Cause**: Old data before migration

**Solution**:
```sql
-- Find duplicates
SELECT team_name, week, season_year, COUNT(*)
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1;

-- Keep only latest by last_updated
DELETE FROM team_stats_cache a
USING team_stats_cache b
WHERE a.team_name = b.team_name
  AND a.week = b.week
  AND a.season_year = b.season_year
  AND a.last_updated < b.last_updated;
```

## Migration Checklist

- [x] Create SQL migration file
- [x] Add metadata headers to CSV files
- [x] Update CSV parser to extract week
- [x] Modify import function to save week/season
- [x] Add UI display for detected week
- [ ] Run SQL migration in Supabase
- [ ] Re-import Week 6 stats with new format
- [ ] Verify data in database
- [ ] Update API to use week-specific stats

## Next Steps

1. **Run Migration**: Execute `add-week-to-team-stats.sql` in Supabase
2. **Re-import**: Import your Week 6 CSV files again
3. **Verify**: Check the database has week=6, season_year=2025
4. **Test**: Generate predictions and verify they use Week 6 stats
5. **Monitor**: Check Admin Panel → Manage Picks shows correct weeks

## Future Enhancements

- [ ] Add week selector in Admin Panel to view specific week stats
- [ ] Show week-over-week stat changes
- [ ] Add trend analysis (improving/declining teams)
- [ ] Export stats for specific weeks
- [ ] Bulk import multiple weeks at once
