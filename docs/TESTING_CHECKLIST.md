# Testing Checklist - NFL Week 7 Predictions

**Date:** October 15, 2025  
**Goal:** Verify all bug fixes work correctly in production

---

## 🎯 Testing Objectives

1. ✅ All Week 7 games generate predictions
2. ✅ No NaN values in database
3. ✅ Edge scores calculated for all picks
4. ✅ Spread picks are correct (especially for road favorites)
5. ✅ Missing odds handled gracefully
6. ✅ Stats quality validation working

---

## 📋 Step-by-Step Testing Process

### Step 1: Generate Predictions

**Action:** In the admin panel (`http://localhost:5173/admin/generate`):
1. ✅ Dev server is running
2. ✅ Admin panel opened in browser
3. ⏳ Click "Generate Picks" button
4. ⏳ Select "Week 7" from dropdown
5. ⏳ Click "Generate" or "Start Generation"
6. ⏳ Wait for completion message

**What to Watch For:**
- Progress indicator shows games being processed
- Success message appears
- No error messages or crashes
- Check browser console (F12) for any errors

---

### Step 2: Check Supabase Dashboard

**Action:** Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/wbfvfzrxdqwrnqmpnfel/functions
2. Click on `generate-predictions` function
3. Click "Logs" tab
4. Look at recent invocations

**Expected Logs:**
```
🏈 [1/16] Processing: Cowboys @ Eagles
✓ Successfully generated prediction for Cowboys @ Eagles

⚠️ Missing moneyline odds for Raiders @ Chiefs. 
   Estimated from spread: Home -380, Away +290
✓ Successfully generated prediction for Raiders @ Chiefs

📊 Stats quality for [Team]: real (database)
✓ Successfully generated prediction for [Team] @ [Team]

🎉 Generated 16 live predictions in XX.XXs
```

**Red Flags to Look For:**
- ❌ `TypeError: Cannot read property...`
- ❌ `NaN` appearing in logs
- ❌ Games failing to process
- ❌ Function timing out

---

### Step 3: Run Database Verification Queries

**Action:** Go to Supabase SQL Editor
1. Open: https://supabase.com/dashboard/project/wbfvfzrxdqwrnqmpnfel/editor
2. Copy queries from `docs/TEST_VERIFICATION_QUERIES.sql`
3. Run each query one by one

**Critical Queries:**

#### Query 1: Quick Check
```sql
SELECT 
  COUNT(*) as predictions_in_last_hour,
  MAX(created_at) as most_recent
FROM picks
WHERE created_at > NOW() - INTERVAL '1 hour';
```
**Expected:** Count > 0 (typically ~16 for full NFL week)

#### Query 2: NaN Check (Bug #4 Test)
```sql
SELECT COUNT(*) as nan_count
FROM picks
WHERE week = 7
  AND (monte_carlo_results::text LIKE '%NaN%' OR game_info::text LIKE '%NaN%');
```
**Expected:** 0 (ZERO NaN values)  
**If Failed:** Bug #4 not working - check drivesPerGame calculation

#### Query 3: Edge Scores Check
```sql
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  monte_carlo_results->>'spread_probability' as spread_prob,
  monte_carlo_results->>'moneyline_probability' as ml_prob,
  monte_carlo_results->>'total_probability' as total_prob
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour'
LIMIT 5;
```
**Expected:** All probabilities should be numbers (not null)  
**If Failed:** Monte Carlo simulation not storing results correctly

#### Query 4: Spread Pick Validation (Bug #3 Test)
```sql
SELECT 
  game_info->>'home_team' || ' vs ' || game_info->>'away_team' as game,
  game_info->>'favorite_team' as favorite,
  spread_prediction,
  CAST(monte_carlo_results->>'favorite_cover_probability' as numeric) as fav_prob
FROM picks
WHERE week = 7
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```
**Expected:** When fav_prob > 50, spread_prediction should include favorite team  
**If Failed:** Bug #3 not working - spread pick logic broken

---

### Step 4: Check Frontend Display

**Action:** Navigate to homepage
1. Go to: `http://localhost:5173/`
2. Scroll through the predictions
3. Click on individual pick cards

**What to Check:**
- ✅ All Week 7 games visible
- ✅ Spread picks show correct team + spread value
- ✅ No "NaN", "undefined", or "null" visible
- ✅ Edge percentages display correctly
- ✅ Confidence levels make sense (40-80% range)
- ✅ Dates are correct (not shifted by timezone)

**Visual Inspection:**
```
✅ GOOD:
Chiefs -7 (65% confidence)
Over 45.5 (58% confidence)
Edge: +5.2%

❌ BAD:
undefined -NaN (NaN% confidence)
Over NaN (null% confidence)
Edge: undefined%
```

---

### Step 5: Test Edge Cases

#### Test A: Road Favorite Scenario
**Find a game where away team is favored:**
```sql
SELECT 
  game_info->>'away_team' || ' @ ' || game_info->>'home_team' as game,
  game_info->>'favorite_team' as favorite,
  game_info->>'favorite_is_home' as fav_is_home,
  spread_prediction
FROM picks
WHERE week = 7
  AND game_info->>'favorite_is_home' = 'false'
  AND created_at > NOW() - INTERVAL '1 hour';
```
**Expected:** Spread pick should show away team with negative spread  
Example: `Chiefs -7` (not `Raiders +7`)

#### Test B: Missing Odds Handling
**Check logs for odds estimation:**
Look for warnings like:
```
⚠️ Missing moneyline odds for [Team] @ [Team]. 
   Estimated from spread: Home -XXX, Away +XXX
```
**Expected:** These warnings should exist (good!) and games should still process

#### Test C: Default Stats Usage
**Check logs for default stats:**
Look for warnings like:
```
⚠️ Using default stats for [Team]
📊 Stats quality for [Team]: default (league_averages)
```
**Expected:** If any teams have no database stats, this should appear

---

## ✅ Success Criteria

Mark each as complete:

### Database Tests
- [ ] Week 7 predictions exist (Query 1 returns > 0)
- [ ] NO NaN values found (Query 2 returns 0)
- [ ] All games have edge scores (Query 3 shows probabilities)
- [ ] Spread picks are correct (Query 4 validates logic)
- [ ] Road favorites handled correctly (Test A passes)
- [ ] Odds validation working (Query 6 shows all odds present)
- [ ] Dates are consistent (Query 7 shows proper dates)

### Frontend Tests
- [ ] All predictions visible on homepage
- [ ] No "NaN" or "undefined" visible
- [ ] Edge percentages display correctly
- [ ] Pick cards show all data properly
- [ ] Dates display in correct timezone

### Log Tests
- [ ] Function completed successfully (no crashes)
- [ ] All games processed (16/16 or similar)
- [ ] Warnings present (but not errors)
- [ ] Execution time reasonable (< 2 minutes)

### Bug-Specific Tests
- [ ] Bug #1: Missing ML odds handled ✅
- [ ] Bug #2: Missing spread/total handled ✅
- [ ] Bug #3: Correct spread picks ✅
- [ ] Bug #4: No NaN values ✅
- [ ] Bug #5: Consistent week numbers ✅
- [ ] Bug #6: Correct dates ✅
- [ ] Bug #7: Stats quality tracked ✅

---

## 🆘 If Tests Fail

### NaN Values Found
1. Check `fetch-stats.ts` - verify `calculateDrivesPerGame()` is being used
2. Check specific team's database stats:
   ```sql
   SELECT * FROM team_stats_cache 
   WHERE team_name = 'problematic-team';
   ```
3. Look for null values in critical fields

### Wrong Spread Picks
1. Check `determineSpreadPick()` function implementation
2. Verify `favoriteInfo` is passed correctly
3. Add debug logging:
   ```typescript
   console.log('Favorite:', favoriteInfo.favoriteTeam);
   console.log('Fav Cover Prob:', simResult.favoriteCoverProbability);
   console.log('Spread Pick:', spreadPick);
   ```

### Missing Edge Scores
1. Verify Monte Carlo simulation completed
2. Check that results are being stored in database
3. Run: 
   ```sql
   SELECT monte_carlo_results FROM picks 
   WHERE week = 7 LIMIT 1;
   ```

### Frontend Issues
1. Check browser console (F12) for errors
2. Verify API calls are returning data
3. Check that picks are being fetched from correct week

---

## 📊 Expected Results Summary

**Typical NFL Week 7:**
- **Games:** 15-16 games
- **Predictions:** 15-16 rows in picks table
- **NaN Count:** 0
- **Edge Scores:** 100% of predictions have scores
- **Warnings:** 0-5 warnings (for missing odds/stats)
- **Errors:** 0
- **Execution Time:** 30-90 seconds

---

## 📝 Testing Notes Section

Use this space to record what you find:

```
Date/Time: _______________
Tester: __________________

Quick Results:
- Total predictions generated: _____
- NaN values found: _____
- Failed games: _____
- Execution time: _____

Issues Found:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

Overall Status: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

Notes:
_____________________________________________________
_____________________________________________________
_____________________________________________________
```

---

**Ready to test? Follow the steps above and check off each item as you go!** 🧪
