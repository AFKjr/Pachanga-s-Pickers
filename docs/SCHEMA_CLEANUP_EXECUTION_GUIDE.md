# Database Schema Cleanup - Execution Guide

## ⚠️ Pre-Execution Checklist

- [ ] **Backup database** (Supabase automatic backups enabled?)
- [ ] **Read the analysis** (`docs/DATABASE_SCHEMA_USAGE_ANALYSIS.md`)
- [ ] **Review migration script** (`supabase/migrations/20251015_cleanup_unused_schema.sql`)
- [ ] **Have rollback ready** (`supabase/migrations/20251015_cleanup_unused_schema_rollback.sql`)

---

## 🚀 Execution Steps

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Navigate to your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Paste Migration Script**
   - Copy contents of `supabase/migrations/20251015_cleanup_unused_schema.sql`
   - Paste into SQL editor

4. **Run Migration**
   - Click "Run" button
   - Watch for NOTICE messages in output
   - Verify "Migration Complete" message

5. **Verify Success**
   - Check output for row counts
   - Verify "All critical columns present ✓" message
   - Check no ERROR messages

---

### Option B: Via Supabase CLI

```powershell
# Navigate to project root
cd "C:\Users\wilmc\Mobile Apps\SportsBettingForum"

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Or manually execute the SQL file
supabase db execute --file supabase/migrations/20251015_cleanup_unused_schema.sql
```

---

## ✅ Post-Migration Testing

### 1. Test CSV Import

1. Go to `/admin/team-stats`
2. Upload a CSV file (week 6 or 7 offense/defense)
3. Verify import succeeds
4. Check data appears in table

### 2. Test Prediction Generation

1. Go to `/admin/generate`
2. Generate a live prediction
3. Verify prediction creates successfully
4. Check edge calculations display

### 3. Test Pick Display

1. Go to homepage `/`
2. Verify picks display correctly
3. Check all fields show (confidence, reasoning, edges)
4. Test filtering by week

### 4. Check Admin Panel

1. Go to `/admin/manage`
2. Verify picks table loads
3. Test editing a pick
4. Test deleting a pick

### 5. Check Results

1. Go to `/admin/results`
2. Verify results tracking works
3. Test updating pick results

---

## 🔍 What to Monitor

After running migration, watch for:

- ✅ **No TypeScript errors** in dev console
- ✅ **No Supabase errors** in browser console
- ✅ **CSV imports work**
- ✅ **Predictions generate**
- ✅ **Picks display correctly**
- ✅ **Edge calculations show**

---

## 🆘 If Something Breaks

### Quick Checks

1. **Check browser console** for errors
2. **Check Supabase logs** in dashboard
3. **Verify backup tables exist**:
   ```sql
   SELECT * FROM picks_backup_20251015 LIMIT 1;
   SELECT * FROM profiles_backup_20251015 LIMIT 1;
   SELECT * FROM team_stats_cache_backup_20251015 LIMIT 1;
   ```

### Rollback Steps

1. **Open Supabase SQL Editor**
2. **Run rollback script**: `supabase/migrations/20251015_cleanup_unused_schema_rollback.sql`
3. **Test application**
4. **Report issue**

---

## 📊 Expected Output

When migration runs successfully, you should see:

```
NOTICE:  Created picks backup: 500 rows
NOTICE:  Created profiles backup: 50 rows
NOTICE:  Created team_stats_cache backup: 1000 rows
NOTICE:  === Data Integrity Check ===
NOTICE:  Picks table: 500 rows
NOTICE:  Profiles table: 50 rows
NOTICE:  Team stats cache: 1000 rows
NOTICE:  All critical columns present ✓
```

---

## 🧹 Cleanup (After 1 Week)

If everything works perfectly for 1 week, remove backups:

```sql
DROP TABLE IF EXISTS picks_backup_20251015;
DROP TABLE IF EXISTS profiles_backup_20251015;
DROP TABLE IF EXISTS team_stats_cache_backup_20251015;
```

---

## 📝 Changes Summary

### Tables Dropped:
- ❌ `team_stats_canonical` (0 rows, never used)
- ❌ `team_name_mapping` (32 rows, never queried)

### Columns Removed:
- **picks** (2 columns): `schedule_id`, `over_under_odds`
- **profiles** (4 columns): `full_name`, `avatar_url`, `bio`, `email`
- **team_stats_cache** (12 columns): kicking stats, sack stats, legacy fields

### Columns Kept (85 total):
- All **actively used** fields for picks, predictions, edges, Monte Carlo results
- All **team stats** used in simulations
- All **authentication** and **authorization** fields

---

## ⏱️ Estimated Time

- **Migration runtime:** ~5 seconds
- **Testing:** ~15 minutes
- **Total:** ~20 minutes

---

## 🎯 Success Criteria

Migration is successful when:

1. ✅ No errors during execution
2. ✅ Backup tables created
3. ✅ Data integrity verified
4. ✅ CSV imports work
5. ✅ Predictions generate
6. ✅ Picks display correctly
7. ✅ No TypeScript errors
8. ✅ No Supabase errors

---

**Ready to proceed?** Start with Option A (Supabase Dashboard) for easiest execution.
