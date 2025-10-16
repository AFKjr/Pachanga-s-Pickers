# Manual Odds Entry & Automatic Edge Calculation

## Overview
The Admin Pick Manager now supports **manual odds entry** with **automatic edge calculation**. This allows you to:

1. ✅ Manually add/edit odds for any pick in the manage cards
2. ✅ Automatically calculate edge values when odds are saved
3. ✅ Update odds without re-running Monte Carlo simulations
4. ✅ Track odds changes for line shopping opportunities

---

## How It Works

### 1. Access Pick Manager
Navigate to **Admin Panel → Manage Picks** and click **Edit** on any pick card.

### 2. Manual Odds Entry Section
Scroll to the **"Manual Odds Entry"** section (blue-bordered area) to enter American odds:

#### **Moneyline Odds**
- **Home Team Odds**: e.g., `-150` (favorite) or `+130` (underdog)
- **Away Team Odds**: e.g., `+130` (underdog) or `-150` (favorite)

#### **Spread Odds**
- Typically `-110` for both sides (standard juice)
- Can vary: `-105`, `-115`, etc.

#### **Over/Under Odds**
- **Over Odds**: e.g., `-110`
- **Under Odds**: e.g., `-110`

### 3. Automatic Edge Calculation
When you click **Save Changes**, the system automatically:

1. ✅ Stores the new odds in `game_info` table
2. ✅ Calculates edge using existing Monte Carlo probabilities
3. ✅ Updates edge displays on pick cards
4. ✅ Applies edge-based confidence colors (green/yellow/red)

---

## Edge Calculation Formula

**Edge = Model Probability - Implied Probability from Odds**

### Example Calculation:

**Scenario:** Cincinnati Bengals moneyline pick
- **Monte Carlo Win Probability**: 66.8% (from simulation)
- **Moneyline Odds**: `+215` (underdog odds)
- **Implied Probability**: ~31.7% (from +215 odds)
- **Edge**: 66.8% - 31.7% = **+35.1%** ✅ (Strong bet!)

---

## American Odds Format Guide

### Favorite Odds (Negative Numbers)
- `-110`: Bet $110 to win $100 (52.4% implied probability)
- `-150`: Bet $150 to win $100 (60% implied probability)
- `-200`: Bet $200 to win $100 (66.7% implied probability)

### Underdog Odds (Positive Numbers)
- `+110`: Bet $100 to win $110 (47.6% implied probability)
- `+150`: Bet $100 to win $150 (40% implied probability)
- `+200`: Bet $100 to win $200 (33.3% implied probability)

### Even Money
- `+100` or `-100`: Bet $100 to win $100 (50% implied probability)

---

## Use Cases

### 1. **Adding Missing Odds**
Some games may not have odds from The Odds API. Manually enter them from your sportsbook:
```
Home ML: -120
Away ML: +100
Spread: -110
Over: -110
Under: -110
```

### 2. **Line Shopping**
Compare odds from different sportsbooks and enter the best available:
```
DraftKings: -110 spread
FanDuel: -105 spread  ← Enter this one (better value)
```

### 3. **Odds Movement Tracking**
Update odds as lines move throughout the week:
```
Monday: Chiefs -7 (-110)
Friday: Chiefs -5.5 (-110)  ← Update for edge recalculation
```

### 4. **Live Odds Updates**
Update odds close to game time for accurate edge calculations:
```
Game time approaching: Update to latest odds from sportsbook
```

---

## Edge Interpretation

### 🟢 **Strong Bet (Edge ≥ +3%)**
- Model significantly favors your pick over market odds
- Example: +5.2% edge = Model sees 5.2% more value than bookmaker
- **Action**: Strong recommendation to bet

### 🟡 **Decent Bet (Edge +1% to +3%)**
- Moderate value found
- Example: +2.1% edge = Slight model advantage
- **Action**: Consider betting with proper bankroll management

### ⚪ **Neutral (Edge 0% to +1%)**
- Minimal edge, close to market consensus
- Example: +0.5% edge = Very small advantage
- **Action**: Pass or small bet only

### 🔴 **Avoid (Edge < 0%)**
- Negative edge = Betting against value
- Example: -2.3% edge = Model disagrees with pick
- **Action**: Avoid this bet

---

## Technical Details

### Database Schema
Odds are stored in `picks` table → `game_info` JSONB column:
```json
{
  "home_ml_odds": -150,
  "away_ml_odds": 130,
  "spread_odds": -110,
  "over_odds": -110,
  "under_odds": -110
}
```

### Edge Calculation Code
Located in: `src/utils/edgeCalculator.ts`

**Key Functions:**
- `calculateEdge(modelProb, americanOdds)`: Core edge calculation
- `oddsToImpliedProbability(americanOdds)`: Convert odds to probability
- `calculatePickEdges(pick, monteCarloResults, gameInfo)`: Calculate all three edge types

### Automatic Recalculation
When odds are updated:
1. Frontend sends new odds in `game_info` update
2. Database stores new odds values
3. Edge calculator uses existing Monte Carlo results (no re-simulation needed)
4. Pick cards display updated edge percentages with new colors

---

## Workflow Example

### Step-by-Step: Adding Odds to Week 7 Game

**Game:** Pittsburgh Steelers @ Cincinnati Bengals

1. **Navigate to Pick Manager**
   - Go to Admin → Manage Picks
   - Filter to Week 7
   - Find "Pittsburgh Steelers @ Cincinnati Bengals"

2. **Click Edit**
   - Opens AdminPickRevision component

3. **Scroll to "Manual Odds Entry" Section**
   - Blue-bordered section near bottom

4. **Enter Odds from Your Sportsbook**
   ```
   Moneyline Odds:
   - Cincinnati Bengals (Home): +215
   - Pittsburgh Steelers (Away): -265
   
   Spread Odds: -110
   
   Over/Under Odds:
   - Over: -105
   - Under: -115
   ```

5. **Review Changes Summary**
   - Yellow box shows: "Home ML Odds: none → +215 (Edge will recalculate)"

6. **Click "Save Changes"**
   - Odds saved to database
   - Edge automatically calculated
   - Pick card updates immediately

7. **View Updated Pick**
   - Navigate back to Manage Picks
   - See updated edge percentages with color coding
   - Front-end users see updated betting recommendations

---

## Best Practices

### ✅ DO:
- Enter odds from your preferred sportsbook for accurate edge
- Update odds close to game time for best accuracy
- Double-check odds format (negative for favorites, positive for underdogs)
- Use standard -110 for spread/O/U if unsure (most common)

### ❌ DON'T:
- Don't enter decimal odds (use American odds only)
- Don't forget negative sign for favorites (e.g., `-150` not `150`)
- Don't leave blank if odds exist (enter `0` or valid odds)
- Don't update odds after game starts (defeats edge calculation purpose)

---

## FAQ

**Q: What if I don't have odds for a game?**  
A: You can leave odds fields blank. Edge will show as 0% until odds are added.

**Q: Do I need to re-run Monte Carlo simulation after updating odds?**  
A: No! Edge recalculates automatically using existing Monte Carlo probabilities.

**Q: What odds format should I use?**  
A: American odds only (e.g., -110, +150). System doesn't support decimal or fractional.

**Q: Can I update odds for past games?**  
A: Yes, but it's only useful for historical analysis. Edge matters most pre-game.

**Q: Where do edge values display?**  
A: Pick cards show edge percentages and color-coded confidence bars on frontend.

**Q: What if odds change after I enter them?**  
A: Simply edit the pick again and update the odds. Edge recalculates on save.

**Q: Does this work for all bet types?**  
A: Yes! Moneyline, spread, and over/under all support manual odds + auto edge calc.

---

## Future Enhancements

Potential improvements for this feature:

1. 📊 **Odds History Tracking**: Track odds changes over time (line movement)
2. 🔄 **Auto-Refresh Odds**: Integration with real-time odds APIs
3. 📈 **Odds Comparison**: Side-by-side comparison of multiple sportsbooks
4. 🎯 **Best Line Alert**: Notify when odds move favorably
5. 💰 **EV Calculator**: Expected value calculator with bankroll management
6. 📱 **Odds Import**: Bulk import odds from CSV/API

---

## Support

**Issues or Questions?**
- Check `src/components/AdminPickRevision.tsx` for odds input UI
- Review `src/utils/edgeCalculator.ts` for calculation logic
- Reference `src/types/index.ts` for `GameInfo` interface

**Testing:**
1. Edit any pick in Admin Panel
2. Add test odds (e.g., Home ML: -150, Away ML: +130)
3. Save and verify edge calculation
4. Check pick card displays updated edge percentage

---

## Conclusion

Manual odds entry with automatic edge calculation provides:
- ✅ Flexibility to add/update odds anytime
- ✅ Instant edge calculation without re-simulation
- ✅ Better betting decisions based on true value
- ✅ Line shopping optimization
- ✅ Real-time odds tracking

**This feature bridges the gap between predictive modeling and real-world betting markets.**
