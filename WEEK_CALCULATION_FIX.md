# Week Calculation Bug Fix - October 8, 2025

## Problem
The admin panel "Manage Picks" page was showing invalid week numbers like Week 59, 58, 57, 56, 55 instead of the correct 2025 NFL weeks (1-18).

## Root Causes

### 1. Hardcoded 2024 Dates (FIXED)
- `AdminPickManager.tsx` was calculating weeks using `'2024-09-05'` instead of the proper 2025 NFL schedule
- `ATSStatsComponent.tsx` had two instances of hardcoded 2024 dates
- **Solution**: Replaced all manual calculations with `getPickWeek()` utility function

### 2. Old Data in Database (NEEDS CLEANUP)
- Database likely contains picks with:
  - Invalid dates from 2024 or other years
  - Manually set week numbers that are out of range
  - Dates that don't match the 2025 NFL schedule
- **Solution**: Use `cleanup-invalid-weeks.sql` script to identify and remove/fix bad data

### 3. Weak Validation (FIXED)
- Week calculation had fallback logic that would create bogus week numbers for invalid dates
- **Solution**: Added validation to check if date is within 2025 NFL season BEFORE calculating week number

## What Was Fixed

### Code Changes:
1. ✅ **AdminPickManager.tsx**: Now uses `getPickWeek(pick)` instead of manual calculation
2. ✅ **ATSStatsComponent.tsx**: Now uses `getPickWeek(pick)` for all week filtering
3. ✅ **getPickWeek() in nflWeeks.ts**: Added early validation to default invalid dates to Week 1

### New Logic Flow:
```
1. Check pick.week field (if manually set)
2. Try getNFLWeekFromDate() using official 2025 schedule
3. Validate date is within 2025 season (Sep 4, 2025 - Jan 5, 2026)
4. If invalid, default to Week 1 with warning log
5. If valid, calculate week from season start date
```

## How to Fix Your Database

### Step 1: Diagnose the Problem
Run the first two queries in `cleanup-invalid-weeks.sql` to see:
- Which picks have invalid week numbers (< 1 or > 18)
- Which picks have dates outside the 2025 NFL season

### Step 2: Clean Up (Choose ONE option)

**Option A: Delete Invalid Picks** (Recommended if data is wrong)
```sql
DELETE FROM picks WHERE week IS NOT NULL AND (week < 1 OR week > 18);
DELETE FROM picks WHERE (game_info->>'game_date')::date < '2025-09-04'::date 
                     OR (game_info->>'game_date')::date > '2026-01-05'::date;
```

**Option B: Reset Weeks** (If dates are correct, just weeks are wrong)
```sql
UPDATE picks SET week = NULL WHERE week IS NOT NULL AND (week < 1 OR week > 18);
```
This will force the app to recalculate weeks from game dates.

### Step 3: Verify Fix
After running cleanup:
1. Refresh your browser
2. Go to Admin Panel → Manage Picks
3. You should now see only valid weeks (1-18)
4. Week 6 picks should appear if you imported them with correct dates

## Expected Week Numbers for 2025 NFL Season

| Week | Date Range | Description |
|------|------------|-------------|
| 1 | Sep 4-8 | Season opener |
| 2 | Sep 11-15 | |
| 3 | Sep 18-22 | |
| 4 | Sep 25-29 | |
| 5 | Oct 2-6 | |
| 6 | Oct 9-13 | **← Your CSV imports should be here** |
| 7 | Oct 16-20 | |
| ... | ... | |
| 18 | Jan 2-5, 2026 | Regular season finale |

## Testing the Fix

1. Check the browser console for warning logs:
   - "Invalid game date for [team] @ [team]"
   - "Game date [date] is outside 2025 NFL season"
   
2. Verify week dropdown shows only 1-18

3. Confirm Week 6 appears if you have Oct 9-13 games

## Prevention

Going forward:
- ✅ Always use `getPickWeek()` utility - never calculate weeks manually
- ✅ Ensure CSV imports set correct `game_date` in YYYY-MM-DD format
- ✅ Validate dates are within current NFL season before saving picks
- ✅ Store week numbers in database when creating picks to avoid recalculation issues

## Files Changed
- `src/components/AdminPickManager.tsx`
- `src/components/ATSStatsComponent.tsx`
- `src/utils/nflWeeks.ts`
- `supabase/cleanup-invalid-weeks.sql` (new)
