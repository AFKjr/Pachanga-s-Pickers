# Database Migration: Add Score Tracking to Picks

## Overview
This migration adds `home_score` and `away_score` fields to the `game_info` JSONB column in the `picks` table. These fields enable automatic calculation of Moneyline, ATS (Against The Spread), and Over/Under results.

## Files
- **`add_scores_to_game_info.sql`** - Full migration with indexes and constraints
- **`quick-add-scores.sql`** - Quick version for Supabase SQL Editor

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to your project: https://app.supabase.com
   - Go to **SQL Editor** (left sidebar)

2. **Run the Migration**
   - Click **New Query**
   - Copy the contents of `quick-add-scores.sql`
   - Paste into the editor
   - Click **Run** (or press `Ctrl+Enter`)

3. **Verify Results**
   - Check the output table shows your picks with `null` values for scores
   - Confirm no errors occurred

### Option 2: Using Supabase CLI

```bash
# Navigate to your project directory
cd "c:\Users\wilmc\Mobile Apps\SportsBettingForum"

# Apply the migration
supabase db push

# Or run the migration file directly
supabase db execute < supabase/migrations/add_scores_to_game_info.sql
```

## What This Migration Does

### 1. Adds Score Fields
Adds `home_score` and `away_score` to all existing picks:
```json
{
  "home_team": "Cardinals",
  "away_team": "Titans",
  "spread": -3.5,
  "over_under": 46.5,
  "home_score": null,  // NEW
  "away_score": null   // NEW
}
```

### 2. Adds Data Validation
Ensures scores are valid non-negative integers when provided:
- Scores must be numbers
- Scores must be >= 0
- NULL/undefined scores are allowed

### 3. Creates Index (Full Migration Only)
Adds index for faster queries on picks with completed scores

## After Migration

### New Data Structure
```typescript
// TypeScript interface (already updated)
interface GameInfo {
  home_team: string;
  away_team: string;
  league: 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAA';
  game_date: string;
  spread?: number;
  over_under?: number;
  home_score?: number;  // NEW - Actual home team score
  away_score?: number;  // NEW - Actual away team score
}
```

### How to Use in Admin Panel

1. Navigate to **Admin Panel → Update Pick Results**
2. Enter actual game scores in the new input fields:
   ```
   Away Score: [21]  @  Home Score: [28]
   ```
3. System automatically calculates:
   - **Moneyline**: WIN/LOSS based on final score
   - **ATS**: WIN/LOSS/PUSH based on spread coverage
   - **O/U**: WIN/LOSS/PUSH based on total points
4. Click **Save All Changes**

### Example API Update
```typescript
// Update pick with scores via API
const { error } = await picksApi.update(pickId, {
  game_info: {
    ...pick.game_info,
    home_score: 28,
    away_score: 21
  }
});
```

## Rollback (If Needed)

If you need to remove the score fields:

```sql
-- Remove score fields from all picks
UPDATE picks
SET game_info = game_info - 'home_score' - 'away_score';

-- Remove constraint
ALTER TABLE picks DROP CONSTRAINT IF EXISTS check_game_info_scores;

-- Remove index (if created)
DROP INDEX IF EXISTS idx_picks_with_scores;
```

## Testing

After applying the migration, test with:

```sql
-- Check existing picks now have score fields
SELECT 
    game_info->>'home_team' as home,
    game_info->>'away_team' as away,
    game_info->>'home_score' as home_score,
    game_info->>'away_score' as away_score
FROM picks
LIMIT 5;

-- Test inserting a pick with scores
INSERT INTO picks (game_info, prediction, confidence, reasoning, result, user_id)
VALUES (
    '{"home_team": "Test Home", "away_team": "Test Away", "league": "NFL", "game_date": "2025-10-01", "home_score": 28, "away_score": 21}'::jsonb,
    'Test prediction',
    80,
    'Test reasoning',
    'win',
    (SELECT id FROM auth.users LIMIT 1)
);

-- Verify constraint works (this should fail)
UPDATE picks
SET game_info = jsonb_set(game_info, '{home_score}', '"-5"')
WHERE id = (SELECT id FROM picks LIMIT 1);
```

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify table structure: `\d picks` in SQL editor
3. Ensure JSONB operations are supported (PostgreSQL 9.4+)
4. Contact support with error messages

## Status
- ✅ Migration files created
- ✅ TypeScript types updated
- ✅ UI components updated
- ✅ Auto-calculation logic implemented
- ⏳ Database migration pending (run SQL above)
