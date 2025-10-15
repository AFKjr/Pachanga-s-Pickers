# Edge Calculation & Display Architecture

**Date:** October 15, 2025  
**Purpose:** Document which files calculate and display betting edges (ML, ATS, O/U) to users

---

## 🎯 **Quick Answer**

### **Edge Calculations:**
1. **`src/utils/edgeCalculator.ts`** - Core edge calculation logic
2. **`src/services/pickManagement.ts`** - Stores edges in database when creating picks

### **Edge Display to Users:**
1. **`src/components/HorizontalPickCard.tsx`** - Main pick card component (homepage)
2. **`src/components/APIPredictionsGenerator.tsx`** - Admin preview (EdgeAnalysisDisplay component)

---

## 📊 **Edge Calculation Files**

### 1. **`src/utils/edgeCalculator.ts`** ⭐ Core Logic

**Purpose:** Calculate betting edge for all bet types (Moneyline, Spread, Over/Under)

**Key Functions:**

```typescript
// Convert American odds to decimal
americanToDecimal(americanOdds: number): number

// Convert odds to implied probability
oddsToImpliedProbability(americanOdds: number): number

// Calculate edge = Model Probability - Implied Probability
calculateEdge(modelProbability: number, americanOdds: number): number

// Calculate all three edges for a pick
calculatePickEdges(pick: Pick, monteCarloResults: MonteCarloResults, gameInfo: GameInfo): {
  moneyline_edge: number;
  spread_edge: number;
  ou_edge: number;
}
```

**Formula:**
```
Edge = Model Probability - Implied Probability from Odds

Example:
- Model says: 65% win probability
- Odds of -150 imply: 60% probability
- Edge = 65% - 60% = +5% edge
```

**Edge Calculation Logic:**

1. **Moneyline Edge:**
   - Uses `home_win_probability` or `away_win_probability` from Monte Carlo
   - Compares to `home_ml_odds` or `away_ml_odds` from The Odds API
   - Returns edge as percentage (e.g., 5.2 = 5.2% edge)

2. **Spread Edge:**
   - Extracts spread value from prediction (e.g., -7.5 or +3.5)
   - Determines if favorite (negative) or underdog (positive) was picked
   - Uses `spread_cover_probability` for favorite picks
   - Uses inverse probability (100 - spread_cover_probability) for underdog picks
   - Compares to `spread_odds` (usually -110)
   - Returns edge as percentage

3. **Over/Under Edge:**
   - Uses `over_probability` or `under_probability` from Monte Carlo
   - Compares to `over_odds` or `under_odds` (usually -110)
   - Returns edge as percentage

**Important:** Returns 0 if odds are missing (no fallback to hardcoded values)

---

### 2. **`src/services/pickManagement.ts`**

**Purpose:** Stores calculated edges in database when creating/updating picks

**Key Code:**

```typescript
// When creating a pick
moneyline_edge: edges.moneyline_edge,
spread_edge: edges.spread_edge,
ou_edge: edges.ou_edge
```

**Database Fields:**
- `picks.moneyline_edge` (DECIMAL)
- `picks.spread_edge` (DECIMAL)
- `picks.ou_edge` (DECIMAL)

---

### 3. **`src/utils/predictionEngine.ts`**

**Purpose:** EdgeCalculator class for Kelly Criterion and edge analysis

**Key Methods:**

```typescript
EdgeCalculator.analyzeEdge(probability: number, americanOdds: number): {
  edge: number;
  kellyFraction: number;
  recommendation: string;
}
```

**Kelly Criterion:** Calculates optimal bet sizing based on edge

---

## 🖥️ **Edge Display Files (User-Facing)**

### 1. **`src/components/HorizontalPickCard.tsx`** ⭐ Main Display

**Purpose:** Display picks with edges to users on homepage

**Edge Display Sections:**

#### **Moneyline Section:**
```tsx
<BetSection
  title="MONEYLINE"
  yourEdge={formatEdge(pick.moneyline_edge)}
  oppEdge={calcOppEdge(pick.moneyline_edge)}
  edgeValue={pick.moneyline_edge || 0}
/>
```

#### **Spread Section:**
```tsx
<BetSection
  title="SPREAD"
  yourEdge={formatEdge(pick.spread_edge)}
  oppEdge={calcOppEdge(pick.spread_edge)}
  edgeValue={pick.spread_edge || 0}
/>
```

#### **Over/Under Section:**
```tsx
<BetSection
  title="TOTAL"
  yourEdge={formatEdge(pick.ou_edge)}
  oppEdge={calcOppEdge(pick.ou_edge)}
  edgeValue={pick.ou_edge || 0}
/>
```

**Visual Display:**
- ✅ **Green text** for positive edge (`text-lime-400`)
- ❌ **Red text** for negative edge (`text-red-400`)
- 📊 **Edge values**: "Edge: +5.2% | -6.7%" (yours | opponent's)
- 📈 **Confidence bar** colored by edge value (lime/yellow/red)

**Edge Color Logic:**
```typescript
getConfidenceBarColor(confidence, edge):
  - edge > 3% → lime (strong edge)
  - edge > 0% → yellow (slight edge)
  - edge ≤ 0% → red (no edge)
```

---

### 2. **`src/components/APIPredictionsGenerator.tsx`** (Admin Only)

**Purpose:** Preview edge calculations when generating predictions

**Component:** `EdgeAnalysisDisplay`

**Edge Preview:**
```tsx
const EdgeAnalysisDisplay = ({ prediction }) => {
  // Calculate edges for preview
  const mlEdge = calculateBetEdge(mlProb, mlOdds);
  const spreadEdge = calculateBetEdge(spreadProb, -110);
  const totalEdge = calculateBetEdge(totalProb, -110);
  
  return (
    <div>
      <h4>📊 Edge Analysis</h4>
      <div>ML Edge: {mlEdge.edge}%</div>
      <div>Spread Edge: {spreadEdge.edge}%</div>
      <div>Total Edge: {totalEdge.edge}%</div>
    </div>
  );
};
```

**Note:** This is admin-only preview BEFORE picks are created

---

### 3. **`src/components/PicksDisplay.tsx`**

**Purpose:** Container component that renders multiple `HorizontalPickCard` components

**Key Code:**
```tsx
{picks.map(pick => (
  <HorizontalPickCard 
    key={pick.id} 
    pick={pick}  // Contains edge values
  />
))}
```

---

### 4. **`src/components/HomePage.tsx`**

**Purpose:** Main page that displays `PicksDisplay` with edge information

**Flow:**
```
HomePage 
  → PicksDisplay 
    → HorizontalPickCard (displays edges)
```

---

## 🔄 **Complete Edge Flow**

### **1. Prediction Generation (Backend)**

```
Supabase Edge Function (generate-predictions)
  ↓
Calculate Monte Carlo probabilities
  ↓
Fetch odds from The Odds API
  ↓
Call calculatePickEdges() in edgeCalculator.ts
  ↓
Store in database:
  - picks.moneyline_edge
  - picks.spread_edge
  - picks.ou_edge
```

### **2. Edge Display (Frontend)**

```
HomePage component loads
  ↓
PicksDisplay fetches picks from database
  ↓
HorizontalPickCard receives pick with edges
  ↓
formatEdge() formats edge values (e.g., "+5.2")
  ↓
Display in UI with color coding:
  - Green for positive edge
  - Red for negative edge
  - Confidence bar colored by edge strength
```

---

## 📝 **Key Helper Functions**

### **`formatEdge(edge?: number): string`**

**Location:** `src/utils/edgeCalculator.ts`

**Purpose:** Format edge values for display

```typescript
formatEdge(5.234) → "+5.2"
formatEdge(-2.876) → "-2.9"
formatEdge(undefined) → "-0.0"
```

### **`getConfidenceBarColor(confidence: number, edge: number): 'lime' | 'yellow' | 'red'`**

**Location:** `src/utils/edgeCalculator.ts`

**Purpose:** Determine confidence bar color based on edge

```typescript
edge > 3% → "lime"    // Strong edge
edge > 0% → "yellow"  // Slight edge
edge ≤ 0% → "red"     // No edge
```

### **`extractSpreadValue(spreadPrediction: string): number`**

**Location:** `src/utils/edgeCalculator.ts`

**Purpose:** Extract numerical spread value from prediction string

```typescript
extractSpreadValue("Chiefs -7.5") → -7.5
extractSpreadValue("Browns +3.5") → 3.5
extractSpreadValue("Cowboys +3") → 3.0
```

---

## 🎨 **Visual Edge Display Elements**

### **1. Edge Percentage Text**
- **Format:** "Edge: +5.2% | -6.7%"
- **Location:** BetSection component in HorizontalPickCard
- **Styling:** 
  - Positive edge: `text-lime-400` (green)
  - Negative edge: `text-red-400` (red)

### **2. Confidence Bar**
- **Format:** Progress bar (0-100%)
- **Colors:**
  - Lime: Strong positive edge (>3%)
  - Yellow: Slight positive edge (0-3%)
  - Red: Negative edge (≤0%)
- **Location:** ConfidenceBar component in HorizontalPickCard

### **3. Model Probability**
- **Format:** "Model: 65.0% | 35.0%"
- **Location:** BetSection component in HorizontalPickCard
- **Purpose:** Shows model's predicted probabilities (not edge)

---

## 📊 **Edge Values Stored in Database**

### **`picks` Table Columns:**

```sql
moneyline_edge DECIMAL(5,2)  -- e.g., 5.23 (meaning 5.23% edge)
spread_edge DECIMAL(5,2)     -- e.g., -2.15 (meaning -2.15% edge)
ou_edge DECIMAL(5,2)         -- e.g., 3.87 (meaning 3.87% edge)
```

### **Example Pick Record:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "prediction": "Kansas City Chiefs",
  "spread_prediction": "Chiefs -7.5",
  "ou_prediction": "Over 48.5",
  "confidence": 68.5,
  "moneyline_edge": 5.23,
  "spread_edge": 3.15,
  "ou_edge": -1.22,
  "game_info": {
    "home_ml_odds": -250,
    "away_ml_odds": +210,
    "spread_odds": -110,
    "over_odds": -110,
    "under_odds": -110
  },
  "monte_carlo_results": {
    "home_win_probability": 72.3,
    "away_win_probability": 27.7,
    "spread_probability": 65.8,
    "over_probability": 48.2,
    "under_probability": 51.8
  }
}
```

---

## 🔍 **Summary**

### **Files That Calculate Edges:**
1. ✅ **`src/utils/edgeCalculator.ts`** - Core calculation logic
2. ✅ **`src/services/pickManagement.ts`** - Saves to database
3. ✅ **`src/utils/predictionEngine.ts`** - Kelly Criterion analysis

### **Files That Display Edges to Users:**
1. ✅ **`src/components/HorizontalPickCard.tsx`** - Main display (homepage)
2. ✅ **`src/components/APIPredictionsGenerator.tsx`** - Admin preview
3. ✅ **`src/components/PicksDisplay.tsx`** - Container
4. ✅ **`src/components/HomePage.tsx`** - Page wrapper

### **All Three Edge Types Calculated:**
- ✅ **Moneyline Edge** (`moneyline_edge`)
- ✅ **Spread Edge (ATS)** (`spread_edge`)
- ✅ **Over/Under Edge** (`ou_edge`)

### **Display Features:**
- ✅ Color-coded by edge value (green/red)
- ✅ Confidence bar colored by edge strength
- ✅ Shows both sides (your edge | opponent's edge)
- ✅ Formatted percentages (+5.2%, -2.9%)
- ✅ Model probabilities displayed alongside edges

---

**Last Updated:** October 15, 2025  
**Status:** All edge calculations and displays working correctly
