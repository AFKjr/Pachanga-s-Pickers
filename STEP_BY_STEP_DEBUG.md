# Step-by-Step Debugging Guide

## Your Database Schema is ✅ CORRECT!

Based on your schema output, the database is properly configured. The error is likely in **data validation** or **data format**.

---

## 🔍 Debug Steps (Do These In Order)

### Step 1: Open Browser Console
1. Press `F12` in your browser
2. Go to the **Console** tab
3. Clear any old messages
4. Keep it open for the next steps

### Step 2: Check Admin Status

In the browser console, run:
```javascript
// Check if you're admin
const { data: profile } = await supabase
  .from('profiles')
  .select('username, is_admin')
  .eq('id', (await supabase.auth.getUser()).data.user.id)
  .single();

console.log('Your profile:', profile);
```

**Expected output:**
```javascript
Your profile: { username: "your_username", is_admin: true }
```

❌ If `is_admin: false`, you need to make yourself admin in Supabase.

---

### Step 3: Try Generating Predictions

1. Go to your admin page: `/admin/generate`
2. Click "Generate Predictions"
3. **Watch the console carefully**

You'll see one of these messages:

#### ✅ Success:
```
Attempting to save pick: { game: "...", week: 5 }
Pick saved successfully: abc-123-def-456
```
→ Everything is working!

#### ❌ Admin Error:
```
Admin verification failed: { ... }
```
→ You're not logged in as admin. Fix Step 2.

#### ❌ Validation Error:
```
Validation failed: {
  errors: ["Team name: ..."],
  originalData: { homeTeam: "...", ... }
}
```
→ Data format issue. See Step 4.

#### ❌ Database Error:
```
Supabase insert error: {
  message: "...",
  code: "...",
  details: "..."
}
```
→ Database constraint issue. See Step 5.

---

### Step 4: If You See "Validation failed"

The console will show exactly what's wrong. Common issues:

#### Team Name Error
```javascript
errors: ["Team name: Team name contains invalid characters..."]
```

**Fix:** Ensure team names are exactly:
- ✅ `"Kansas City Chiefs"`
- ❌ `"KC Chiefs"` (abbreviation)
- ❌ `"Kansas City Chiefs "` (trailing space)
- ❌ `"Kansas City Chiefs®"` (special character)

#### Date Format Error
```javascript
errors: ["Game date: Invalid date format"]
```

**Fix:** Date must be `YYYY-MM-DD`:
- ✅ `"2025-10-12"`
- ❌ `"10/12/2025"`
- ❌ `"Oct 12, 2025"`
- ❌ `"2025-10-12T14:30:00Z"`

#### Week Error
```javascript
errors: ["Week: Invalid week number"]
```

**Fix:** Week must be a number 1-18:
- ✅ `5`
- ❌ `"5"` (string)
- ❌ `0` or `19` (out of range)
- ❌ `"Week 5"` (text)

#### Confidence Error
```javascript
errors: ["Confidence: Invalid confidence level"]
```

**Fix:** Confidence must be 0-100:
- ✅ `75`
- ❌ `"75"` (string)
- ❌ `150` (out of range)
- ❌ `75.5` (must be integer)

---

### Step 5: If You See "Supabase insert error"

Look at the `code` field:

#### Code: `23502` (NOT NULL violation)
```javascript
message: "null value in column '...' violates not-null constraint"
```

**This means a required field is missing.**

Check which column from the error message:
- `prediction` → Must have a prediction text
- `reasoning` → Must have reasoning text
- `game_info` → Must have game info object

**Quick fix:** Make sure ALL these fields are present:
```javascript
{
  game_info: { ... },  // ✅ Required
  prediction: "...",   // ✅ Required
  reasoning: "...",    // ✅ Required
  confidence: 75       // ✅ Required (or run fix-confidence-column.sql)
}
```

#### Code: `23514` (CHECK constraint violation)
```javascript
message: "new row violates check constraint '...'"
```

**This means a value is outside allowed range.**

Common causes:
- `confidence` outside 0-100 range
- `result` not one of: 'win', 'loss', 'push', 'pending'
- `week` outside 1-18 range

#### Code: `23505` (UNIQUE violation)
```javascript
message: "duplicate key value violates unique constraint"
```

**This means you're trying to save the same game twice.**

Not a real error - the prediction might already be saved!

---

### Step 6: Test with Minimal Data

If you're still stuck, test with this simple pick in the browser console:

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
  reasoning: "Simple test prediction to verify database is working",
  result: "pending",
  week: 5
};

console.log('Testing with:', testPick);

const { data, error } = await picksApi.create(testPick);

if (error) {
  console.error('❌ Test failed:', error);
} else {
  console.log('✅ Test passed! Pick saved:', data.id);
}
```

**If this works:** Your database is fine, the issue is in how your CSV predictions are formatted.

**If this fails:** Share the exact error message from the console.

---

## 🎯 Most Common Solutions

### 90% of errors are fixed by:

1. **Making yourself admin** (if you see "Admin verification failed")
   ```sql
   -- Run in Supabase SQL Editor
   UPDATE profiles SET is_admin = true WHERE id = auth.uid();
   ```

2. **Fixing team name format** (if you see "Team name contains invalid characters")
   - Use exact NFL names
   - Remove special characters
   - Trim whitespace

3. **Fixing date format** (if you see "Invalid date format")
   - Use YYYY-MM-DD format
   - No time component

---

## 📞 Still Need Help?

If you're still seeing errors, reply with:

1. **The exact console error** (copy-paste the whole message)
2. **One example of the data you're trying to save** (copy from console log)
3. **Confirmation that you ran these checks:**
   - [ ] I am logged in
   - [ ] I am an admin user (Step 2 confirmed this)
   - [ ] I see console logs when I try to save
   - [ ] I tried the test pick in Step 6

This will help pinpoint the exact issue!
