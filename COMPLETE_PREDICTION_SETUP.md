# Complete Prediction Generation Setup Guide

## 🎯 Overview

This guide walks you through generating NFL predictions using Monte Carlo simulations (no AI needed!).

---

## ✅ Prerequisites Checklist

Before generating predictions, ensure you have:

- [ ] **Week 6 CSV files** in `2025/Weekly Stats Offense` and `2025/Weekly Stats Defense`
- [ ] **Environment variables** set correctly (see below)
- [ ] **Supabase database** setup with `team_stats_cache` table
- [ ] **The Odds API key** (get free at [the-odds-api.com](https://the-odds-api.com/))
- [ ] **OpenWeather API key** (optional, get at [openweathermap.org](https://openweathermap.org/api))

---

## 📝 Step 1: Environment Variables

### Local Development (.env file)

Your `.env` file should have:

```properties
# Supabase Configuration
VITE_SUPABASE_URL=https://wbfvfzrxdqwrnqmpnfel.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Also for Vercel API routes
SUPABASE_URL=https://wbfvfzrxdqwrnqmpnfel.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# The Odds API
VITE_ODDS_API_KEY=your-odds-api-key
ODDS_API_KEY=your-odds-api-key

# OpenWeather API (optional)
VITE_OPENWEATHER_API_KEY=your-weather-key
OPENWEATHER_API_KEY=your-weather-key

NODE_ENV=development
```

### Vercel Production

**Important:** You must also set these in Vercel Dashboard!

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ODDS_API_KEY`
   - `VITE_ODDS_API_KEY`
   - `OPENWEATHER_API_KEY` (optional)
   - `VITE_OPENWEATHER_API_KEY` (optional)

5. **Redeploy** your application after adding variables

---

## 📊 Step 2: Import Week 6 Stats

### Navigate to Admin Panel

```
https://your-app.vercel.app/admin
```

Or locally:
```
http://localhost:5173/admin
```

### Import Offensive Stats

1. Click **"Team Stats"** tab
2. Click **"CSV Import"** button
3. Select file: `2025/Weekly Stats Offense/week 6 offense.csv`
4. System auto-detects: ✅ **Week 6, Season 2025**
5. Click **"Parse & Import"**
6. Wait for success: **"32 teams imported"**

### Import Defensive Stats

1. Click **"CSV Import"** button again
2. Select file: `2025/Weekly Stats Defense/week 6 defense.csv`
3. System auto-detects: ✅ **Week 6, Season 2025**
4. Click **"Parse & Import"**
5. Wait for success: **"32 teams updated with defense stats"**

### Verify Import

Run this in Supabase SQL Editor:

```sql
SELECT 
  team_name,
  week,
  season_year,
  points_per_game,
  offensive_yards_per_game,
  defensive_yards_allowed
FROM team_stats_cache
WHERE week = 6 AND season_year = 2025
ORDER BY team_name;
```

**Expected:** 32 rows (one per NFL team)

---

## 🤖 Step 3: Generate Predictions

### Navigate to Generate Picks

1. Go to `/admin` → **"Generate Picks"** tab
2. You'll see the **"Generate Monte Carlo Predictions"** panel

### Click "Generate Predictions"

**What Happens:**

```
1. ✅ Fetches upcoming NFL games from The Odds API
   - Gets spreads, totals, game times
   - Filters for current week games
   
2. ✅ Loads team stats from database
   - Queries: team_stats_cache WHERE season_year=2025
   - ORDER BY week DESC LIMIT 1 (gets Week 6 automatically!)
   
3. ✅ Fetches weather data (if API key set)
   - Gets conditions for game location
   - Adjusts predictions for weather
   
4. ✅ Runs Monte Carlo simulation
   - 10,000 iterations per game
   - Uses actual Week 6 stats from CSVs
   - Calculates win probability, scores
   
5. ✅ Saves predictions to database
   - Stores in picks table
   - Auto-pins as admin picks
   - Visible to all users on homepage
```

### Expected Timeline

- **Processing time:** 5-10 minutes for ~14 games
- **Status updates:** Shows in browser console
- **Success message:** "Successfully saved X predictions!"

### Troubleshooting

If you see **"Error: FUNCTION_INVOCATION_FAILED"**:

1. Check Vercel environment variables are set
2. Check Odds API key is valid
3. Check Week 6 stats are imported
4. See `TROUBLESHOOTING_PREDICTIONS.md` for detailed help

---

## 📋 Step 4: Review Predictions

### Navigate to Manage Picks

1. Go to `/admin` → **"Manage Picks"** tab
2. Filter by **"Week 6"**

### What to Review

Each prediction shows:

- **Game matchup:** Away Team @ Home Team
- **Moneyline prediction:** Which team wins
- **Win probability:** Based on 10,000 simulations
- **Score prediction:** Average score from simulations
- **Spread prediction:** ATS pick with confidence
- **Total prediction:** Over/Under with confidence
- **Reasoning:** Explains the prediction logic
- **Monte Carlo results:** Full simulation statistics

### Edit if Needed

You can:
- Adjust prediction text
- Modify confidence scores
- Update reasoning
- Change spread/total picks

---

## 🎉 Step 5: Publish to Users

Predictions are **automatically visible** on the homepage!

Users will see:
- Week 6 picks on main feed
- Win probabilities
- Score predictions
- Confidence levels
- Reasoning for each pick

---

## 🔍 Understanding the Predictions

### Moneyline (ML)

- **Prediction:** Which team wins outright
- **Probability:** % chance of winning (from 10,000 simulations)
- **Confidence:** How strong the prediction is (55-90% typical)

### Against the Spread (ATS)

- **Prediction:** Which team covers the spread
- **Spread:** Point differential line (e.g., -7.5)
- **Probability:** % chance of covering spread

### Over/Under (O/U)

- **Prediction:** Total points over or under line
- **Line:** Total points line (e.g., 45.5)
- **Probability:** % chance of going over/under

### Monte Carlo Results

Each prediction includes:
```json
{
  "home_win_probability": 78.5,
  "away_win_probability": 21.5,
  "predicted_home_score": 28,
  "predicted_away_score": 18,
  "spread_cover_probability": 65.2,
  "over_probability": 58.3,
  "under_probability": 41.7,
  "iterations": 10000
}
```

---

## 🧪 Testing the System

### Test 1: Verify Team Stats

```sql
-- Should return Week 6 data for all 32 teams
SELECT COUNT(*) as team_count, week, season_year
FROM team_stats_cache
WHERE season_year = 2025
GROUP BY week, season_year
ORDER BY week DESC;
```

### Test 2: Check API Endpoint

Access in browser:
```
https://your-app.vercel.app/api/test-env
```

Should show:
```json
{
  "hasSupabaseUrl": true,
  "hasSupabaseKey": true,
  "hasOddsKey": true,
  "hasWeatherKey": true
}
```

### Test 3: Verify Predictions Saved

```sql
-- Check Week 6 predictions exist
SELECT 
  id,
  prediction,
  confidence,
  week,
  created_at
FROM picks
WHERE week = 6
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Expected Results

For a typical NFL week:

- **Games:** 14-16 (Thursday, Sunday, Monday)
- **Processing time:** 5-10 minutes total
- **Success rate:** 100% if data imported correctly
- **Confidence range:** 55-90% typical
- **Predictions include:**
  - Moneyline pick + probability
  - ATS pick + probability
  - O/U pick + probability
  - Score prediction
  - Full reasoning
  - Weather impact (if available)

---

## 🚀 Quick Reference Commands

### Import Stats
```
/admin → Team Stats → CSV Import
→ Select offense CSV → Parse & Import
→ Select defense CSV → Parse & Import
```

### Generate Predictions
```
/admin → Generate Picks → Generate Predictions
```

### Review Results
```
/admin → Manage Picks → Filter by Week 6
```

### Verify Database
```sql
-- Check stats imported
SELECT COUNT(*) FROM team_stats_cache WHERE week = 6;

-- Check predictions generated
SELECT COUNT(*) FROM picks WHERE week = 6;
```

---

## ⚡ Pro Tips

1. **Import early:** Import Week 6 stats on Tuesday/Wednesday
2. **Generate 24-48 hours before:** Gets latest odds from The Odds API
3. **Re-generate if needed:** System updates existing picks
4. **Monitor console:** Check browser dev tools for debugging
5. **Check Vercel logs:** For API-side issues
6. **Weather matters:** Predictions improve with weather data

---

## 🎯 Success Indicators

✅ **Stats Imported:**
- 32 teams in database for Week 6
- All offensive & defensive metrics populated

✅ **Predictions Generated:**
- 14-16 games processed
- All have confidence scores 55-90%
- Monte Carlo results included
- Reasoning mentions "Week 6 stats"

✅ **Visible to Users:**
- Picks appear on homepage
- Users can see all prediction details
- Week 6 filter works correctly

---

## 📚 Additional Resources

- `WEEK_6_PREDICTION_WORKFLOW.md` - Detailed workflow
- `TROUBLESHOOTING_PREDICTIONS.md` - Error solutions
- `DATABASE_VALIDATION_REPORT.md` - Schema validation
- `SUPABASE_VSCODE_SETUP.md` - Dev environment setup

---

## 🆘 Need Help?

1. Check browser console for client errors
2. Check Vercel logs for server errors
3. Verify environment variables in Vercel
4. Confirm Week 6 data in database
5. Test Odds API key separately
6. Review `TROUBLESHOOTING_PREDICTIONS.md`

Your Monte Carlo prediction system is ready to go! 🎉
