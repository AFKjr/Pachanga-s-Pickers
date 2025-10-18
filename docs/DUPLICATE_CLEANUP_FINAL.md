# Duplicate Teams Cleanup - Final Working Solution

## Problem Fixed
The initial SQL scripts referenced columns that don't exist in the `team_stats_cache` table:
- ❌ `id` column (table uses composite primary key)
- ❌ `created_at` column (table only has `last_updated`)

## Corrected Approach
Use PostgreSQL's `ctid` (internal row identifier) to identify and remove duplicates.

## Quick Fix - Copy/Paste These Queries

### ✅ Query 1: Check for Duplicates
```sql
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as duplicate_count
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, team_name, week;
```

**What to expect:**
- If this returns rows, you have duplicates
- `duplicate_count` shows how many duplicate entries exist

---

### ✅ Query 2: Remove Duplicates (SIMPLE VERSION)
```sql
DELETE FROM team_stats_cache
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM team_stats_cache
  GROUP BY team_name, week, season_year
);
```

**What it does:**
- Keeps one entry per `(team_name, week, season_year)` combination
- Deletes all other duplicate rows
- Uses PostgreSQL's internal `ctid` to identify rows

**Expected output:**
- `DELETE X` where X = number of duplicates removed

---

### ✅ Query 3: Add Unique Constraint
```sql
ALTER TABLE team_stats_cache 
  DROP CONSTRAINT IF EXISTS unique_team_week_season;

ALTER TABLE team_stats_cache 
  ADD CONSTRAINT unique_team_week_season 
  UNIQUE (team_name, week, season_year);
```

**What it does:**
- Prevents future duplicates
- Makes CSV imports with `upsert` work correctly

**Expected output:**
- `ALTER TABLE` success message

---

### ✅ Query 4: Verify No Duplicates Remain
```sql
SELECT 
  team_name,
  week,
  season_year,
  COUNT(*) as count
FROM team_stats_cache
GROUP BY team_name, week, season_year
HAVING COUNT(*) > 1;
```

**Expected output:**
- **No rows** (meaning cleanup was successful) ✅

---

### ✅ Query 5: Summary Statistics
```sql
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT team_name) as unique_teams,
  COUNT(DISTINCT week) as weeks_covered,
  COUNT(DISTINCT season_year) as seasons_covered,
  MIN(week) as earliest_week,
  MAX(week) as latest_week
FROM team_stats_cache;
```

**Expected output:**
- Shows database stats
- Should have ~32 unique teams (NFL)
- Total records ≈ 32 teams × number of weeks

---

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Navigate to your project
- Go to **SQL Editor**

### 2. Run Query 1 (Check)
- Copy Query 1 above
- Paste into SQL Editor
- Click "Run"
- **Note the number of duplicates**

### 3. Run Query 2 (Delete)
- Copy Query 2 above
- Paste into SQL Editor
- Click "Run"
- **Verify it says "DELETE X"** where X matches duplicates from step 2

### 4. Run Query 3 (Prevent Future Duplicates)
- Copy Query 3 above
- Paste into SQL Editor
- Click "Run"
- **Look for "ALTER TABLE" success message**

### 5. Run Query 4 (Verify)
- Copy Query 4 above
- Paste into SQL Editor
- Click "Run"
- **Should return 0 rows** ✅

### 6. Run Query 5 (Summary)
- Copy Query 5 above
- Paste into SQL Editor
- Click "Run"
- **Check your database stats**

---

## Why `ctid` Works

PostgreSQL's `ctid` is an internal row identifier (tuple identifier) that:
- ✅ Exists on every table automatically
- ✅ Uniquely identifies each physical row
- ✅ Works even without primary key or id column
- ✅ Simple to use for duplicate removal

**Example:**
```sql
-- Each row has a unique ctid
SELECT ctid, team_name, week FROM team_stats_cache LIMIT 3;

-- Output:
-- ctid    | team_name          | week
-- --------+-------------------+------
-- (0,1)   | Kansas City Chiefs | 7
-- (0,2)   | Buffalo Bills      | 7
-- (0,3)   | Dallas Cowboys     | 7
```

---

## Table Structure (For Reference)

The `team_stats_cache` table uses a **composite primary key**:
- `team_name` + `week` + `season_year`

**Key columns:**
- `team_name` (VARCHAR)
- `week` (INTEGER)
- `season_year` (INTEGER)
- `last_updated` (TIMESTAMP)
- `source` (VARCHAR) - 'csv', 'manual', etc.

**NO `id` column**
**NO `created_at` column**

---

## After Cleanup

### Re-generate Predictions
After removing duplicates, regenerate your predictions to use clean data:
1. Go to `/admin/generate` in your app
2. Run Monte Carlo predictions
3. Check for improved accuracy

### Monitor for Duplicates
Run Query 1 periodically to ensure no new duplicates appear:
```sql
-- Quick duplicate check
SELECT COUNT(*) as duplicate_count
FROM (
  SELECT team_name, week, season_year, COUNT(*) as cnt
  FROM team_stats_cache
  GROUP BY team_name, week, season_year
  HAVING COUNT(*) > 1
) duplicates;
```

**Expected:** `duplicate_count = 0` ✅

---

## Troubleshooting

### If Query 2 Fails
Try this alternative that's even simpler:
```sql
-- Create temp table with unique entries
CREATE TEMP TABLE team_stats_unique AS
SELECT DISTINCT ON (team_name, week, season_year) *
FROM team_stats_cache
ORDER BY team_name, week, season_year, last_updated DESC NULLS LAST;

-- Clear original table
DELETE FROM team_stats_cache;

-- Restore unique entries
INSERT INTO team_stats_cache SELECT * FROM team_stats_unique;

-- Clean up
DROP TABLE team_stats_unique;
```

### If Constraint Already Exists
If Query 3 says constraint exists:
```sql
-- Check existing constraints
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'team_stats_cache' 
  AND constraint_type = 'UNIQUE';
```

Then you're already protected! Skip Query 3.

---

## Impact on Predictions

**Before:**
- ❌ Multiple conflicting stats for same team/week
- ❌ Edge functions may fetch wrong data
- ❌ Lower prediction accuracy

**After:**
- ✅ One canonical entry per team/week/season
- ✅ Consistent data for Monte Carlo simulations
- ✅ Higher accuracy predictions
- ✅ Reliable confidence scores

---

## Files Reference

1. **`QUICK_REMOVE_DUPLICATES.sql`** - Simple 5-query script (CORRECTED)
2. **`REMOVE_DUPLICATE_TEAMS.sql`** - Full script with backup (CORRECTED)
3. **`DUPLICATE_TEAMS_FIX_GUIDE.md`** - Detailed explanation
4. **`DUPLICATE_CLEANUP_FINAL.md`** - This file (WORKING VERSION)

---

## Success Checklist

- [ ] Ran Query 1 - identified duplicates
- [ ] Ran Query 2 - deleted duplicates (noted count)
- [ ] Ran Query 3 - added unique constraint
- [ ] Ran Query 4 - verified 0 duplicates remain
- [ ] Ran Query 5 - checked database stats
- [ ] Re-generated predictions with clean data
- [ ] Verified improved accuracy

---

**You're done!** Your database is now clean and protected from future duplicates. 🎉
