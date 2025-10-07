# CSV Import Fix for Week 6 Data

## Problem Identified
The CSV parser wasn't accepting your Week 6 data because the exported CSV files had each row wrapped in quotes as a single field:

```csv
"Rk,Tm,G,PF,Yds,Ply,Y/P,TO,FL,1stD..."  ← Entire row in quotes
"1,Detroit Lions,5,174,1825,306,6.0..."  ← Each data row also quoted
```

This is a common export format from Google Sheets or Excel when copying data.

## Solution Implemented ✅
Updated the CSV parser in `src/components/CSVImportStats.tsx` to automatically detect and remove the surrounding quotes from each line before processing. The parser now handles both formats:

- ✅ **Normal CSV**: `Rk,Tm,G,PF,Yds...`
- ✅ **Quoted CSV**: `"Rk,Tm,G,PF,Yds..."`

### Changes Made:
1. **Header line cleaning**: Detects if entire header is wrapped in quotes and removes them
2. **Data line cleaning**: Detects if entire data row is wrapped in quotes and removes them
3. **Conversions table cleaning**: Same fix applied to 3rd down/red zone data parsing

## How to Import Week 6 Data (Updated Steps)

### 1. Navigate to Admin Panel
- Go to your app → `/admin` route
- Scroll to the **"Import Extended Team Stats from CSV"** section

### 2. Upload Your CSV Files
You have two files ready:
- `NFL Season Stats 2025 - WEEK6 Offense Totals.csv`
- `NFL Season Stats 2025 - WEEK6 Defense Totals.csv`

**Upload Process:**
1. Click "Choose File" under **Offensive Stats CSV** → Select the Offense file
2. Click "Choose File" under **Defensive Stats CSV** → Select the Defense file
3. Click **"Parse & Merge Stats"** button

### 3. Review Parsed Data
The system will display a preview table showing:
- All 32 NFL teams
- Games played (should show 5 for Week 6)
- Offensive yards per game
- Defensive yards allowed
- Points for/against
- Turnover differential

**Example Expected Data:**
```
Detroit Lions:     G=5, Off Yds=365.0, Def Yds=298.8, PPG=34.8
Indianapolis:      G=5, Off Yds=381.2, Def Yds=315.0, PPG=32.6
Buffalo Bills:     G=5, Off Yds=395.8, Def Yds=299.6, PPG=30.6
```

### 4. Import to Database
- Review the preview to ensure data looks correct
- Click **"Import to Database"**
- Wait for success message: "Successfully imported 32 teams with extended stats!"

### 5. Verify Import
After import, the team stats are immediately available for predictions. The database stores:
- **40+ statistics per team**
- Offensive: Passing, rushing, total yards, TDs, turnovers
- Defensive: Yards allowed, TDs allowed, turnovers forced
- Efficiency: 3rd down %, red zone %, yards per play
- All stats as **per-game averages**

## Understanding the Data

### What Gets Imported (Full List)

**Basic Stats:**
- Games played (5 for Week 6)
- Offensive/defensive yards per game
- Points scored/allowed per game
- Turnover differential

**Offensive Breakdown:**
- Pass completions, attempts, completion %
- Passing yards, TDs, interceptions
- Yards per pass attempt
- Rushing attempts, yards, TDs
- Yards per rush
- Total plays, first downs
- Penalties and penalty yards

**Defensive Breakdown:**
- Pass completions/attempts allowed
- Passing yards/TDs allowed
- Interceptions made
- Rush attempts/yards/TDs allowed
- Total plays allowed
- Yards per play allowed
- First downs allowed

**Turnovers & Efficiency:**
- Turnovers forced/lost
- Fumbles forced/lost
- 3rd down conversion % (from conversions table)
- Red zone efficiency % (from conversions table)

## Data Source Notes

Your CSV files come from NFL Season Stats 2025 and include:
- **Through Week 5 games** (5 games played for most teams, 4 for some)
- All stats are cumulative season totals
- Parser automatically converts to **per-game averages** for predictions

**Important:** Some teams may have 4 games played (like Green Bay Packers) due to bye weeks or scheduling.

## Updating for Future Weeks

### Week 7 and Beyond:

1. **Export fresh CSV files** with updated stats after Week 6 games complete
2. **Use the same filenames** or update them (e.g., `WEEK7 Offense Totals.csv`)
3. **Follow the same upload process** above
4. The system uses **UPSERT** - it will update existing teams rather than creating duplicates

### Data Freshness:
- Stats are stored with `last_updated` timestamp
- Each import overwrites previous data for all teams
- No need to manually delete old data

## Prediction Accuracy Improvements

With Week 6 data imported, predictions will now use:
- **More games = better averages** (5+ games vs 1-2 early season)
- **Current form** reflected in recent stats
- **Injury impact** shown in team performance metrics
- **Defensive trends** captured in yards/points allowed

### Monte Carlo Simulations:
The advanced prediction system runs 10,000+ simulations using:
- Offensive yards per game vs defensive yards allowed
- Scoring efficiency (points, red zone %, 3rd down %)
- Turnover differentials
- Variance modeling for game-to-game fluctuations

## Troubleshooting

### If Import Fails:

**Error: "No valid team data found"**
- Check that CSV files have the correct header format
- Verify files contain team names in column 2 (Tm)
- Ensure at least one row of data exists

**Error: "Failed to import data"**
- Check browser console for detailed error
- Verify you're logged in as admin
- Check database connection (Supabase status)

**Wrong Stats Showing:**
- Clear browser cache
- Re-upload both offensive AND defensive files
- Click "Parse & Merge" again before importing

### Data Verification:
After import, you can check the stats by:
1. Looking at the AdminTeamStats table in the admin panel
2. Running predictions and verifying they use recent data
3. Checking `last_updated` timestamp in the database

## Technical Details (For Developers)

### Parser Enhancements:
```typescript
// Before (failed on quoted lines):
const values = line.split(',').map(v => v.replace(/"/g, '').trim());

// After (handles quoted lines):
if (line.startsWith('"') && line.endsWith('"')) {
  line = line.slice(1, -1); // Remove surrounding quotes
}
const values = line.split(',').map(v => v.replace(/"/g, '').trim());
```

### Database Table:
- Table: `team_stats_cache`
- Primary Key: `team_name` (TEXT)
- 40+ NUMERIC columns for statistics
- Metadata: `source` ('csv'), `last_updated` (TIMESTAMPTZ)

### Upsert Logic:
```typescript
await supabase
  .from('team_stats_cache')
  .upsert({
    team_name: row.team,
    // ... all stats ...
    source: 'csv',
    last_updated: new Date().toISOString()
  });
```

## Next Steps

1. ✅ **Import Week 6 data** using the fixed parser
2. 🔄 **Generate predictions** for Week 7 games with updated stats
3. 📊 **Compare accuracy** between early season and mid-season predictions
4. 🗓️ **Set reminder** to update stats after each week's games complete

## Questions?

- **How often to update?** Once per week after all games complete
- **Can I partial update?** No - always upload both offense and defense files
- **What if a team is missing?** Parser will use league averages as fallback
- **Do I need to delete old data?** No - upsert automatically overwrites

---

**Status:** ✅ CSV Parser Fixed - Ready for Week 6 Import  
**Last Updated:** October 7, 2025  
**Files Modified:** `src/components/CSVImportStats.tsx`
