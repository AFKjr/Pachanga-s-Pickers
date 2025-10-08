# Week 6 Prediction Generation Workflow

## 📋 Complete Admin Workflow

### Step 1: Add CSV Files ✅ (DONE)
You already have:
- ✅ `2025/Weekly Stats Offense/week 6 offense.csv`
- ✅ `2025/Weekly Stats Defense/week 6 defense.csv`

Both files include metadata:
```csv
# Week: 6
# Season: 2025
# Date Range: 2025-10-09 to 2025-10-13
```

### Step 2: Import to Database ✅ (READY)

1. **Navigate to Admin Panel**
   - Go to: `/admin` route in your app
   - Click on "Team Stats" tab

2. **Import Week 6 Offense Stats**
   - Click "CSV Import" button
   - Select file: `2025/Weekly Stats Offense/week 6 offense.csv`
   - The parser will auto-detect: **Week 6, Season 2025**
   - Click "Parse & Import"
   - Verify: Should show 32 teams imported

3. **Import Week 6 Defense Stats**
   - Click "CSV Import" button again
   - Select file: `2025/Weekly Stats Defense/week 6 defense.csv`
   - Auto-detects: **Week 6, Season 2025**
   - Click "Parse & Import"
   - Verify: Should update 32 teams with defensive stats

### Step 3: Verify Data Import

Run this query in Supabase SQL Editor:

```sql
-- Check Week 6 data
SELECT 
  team_name,
  week,
  season_year,
  points_per_game,
  offensive_yards_per_game,
  defensive_yards_allowed,
  third_down_conversion_rate,
  red_zone_efficiency
FROM team_stats_cache
WHERE week = 6 AND season_year = 2025
ORDER BY team_name;
```

**Expected:** 32 rows (one per NFL team)

### Step 4: Generate Week 6 Predictions 🎯

1. **Navigate to Generate Picks**
   - Go to: `/admin` → "Generate Picks" tab
   - You'll see the `APIPredictionsGenerator` component

2. **How It Works**
   
   When you click "Generate Predictions":
   
   **a) Fetches Current NFL Games**
   - Calls The Odds API for upcoming games
   - Gets spreads, totals, and game times
   - Filters for games happening this week
   
   **b) Loads Team Stats from Database**
   - For each game, fetches **home team** and **away team** stats
   - Query: `team_stats_cache` WHERE `season_year=2025` ORDER BY `week DESC` LIMIT 1
   - **Automatically uses your Week 6 data!** (most recent week)
   
   **c) Fetches Weather Data** (optional)
   - Uses OpenWeather API if `OPENWEATHER_API_KEY` is set
   - Adjusts predictions for weather conditions
   
   **d) Runs Monte Carlo Simulation**
   - Simulates each game 10,000 times
   - Uses actual team stats from your CSV imports
   - Calculates win probability, score predictions
   
   **e) Saves Predictions to Database**
   - Stores in `picks` table
   - Includes: prediction, confidence, reasoning, Monte Carlo results
   - Auto-pins as admin picks

3. **Click "Generate Predictions" Button**
   
   The system will:
   - ⏳ Show loading indicator
   - 📊 Process each game (~15-30 seconds per game)
   - ✅ Display success message with count
   - 📋 Show list of generated predictions

### Step 5: Review Generated Predictions

After generation completes:

1. **View on Admin Panel**
   - Go to "Manage Picks" tab
   - Filter by: Week 6
   - See all generated predictions

2. **Review Each Prediction**
   - Check confidence scores
   - Review reasoning
   - View Monte Carlo simulation results
   - Verify spreads and totals match Odds API

3. **Edit if Needed**
   - Adjust prediction text
   - Modify confidence scores
   - Update reasoning

4. **Publish to Users**
   - Predictions are automatically visible on homepage
   - Users can see Week 6 picks immediately

---

## 🔧 Technical Details

### API Endpoint
- **URL:** `/api/generate-predictions`
- **Method:** POST
- **Auth:** Requires Bearer token (automatic in admin panel)

### Data Flow
```
[Odds API] → [Game Data]
     ↓
[Supabase DB: team_stats_cache] → [Week 6 Stats]
     ↓
[Monte Carlo Simulation] → [10,000 iterations per game]
     ↓
[OpenWeather API] → [Weather adjustments (optional)]
     ↓
[Supabase DB: picks] → [Saved predictions]
     ↓
[Homepage] → [Visible to users]
```

### Team Stats Query
```typescript
// Automatically gets most recent week (Week 6)
const query = `${supabaseUrl}/rest/v1/team_stats_cache?
  team_name=eq.${teamName}&
  season_year=eq.2025&
  order=week.desc&
  limit=1&
  select=*`;
```

### Prediction Format
```typescript
{
  game_info: {
    home_team: "Kansas City Chiefs",
    away_team: "Denver Broncos",
    league: "NFL",
    game_date: "2025-10-XX",
    spread: -7.5,
    over_under: 45.5
  },
  prediction: "Chiefs win by 10+",
  confidence: 78,
  reasoning: "Based on 10,000 Monte Carlo simulations using Week 6 stats...",
  monte_carlo_results: {
    home_win_probability: 78.5,
    away_win_probability: 21.5,
    average_home_score: 28.3,
    average_away_score: 18.1,
    spread_cover_probability: 65.2
  },
  weather: { /* weather data if available */ },
  week: 6
}
```

---

## 🐛 Troubleshooting

### Issue: "No games available"
**Solution:** The Odds API only shows games ~3-7 days in advance. Check closer to game day.

### Issue: "Using default stats"
**Solution:** 
1. Check if Week 6 data is imported: Run SQL validation query
2. Verify team names match between Odds API and your database
3. Check console logs for team name resolution

### Issue: "Weather data unavailable"
**Solution:** Weather API key might be missing. Predictions still work without weather.

### Issue: Predictions seem inaccurate
**Possible causes:**
1. CSV data not imported correctly
2. Using default fallback stats instead of actual data
3. Check logs to see which stats are being used

---

## ✅ Verification Checklist

Before generating predictions:
- [ ] Week 6 CSV files uploaded
- [ ] Offense stats imported (32 teams)
- [ ] Defense stats imported (32 teams)
- [ ] Database validation query returns 32 rows
- [ ] Admin panel shows "Week 6" in dropdown
- [ ] Team stats display correct Week 6 data

After generating predictions:
- [ ] All games processed successfully
- [ ] Predictions saved to database
- [ ] Confidence scores seem reasonable (50-90%)
- [ ] Reasoning mentions "Week 6 stats"
- [ ] Predictions visible on homepage
- [ ] Monte Carlo results included

---

## 📊 Expected Results

For a typical NFL week, you should get:
- **14-16 games** (Thursday, Sunday, Monday)
- **Processing time:** 5-10 minutes total
- **Confidence range:** 55-85% typical
- **Success rate:** Should be 100% if data is imported correctly

---

## 🎯 Next Steps

1. **Go to Admin Panel** → Team Stats → Import Week 6 CSVs
2. **Verify Import** → Check database has 32 teams with Week 6 data
3. **Generate Picks** → Navigate to Generate Picks tab
4. **Click Button** → Wait for predictions to process
5. **Review Results** → Check Manage Picks tab
6. **Publish** → Predictions automatically visible to users!

---

## 🚀 Pro Tips

- **Import data early in the week** (Tuesday/Wednesday)
- **Generate predictions 24-48 hours before games** for latest odds
- **Re-generate if needed** - system will update existing picks
- **Monitor console logs** in browser dev tools for debugging
- **Check Vercel logs** for API-side issues

Your Week 6 stats are ready - just import and generate! 🎉
