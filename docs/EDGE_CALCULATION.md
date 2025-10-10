# Edge Calculation System

This document explains the edge calculation system for Pachanga's Picks.

## Overview

**Edge** is the difference between your model's predicted probability and the implied probability from the sportsbook odds. A positive edge indicates a favorable betting opportunity.

**Formula:**
```
Edge = Model Probability - Implied Probability from Odds
```

## Key Concepts

### 1. American Odds to Implied Probability

```typescript
// Negative odds (favorites)
// -110 → 52.38% implied probability
if (odds < 0) {
  decimal = (100 / Math.abs(odds)) + 1
  implied_prob = (1 / decimal) * 100
}

// Positive odds (underdogs)
// +145 → 40.82% implied probability
if (odds > 0) {
  decimal = (odds / 100) + 1
  implied_prob = (1 / decimal) * 100
}
```

### 2. Edge Calculation Example

If your model says Cardinals have a 58% chance to win, but the odds are -110 (52.38% implied):
```
Edge = 58% - 52.38% = +5.62%
```

This is a **strong edge** – you're getting +5.62% better value than the market thinks!

## Implementation

### Type Definitions

**Extended Pick Interface** (`src/types/index.ts`):
```typescript
export interface Pick {
  // ... existing fields
  
  // Edge values for each bet type
  moneyline_edge?: number;
  spread_edge?: number;
  ou_edge?: number;
}
```

**Extended GameInfo Interface**:
```typescript
export interface GameInfo {
  // ... existing fields
  
  // Actual odds from sportsbooks
  home_ml_odds?: number;      // e.g., -175
  away_ml_odds?: number;      // e.g., +145
  spread_odds?: number;        // e.g., -110
  over_odds?: number;          // e.g., -110
  under_odds?: number;         // e.g., -110
}
```

### Core Functions

**Edge Calculator** (`src/utils/edgeCalculator.ts`):

- `americanToDecimal(odds)` - Convert American odds to decimal
- `oddsToImpliedProbability(odds)` - Get implied probability from odds
- `calculateEdge(modelProb, odds)` - Calculate edge percentage
- `calculatePickEdges(pick, monteCarloResults, gameInfo)` - Calculate all edges for a pick
- `getConfidenceBarColor(confidence, edge)` - Get color based on edge and confidence
- `formatEdge(edge)` - Format edge for display (e.g., "+5.6%")

### Color Coding

The system uses color-coded confidence bars based on edge and confidence:

| Edge | Confidence | Color | Meaning |
|------|-----------|-------|---------|
| ≥3% | ≥65% | 🟢 Lime | Strong bet - high edge + solid confidence |
| ≥2% | ≥60% | 🟢 Lime | Good bet - decent edge + okay confidence |
| ≥1% | ≥70% | 🟡 Yellow | Marginal - low edge but high confidence |
| <1% | Any | 🟡 Yellow | Weak - very low edge |
| Negative | Any | 🔴 Red | Avoid - negative edge (bad value) |

### Service Integration

**Pick Management** (`src/services/pickManagement.ts`):

The `createPick()` function automatically calculates edge values when a pick is created:

```typescript
// Calculate edge values if Monte Carlo results are available
if (pickData.monte_carlo_results && pickData.game_info) {
  const edges = calculatePickEdges(
    pickData as Pick,
    pickData.monte_carlo_results,
    pickData.game_info
  );
  
  enrichedPickData = {
    ...enrichedPickData,
    moneyline_edge: edges.moneyline_edge,
    spread_edge: edges.spread_edge,
    ou_edge: edges.ou_edge
  };
}
```

## Database Schema

### Migration

Run the migration in Supabase SQL Editor:

```sql
-- Add edge value columns
ALTER TABLE picks 
ADD COLUMN IF NOT EXISTS moneyline_edge DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS spread_edge DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ou_edge DECIMAL(5,2);

-- Create indexes for edge-based queries
CREATE INDEX IF NOT EXISTS idx_picks_moneyline_edge ON picks(moneyline_edge);
CREATE INDEX IF NOT EXISTS idx_picks_spread_edge ON picks(spread_edge);
CREATE INDEX IF NOT EXISTS idx_picks_ou_edge ON picks(ou_edge);
```

### High-Edge Picks View

The migration creates a view for easy access to strong betting opportunities:

```sql
CREATE OR REPLACE VIEW high_edge_picks AS
SELECT *
FROM picks
WHERE (moneyline_edge >= 2 OR spread_edge >= 2 OR ou_edge >= 2)
  AND result = 'pending'
ORDER BY GREATEST(
  COALESCE(moneyline_edge, 0),
  COALESCE(spread_edge, 0),
  COALESCE(ou_edge, 0)
) DESC;
```

## Backfilling Existing Picks

To calculate edges for picks created before this feature:

```bash
# Run the backfill script
npm run backfill-edges
```

Or manually:

```typescript
import { backfillEdges } from './scripts/backfillEdges';

await backfillEdges();
```

The script will:
1. Find all picks without edge values
2. Calculate edges using Monte Carlo results and game odds
3. Update the database
4. Skip picks missing required data
5. Print summary statistics

## Usage in Components

### Display Edge in Pick Cards

```typescript
import { formatEdge, getEdgeTextColor } from '../utils/edgeCalculator';

const PickCard = ({ pick }) => {
  const mlEdge = pick.moneyline_edge || 0;
  const atsEdge = pick.spread_edge || 0;
  const ouEdge = pick.ou_edge || 0;
  
  return (
    <div>
      <span className={getEdgeTextColor(mlEdge)}>
        {formatEdge(mlEdge)} edge
      </span>
    </div>
  );
};
```

### Color-Coded Confidence Bars

```typescript
import { getConfidenceBarColor } from '../utils/edgeCalculator';

const ConfidenceBar = ({ pick }) => {
  const color = getConfidenceBarColor(pick.confidence, pick.moneyline_edge);
  
  const colorClasses = {
    lime: 'bg-lime-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className={`h-2 rounded ${colorClasses[color]}`} 
         style={{ width: `${pick.confidence}%` }} />
  );
};
```

## Best Practices

1. **Always fetch latest odds** before calculating edges
2. **Recalculate edges** if odds change significantly
3. **Don't bet negative edges** unless there's a specific reason
4. **Focus on high-edge picks** (≥2%) for best long-term results
5. **Consider confidence + edge together** - both matter!

## Edge Thresholds

Based on sports betting research:

- **≥5% edge**: Elite opportunity (rare)
- **3-5% edge**: Strong bet
- **2-3% edge**: Good value
- **1-2% edge**: Marginal value
- **0-1% edge**: Minimal value
- **Negative edge**: Avoid

## Example Scenarios

### Scenario 1: Cardinals -3.5 Spread

```
Monte Carlo: 64% chance to cover
DraftKings Odds: -110 (52.38% implied)
Edge = 64% - 52.38% = +11.62%
```
**Verdict**: 🟢 STRONG BET - Excellent edge

### Scenario 2: Over 46.5

```
Monte Carlo: 53% chance of Over
DraftKings Odds: -110 (52.38% implied)
Edge = 53% - 52.38% = +0.62%
```
**Verdict**: 🟡 MARGINAL - Low edge, skip or bet small

### Scenario 3: Ravens Moneyline

```
Monte Carlo: 48% chance to win
DraftKings Odds: +145 (40.82% implied)
Edge = 48% - 40.82% = +7.18%
```
**Verdict**: 🟢 STRONG BET - Great underdog value

## Troubleshooting

### Edge not calculating?

Check:
1. Pick has `monte_carlo_results`
2. Pick has `game_info` with odds fields
3. Prediction text contains team names
4. Odds are in American format (-110, +145, etc.)

### Edge seems wrong?

Verify:
1. Odds are current (not stale)
2. Model probability aligns with pick side
3. Correct odds used (home vs away, over vs under)

## Future Enhancements

- [ ] Real-time odds updates from odds API
- [ ] Historical edge tracking and performance
- [ ] Edge-based bet sizing recommendations
- [ ] Closing line value (CLV) analysis
- [ ] Multi-sportsbook edge comparison
- [ ] Edge alert notifications
