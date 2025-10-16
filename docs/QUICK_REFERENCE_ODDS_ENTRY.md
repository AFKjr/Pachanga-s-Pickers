# Quick Reference: Manual Odds Entry

## 🎯 Quick Start (30 seconds)

1. **Admin Panel** → **Manage Picks** → **Edit** (on any pick)
2. Scroll to **"Manual Odds Entry"** (blue section)
3. Enter odds in American format
4. Click **Save Changes**
5. ✅ Edge automatically calculated!

---

## 📝 Odds Format Examples

| Odds Type | Example | Meaning |
|-----------|---------|---------|
| Favorite | `-150` | Bet $150 to win $100 |
| Underdog | `+130` | Bet $100 to win $130 |
| Even | `+100` | Bet $100 to win $100 |
| Standard Juice | `-110` | Typical spread/O/U odds |

---

## 🎨 Edge Color Guide

| Color | Edge Range | Action |
|-------|------------|--------|
| 🟢 Green | +3% or higher | **STRONG BET** |
| 🟡 Yellow | +1% to +3% | Decent value |
| ⚪ Gray | 0% to +1% | Pass/minimal bet |
| 🔴 Red | Negative | **AVOID** |

---

## ⚡ Common Scenarios

### Scenario 1: Missing Odds
```
Problem: Game has no odds from API
Solution: Manually enter from your sportsbook
Time: 30 seconds per game
```

### Scenario 2: Line Movement
```
Problem: Odds changed since prediction generated
Solution: Update odds, edge recalculates instantly
Time: 15 seconds
```

### Scenario 3: Line Shopping
```
Problem: Finding best available odds across books
Solution: Enter best odds found, optimize edge
Time: 1 minute (compare books + enter)
```

---

## 💡 Pro Tips

✅ **Update close to game time** for most accurate edge  
✅ **Use -110 as default** for spread/O/U if unsure  
✅ **Double-check negative signs** on favorites  
✅ **Save after each game** to avoid losing data  
✅ **Check edge colors** before publishing picks  

---

## 🔧 Fields Explained

### Moneyline Odds
- **Home Team**: Odds for home team to win
- **Away Team**: Odds for away team to win
- **One negative, one positive** (or both positive if close matchup)

### Spread Odds
- **Single value**: Applies to both favorite and underdog
- **Usually -110** (standard vig)
- **Can differ**: -105, -115, etc.

### Over/Under Odds
- **Over**: Odds for total points OVER the line
- **Under**: Odds for total points UNDER the line
- **Often different**: e.g., Over -110, Under -105

---

## 📊 Example: Complete Entry

**Game**: Kansas City Chiefs @ Las Vegas Raiders

```
Moneyline Odds:
├─ Kansas City Chiefs (Home): -850
└─ Las Vegas Raiders (Away): +575

Spread Odds: -112

Over/Under Odds:
├─ Over: -110
└─ Under: -110
```

**Result**: 
- Edge calculated for all three bet types
- Pick cards show updated recommendations
- Users see confidence bars with colors

---

## ⚠️ Common Mistakes

| Mistake | Correct |
|---------|---------|
| `150` (no sign) | `-150` (favorite) |
| `1.50` (decimal) | `-150` (American) |
| Blank when known | Enter actual odds |
| After game starts | Update pre-game only |

---

## 🚀 Workflow Automation

### For Multiple Games:
1. Open sportsbook in separate tab
2. Go to Manage Picks (filtered by week)
3. Edit first game → Enter odds → Save
4. Edit next game → Enter odds → Save
5. Repeat for all games
6. ✅ All edges calculated automatically

**Time**: ~2-3 minutes for full weekly slate

---

## 📱 Mobile-Friendly

The odds entry interface works on:
- ✅ Desktop browsers
- ✅ Tablet devices  
- ✅ Mobile phones (admin access required)

---

## 🎓 Learn More

**Full Documentation**: `docs/MANUAL_ODDS_ENTRY_GUIDE.md`  
**Edge Calculator Code**: `src/utils/edgeCalculator.ts`  
**UI Component**: `src/components/AdminPickRevision.tsx`

---

## 🆘 Troubleshooting

**Q: Odds not saving?**  
→ Check for TypeScript errors in browser console

**Q: Edge shows 0%?**  
→ Verify Monte Carlo results exist for that pick

**Q: Wrong edge calculation?**  
→ Confirm odds format is American (not decimal)

**Q: Can't see odds section?**  
→ Scroll down in Edit Pick modal (blue-bordered section)

---

## ✨ Key Benefits

1. **No Re-Simulation Needed**: Uses existing Monte Carlo data
2. **Instant Edge Updates**: Saves → calculates → displays in <1 second
3. **Flexible Updates**: Change odds anytime, any game
4. **Better Decisions**: True edge based on your sportsbook's odds
5. **Line Shopping**: Optimize for best available value

---

**Happy betting! 🎲📊**
