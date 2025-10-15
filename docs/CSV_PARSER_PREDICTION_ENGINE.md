# CSV Parser & Prediction Engine Documentation

This document explains the refactored CSV parsing utilities and new prediction engine features.

## Overview

The codebase now has three main utility modules:

1. **`csvParser.ts`** - Refactored CSV parsing from `CSVImportStats.tsx`
2. **`predictionEngine.ts`** - Game prediction and edge calculation utilities
3. **Existing Monte Carlo** - Advanced simulation in Edge Functions (unchanged)

---

## 1. CSV Parser (`src/utils/csvParser.ts`)

### Purpose
Parses ESPN offensive and defensive CSV files into structured team statistics.

### Key Classes

#### `NFLStatsParser`

**Static Methods:**

```typescript
// Parse offensive stats CSV
static async parseOffensiveCSV(fileContent: string): Promise<Map<string, Partial<TeamStats>>>

// Parse defensive stats CSV and merge with offensive
static async parseDefensiveCSV(
  fileContent: string, 
  existingStats: Map<string, Partial<TeamStats>>
): Promise<Map<string, Partial<TeamStats>>>

// Parse both CSVs in one call
static async parseCompleteStats(
  offensiveContent: string,
  defensiveContent: string
): Promise<Map<string, Partial<TeamStats>>>

// Extract week/season from CSV content or filename
static extractWeekFromCSV(
  lines: string[], 
  filename: string
): { week: number; season: number }

// Normalize team names
static resolveTeamName(teamName: string): string | null

// Get specific team stats
static getTeamStats(
  statsMap: Map<string, Partial<TeamStats>>,
  teamName: string
): Partial<TeamStats> | null
```

### Usage Example

```typescript
import { NFLStatsParser } from '../utils/csvParser';

// Read CSV files
const offensiveCSV = await offensiveFile.text();
const defensiveCSV = await defensiveFile.text();

// Parse complete stats
const teamStatsMap = await NFLStatsParser.parseCompleteStats(
  offensiveCSV,
  defensiveCSV
);

// Get specific team
const chiefs = NFLStatsParser.getTeamStats(teamStatsMap, 'Kansas City Chiefs');

// Extract week info
const lines = offensiveCSV.split('\n');
const { week, season } = NFLStatsParser.extractWeekFromCSV(lines, 'week7_offense.csv');
```

### CSV Format Requirements

**Offensive Stats CSV:**
- Header must include: `Tm,G,PF` (Team, Games, Points For)
- Columns: Rank, Team, Games, Points, Yards, Plays, Y/P, TO, FL, 1stD, Cmp, Att, Yds, TD, Int, Y/A, 1stD, Att, Yds, TD, Y/A, 1stD, Pen, Yds, 1stPy, Sc%, TO%, 3DAtt, 3DConv, 3D%, 4DAtt, 4DConv

**Defensive Stats CSV:**
- Header must include: `Tm,G,PA` (Team, Games, Points Against)
- Same column structure as offensive

---

## 2. Prediction Engine (`src/utils/predictionEngine.ts`)

### Purpose
Calculate game predictions and betting edges independent of Monte Carlo simulations.

### Key Classes

#### `NFLPredictionEngine`

**Core Prediction Methods:**

```typescript
// Calculate score for a team
calculateScore(
  offenseStats: OffensiveStats,
  opponentDefenseStats: DefensiveStats,
  isHomeTeam: boolean
): number

// Generate full game prediction
predictGame(
  awayTeam: string,
  homeTeam: string,
  awayStats: TeamStatsForPrediction,
  homeStats: TeamStatsForPrediction
): GamePrediction

// Calculate confidence level
calculateConfidence(
  awayStats: TeamStatsForPrediction,
  homeStats: TeamStatsForPrediction
): 'High' | 'Medium' | 'Low'

// Calculate edge vs bookmaker
calculateEdge(
  prediction: GamePrediction, 
  odds: BookmakerOdds
): EdgeAnalysis
```

**Odds Conversion Methods:**

```typescript
// Convert American odds to implied probability
oddsToImpliedProbability(americanOdds: number): number

// Calculate Kelly Criterion stake
calculateKellyCriterion(
  probability: number,
  odds: number,
  fractionOfKelly: number = 0.25
): number
```

### Usage Example

```typescript
import { NFLPredictionEngine } from '../utils/predictionEngine';

// Initialize engine
const engine = new NFLPredictionEngine();

// Prepare team stats
const awayStats = {
  offensiveStats: { pointsPerGame: 24.5, offensiveYardsPerGame: 365, ... },
  defensiveStats: { pointsAllowedPerGame: 22.1, turnoversForced: 12 },
  gamesPlayed: 7
};

const homeStats = {
  offensiveStats: { pointsPerGame: 27.3, offensiveYardsPerGame: 390, ... },
  defensiveStats: { pointsAllowedPerGame: 19.5, turnoversForced: 15 },
  gamesPlayed: 7
};

// Generate prediction
const prediction = engine.predictGame(
  'Kansas City Chiefs',
  'Buffalo Bills',
  awayStats,
  homeStats
);

console.log(prediction);
// {
//   awayTeam: 'Kansas City Chiefs',
//   homeTeam: 'Buffalo Bills',
//   awayScore: 24,
//   homeScore: 28,
//   predictedSpread: 4,
//   predictedTotal: 52,
//   winner: 'Buffalo Bills',
//   winningMargin: 4,
//   confidence: 'Medium'
// }

// Calculate edge
const bookmakerOdds = { spread: -3.5, total: 48.5 };
const edge = engine.calculateEdge(prediction, bookmakerOdds);

console.log(edge);
// {
//   spread: {
//     bookmakerLine: -3.5,
//     modelProjection: 4,
//     difference: '0.5',
//     edge: 'Minimal',
//     recommendation: 'No strong edge'
//   },
//   total: {
//     bookmakerLine: 48.5,
//     modelProjection: 52,
//     difference: '3.5',
//     edge: 'Moderate',
//     recommendation: 'Bet OVER'
//   }
// }
```

---

#### `EdgeCalculator`

Standalone utility for betting edge analysis.

**Methods:**

```typescript
// Comprehensive edge analysis
static analyzeEdge(
  modelProbability: number,
  bookmakerOdds: number
): {
  impliedProbability: number;
  edge: number;
  edgePercentage: number;
  recommendation: 'Strong Bet' | 'Moderate Bet' | 'Avoid';
  kellyStake: number;
}

// Calculate expected value
static calculateEV(
  probability: number,
  payout: number,
  stake: number = 1
): number

// Calculate ROI
static calculateROI(probability: number, odds: number): number
```

### Usage Example

```typescript
import { EdgeCalculator } from '../utils/predictionEngine';

// Model says 60% chance Chiefs win
const modelProb = 0.60;
const bookmakerOdds = -150; // Chiefs -150

const analysis = EdgeCalculator.analyzeEdge(modelProb, bookmakerOdds);

console.log(analysis);
// {
//   impliedProbability: 0.60,  // 60% implied by -150 odds
//   edge: 0.00,                 // No edge
//   edgePercentage: 0,
//   recommendation: 'Avoid',
//   kellyStake: 0
// }

// Calculate EV
const ev = EdgeCalculator.calculateEV(0.60, 100, 110);
console.log(`Expected Value: $${ev.toFixed(2)}`);
// Expected Value: $-4.00 (negative EV, avoid bet)
```

---

#### `PerformanceTracker`

Track betting performance metrics.

**Methods:**

```typescript
// Calculate win rate percentage
static calculateWinRate(wins: number, total: number): number

// Calculate ROI
static calculateROI(profit: number, totalStaked: number): number

// Calculate units won/lost
static calculateUnits(wins: number, losses: number, pushes: number): number

// Get break-even percentage for -110 odds
static breakEvenPercentage(): number // Returns 52.38

// Calculate Sharpe Ratio (risk-adjusted returns)
static calculateSharpeRatio(returns: number[], riskFreeRate: number): number
```

### Usage Example

```typescript
import { PerformanceTracker } from '../utils/predictionEngine';

// Season record: 45-32-3 (W-L-P)
const wins = 45;
const losses = 32;
const pushes = 3;

// Win rate
const winRate = PerformanceTracker.calculateWinRate(wins, wins + losses + pushes);
console.log(`Win Rate: ${winRate.toFixed(1)}%`); // 56.3%

// Units
const units = PerformanceTracker.calculateUnits(wins, losses, pushes);
console.log(`Units: ${units > 0 ? '+' : ''}${units.toFixed(2)}`); // +9.8 units

// Break-even
const breakEven = PerformanceTracker.breakEvenPercentage();
console.log(`Need ${breakEven}% to break even at -110`); // 52.38%

// Sharpe Ratio
const returns = [0.05, -0.02, 0.08, 0.01, -0.03, 0.06];
const sharpe = PerformanceTracker.calculateSharpeRatio(returns);
console.log(`Sharpe Ratio: ${sharpe.toFixed(2)}`); // Risk-adjusted performance
```

---

## 3. Integration with Existing System

### How It Fits Together

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CSV FILES (ESPN Stats)                                  │
│    - Week 7 Offense.csv                                    │
│    - Week 7 Defense.csv                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. NFLStatsParser.parseCompleteStats()                     │
│    → Returns Map<string, TeamStats>                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3a. NFLPredictionEngine.predictGame()                      │
│     → Quick predictions with edge analysis                 │
│                                                             │
│ 3b. Monte Carlo Simulation (Edge Function)                 │
│     → 10,000 iterations with probabilities                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. EdgeCalculator.analyzeEdge()                            │
│    → Calculate betting edge vs bookmaker                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Save to Database (Supabase picks table)                 │
└─────────────────────────────────────────────────────────────┘
```

### When to Use Each Tool

**Use `NFLStatsParser`:**
- When uploading CSV files in admin panel
- To convert raw ESPN stats into structured data
- For caching team statistics

**Use `NFLPredictionEngine`:**
- For quick predictions without Monte Carlo overhead
- For preliminary analysis before running full simulation
- For testing and development

**Use `EdgeCalculator`:**
- After predictions are generated
- To compare model vs bookmaker odds
- For bet sizing (Kelly Criterion)

**Use Monte Carlo Simulation (existing):**
- For production predictions
- When you need probabilistic outcomes
- For confidence intervals and variance analysis

**Use `PerformanceTracker`:**
- For season-end analysis
- To calculate ROI and units
- For performance dashboards

---

## 4. Refactoring CSVImportStats Component

The `CSVImportStats.tsx` component should now use the new utilities:

```typescript
import { NFLStatsParser } from '../utils/csvParser';

// Inside handleSubmit():
const teamStatsMap = await NFLStatsParser.parseCompleteStats(
  offensiveContent,
  defensiveContent
);

const teamStatsArray = NFLStatsParser.statsMapToArray(teamStatsMap);

// Extract week
const lines = offensiveContent.split('\n');
const { week, season } = NFLStatsParser.extractWeekFromCSV(
  lines, 
  offensiveFileName
);

// Save to database (existing code)
await saveStatsToDatabase(teamStatsArray, week, season);
```

---

## 5. Testing the New Utilities

### Unit Test Examples

```typescript
// Test CSV parsing
describe('NFLStatsParser', () => {
  it('should parse offensive CSV correctly', async () => {
    const csvContent = `Rank,Tm,G,PF,Yds,Ply,...
1,Kansas City Chiefs,7,189,2730,456,...`;
    
    const stats = await NFLStatsParser.parseOffensiveCSV(csvContent);
    const chiefs = stats.get('Kansas City Chiefs');
    
    expect(chiefs?.pointsPerGame).toBeCloseTo(27.0);
    expect(chiefs?.gamesPlayed).toBe(7);
  });
});

// Test prediction engine
describe('NFLPredictionEngine', () => {
  it('should predict game correctly', () => {
    const engine = new NFLPredictionEngine();
    const prediction = engine.predictGame(...);
    
    expect(prediction.winner).toBeDefined();
    expect(prediction.confidence).toMatch(/High|Medium|Low/);
  });
});

// Test edge calculator
describe('EdgeCalculator', () => {
  it('should identify positive edge', () => {
    const analysis = EdgeCalculator.analyzeEdge(0.65, -150);
    
    expect(analysis.edge).toBeGreaterThan(0);
    expect(analysis.recommendation).not.toBe('Avoid');
  });
});
```

---

## 6. Migration Path

### Step 1: Update CSVImportStats.tsx
Replace inline parsing with `NFLStatsParser` utility

### Step 2: Add Edge Calculations to Picks
Use `EdgeCalculator` after predictions are saved

### Step 3: Performance Dashboard
Use `PerformanceTracker` for analytics page

### Step 4: Testing
Add unit tests for all utilities

### Step 5: Documentation
Update inline documentation in components

---

## 7. Future Enhancements

### Planned Features:
- [ ] Automated CSV fetching from ESPN
- [ ] Real-time edge monitoring
- [ ] Bet recommendation engine
- [ ] Historical backtesting framework
- [ ] Machine learning integration
- [ ] Live betting edge calculator

### Potential Improvements:
- Cache parsed stats in localStorage
- Add CSV validation before parsing
- Support for other stat sources (PFF, Football Outsiders)
- Export predictions to CSV
- Automated bet tracking

---

## Summary

The refactored system provides:

✅ **Reusable CSV parsing** - No more duplicate code
✅ **Standalone prediction engine** - Works without Monte Carlo
✅ **Edge calculation utilities** - Built-in betting math
✅ **Performance tracking** - ROI, units, Sharpe ratio
✅ **Type-safe** - Full TypeScript support
✅ **Testable** - Easy to unit test
✅ **Documented** - Clear usage examples

The existing Monte Carlo simulation remains unchanged and works alongside these utilities for production predictions.
