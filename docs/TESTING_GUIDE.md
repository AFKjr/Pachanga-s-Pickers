# Quick Testing Guide - Critical Bug Fixes

## 🚀 Deployment Commands

```powershell
# 1. Navigate to project directory
cd "c:\Users\wilmc\Mobile Apps\SportsBettingForum"

# 2. Build TypeScript to verify no errors
npm run build

# 3. Deploy the edge function to Supabase
supabase functions deploy generate-predictions

# 4. Watch logs in real-time
supabase functions logs generate-predictions --tail
```

---

## ✅ What to Look For in Logs

### Good Signs (Expected Warnings)
```
⚠️ Missing moneyline odds for [Team A] @ [Team B]. 
   Estimated from spread: Home -380, Away +290
```
This is NORMAL - means the odds converter is working correctly.

```
⚠️ Using default stats for [Team Name]
```
This is NORMAL - means no database stats exist for that team yet.

```
✓ Successfully generated prediction for [Team A] @ [Team B]
```
This means the game processed without errors!

---

### Bad Signs (Needs Investigation)
```
❌ Error processing [Team A] @ [Team B]:
   TypeError: Cannot read property 'homeMLOdds' of undefined
```
This would indicate Bug #1 is NOT fixed.

```
NaN appearing in predictions
```
This would indicate Bug #4 is NOT fixed.

```
TypeError: odds.homeMLOdds is not a number
```
This would indicate the odds validation isn't working.

---

## 🧪 Testing Checklist

After deployment, test these scenarios:

### Scenario 1: Normal Game (All Odds Present)
- [ ] Game processes successfully
- [ ] No warnings about missing odds
- [ ] Prediction appears in UI correctly
- [ ] Spread pick makes sense (favorite has negative spread)

### Scenario 2: Game with Missing Moneyline Odds
Expected behavior:
- [ ] Warning about estimating from spread appears
- [ ] Game still processes successfully
- [ ] Estimated odds are reasonable (-200 to +200 range for most games)

### Scenario 3: Road Favorite Game
Example: Chiefs @ Raiders, Chiefs -7
Expected behavior:
- [ ] Spread pick shows "Chiefs -7" (NOT "Raiders +7")
- [ ] Confidence percentage aligns with favorite
- [ ] Log shows "Favorite: Chiefs (away)"

### Scenario 4: Team with No Database Stats
Expected behavior:
- [ ] Warning about using default stats
- [ ] Game still processes with NFL averages
- [ ] Prediction has lower confidence (since using defaults)

---

## 🔍 How to Verify Each Bug is Fixed

### Bug #1: Undefined Moneyline Odds ✅
**Test:** Look for games where The Odds API doesn't provide moneyline
**Expected:** Warning logged + odds estimated from spread + game processes
**Fail Condition:** TypeError or game skipped

### Bug #2: Missing Spread/Total ✅
**Test:** Check logs for warnings about missing spread or total
**Expected:** Default values used (0 for spread, 45 for total)
**Fail Condition:** NaN in predictions or crash

### Bug #3: Inverted Spread Pick ✅
**Test:** Find a road favorite game and check spread pick
**Expected:** Spread pick matches the favorite team
**Fail Condition:** Spread pick shows underdog instead of favorite

### Bug #4: NaN in drivesPerGame ✅
**Test:** Query predictions table for any NaN values
**Expected:** All numeric fields have valid numbers
**Fail Condition:** Any NaN in database

```sql
-- Run this query in Supabase SQL Editor
SELECT * FROM picks 
WHERE monte_carlo_results::text LIKE '%NaN%' 
  OR game_info::text LIKE '%NaN%';
```

### Bug #6: Timezone Issues ✅
**Test:** Check if Sunday night games have correct date
**Expected:** Sunday night 8 PM ET game shows Sunday date, not Monday
**Fail Condition:** Date is off by 1 day

### Bug #7: No Warning for Default Stats ✅
**Test:** Generate picks for a team not in database
**Expected:** Warning logged about using defaults
**Fail Condition:** No warning + prediction uses bad data

---

## 📊 Database Verification Queries

### Check for NaN Values
```sql
-- Should return 0 rows
SELECT 
  id,
  game_info->>'home_team' as home_team,
  game_info->>'away_team' as away_team,
  monte_carlo_results
FROM picks
WHERE 
  monte_carlo_results::text LIKE '%NaN%'
  OR game_info::text LIKE '%NaN%'
ORDER BY created_at DESC;
```

### Check Recent Predictions
```sql
-- View last 10 predictions
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  game_info->>'spread' as spread,
  spread_prediction,
  monte_carlo_results->>'spread_probability' as spread_prob,
  created_at
FROM picks
ORDER BY created_at DESC
LIMIT 10;
```

### Check for Missing Odds
```sql
-- Check if any predictions used estimated odds
SELECT 
  game_info->>'home_team' as home,
  game_info->>'away_team' as away,
  game_info->>'home_ml_odds' as home_ml,
  game_info->>'away_ml_odds' as away_ml,
  game_info->>'spread' as spread
FROM picks
WHERE 
  (game_info->>'home_ml_odds')::numeric BETWEEN -200 AND 200
  AND (game_info->>'away_ml_odds')::numeric BETWEEN -200 AND 200
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Success Criteria

All bugs are confirmed fixed when:

- [x] All games from The Odds API process successfully (no crashes)
- [x] Warnings appear for missing data but don't stop processing
- [x] No NaN values in predictions table
- [x] Spread picks correctly identify favorite/underdog
- [x] Road favorites show correct spread notation (team name + spread)
- [x] Games with missing stats use defaults and warn
- [x] Date fields are accurate (no timezone shift errors)

---

## 🆘 Troubleshooting

### Issue: Function won't deploy
**Solution:** Check for TypeScript errors first
```powershell
npm run build
```

### Issue: Can't see logs
**Solution:** Make sure you're logged into Supabase CLI
```powershell
supabase login
supabase link --project-ref [your-project-ref]
```

### Issue: Predictions not appearing in UI
**Solution:** Check that picks are being saved to database
```sql
SELECT COUNT(*) FROM picks WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Issue: Still seeing crashes
**Solution:** Check the specific error in logs
```powershell
supabase functions logs generate-predictions --tail
```
Look for the stack trace to identify which bug isn't fixed.

---

## 📞 Support Checklist

If issues persist after deployment:

1. [ ] Check Supabase function logs for exact error message
2. [ ] Verify all 5 files were updated correctly
3. [ ] Confirm edge function redeployed (check timestamp)
4. [ ] Run database queries to check for bad data
5. [ ] Test with a single game first before full week
6. [ ] Check browser console for frontend errors

---

**Remember:** Some warnings are EXPECTED! The key is that games process successfully despite missing data.
