# Week Tracking Implementation - Quick Start

## ✅ What Was Done

1. **CSV Files Updated** - Added metadata headers to Week 6 files:
   - `2025/Weekly Stats Offense/week 6 offense.csv`
   - `2025/Weekly Stats Defense/week 6 defense.csv`
   
2. **Database Schema Updated** - Created migration SQL:
   - `supabase/add-week-to-team-stats.sql`
   - Adds `week` and `season_year` columns
   - Changes primary key to `(team_name, week, season_year)`

3. **CSV Parser Enhanced**:
   - Extracts week from metadata headers (`# Week: 6`)
   - Falls back to filename extraction (`week 6 offense.csv`)
   - Displays detected week in UI before import

4. **Import Function Updated**:
   - Saves week and season with each team stat entry
   - Uses new composite primary key for upserts
   - Allows multiple weeks to coexist in database

## 🚀 Next Steps (You Need To Do)

### Step 1: Run Database Migration
Go to **Supabase SQL Editor** and run:
```sql
-- File: supabase/add-week-to-team-stats.sql
-- This adds week tracking to team_stats_cache table
```

Copy and paste the entire contents of `supabase/add-week-to-team-stats.sql` into the SQL editor and execute.

### Step 2: Re-Import Week 6 Stats
1. Go to **Admin Panel** → **Team Stats** → **CSV Import**
2. Upload `week 6 offense.csv` and `week 6 defense.csv`
3. You should see: **"📅 Detected: Week 6, Season 2025"**
4. Click **"Parse & Merge Stats"**
5. Click **"Import to Database"**

### Step 3: Verify Data
Run this query in Supabase:
```sql
SELECT team_name, week, season_year, points_per_game, offensive_yards_per_game
FROM team_stats_cache
WHERE week = 6 AND season_year = 2025
ORDER BY team_name;
```

You should see 32 teams with Week 6 stats.

### Step 4: Check Admin Panel
Go to **Admin Panel** → **Manage Picks**

The week dropdown should now show the correct weeks (1-18, not 59, 58, etc.)

## 📁 CSV File Format (For Future Weeks)

When you get Week 7, 8, etc. stats, format them like this:

```csv
# NFL Week 7 Offensive Stats
# Week: 7
# Season: 2025
# Date Range: 2025-10-16 to 2025-10-20
# Source: ESPN/NFL
,,,,,Tot Yds & TO,Tot Yds & TO,Tot Yds & TO,,,Passing,Passing...
Rk,Tm,G,PF,Yds,Ply,Y/P,TO,FL,1stD,Cmp,Att,Yds,TD,Int,NY/A...
[data rows...]
```

**Key Requirements**:
- Lines starting with `#` are metadata
- Must include `# Week: X` line
- Must include `# Season: YYYY` line
- Data rows come after metadata

## 🔍 What This Fixes

**Before**: Database only stored cumulative season stats
- Couldn't track week-by-week changes
- Importing new week overwrote old data
- No historical analysis possible

**After**: Database stores weekly snapshots
- ✅ Each week is a separate record
- ✅ Can compare team performance across weeks
- ✅ Can generate predictions using specific week data
- ✅ Historical analysis enabled

## 📊 How It Works

### Storage Example
```
team_stats_cache table:
┌──────────┬──────┬────────────┬─────────────┬─────────────┐
│ team     │ week │ season_year│ points_pg   │ yards_pg    │
├──────────┼──────┼────────────┼─────────────┼─────────────┤
│ Detroit  │  1   │   2025     │    28.5     │    385.2    │
│ Detroit  │  2   │   2025     │    31.2     │    402.8    │
│ Detroit  │  3   │   2025     │    29.8     │    391.5    │
│ Detroit  │  4   │   2025     │    32.1     │    410.3    │
│ Detroit  │  5   │   2025     │    33.8     │    425.7    │
│ Detroit  │  6   │   2025     │    34.8     │    365.0    │
└──────────┴──────┴────────────┴─────────────┴─────────────┘
```

Each row = stats through that week (cumulative averages)

### Query for Latest Week
```sql
-- Get most recent week stats for predictions
SELECT * FROM team_stats_cache
WHERE season_year = 2025
  AND week = (SELECT MAX(week) FROM team_stats_cache WHERE season_year = 2025)
ORDER BY team_name;
```

## 📚 Documentation

- **Full Guide**: `CSV_WEEK_TRACKING.md`
- **Week Fix**: `WEEK_CALCULATION_FIX.md`
- **SQL Migration**: `supabase/add-week-to-team-stats.sql`

## ❓ Troubleshooting

**Q: Week not detected from CSV?**
A: Check that metadata lines start with `#` and have no extra spaces

**Q: Import fails with "constraint violation"?**
A: Run the migration SQL first to update the database schema

**Q: Old weeks still showing wrong numbers?**
A: Run the cleanup SQL from `WEEK_CALCULATION_FIX.md` to remove invalid picks

**Q: Can't see Week 6 in dropdown?**
A: Make sure you have picks with proper game_dates in Oct 9-13, 2025 range

## ✨ Summary

You now have a complete week tracking system for team stats! After running the migration and re-importing Week 6, your system will properly store and track weekly stat snapshots for better predictions and historical analysis.
