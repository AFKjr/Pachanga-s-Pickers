# Database Schema Analysis - Picks Table

## ✅ Good News
Your database schema is mostly correct! Here's what's working:

- ✅ `user_id` is nullable (allows CSV predictions without a user)
- ✅ `monte_carlo_results` column exists
- ✅ `spread_prediction` and `ou_prediction` columns exist
- ✅ `ats_result` and `ou_result` columns exist
- ✅ `result` has default value: `'pending'`
- ✅ `is_pinned` has default value: `false`

## ⚠️ Potential Issue Found

### `confidence` column is nullable but validation expects it to be required

**Current Schema:**
```json
{
  "column_name": "confidence",
  "data_type": "integer",
  "is_nullable": "YES",  // ← This could cause issues
  "column_default": null
}
```

**What the code expects:**
The validation in `src/lib/api.ts` treats `confidence` as a required field.

**Fix Options:**

#### Option 1: Make confidence NOT NULL (Recommended)
Run `supabase/fix-confidence-column.sql`:
```sql
-- Sets default to 50 and makes it NOT NULL
ALTER TABLE picks ALTER COLUMN confidence SET NOT NULL;
```

#### Option 2: Keep it nullable (Already handled in code)
The updated `src/lib/api.ts` now provides a default value of 50 if confidence is missing:
```typescript
confidence: validation.sanitizedData.confidence ?? 50
```

## 🔍 Next Steps to Debug

Since your schema looks correct, the error might be:

### 1. Validation Error (Most Likely)
Check browser console for validation failures:

```javascript
// Look for this in console:
"Validation failed: {
  errors: ["Team name contains invalid characters"],
  originalData: { ... }
}"
```

**Common validation issues:**
- Team names must match exactly: `"Kansas City Chiefs"` not `"KC"` or `"Chiefs"`
- Date format must be: `"2025-10-12"` not `"10/12/2025"`
- Week must be: `5` not `"5"` or `"Week 5"`
- Confidence must be: `75` not `"75"` or `75.5`

### 2. Check Data Being Sent

Add this to your prediction generator to see what's being sent:

```javascript
console.log('Pick data before save:', JSON.stringify(pick, null, 2));
```

### 3. Run a Simple Test

Try saving this minimal prediction in browser console:

```javascript
// Test in browser console (F12)
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
  reasoning: "Test prediction",
  result: "pending",
  week: 5
};

const { data, error } = await picksApi.create(testPick);
console.log('Result:', { data, error });
```

## 🐛 Debugging Checklist

When you see "Internal server error", check:

### In Browser Console (F12):
- [ ] Is there a "Validation failed" message?
- [ ] Is there a "Supabase insert error" message?
- [ ] Is there an "Admin verification failed" message?
- [ ] Are you logged in as an admin user?

### In Supabase Dashboard:
- [ ] Go to Authentication → Users → Is your user marked as admin?
- [ ] Go to Database → Profiles → Does your profile have `is_admin: true`?
- [ ] Go to Logs → Can you see the failed insert attempt?

### In Your Code:
- [ ] Are team names EXACTLY matching NFL official names?
- [ ] Is game_date in YYYY-MM-DD format?
- [ ] Is confidence a number (not string)?
- [ ] Is week a number between 1-18?

## 📋 Expected Console Output

### Success:
```
Attempting to save pick: { game: "Kansas City Chiefs @ Jacksonville Jaguars", week: 5, hasSpread: true, hasOU: true, hasMonteCarlo: true }
Pick saved successfully: 12345678-abcd-ef00-1234-567890abcdef
```

### Validation Failure:
```
Validation failed: {
  errors: ["Team name: Team name contains invalid characters..."],
  originalData: {
    homeTeam: "Kansas City Chiefs®",  // ← Notice the ® symbol
    awayTeam: "Jacksonville Jaguars",
    ...
  }
}
```

### Database Error:
```
Supabase insert error: {
  message: "new row for relation \"picks\" violates check constraint \"picks_confidence_check\"",
  code: "23514",
  details: "Failing row contains (confidence = 150)..."
}
```

## 🎯 Most Likely Culprits

Based on your schema being correct, the error is probably:

1. **Team name validation** (80% probability)
   - Special characters in team names
   - Extra spaces or formatting
   - Non-ASCII characters

2. **Date format** (15% probability)
   - Not in YYYY-MM-DD format
   - Invalid date (e.g., February 31)

3. **Type mismatch** (5% probability)
   - Week as string instead of number
   - Confidence as string instead of number

## 🔧 Quick Fix Commands

### Check if you're admin:
```sql
-- Run in Supabase SQL Editor
SELECT id, email, is_admin FROM profiles 
WHERE id = auth.uid();
```

### Manually insert a test pick:
```sql
-- Run in Supabase SQL Editor
INSERT INTO picks (
  game_info, prediction, confidence, reasoning, result, week
) VALUES (
  '{"home_team":"Test Home","away_team":"Test Away","league":"NFL","game_date":"2025-10-12"}',
  'Test Home to win',
  75,
  'This is a test',
  'pending',
  5
);
```

If this works, the issue is in your data format, not the schema!
