# Fix for CSV Predictions Database Errors

## Summary
Fixed the "Internal server error" when saving CSV-generated predictions by:
1. Adding comprehensive logging to identify validation failures
2. Making user_id handling more flexible
3. Ensuring default values for result fields
4. Creating a database migration to fix schema constraints

## Changes Made

### 1. Updated `src/lib/api.ts` - picksApi.create()
- Added detailed console logging at each step
- Made user_id fall back to current user if not provided
- Added default values for result, ats_result, ou_result
- Log validation errors with original data for debugging

### 2. Created Database Migrations

#### `supabase/fix-picks-table-for-csv.sql`
- Makes user_id nullable (CSV predictions may not have a user)
- Adds all optional columns if missing
- Sets proper defaults for result fields
- Verifies final schema

#### `supabase/verify-picks-schema.sql`
- Quick check to see current database schema
- Lists all columns with types and constraints

### 3. Created Documentation

#### `CSV_PREDICTIONS_FIX.md`
- Complete troubleshooting guide
- Data format requirements
- Common errors and solutions
- Testing procedures

## How to Apply the Fix

### Step 1: Run Database Migration

1. Go to your Supabase Dashboard
2. Open SQL Editor
3. Copy and paste contents of `supabase/fix-picks-table-for-csv.sql`
4. Click "Run"

### Step 2: Deploy Updated Code

The updated `src/lib/api.ts` file now includes:
- Better error logging (check browser console)
- Flexible user_id handling
- Default values for required fields

### Step 3: Test the Fix

1. Open browser DevTools Console (F12)
2. Navigate to `/admin/generate`
3. Click "Generate Predictions"
4. Watch the console for detailed logs:
   - "Attempting to save pick: ..."
   - "Pick saved successfully: ..." (if it works)
   - "Validation failed: ..." (if validation issues)
   - "Supabase insert error: ..." (if database issues)

## Expected Console Output

### Success:
```
Attempting to save pick: { game: "Kansas City Chiefs @ Jacksonville Jaguars", week: 5, ... }
Pick saved successfully: abc123-uuid-here
```

### Validation Error:
```
Validation failed: {
  errors: ["Team name contains invalid characters"],
  originalData: { homeTeam: "Kansas City Chiefs", ... }
}
```

### Database Error:
```
Supabase insert error: {
  message: "column 'user_id' violates not-null constraint",
  code: "23502",
  ...
}
```

## Common Issues and Solutions

### Issue: "column 'user_id' violates not-null constraint"
**Solution:** Run the database migration to make user_id nullable

### Issue: "Validation failed: Team name contains invalid characters"
**Solution:** Check team name format - must be exact NFL team name
- ✅ "Kansas City Chiefs"
- ❌ "KC Chiefs" or "Kansas City"

### Issue: "Validation failed: Game date: Invalid date format"
**Solution:** Ensure date is in YYYY-MM-DD format
- ✅ "2025-10-12"
- ❌ "10/12/2025" or "Oct 12, 2025"

### Issue: "Validation failed: Week: Invalid week number"
**Solution:** Week must be 1-18
- ✅ 5
- ❌ 0, 19, or "Week 5"

## Database Schema Requirements

After running the migration, your `picks` table should have:

**Required columns (NOT NULL):**
- id (uuid)
- game_info (jsonb)
- prediction (text)
- confidence (integer)
- reasoning (text)
- created_at (timestamp)
- updated_at (timestamp)

**Optional columns (NULL allowed):**
- user_id (uuid) ← Now nullable!
- spread_prediction (text)
- ou_prediction (text)
- result (text, default 'pending')
- ats_result (text)
- ou_result (text)
- week (integer)
- schedule_id (text)
- monte_carlo_results (jsonb)
- is_pinned (boolean, default false)

## Testing

After applying the fix:

1. **Check browser console** for detailed error messages
2. **Verify database schema** using `verify-picks-schema.sql`
3. **Try saving a simple prediction** to isolate the issue
4. **Check Supabase logs** in the dashboard for server-side errors

## Next Steps

If you still see errors after applying this fix:

1. Share the **exact console error** from browser DevTools
2. Run `verify-picks-schema.sql` and share the output
3. Check if the migration ran successfully in Supabase
4. Verify you're logged in as an admin user

## Files Changed

- ✅ `src/lib/api.ts` - Added logging and flexible user_id handling
- ✅ `supabase/fix-picks-table-for-csv.sql` - Database schema fix
- ✅ `supabase/verify-picks-schema.sql` - Schema verification tool
- ✅ `CSV_PREDICTIONS_FIX.md` - User-facing documentation
- ✅ `CSV_PREDICTIONS_FIX_SUMMARY.md` - This file
