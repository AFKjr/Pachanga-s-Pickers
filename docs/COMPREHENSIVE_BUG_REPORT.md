# Comprehensive Bug Report - Sports Betting Forum Prediction System

**Date:** October 15, 2025  
**Analysis Type:** Full Codebase Audit  
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

---

## 🔴 **CRITICAL BUGS (System Breaking)**

### BUG #1: Undefined Moneyline Odds Cause Random Failures
**File:** `supabase/functions/generate-predictions/lib/generators/live-predictions.ts` (Line 117)  
**Severity:** 🔴 CRITICAL

**Issue:**
```typescript
const favoriteInfo = determineFavorite(odds.homeMLOdds, odds.awayMLOdds);
```

`odds.homeMLOdds` and `odds.awayMLOdds` can be **undefined** (they're optional in the `ExtractedOdds` type), but `determineFavorite()` expects `number` parameters.

**Impact:**
- When The Odds API doesn't return moneyline odds for a game, this causes TypeError
- Function receives `undefined` values → comparison fails → wrong favorite determination
- Games with missing ML odds are randomly processed incorrectly or fail

**Root Cause:**
```typescript
// In fetch-odds.ts
export interface ExtractedOdds {
  homeMLOdds?: number;  // ❌ Optional - can be undefined
  awayMLOdds?: number;  // ❌ Optional - can be undefined
}

// In monte-carlo.ts
function determineFavorite(homeMoneyline: number, awayMoneyline: number) {
  if (homeMoneyline < awayMoneyline) {  // ❌ Breaks if undefined
```

**Recommended Fix:**
```typescript
// Option 1: Provide defaults in live-predictions.ts
const favoriteInfo = determineFavorite(
  odds.homeMLOdds ?? -110,  // Default to slight favorite
  odds.awayMLOdds ?? +110
);

// Option 2: Make determineFavorite handle undefined
function determineFavorite(homeMoneyline?: number, awayMoneyline?: number): {
  if (!homeMoneyline || !awayMoneyline) {
    // Fallback to spread to determine favorite
    return { favoriteIsHome: true, favoriteTeam: 'home', underdogTeam: 'away' };
  }
  // ... rest of logic
}
```

---

### BUG #2: Missing Null Check for Spread/Total Odds
**File:** `supabase/functions/generate-predictions/lib/generators/live-predictions.ts` (Lines 122-127)  
**Severity:** 🔴 CRITICAL

**Issue:**
```typescript
const simResult = runMonteCarloSimulation(
  homeStats,
  awayStats,
  odds.homeSpread,  // Can be 0 (valid) or undefined
  odds.total,       // Can be undefined
  gameWeather,
  favoriteInfo.favoriteIsHome
);
```

**Impact:**
- If `odds.total` is undefined, Monte Carlo simulation uses `NaN` for total
- Over/Under calculations become invalid
- Games without totals market fail silently

**Root Cause:**
```typescript
// In fetch-odds.ts
const total = totalsMarket?.outcomes[0]?.point || 45;  // Defaults to 45
```

Default of 45 is applied, but if `totalsMarket` is missing entirely, `total` could be undefined before the `|| 45` kicks in.

**Recommended Fix:**
```typescript
const odds = extractOddsFromGame(game);

// Validate critical odds exist
if (odds.homeMLOdds === undefined || odds.awayMLOdds === undefined) {
  console.warn(`⚠️ Skipping ${game.away_team} @ ${game.home_team}: Missing moneyline odds`);
  errors.push({
    game: `${game.away_team} @ ${game.home_team}`,
    error: 'Missing moneyline odds'
  });
  continue;  // Skip this game
}

// Ensure total has valid default
const total = odds.total ?? 45;
const spread = odds.homeSpread ?? 0;
```

---

## 🟠 **HIGH SEVERITY BUGS (Data Integrity)**

### BUG #3: Inconsistent Spread Cover Probability Logic
**File:** `supabase/functions/generate-predictions/lib/generators/live-predictions.ts` (Line 136)  
**Severity:** 🟠 HIGH

**Issue:**
```typescript
const spreadPick = simResult.spreadCoverProbability > 50
  ? `${game.home_team} ${odds.homeSpread > 0 ? '+' : ''}${odds.homeSpread}`
  : `${game.away_team} ${-odds.homeSpread > 0 ? '+' : ''}${-odds.homeSpread}`;
```

This logic assumes `spreadCoverProbability` represents HOME team covering, but it actually represents the **FAVORITE** covering (after our recent changes).

**Impact:**
- Spread pick can be inverted (picks wrong side)
- If home team is underdog but has >50% spreadCoverProbability, logic picks home team incorrectly
- Edge calculations become misaligned

**Example Scenario:**
```
Game: Raiders @ Chiefs
Spread: Chiefs -7.5 (Chiefs are favorite at home)
favoriteCoverProbability: 62%  (Chiefs cover 62% of time)
spreadCoverProbability: 62% (aliased to favoriteCoverProbability)

Current logic: 62% > 50 → picks Chiefs -7.5 ✅ CORRECT (by luck)

BUT if Chiefs were away:
Game: Chiefs @ Raiders  
Spread: Chiefs -7.5 (Chiefs are favorite on road)
favoriteCoverProbability: 62%
spreadCoverProbability: 62%

Current logic: 62% > 50 → picks Raiders +7.5 ❌ WRONG! Should pick Chiefs -7.5
```

**Recommended Fix:**
```typescript
// Use favoriteInfo to determine correct spread pick
const spreadPick = simResult.favoriteCoverProbability > 50
  ? favoriteInfo.favoriteIsHome
    ? `${game.home_team} ${odds.homeSpread > 0 ? '+' : ''}${odds.homeSpread}`
    : `${game.away_team} ${-odds.homeSpread > 0 ? '+' : ''}${-odds.homeSpread}`
  : favoriteInfo.favoriteIsHome
    ? `${game.away_team} ${-odds.homeSpread > 0 ? '+' : ''}${-odds.homeSpread}`
    : `${game.home_team} ${odds.homeSpread > 0 ? '+' : ''}${odds.homeSpread}`;

const spreadProb = Math.max(simResult.favoriteCoverProbability, simResult.underdogCoverProbability);
```

---

### BUG #4: Drive Stats Calculation Can Return NaN
**File:** `supabase/functions/generate-predictions/lib/database/fetch-stats.ts` (Line 106)  
**Severity:** 🟠 HIGH

**Issue:**
```typescript
drivesPerGame: dbStats.drives_per_game ?? (dbStats.total_plays / dbStats.games_played / 5.5),
```

If `dbStats.drives_per_game` is null/undefined AND `dbStats.total_plays` or `dbStats.games_played` are also null/undefined, this returns `NaN`.

**Impact:**
- Monte Carlo simulation uses `NaN` for possessions per team
- Entire game simulation produces invalid scores
- Games with incomplete stats fail

**Recommended Fix:**
```typescript
drivesPerGame: dbStats.drives_per_game ?? 
  (dbStats.total_plays && dbStats.games_played 
    ? dbStats.total_plays / dbStats.games_played / 5.5 
    : 11.0),  // NFL average
```

---

## 🟡 **MEDIUM SEVERITY BUGS (Logic Issues)**

### BUG #5: Duplicate Week Calculation Functions
**File:** `supabase/functions/generate-predictions/lib/utils/nfl-utils.ts`  
**Severity:** 🟡 MEDIUM

**Issue:**
Two different functions calculate NFL week:
1. `getNFLWeekFromDate()` - Uses hardcoded schedule (lines 4-46)
2. `calculateNFLWeek()` - Uses math formula (lines 87-92)

These can give **different results** for the same date!

**Impact:**
- `live-predictions.ts` line 41 uses `getNFLWeekFromDate()` for logging
- `live-predictions.ts` line 188 uses `calculateNFLWeek()` for storing week
- Week stored in database might not match week logged in console
- Filtering by week becomes unreliable

**Recommended Fix:**
Remove `calculateNFLWeek()` and use `getNFLWeekFromDate()` everywhere:
```typescript
week: getNFLWeekFromDate(new Date(game.commence_time)) || 1,
```

---

### BUG #6: Date Timezone Conversion Issues
**File:** `supabase/functions/generate-predictions/lib/generators/live-predictions.ts` (Lines 147-150)  
**Severity:** 🟡 MEDIUM

**Issue:**
```typescript
const gameDateTime = new Date(game.commence_time);
const estOffset = 5 * 60 * 60 * 1000;
const estDate = new Date(gameDateTime.getTime() - estOffset);
const formattedDate = estDate.toISOString().split('T')[0];
```

This assumes Eastern Time (EST) is always UTC-5, but:
- During Daylight Saving Time, Eastern is UTC-4 (EDT)
- Game times from The Odds API are already in UTC
- Subtracting 5 hours can shift date to wrong day

**Impact:**
- Games on Sunday night (e.g., 8 PM ET = 1 AM UTC Monday) get stored with Monday date
- Week filtering becomes inconsistent
- Display shows wrong game date

**Recommended Fix:**
```typescript
// Don't convert timezone - store UTC date and let frontend handle display
const formattedDate = game.commence_time.split('T')[0];
```

---

### BUG #7: Missing Validation for Team Stats
**File:** `supabase/functions/generate-predictions/lib/generators/live-predictions.ts` (Lines 87-89)  
**Severity:** 🟡 MEDIUM

**Issue:**
```typescript
const homeStats = await fetchTeamStatsWithFallback(game.home_team, supabaseUrl, supabaseKey, rapidApiKey);
const awayStats = await fetchTeamStatsWithFallback(game.away_team, supabaseUrl, supabaseKey, rapidApiKey);
```

`fetchTeamStatsWithFallback()` always returns a TeamStats object (uses defaults if not found), but doesn't indicate if it's using real data or defaults.

**Impact:**
- No way to know if prediction is based on real stats or default stats
- Can't skip games with missing stats
- Predictions for new teams use generic defaults (inaccurate)

**Recommended Fix:**
```typescript
const homeStats = await fetchTeamStatsWithFallback(game.home_team, ...);
const awayStats = await fetchTeamStatsWithFallback(game.away_team, ...);

// Warn if using defaults
if (homeStats.team !== game.home_team) {
  console.warn(`⚠️ Using default stats for ${game.home_team}`);
}
if (awayStats.team !== game.away_team) {
  console.warn(`⚠️ Using default stats for ${game.away_team}`);
}
```

---

## 🔵 **LOW SEVERITY BUGS (Minor Issues)**

### BUG #8: Opponent Edge Calculation is Approximation
**File:** `src/components/HorizontalPickCard.tsx` (Lines 139-142)  
**Severity:** 🔵 LOW

**Issue:**
```typescript
const calcOppEdge = (edge?: number): string => {
  if (!edge) return '-0.0';
  return formatEdge(-edge - 1.5); // Rough approximation
};
```

This is a "rough approximation" comment in production code. The `-1.5` is arbitrary.

**Impact:**
- Opponent edge shown to users is inaccurate
- Misleading for betting decisions

**Recommended Fix:**
Calculate actual opponent edge using the same formula:
```typescript
const calcOppEdge = (yourProb: number, odds: number): number => {
  const oppProb = 100 - yourProb;
  return EdgeCalculator.analyzeEdge(oppProb / 100, odds).edge;
};
```

---

### BUG #9: Type Mismatch in Edge Calculator
**File:** `src/utils/edgeCalculator.ts` (Line 92)  
**Severity:** 🔵 LOW

**Issue:**
```typescript
} else if (predictedAway && (gameInfo.away_ml_odds || gameInfo.away_ml_odds === 0)) {
  moneylineEdge = calculateEdge(monteCarloResults.away_win_probability, gameInfo.away_ml_odds);
```

The check `gameInfo.away_ml_odds || gameInfo.away_ml_odds === 0` is redundant. If `away_ml_odds` is 0, the first part is falsy so the `|| === 0` is never evaluated in a useful way.

**Recommended Fix:**
```typescript
} else if (predictedAway && gameInfo.away_ml_odds !== undefined) {
  moneylineEdge = calculateEdge(monteCarloResults.away_win_probability, gameInfo.away_ml_odds);
```

---

### BUG #10: Console Log Pollution
**File:** `supabase/functions/generate-predictions/lib/database/fetch-stats.ts` (Lines 53-61)  
**Severity:** 🔵 LOW

**Issue:**
Excessive console logging of raw database values in production:
```typescript
console.log(`Raw DB values for ${teamName}:`, {
  thirdDownConversionRate: dbStats.third_down_conversion_rate,
  // ... 7 more fields
});
```

**Impact:**
- Edge function logs become cluttered
- Performance impact (minimal but unnecessary)
- Debugging info in production

**Recommended Fix:**
Remove or put behind debug flag:
```typescript
if (Deno.env.get('DEBUG') === 'true') {
  console.log(`Raw DB values for ${teamName}:`, { ... });
}
```

---

## 📊 **Bug Summary Table**

| ID | Severity | File | Issue | Fix Difficulty |
|----|----------|------|-------|----------------|
| #1 | 🔴 Critical | live-predictions.ts | Undefined ML odds → determineFavorite crash | Easy |
| #2 | 🔴 Critical | live-predictions.ts | Missing null check for spread/total | Easy |
| #3 | 🟠 High | live-predictions.ts | Spread pick logic uses wrong probability | Medium |
| #4 | 🟠 High | fetch-stats.ts | drivesPerGame can be NaN | Easy |
| #5 | 🟡 Medium | nfl-utils.ts | Duplicate week calculation functions | Medium |
| #6 | 🟡 Medium | live-predictions.ts | Timezone conversion issues | Easy |
| #7 | 🟡 Medium | live-predictions.ts | No validation for default stats | Easy |
| #8 | 🔵 Low | HorizontalPickCard.tsx | Inaccurate opponent edge | Medium |
| #9 | 🔵 Low | edgeCalculator.ts | Redundant type check | Easy |
| #10 | 🔵 Low | fetch-stats.ts | Console log pollution | Easy |

---

## 🎯 **Priority Fix Order**

### **Immediate (Today):**
1. Fix Bug #1 (Undefined ML odds) - **CRITICAL**
2. Fix Bug #2 (Null checks) - **CRITICAL**
3. Fix Bug #3 (Spread pick logic) - **HIGH**

### **This Week:**
4. Fix Bug #4 (NaN in drivesPerGame) - **HIGH**
5. Fix Bug #5 (Duplicate week functions) - **MEDIUM**
6. Fix Bug #6 (Timezone issues) - **MEDIUM**

### **Next Sprint:**
7. Fix Bug #7 (Stats validation) - **MEDIUM**
8. Fix Bugs #8-10 (Low priority) - **LOW**

---

## 🔧 **Testing Recommendations**

After fixes, test these scenarios:

1. **Game with missing moneyline odds** - Should use defaults or skip gracefully
2. **Game with missing total odds** - Should use default 45 or skip
3. **Road favorite scenario** - Verify spread pick is correct
4. **Team with no stats in database** - Verify defaults are used with warning
5. **Game on DST boundary** - Verify date is correct
6. **Multiple games in same week** - Verify all process consistently

---

**End of Report**  
**Total Bugs Found:** 10  
**Critical:** 2 | **High:** 2 | **Medium:** 3 | **Low:** 3
