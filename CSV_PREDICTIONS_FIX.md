# CSV Predictions Database Fix

## Problem
The application is generating predictions from CSV data but failing to save them to the database with the error: "Internal server error". This is happening because:

1. The database schema may be missing required columns
2. Validation logic is too strict for CSV-generated data
3. User ID requirements may be blocking saves

## Solution

### Step 1: Update Database Schema

Run the SQL migration in `supabase/fix-picks-table-for-csv.sql` in your Supabase SQL Editor:

```sql
-- This migration:
-- 1. Adds all optional columns (spread_prediction, ou_prediction, etc.)
-- 2. Makes user_id nullable (CSV predictions may not have a user)
-- 3. Sets proper defaults for result fields
-- 4. Ensures constraints allow NULL where appropriate
```

### Step 2: Verify Database Columns

After running the migration, verify with `supabase/verify-picks-schema.sql`:

```sql
-- This will show all columns, their types, and constraints
```

### Step 3: Update API Layer

The `picksApi.create()` function in `src/lib/api.ts` needs to:

1. **Handle missing user_id**: CSV predictions don't have a logged-in user
2. **Skip validation for system-generated picks**: CSV data is pre-validated
3. **Provide better error messages**: Log the actual validation errors

### Step 4: Required Database Columns

The `picks` table MUST have these columns:

#### Required (NOT NULL):
- `id` (UUID, auto-generated)
- `game_info` (JSONB, contains team names, date, spread, etc.)
- `prediction` (TEXT, the moneyline pick)
- `confidence` (INTEGER, 0-100)
- `reasoning` (TEXT, explanation of the pick)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### Optional (NULL allowed):
- `user_id` (UUID, nullable for system predictions)
- `spread_prediction` (TEXT, ATS pick)
- `ou_prediction` (TEXT, Over/Under pick)
- `result` (TEXT, default 'pending')
- `ats_result` (TEXT, default 'pending')
- `ou_result` (TEXT, default 'pending')
- `week` (INTEGER, 1-18)
- `schedule_id` (TEXT)
- `monte_carlo_results` (JSONB)
- `is_pinned` (BOOLEAN, default false)

### Step 5: Data Format from CSV

CSV predictions should be formatted as:

```typescript
{
  game_info: {
    home_team: "Kansas City Chiefs",
    away_team: "Jacksonville Jaguars", 
    league: "NFL",
    game_date: "2025-10-12", // YYYY-MM-DD format
    spread: -7.5,
    over_under: 47.5,
    home_score: null,
    away_score: null
  },
  prediction: "Kansas City Chiefs to win",
  spread_prediction: "Kansas City Chiefs -7.5",
  ou_prediction: "Over 47.5",
  confidence: 75,
  reasoning: "Monte Carlo simulation shows 75% win probability...",
  result: "pending",
  ats_result: "pending",
  ou_result: "pending",
  week: 5,
  schedule_id: null,
  monte_carlo_results: {
    // Optional simulation data
  }
}
```

## Next Steps

1. ✅ Run `supabase/fix-picks-table-for-csv.sql` in Supabase SQL Editor
2. ✅ Verify schema with `supabase/verify-picks-schema.sql`
3. ⏭️ Update the API create function to handle missing user_id
4. ⏭️ Test saving a prediction from the CSV generator
5. ⏭️ Add better error logging to see exact validation failures

## Common Errors

### "user_id violates not-null constraint"
- Solution: Run the migration to make `user_id` nullable
- Or: Set `user_id` to the admin user's ID when saving

### "Invalid pick data: Team name contains invalid characters"
- Solution: Ensure team names match NFL official names exactly
- Check for special characters or extra spaces

### "Validation failed"
- Solution: Log the `validation.errors` array to see specific issues
- Common: Date format must be YYYY-MM-DD
- Common: Week must be 1-18
- Common: Confidence must be 0-100

## Testing

After applying the fix, test with a simple prediction:

```javascript
const testPick = {
  game_info: {
    home_team: "Kansas City Chiefs",
    away_team: "Jacksonville Jaguars",
    league: "NFL",
    game_date: "2025-10-12",
    spread: -7.5,
    over_under: 47.5
  },
  prediction: "Kansas City Chiefs to win",
  confidence: 75,
  reasoning: "Test prediction from CSV data",
  result: "pending",
  week: 5
};

const { data, error } = await picksApi.create(testPick);
console.log('Result:', data, error);
```
