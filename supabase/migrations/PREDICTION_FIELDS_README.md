# Database Schema Update - Add Prediction Fields

## Problem
Getting a `400 Bad Request` error when trying to update picks with `spread_prediction` and `ou_prediction` because these columns don't exist in the Supabase database yet.

## Solution
Run the SQL migration to add the missing columns to your `picks` table.

## Quick Fix (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `wbfvfzrxdqwrnqmpnfel`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `quick-add-prediction-fields.sql`:

```sql
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS spread_prediction TEXT,
ADD COLUMN IF NOT EXISTS ou_prediction TEXT;
```

6. Click **Run** or press `Ctrl+Enter`

## Verify the Fix

After running the migration, verify the columns were added:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'picks' 
AND column_name IN ('spread_prediction', 'ou_prediction')
ORDER BY column_name;
```

You should see:
```
column_name         | data_type | is_nullable
--------------------|-----------|------------
ou_prediction       | text      | YES
spread_prediction   | text      | YES
```

## Complete Schema Update (Optional)

If you also need to add `schedule_id` or verify other columns, use `complete-schema-update.sql` instead.

## After Migration

1. **Redeploy on Vercel** (or wait for auto-deploy from the git push)
2. **Test the Admin Panel** → Manage Picks → Revise a pick
3. **Add predictions** like:
   - Spread Prediction: "Rams -6.5 to Cover"
   - O/U Prediction: "Under 46.5"
4. **Save** and verify no errors

## Files Created

- `migrations/add_prediction_fields.sql` - Full migration with comments
- `quick-add-prediction-fields.sql` - Simple version for SQL Editor
- `complete-schema-update.sql` - Complete schema update with all fields

## Notes

- These columns are optional (`NULL` allowed)
- Existing picks won't be affected (they'll just have `NULL` values)
- The migration is idempotent (safe to run multiple times)
