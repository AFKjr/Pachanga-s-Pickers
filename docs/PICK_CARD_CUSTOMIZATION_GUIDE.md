# Pick Card Customization Guide

## 📍 Main File: `HorizontalPickCard.tsx`

**Location**: `src/components/HorizontalPickCard.tsx`

This component controls **ALL visual elements** on the home page pick cards.

---

## 🎨 What You Can Customize

### 1. **Card Layout & Styling**

**Lines 144-151**: Card container styling
```tsx
<div 
  className={`bg-[#1a1a1a] rounded-lg transition-all duration-200 min-h-[280px] max-w-none ${
    isHovered 
      ? 'transform -translate-y-1 shadow-2xl border border-lime-500' 
      : 'border border-[rgba(255,255,255,0.05)]'
  }`}
>
```

**Adjustments**:
- `bg-[#1a1a1a]` → Background color
- `min-h-[280px]` → Minimum card height
- `border-lime-500` → Hover border color
- `transform -translate-y-1` → Hover lift effect

---

### 2. **Game Header Section**

**Lines 154-163**: Team names and date
```tsx
<div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
  <div className="flex items-center justify-between">
    <h3 className="text-white font-bold text-lg">
      {pick.game_info.away_team} @ {pick.game_info.home_team}
    </h3>
  </div>
  <div className="text-xs text-gray-500 mt-1">
    {formatGameDate(pick.game_info.game_date)}
  </div>
</div>
```

**Adjustments**:
- `text-lg` → Team name font size
- `text-xs` → Date font size
- `px-6 py-4` → Header padding
- Format: `{away_team} @ {home_team}` → Can change to vs, at, etc.

---

### 3. **Bet Section Spacing**

**Lines 166-167**: Gap between bet sections
```tsx
<div className="px-6 py-4 flex flex-wrap gap-6 justify-start">
```

**Adjustments**:
- `gap-6` → Space between Moneyline/Spread/Total sections (1.5rem)
- `px-6 py-4` → Container padding
- `flex-wrap` → Allows sections to wrap on small screens
- `justify-start` → Left-align sections

---

### 4. **Moneyline Section** 

**Lines 169-179**: Moneyline bet display
```tsx
<BetSection
  title="MONEYLINE"
  prediction={pick.prediction}
  line={`Line: ${pick.game_info.home_ml_odds || '-110'}/${pick.game_info.away_ml_odds || '+110'}`}
  yourEdge={formatEdge(pick.moneyline_edge)}
  oppEdge={calcOppEdge(pick.moneyline_edge)}
  yourProb={pick.monte_carlo_results?.moneyline_probability || pick.confidence}
  oppProb={100 - (pick.monte_carlo_results?.moneyline_probability || pick.confidence)}
  confidence={pick.monte_carlo_results?.moneyline_probability || pick.confidence}
  edgeValue={pick.moneyline_edge || 0}
  result={pick.result}
/>
```

**What's Displayed**:
- **Title**: "MONEYLINE"
- **Prediction**: e.g., "Pittsburgh Steelers to win"
- **Line**: Moneyline odds (e.g., "Line: -265/+215")
- **Your Edge**: Edge percentage (e.g., "+5.55%")
- **Model**: Win probabilities (e.g., "77.6% | 22.4%")
- **Confidence Bar**: Green/yellow/red bar

**Adjustments**:
- Change `title="MONEYLINE"` to different label
- Modify odds format in `line` string
- Change fallback odds: `-110` or `+110`

---

### 5. **Spread Section**

**Lines 182-192**: Spread bet display
```tsx
{pick.spread_prediction && (
  <BetSection
    title="SPREAD"
    prediction={pick.spread_prediction}
    line={`Line: ${pick.game_info.spread_odds || -110}/${pick.game_info.spread_odds || -110}`}
    yourEdge={formatEdge(pick.spread_edge)}
    oppEdge={calcOppEdge(pick.spread_edge)}
    yourProb={pick.monte_carlo_results?.spread_probability || pick.confidence}
    oppProb={100 - (pick.monte_carlo_results?.spread_probability || pick.confidence)}
    confidence={pick.monte_carlo_results?.spread_probability || pick.confidence}
    edgeValue={pick.spread_edge || 0}
    result={pick.ats_result}
  />
)}
```

**What's Displayed**:
- **Title**: "SPREAD"
- **Prediction**: e.g., "Pittsburgh Steelers +5.5"
- **Line**: Spread juice (e.g., "Line: -110/-110")
- **Your Edge**: Edge percentage (e.g., "+20.45%")
- **Model**: Cover probabilities

**Adjustments**:
- Only shows if `pick.spread_prediction` exists
- Fallback spread odds: `-110` (standard juice)
- Uses `ats_result` for win/loss badge

---

### 6. **Total (Over/Under) Section**

**Lines 195-205**: O/U bet display
```tsx
{pick.ou_prediction && (
  <BetSection
    title="TOTAL"
    prediction={pick.ou_prediction}
    line={`Line: ${pick.game_info.over_odds || -110}`}
    yourEdge={formatEdge(pick.ou_edge)}
    oppEdge={calcOppEdge(pick.ou_edge)}
    yourProb={pick.monte_carlo_results?.total_probability || pick.confidence}
    oppProb={100 - (pick.monte_carlo_results?.total_probability || pick.confidence)}
    confidence={pick.monte_carlo_results?.total_probability || pick.confidence}
    edgeValue={pick.ou_edge || 0}
    result={pick.ou_result}
  />
)}
```

**What's Displayed**:
- **Title**: "TOTAL"
- **Prediction**: e.g., "Over 42.5"
- **Line**: O/U juice (e.g., "Line: -110")
- **Your Edge**: Edge percentage (e.g., "+20.25%")
- **Model**: Over/under probabilities

**Adjustments**:
- Only shows if `pick.ou_prediction` exists
- Can show `under_odds` instead of `over_odds`
- Uses `ou_result` for win/loss badge

---

## 📊 BetSection Component Details

**Lines 33-109**: Individual bet section styling

### What BetSection Displays:

```tsx
<div className="flex-1 min-w-0">
  {/* Section Title */}
  <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
    {title}  {/* MONEYLINE, SPREAD, or TOTAL */}
  </h4>
  
  {/* Prediction with checkmark */}
  <div className="flex items-center gap-2">
    <span className="text-lime-400 text-xs">✓</span>
    <span className="text-white font-medium text-sm">{prediction}</span>
  </div>
  
  {/* Odds line */}
  <div className="text-xs text-gray-400">{line}</div>
  
  {/* Model probabilities */}
  <div className="flex justify-between">
    <span className="text-gray-500">Model:</span>
    <span className="text-gray-300">{yourProb}% | {oppProb}%</span>
  </div>
  
  {/* Edge percentages */}
  <div className="flex justify-between">
    <span className="text-gray-500">Edge:</span>
    <span className="text-lime-400">{yourEdge}% | {oppEdge}%</span>
  </div>
  
  {/* Confidence bar */}
  <ConfidenceBar confidence={confidence} edge={edgeValue} />
</div>
```

### Styling Adjustments in BetSection:

**Lines 64-77**: Prediction text
```tsx
<div className="flex items-center gap-2">
  <span className="text-lime-400 text-xs">✓</span>
  <span className="text-white font-medium text-sm truncate">{prediction}</span>
</div>
<div className="text-xs text-gray-400">{line}</div>
```
- `text-lime-400` → Checkmark color
- `text-sm` → Prediction font size
- `text-xs` → Line font size

**Lines 80-92**: Model & Edge display
```tsx
<div className="space-y-0.5 text-xs mb-1">
  <div className="flex justify-between">
    <span className="text-gray-500">Model:</span>
    <span className="text-gray-300">{yourProb.toFixed(1)}% | {oppProb.toFixed(1)}%</span>
  </div>
  <div className="flex justify-between">
    <span className="text-gray-500">Edge:</span>
    <span className={`font-medium ${
      parseFloat(yourEdge) >= 0 ? 'text-lime-400' : 'text-red-400'
    }`}>
      {yourEdge}% | <span className="text-gray-500">{oppEdge}%</span>
    </span>
  </div>
</div>
```
- `text-xs` → Stats font size
- `text-lime-400` → Positive edge color
- `text-red-400` → Negative edge color
- `.toFixed(1)` → Decimal places (change to `.toFixed(2)` for more precision)

---

## 🎨 Confidence Bar Customization

**Lines 11-31**: Confidence bar component

```tsx
const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ confidence, edge }) => {
  const barColor = getConfidenceBarColor(confidence, edge);
  
  const colorMap = {
    lime: 'bg-lime-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`${colorMap[barColor]} h-full transition-all duration-300`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 font-medium min-w-[40px] text-right">
        {confidence.toFixed(1)}%
      </span>
    </div>
  );
};
```

**Adjustments**:
- `bg-lime-500` → Strong bet color (change to `bg-green-500`, etc.)
- `bg-yellow-500` → Decent bet color
- `bg-red-500` → Avoid bet color
- `h-1.5` → Bar height (change to `h-2` for thicker bar)
- `bg-gray-700` → Bar background color
- `text-xs` → Percentage text size

---

## 🔧 Color Logic (Edge Calculator)

**File**: `src/utils/edgeCalculator.ts`

The confidence bar color is determined by:
```typescript
export function getConfidenceBarColor(
  confidence: number,
  edge: number
): 'lime' | 'yellow' | 'red' {
  
  // Negative edge = avoid (red)
  if (edge < 0) return 'red';
  
  // Strong bet: high edge + solid confidence
  if (edge >= 3 && confidence >= 65) return 'lime';
  
  // Good bet: decent edge + okay confidence
  if (edge >= 2 && confidence >= 60) return 'lime';
  
  // Marginal: low edge or lower confidence
  if (edge >= 1 || confidence >= 70) return 'yellow';
  
  // Weak: very low edge and low confidence
  return 'yellow';
}
```

**To Change Color Thresholds**:
Edit the numbers in `src/utils/edgeCalculator.ts`:
- `edge >= 3` → Minimum edge for green (strong bet)
- `confidence >= 65` → Minimum confidence for green
- `edge >= 1` → Minimum edge for yellow (decent bet)

---

## 📐 Common Customizations

### Change Card Width
**Line 145**: Adjust `max-w-none`
```tsx
className={`bg-[#1a1a1a] rounded-lg ... max-w-none ${...}`}
```
Options: `max-w-sm`, `max-w-md`, `max-w-lg`, `max-w-xl`, `max-w-2xl`

### Change Bet Section Width
**Line 167**: Sections auto-size with `flex-1`
```tsx
{/* In BetSection component, line 51 */}
<div className="flex-1 min-w-0">
```
Change `flex-1` to fixed width like `w-64` or `w-80`

### Hide Opponent Edge
**Lines 90-91**: Remove opponent edge display
```tsx
{yourEdge}% | <span className="text-gray-500">{oppEdge}%</span>
```
Change to: `{yourEdge}%` (remove the `| {oppEdge}%` part)

### Change Decimal Precision
**Lines 27, 84, 86**: Change `.toFixed(1)` to `.toFixed(2)`
```tsx
{confidence.toFixed(1)}%  // 1 decimal: 77.6%
{confidence.toFixed(2)}%  // 2 decimals: 77.63%
{confidence.toFixed(0)}%  // 0 decimals: 78%
```

### Add Win/Loss Badge
**Lines 54-69**: Badge is already implemented
```tsx
const getResultBadge = () => {
  if (!result || result === 'pending') return null;
  
  const colorMap = {
    win: 'bg-green-900/30 text-green-400 border-green-500',
    loss: 'bg-red-900/30 text-red-400 border-red-500',
    push: 'bg-yellow-900/30 text-yellow-400 border-yellow-500'
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colorMap[result]}`}>
      {result === 'win' ? 'W' : result === 'loss' ? 'L' : 'P'}
    </span>
  );
};
```

---

## 🗂️ Related Files

### 1. **Pick Data Source**
**File**: `src/components/PicksDisplay.tsx`
- Fetches picks from database
- Calculates edges
- Passes picks to `HorizontalPickCard`

### 2. **Edge Calculations**
**File**: `src/utils/edgeCalculator.ts`
- `calculatePickEdges()` - Calculates moneyline/spread/O/U edges
- `formatEdge()` - Formats edge for display (e.g., "+5.5%")
- `getConfidenceBarColor()` - Determines bar color

### 3. **Type Definitions**
**File**: `src/types/index.ts`
- `Pick` interface defines data structure
- `MonteCarloResults` interface for probabilities
- `GameInfo` interface for game details

### 4. **Date Formatting**
**File**: `src/utils/dateValidation.ts`
- `safeDateFormat()` - Safe date formatting
- Handles timezone issues

---

## 🎯 Quick Reference: Line Numbers

| Feature | Lines | What It Controls |
|---------|-------|------------------|
| **Card Container** | 144-151 | Background, border, hover effect, size |
| **Game Header** | 154-163 | Team names, date display |
| **Bet Sections Container** | 166-167 | Spacing between bet types |
| **Moneyline Section** | 169-179 | Moneyline bet display |
| **Spread Section** | 182-192 | Spread bet display |
| **Total Section** | 195-205 | O/U bet display |
| **BetSection Component** | 33-109 | Individual bet section layout |
| **Confidence Bar** | 11-31 | Progress bar styling |
| **Win/Loss Badge** | 54-69 | Result badge (W/L/P) |

---

## 💡 Pro Tips

1. **Test Changes Locally**: Edit `HorizontalPickCard.tsx` and save - hot reload will update immediately
2. **Use Tailwind Classes**: All styling uses Tailwind CSS (e.g., `text-lg`, `bg-gray-700`)
3. **Check Edge Calculations**: If edges look wrong, check `src/utils/edgeCalculator.ts`
4. **Verify Data**: Use browser console to log `pick` object and see all available data
5. **Color Consistency**: Use Tailwind color classes for consistent theme

---

## 🚀 Example Customizations

### Make Cards More Compact
```tsx
// Line 145: Reduce min height
min-h-[220px]  // Was: min-h-[280px]

// Line 167: Reduce padding
className="px-4 py-3 flex flex-wrap gap-4 justify-start"  // Was: px-6 py-4 gap-6
```

### Emphasize High-Edge Picks
```tsx
// Add glow effect for strong bets in line 145
className={`... ${
  (pick.moneyline_edge || 0) >= 5 
    ? 'ring-2 ring-lime-500 shadow-lg shadow-lime-500/50' 
    : ''
}`}
```

### Show Only Strong Bets
```tsx
// In PicksDisplay.tsx, filter before rendering
const displayPicks = filteredPicks
  .filter(pick => (pick.moneyline_edge || 0) >= 3)
  .slice(0, maxPicks);
```

---

**File Location**: `src/components/HorizontalPickCard.tsx` (217 lines total)

**Last Updated**: October 15, 2025
