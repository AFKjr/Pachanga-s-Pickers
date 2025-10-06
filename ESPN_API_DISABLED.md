# ESPN API Disabled - CSV Import Only

## Summary of Changes

All ESPN API functionality has been **commented out** and **disabled** in favor of the CSV import system for weekly team stats updates.

## Files Modified

### 1. `src/components/AdminTeamStats.tsx`
- ✅ Commented out `refreshAllStats()` ESPN API fetch logic
- ✅ Function now shows alert: "ESPN API refresh is disabled. Please use the CSV Import feature"
- ✅ "Refresh All from ESPN" button disabled with gray styling
- ✅ Removed loading message for ESPN API refresh
- ✅ Updated legend:
  - 🟣 CSV (Purple) - Imported from CSV file (PRIMARY)
  - 🔵 Manual (Blue) - Manually entered
  - 🟡 Historical (Yellow) - Historical data
  - ⚫ ESPN (Gray) - Legacy, disabled

### 2. `src/pages/admin/TeamStatsPage.tsx`
- ✅ Updated warning message to recommend CSV Import
- ✅ Added note that ESPN API is disabled
- ✅ Highlighted CSV Import as recommended data source

### 3. `src/components/CSVImportStats.tsx`
- ✅ Fixed file validation (checks `.csv` extension instead of MIME type)
- ✅ Supports dual-file upload (offensive + defensive CSVs)
- ✅ Automatic merging and calculation of complete stats

## Files NOT Modified (ESPN Code Remains)

These files still contain ESPN API code but are **not actively used**:

### Backend/API Files (Not Called)
- `api/refresh-team-stats.ts` - Vercel serverless function (not called)
- `src/lib/externalApis.ts` - ESPN API helper functions (not used)

### Component Files (Not Used)
- `src/components/APIPredictionsGenerator.tsx` - Old prediction component
- `src/components/DataCollectionStatus.tsx` - ESPN status component

### Documentation (Outdated)
- `TEAM_STATS_SYSTEM.md` - Documents ESPN API system
- `README.md` - References ESPN API
- `.github/copilot-instructions.md` - Already notes ESPN scraper removed

## How It Works Now

### CSV Import Workflow:
1. **Admin navigates to Team Stats page**
2. **Upload two CSV files from Sports Reference:**
   - Offensive Stats CSV (contains PF, offensive yards, TOs lost)
   - Defensive Stats CSV (contains PA, yards allowed, TOs gained)
3. **Click "Parse & Merge Stats"**
   - Combines both files by team name
   - Calculates per-game averages
   - Computes turnover differential (TOs gained - TOs lost)
4. **Review preview table**
5. **Click "Import to Database"**
   - Bulk upserts to `team_stats_cache` table
   - Sets `source = 'csv'`
   - Updates `last_updated` timestamp

### Data Calculated:
- ✅ **OffensiveYards** = Total Yds / Games (offensive CSV)
- ✅ **DefensiveYards** = Total Yds / Games (defensive CSV)
- ✅ **PointsPerGame** = PF / Games
- ✅ **PointsAllowed** = PA / Games
- ✅ **TurnoverDiff** = Defense TO - Offense TO (real differential!)
- ⚠️ **ThirdDownPct** = 40% (placeholder)
- ⚠️ **RedZonePct** = 55% (placeholder)

## Benefits

1. **More Accurate**: Sports Reference data is comprehensive and reliable
2. **Weekly Updates**: Easy to download and import new CSVs each week
3. **No Rate Limits**: No API throttling or timeout issues
4. **Complete Data**: Get both offensive AND defensive stats together
5. **Real TO Differential**: Proper calculation of turnovers gained vs lost

## Future Considerations

If you want to completely remove ESPN code:
- Delete `api/refresh-team-stats.ts`
- Delete ESPN functions from `src/lib/externalApis.ts`
- Update documentation files

For now, the code is **commented out** and **disabled** but remains in the codebase for reference.

## User-Facing Changes

- "Refresh All from ESPN" button is now **grayed out** and shows alert when clicked
- CSV Import section is **prominently placed** at top of Team Stats page
- Updated instructions guide users to use CSV import instead
- Source badges show **CSV in purple** as the primary data source
