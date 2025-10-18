# Duplicate Teams Issue - Fix Guide

## Problem
Duplicate team entries in the `team_stats_cache` table can significantly lower prediction accuracy because:

1. **Inconsistent Data**: Multiple entries for the same team/week/season may have conflicting statistics
2. **Query Confusion**: Edge functions may fetch the wrong entry (older or less accurate data)
3. **Monte Carlo Issues**: Simulations using duplicate/stale data produce less reliable predictions
4. **Constraint Violations**: Without proper unique constraints, CSV imports can create duplicates

## Root Causes

### 1. Missing Unique Constraint
The `team_stats_cache` table may not have enforced uniqueness on `(team_name, week, season_year)`:
```sql
-- Check if constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'team_stats_cache' 
  AND constraint_type = 'UNIQUE';
```

### 2. Multiple CSV Imports
Importing the same week's data multiple times without proper conflict resolution can create duplicates.

### 3. Team Name Variations
Different CSV sources may use slightly different team names (e.g., "Los Angeles Rams" vs "LA Rams").

## Solution

### Step 1: Identify Duplicates

Run this query in Supabase SQL Editor:
```sql
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as duplicate_ids
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

**What to look for:**
- Any rows returned = you have duplicates
- `duplicate_count` shows how many duplicate entries exist
- `duplicate_ids` shows the specific row IDs

### Step 2: Remove Duplicates

Use the SQL script: **`QUICK_REMOVE_DUPLICATES.sql`**

This script will:
1. ✅ Identify all duplicates
2. ✅ Keep the most recent entry (based on `last_updated`, `created_at`)
3. ✅ Delete older duplicate entries
4. ✅ Add unique constraint to prevent future duplicates
5. ✅ Verify cleanup was successful

**To run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy queries from `docs/QUICK_REMOVE_DUPLICATES.sql`
3. Run each query **ONE AT A TIME** in order
4. Verify results after each step

### Step 3: Verify Fix

After running the cleanup:

```sql
-- Should return 0 rows
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as count
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1;
```

**Expected Result:** No rows returned = no duplicates remain ✅

### Step 4: Prevent Future Duplicates

The script adds this constraint:
```sql
ALTER TABLE team_stats_cache 
  ADD CONSTRAINT unique_team_week_season 
  UNIQUE (team_name, week, season_year);
```

**Effect:**
- ✅ Prevents duplicate entries for same team/week/season
- ✅ CSV imports with existing data will update instead of duplicate
- ✅ Maintains data integrity automatically

## Code Already Handles This

Your `TeamStatsImporter` service already uses proper upsert logic:

```typescript
// In src/services/teamStatsImporter.ts
await supabase
  .from('team_stats_cache')
  .upsert(teamStatsData, {
    onConflict: 'team_name,week,season'  // ✅ Correct conflict resolution
  });
```

**This works correctly IF:**
- ✅ The unique constraint exists in the database
- ✅ Team names are normalized consistently
- ✅ Week and season values are correct

## Common Scenarios

### Scenario 1: Same Week Imported Multiple Times
**Before Fix:**
```
team_name           | week | season_year | offensive_yards
--------------------|------|-------------|----------------
Kansas City Chiefs  |  7   |    2025     |    380
Kansas City Chiefs  |  7   |    2025     |    385  ← Different stats!
```

**After Fix:**
```
team_name           | week | season_year | offensive_yards
--------------------|------|-------------|----------------
Kansas City Chiefs  |  7   |    2025     |    385  ← Most recent kept
```

### Scenario 2: Team Name Variations
**Before Fix:**
```
team_name           | week | season_year
--------------------|------|-------------
Los Angeles Rams    |  7   |    2025
LA Rams             |  7   |    2025  ← Treated as different team!
```

**Solution:** Use consistent team names from `csvParser.ts` normalization:
```typescript
const teamMap: Record<string, string> = {
  'LA Rams': 'Los Angeles Rams',
  'Los Angeles Rams': 'Los Angeles Rams',
  // ... etc
};
```

## Verification Queries

### Check Total Records
```sql
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT team_name) as unique_teams,
  MIN(week) as earliest_week,
  MAX(week) as latest_week
FROM team_stats_cache;
```

**Expected:** 
- 32 unique teams (NFL teams)
- No more than 32 records per week
- Total records ≈ 32 teams × number of weeks

### Check Specific Team
```sql
SELECT 
  team_name,
  week,
  season_year,
  offensive_yards_per_game,
  points_per_game,
  last_updated,
  source
FROM team_stats_cache
WHERE team_name = 'Kansas City Chiefs'
ORDER BY week, last_updated DESC;
```

**Expected:** One row per week, no duplicates

## Impact on Predictions

**Before Fixing Duplicates:**
- ❌ Edge functions may fetch wrong/stale data
- ❌ Monte Carlo simulations use inconsistent stats
- ❌ Confidence scores less reliable
- ❌ Edge calculations potentially incorrect

**After Fixing Duplicates:**
- ✅ Consistent data for all predictions
- ✅ Most recent stats always used
- ✅ Higher accuracy Monte Carlo results
- ✅ Reliable confidence scores
- ✅ Correct edge calculations

## Maintenance

### Weekly CSV Import Checklist
1. ✅ Run duplicate check before import (Query 1)
2. ✅ Import new week's data
3. ✅ Run duplicate check after import (should be 0)
4. ✅ Verify record count: `SELECT COUNT(*) FROM team_stats_cache`

### Monthly Audit
```sql
-- Check for any data quality issues
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as records,
  STRING_AGG(source, ', ') as sources,
  MAX(last_updated) as most_recent
FROM team_stats_cache
WHERE season_year = 2025
GROUP BY team_name, week, season_year
ORDER BY team_name, week;
```

## Rollback Plan

If something goes wrong, the full script (`REMOVE_DUPLICATE_TEAMS.sql`) creates a backup:

```sql
-- Restore from backup
BEGIN;
DELETE FROM team_stats_cache;
INSERT INTO team_stats_cache 
SELECT * FROM team_stats_cache_backup_duplicates;
COMMIT;
```

## Summary

**Files to Use:**
1. **`QUICK_REMOVE_DUPLICATES.sql`** - Run this in Supabase (5 simple queries)
2. **`REMOVE_DUPLICATE_TEAMS.sql`** - Full script with backup/rollback

**Steps:**
1. Run Query 1 to identify duplicates
2. Run Query 2 to remove duplicates
3. Run Query 3 to add unique constraint
4. Run Query 4 to verify cleanup
5. Run Query 5 to see summary stats

**Result:**
✅ No duplicate teams  
✅ Higher prediction accuracy  
✅ Future duplicates prevented automatically  
✅ Cleaner, more reliable database  

---

**Questions or Issues?** Check the verification queries above or restore from backup if needed.
