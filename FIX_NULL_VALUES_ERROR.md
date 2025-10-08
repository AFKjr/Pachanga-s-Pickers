# Fix for NULL Values Error in Week Tracking Migration

## The Error You Got
```
ERROR: 23502: column "week" of relation "team_stats_cache" contains null values
```

This happened because you have existing data in `team_stats_cache` without week values.

## Solution: Choose ONE Option

### ✅ **Option A: Safe Migration (Keep Existing Data)**

This updates existing records to have week=1, season_year=2025 before adding constraints.

**Run this in Supabase SQL Editor:**
```sql
-- File: supabase/add-week-to-team-stats.sql (UPDATED VERSION)
```

Copy the **updated** `add-week-to-team-stats.sql` file and run it. It now:
1. Adds columns as nullable first
2. Updates existing records with default values (week=1, season=2025)
3. THEN adds NOT NULL constraints
4. Finally creates the composite primary key

### ✅ **Option B: Clean Start (Recommended if no critical data)**

This drops and recreates the table with the new schema.

**Run this in Supabase SQL Editor:**
```sql
-- File: supabase/clean-migration-week-tracking.sql
```

This is **cleaner** and recommended if:
- You don't have important data in team_stats_cache yet
- You're just testing/developing
- You can re-import the CSV files

### 🔄 **Option C: Rollback First, Then Migrate**

If the migration is partially applied and stuck:

**Step 1: Rollback**
```sql
-- File: supabase/rollback-week-tracking.sql
```

**Step 2: Choose Option A or B above**

## Recommended Approach

Since you're likely just testing with Week 6 data:

1. **Use Option B (Clean Start):**
   - Run `clean-migration-week-tracking.sql`
   - This gives you a fresh table with week tracking
   
2. **Re-import Week 6 CSV files:**
   - Admin Panel → Team Stats → CSV Import
   - Upload week 6 offense.csv and week 6 defense.csv
   - Import to database

## What Each Script Does

### `add-week-to-team-stats.sql` (FIXED)
- ✅ Safely adds week columns to existing table
- ✅ Updates existing data with defaults
- ✅ Preserves your current data
- ⚠️ Existing data will have week=1, season=2025

### `clean-migration-week-tracking.sql` (NEW)
- ✅ Drops and recreates table cleanly
- ✅ No NULL value issues
- ✅ Fresh start with correct schema
- ⚠️ Deletes all existing data

### `rollback-week-tracking.sql` (NEW)
- ✅ Reverts migration if needed
- ✅ Restores original schema
- ✅ Useful if migration got stuck

## After Running Migration

### Verify Success
```sql
-- Check table structure
\d team_stats_cache

-- Should show:
-- Primary Key: (team_name, week, season_year)
-- Columns: week (integer NOT NULL), season_year (integer NOT NULL)
```

### Test Insert
```sql
INSERT INTO team_stats_cache (team_name, week, season_year, points_per_game)
VALUES ('Test Team', 6, 2025, 25.5);

-- Should succeed
```

### Check Data
```sql
SELECT team_name, week, season_year FROM team_stats_cache LIMIT 5;
```

## Then: Re-Import Your CSV Files

After successful migration:

1. Go to **Admin Panel** → **Team Stats** → **CSV Import**
2. Upload `week 6 offense.csv`
3. Upload `week 6 defense.csv`
4. UI should show: **"📅 Detected: Week 6, Season 2025"**
5. Click **Parse & Merge Stats**
6. Click **Import to Database**

## Verify Final Result

```sql
SELECT team_name, week, season_year, points_per_game, offensive_yards_per_game
FROM team_stats_cache
WHERE week = 6 AND season_year = 2025
ORDER BY points_per_game DESC
LIMIT 10;
```

You should see 32 teams with Week 6 stats! 🎉

## Troubleshooting

**Q: Still getting NULL value error?**
A: Use Option B (clean-migration) or Option C (rollback then migrate)

**Q: Lost my data?**
A: If you used Option B, just re-import your CSV files

**Q: Primary key violation?**
A: This means you have duplicate team entries. Clean the table first with Option B

**Q: Can I have both old and new data?**
A: No, old data (without weeks) isn't compatible. Use Option B and re-import.
