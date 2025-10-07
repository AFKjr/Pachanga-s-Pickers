# IMPORTANT: Clear Database Before Re-Import

## The Problem
Your screenshot shows old/incorrect data. The issue is that previous bad imports are still in the database.

## Solution: Clear and Re-Import

### Step 1: Clear Old Data
Run this SQL command in your Supabase dashboard:

```sql
DELETE FROM team_stats_cache WHERE source = 'csv';
```

OR delete ALL team stats to start fresh:

```sql
DELETE FROM team_stats_cache;
```

### Step 2: Fresh Import with Fixed Parser

1. **Restart dev server:** 
   ```powershell
   npm run dev
   ```

2. **Navigate to:** `http://localhost:5173/admin`

3. **Upload both CSV files**

4. **Click "Parse & Merge Stats"**

5. **Check the PREVIEW table** - it should show:
   - Detroit Lions: **365.0** off yds (not 2.6)
   - Detroit Lions: **34.8** ppg (not 1.6)

6. **If preview looks good, click "Import to Database"**

7. **HARD REFRESH the page** (Ctrl+F5) to see updated data

## What Should You See

### Correct Preview Values:
```
Detroit Lions:     Off Yds=365.0, Def Yds=298.8, PPG=34.8
Indianapolis:      Off Yds=381.2, Def Yds=315.0, PPG=32.6
Buffalo Bills:     Off Yds=395.8, Def Yds=299.6, PPG=30.6
```

### If You Still See Wrong Values:
The old data is cached. Clear it from the database first.

## Quick Clear Script

Save this as `clear-team-stats.sql` and run in Supabase:

```sql
-- Clear all CSV imported data
DELETE FROM team_stats_cache WHERE source = 'csv';

-- Verify deletion
SELECT COUNT(*) as remaining_teams FROM team_stats_cache;

-- Should show 0 (or only non-CSV entries)
```

Then re-import with the fixed parser.
