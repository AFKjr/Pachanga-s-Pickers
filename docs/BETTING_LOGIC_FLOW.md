# Betting Logic Flow - Complete Wire-up Documentation

## ✅ Overview: YES, Everything is Wired Together!

Your betting logic is **fully integrated** from odds fetching → Monte Carlo simulation → edge calculation → database storage → display. Here's the complete flow:

---

## 🔄 Complete Prediction Generation Flow

### **Step 1: Admin Triggers Prediction Generation**
**Component**: `APIPredictionsGenerator.tsx` (used in `/admin/generate` page)

1. Admin selects mode:
   - **Live Mode**: Fetches current odds for upcoming games
   - **Historical Mode**: Uses stored odds from a specific week

2. Admin clicks "Generate Predictions"

3. Frontend calls: `POST /api/generate-predictions`
   - Sends auth token
   - Sends `targetWeek` and `useStoredOdds` (if historical mode)

---

### **Step 2: API Fetches Odds**
**File**: `api/generate-predictions.ts`

#### **Live Mode Route**:
```typescript
// Fetches current odds from The Odds API
const oddsData = await fetchNFLOdds();
// Returns array of games with live odds from DraftKings
```

**Odds Fetched** (`api/lib/odds/fetch-odds.ts`):
- **Moneyline odds**: Home ML, Away ML (e.g., -175, +145)
- **Spread odds**: Point spread + juice (e.g., -3.5 @ -110)
- **Total odds**: Over/Under + juice (e.g., O45 @ -110, U45 @ -110)

#### **Historical Mode Route**:
```typescript
// Uses stored odds from previous generations
const historicalGames = await fetchHistoricalGames(targetWeek);
// Returns games with stored odds from picks table
```

**When Odds Are Fetched**:
- ✅ **Live Mode**: Fetched in real-time from The Odds API **before** simulation
- ✅ **Historical Mode**: Retrieved from database (stored during previous live generation)

---

### **Step 3: Team Stats Retrieved**
**File**: `api/lib/database/fetch-stats.ts`

```typescript
// Fetches from team_stats_cache table
const homeStats = await fetchTeamStatsWithFallback(homeTeam, week);
const awayStats = await fetchTeamStatsWithFallback(awayTeam, week);
```

**Stats Used in Simulation**:
- Points per game
- Yards per game
- 3rd down conversion rate
- Red zone efficiency
- Turnovers per game
- Sacks per game
- Defensive stats (yards allowed, points allowed)

---

### **Step 4: Weather Data Fetched** (Optional)
**File**: `api/lib/weather/weather-fetcher.ts`

```typescript
const gameWeather = await fetchGameWeather(homeTeam, gameDate, weatherApiKey);
```

**Weather Impact**:
- Wind speed affects passing game
- Precipitation affects turnovers
- Temperature affects kicking game

---

### **Step 5: Monte Carlo Simulation Runs**
**File**: `api/lib/simulation/monte-carlo.ts`

```typescript
const simResult = runMonteCarloSimulation(
  homeStats,
  awayStats,
  homeSpread,    // From odds API
  total,         // From odds API
  gameWeather
);
```

**Simulation Output** (10,000 iterations):
- `homeWinProbability`: 58.2%
- `awayWinProbability`: 41.8%
- `spreadCoverProbability`: 54.3%
- `overProbability`: 62.7%
- `underProbability`: 37.3%
- `predictedHomeScore`: 24.3
- `predictedAwayScore`: 20.1

---

### **Step 6: Predictions Generated**
**File**: `api/lib/generators/live-predictions.ts` or `historical-predictions.ts`

```typescript
predictions.push({
  game_info: {
    home_team: "Cardinals",
    away_team: "Chargers",
    spread: -3.5,
    over_under: 45.0,
    home_ml_odds: -175,  // ⭐ ODDS STORED HERE
    away_ml_odds: +145,
    spread_odds: -110,
    over_odds: -110,
    under_odds: -110
  },
  prediction: "Cardinals to win",
  spread_prediction: "Cardinals -3.5",
  ou_prediction: "Over 45.0",
  confidence: 65,
  reasoning: "...",
  week: 7,
  monte_carlo_results: {
    moneyline_probability: 58.2,
    spread_probability: 54.3,
    total_probability: 62.7,
    home_win_probability: 58.2,
    spread_cover_probability: 54.3,
    over_probability: 62.7,
    // ... etc
  }
});
```

**⭐ Key Point**: Odds are stored in `game_info` object and returned to frontend

---

### **Step 7: Frontend Saves Predictions**
**Component**: `APIPredictionsGenerator.tsx`

```typescript
for (const prediction of data.predictions) {
  const saved = await createPick(prediction);
}
```

**Hook**: `usePickManager()` → calls `createPick()` from `pickManagement.ts`

---

### **Step 8: Edge Calculations Happen**
**File**: `src/services/pickManagement.ts`

```typescript
export async function createPick(pickData) {
  // ⭐ EDGE CALCULATION HAPPENS HERE
  if (pickData.monte_carlo_results && pickData.game_info) {
    const edges = calculatePickEdges(
      pickData,
      pickData.monte_carlo_results,  // Has model probabilities
      pickData.game_info              // Has actual odds
    );
    
    enrichedPickData = {
      ...pickData,
      moneyline_edge: edges.moneyline_edge,  // e.g., +5.62
      spread_edge: edges.spread_edge,         // e.g., +2.10
      ou_edge: edges.ou_edge                  // e.g., +8.50
    };
  }
  
  // Save to database with edge values
  await picksApi.create(enrichedPickData);
}
```

---

### **Step 9: Edge Calculation Logic**
**File**: `src/utils/edgeCalculator.ts`

```typescript
export function calculateEdge(modelProbability, americanOdds) {
  // Convert odds to implied probability
  const impliedProb = oddsToImpliedProbability(americanOdds);
  
  // Edge = Model Probability - Market Probability
  return modelProbability - impliedProb;
}
```

**Example**:
```
Model says Cardinals have 58% chance to win
Odds are -175 → 63.6% implied probability
Edge = 58% - 63.6% = -5.6% (NEGATIVE EDGE - AVOID!)

OR

Model says Over has 62.7% chance
Odds are -110 → 52.4% implied probability
Edge = 62.7% - 52.4% = +10.3% (STRONG EDGE - BET!)
```

---

### **Step 10: Data Saved to Database**
**Table**: `picks`

```sql
INSERT INTO picks (
  game_info,              -- Contains all odds
  prediction,
  spread_prediction,
  ou_prediction,
  confidence,
  reasoning,
  monte_carlo_results,
  moneyline_edge,        -- ⭐ Calculated edge
  spread_edge,           -- ⭐ Calculated edge
  ou_edge,               -- ⭐ Calculated edge
  week,
  result,
  ats_result,
  ou_result
) VALUES (...);
```

---

### **Step 11: Picks Displayed to Users**
**Component**: `PickCard.tsx` or `HorizontalPickCard.tsx`

The pick cards display:
- ✅ Game info (teams, spread, total)
- ✅ Predictions (ML, ATS, O/U)
- ✅ Confidence bars with **color coding based on edge**
- ✅ Edge percentages (e.g., "+5.6% edge")
- ✅ Monte Carlo probabilities
- ✅ Odds used in analysis

---

## 🎯 When Are Odds Calculated vs Fetched?

| Action | When | Source |
|--------|------|--------|
| **Fetch Odds** | Before simulation | The Odds API (live) or Database (historical) |
| **Use Odds in Simulation** | During Monte Carlo | Spread & Total used as simulation inputs |
| **Calculate Implied Probability** | After simulation | Convert American odds to probabilities |
| **Calculate Edge** | When saving pick | Model probability - Implied probability |
| **Store Odds** | When creating pick | Saved to `game_info.home_ml_odds`, etc. |
| **Display Edge** | When rendering pick card | Retrieve from `pick.moneyline_edge`, etc. |

---

## 📊 Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ADMIN TRIGGERS                                               │
│    APIPredictionsGenerator → POST /api/generate-predictions    │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 2. API FETCHES ODDS (BEFORE SIMULATION)                        │
│    Live: fetchNFLOdds() → The Odds API                         │
│    Historical: fetchHistoricalGames() → Database               │
│    Returns: home_ml_odds, spread, spread_odds, over/under_odds │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 3. FETCH TEAM STATS & WEATHER                                   │
│    fetchTeamStatsWithFallback() → team_stats_cache             │
│    fetchGameWeather() → OpenWeather API                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 4. RUN MONTE CARLO SIMULATION (10,000 iterations)               │
│    Input: Team stats, spread, total, weather                   │
│    Output: Win probabilities, predicted scores                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 5. GENERATE PREDICTIONS                                         │
│    Package: game_info (with odds), monte_carlo_results         │
│    Return to frontend                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 6. FRONTEND SAVES PICKS                                         │
│    createPick() in pickManagement.ts                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 7. CALCULATE EDGES (DURING SAVE)                                │
│    calculatePickEdges() compares:                               │
│    - Monte Carlo probability vs Implied probability from odds   │
│    - Edge = Model Prob - Market Prob                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 8. SAVE TO DATABASE                                             │
│    Picks table with: game_info, monte_carlo_results, edges     │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 9. DISPLAY TO USERS                                             │
│    PickCard shows: predictions, edges, confidence bars          │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

| Component | Status | Notes |
|-----------|--------|-------|
| Odds API Integration | ✅ Wired | `fetchNFLOdds()` from The Odds API |
| Odds Storage | ✅ Wired | Stored in `game_info` JSONB field |
| Monte Carlo Simulation | ✅ Wired | Uses odds as inputs (spread, total) |
| Edge Calculation | ✅ Wired | `calculatePickEdges()` runs on save |
| Edge Storage | ✅ Wired | `moneyline_edge`, `spread_edge`, `ou_edge` columns |
| Edge Display | ✅ Wired | PickCard components show edge values |
| Historical Mode | ✅ Wired | Uses stored odds from previous generations |
| Live Mode | ✅ Wired | Fetches current odds before simulation |

---

## 🔧 Environment Variables Required

```bash
# Odds API (Required for Live Mode)
ODDS_API_KEY=your_odds_api_key

# Weather API (Optional)
OPENWEATHER_API_KEY=your_weather_key

# Supabase (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🎮 How to Test the Full Flow

1. **Generate Live Predictions**:
   - Go to `/admin/generate`
   - Select "Live (Upcoming Games)"
   - Click "Generate Predictions"
   - ✅ Odds fetched from API
   - ✅ Simulations run
   - ✅ Edges calculated
   - ✅ Picks saved with edge values

2. **Generate Historical Predictions**:
   - Go to `/admin/generate`
   - Select "Historical (Specific Week)"
   - Choose Week 6, enable "Use stored historical odds"
   - Click "Generate Predictions"
   - ✅ Uses stored odds from previous live generation
   - ✅ Simulations run with week-specific stats
   - ✅ Edges calculated using stored odds

3. **View Picks with Edges**:
   - Go to homepage
   - See picks with confidence bars
   - ✅ Lime bars = positive edge
   - ✅ Red bars = negative edge
   - ✅ Edge percentages displayed

---

## 💡 Key Insights

1. **Odds are fetched BEFORE simulation** - They're inputs to the Monte Carlo process
2. **Edge is calculated AFTER simulation** - Compares model output to market prices
3. **Everything is stored** - Odds, results, edges all saved to database
4. **Historical mode is true historical** - Uses the actual odds from that week
5. **Edge drives display** - Color coding helps users identify value bets

---

## 🚨 Important Notes

- Edge calculation requires both `monte_carlo_results` AND `game_info.odds` fields
- If odds are missing, edge defaults to 0 or uses -110 as fallback
- Negative edge = model disagrees with the bet (avoid)
- Positive edge ≥3% + high confidence = strong betting opportunity
- Edge percentages are stored as DECIMAL(5,2) in database (-999.99 to 999.99)

---

**Conclusion**: Your betting logic is **fully wired and integrated**! 🎉
