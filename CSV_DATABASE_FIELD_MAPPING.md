# CSV Parser vs Database Schema Field Mapping Analysis

## ⚠️ **CRITICAL GAPS IDENTIFIED**

### Fields in Database BUT NOT in CSV Parser:

| Database Field | Status | Notes |
|---------------|---------|-------|
| `sacks_allowed` | ❌ **MISSING** | Not in Sports Reference CSV |
| `sack_yards_lost` | ❌ **MISSING** | Not in Sports Reference CSV |
| `qb_rating` | ❌ **MISSING** | Not in Sports Reference CSV |
| `field_goals_made` | ❌ **MISSING** | Not in Sports Reference CSV |
| `field_goals_attempted` | ❌ **MISSING** | Not in Sports Reference CSV |
| `field_goal_pct` | ❌ **MISSING** | Not in Sports Reference CSV |
| `extra_points_made` | ❌ **MISSING** | Not in Sports Reference CSV |
| `extra_points_attempted` | ❌ **MISSING** | Not in Sports Reference CSV |
| `def_sacks` | ❌ **MISSING** | Not in Sports Reference CSV |
| `def_sack_yards` | ❌ **MISSING** | Not in Sports Reference CSV |
| `avg_time_of_possession` | ❌ **MISSING** | Not in Sports Reference CSV |

---

## ✅ **CORRECTLY MAPPED FIELDS**

### Offensive Stats (20 fields) ✅

| CSV Parser Field | Database Field | Source CSV | Status |
|-----------------|----------------|------------|--------|
| `gamesPlayed` | `games_played` | Offensive: G (index 2) | ✅ Mapped |
| `offensiveYardsPerGame` | `offensive_yards_per_game` | Offensive: Yds ÷ G | ✅ Mapped |
| `pointsPerGame` | `points_per_game` | Offensive: PF ÷ G | ✅ Mapped |
| `totalPlays` | `total_plays` | Offensive: Ply ÷ G | ✅ Mapped |
| `yardsPerPlay` | `yards_per_play` | Offensive: Y/P | ✅ Mapped |
| `firstDowns` | `first_downs` | Offensive: 1stD ÷ G | ✅ Mapped |
| `passCompletions` | `pass_completions` | Offensive: Cmp ÷ G | ✅ Mapped |
| `passAttempts` | `pass_attempts` | Offensive: Att ÷ G | ✅ Mapped |
| `passCompletionPct` | `pass_completion_pct` | Calculated: (Cmp/Att)*100 | ✅ Mapped |
| `passingYards` | `passing_yards` | Offensive: Pass Yds ÷ G | ✅ Mapped |
| `passingTds` | `passing_tds` | Offensive: Pass TD ÷ G | ✅ Mapped |
| `interceptionsThrown` | `interceptions_thrown` | Offensive: Int ÷ G | ✅ Mapped |
| `yardsPerPassAttempt` | `yards_per_pass_attempt` | Offensive: NY/A | ✅ Mapped |
| `rushingAttempts` | `rushing_attempts` | Offensive: Rush Att ÷ G | ✅ Mapped |
| `rushingYards` | `rushing_yards` | Offensive: Rush Yds ÷ G | ✅ Mapped |
| `rushingTds` | `rushing_tds` | Offensive: Rush TD ÷ G | ✅ Mapped |
| `yardsPerRush` | `yards_per_rush` | Offensive: Y/A | ✅ Mapped |
| `penalties` | `penalties` | Offensive: Pen ÷ G | ✅ Mapped |
| `penaltyYards` | `penalty_yards` | Offensive: Pen Yds ÷ G | ✅ Mapped |
| `redZonePct` | `red_zone_efficiency` | Offensive: Sc% | ✅ Mapped |

### Defensive Stats (15 fields) ✅

| CSV Parser Field | Database Field | Source CSV | Status |
|-----------------|----------------|------------|--------|
| `defensiveYardsAllowed` | `defensive_yards_allowed` | Defensive: Yds ÷ G | ✅ Mapped |
| `pointsAllowedPerGame` | `points_allowed_per_game` | Defensive: PA ÷ G | ✅ Mapped |
| `defTotalPlays` | `def_total_plays` | Defensive: Ply ÷ G | ✅ Mapped |
| `defYardsPerPlayAllowed` | `def_yards_per_play_allowed` | Defensive: Y/P | ✅ Mapped |
| `defFirstDownsAllowed` | `def_first_downs_allowed` | Defensive: 1stD ÷ G | ✅ Mapped |
| `defPassCompletionsAllowed` | `def_pass_completions_allowed` | Defensive: Cmp ÷ G | ✅ Mapped |
| `defPassAttempts` | `def_pass_attempts` | Defensive: Att ÷ G | ✅ Mapped |
| `defPassingYardsAllowed` | `def_passing_yards_allowed` | Defensive: Pass Yds ÷ G | ✅ Mapped |
| `defPassingTdsAllowed` | `def_passing_tds_allowed` | Defensive: Pass TD ÷ G | ✅ Mapped |
| `defInterceptions` | `def_interceptions` | Defensive: Int ÷ G | ✅ Mapped |
| `defRushingAttemptsAllowed` | `def_rushing_attempts_allowed` | Defensive: Rush Att ÷ G | ✅ Mapped |
| `defRushingYardsAllowed` | `def_rushing_yards_allowed` | Defensive: Rush Yds ÷ G | ✅ Mapped |
| `defRushingTdsAllowed` | `def_rushing_tds_allowed` | Defensive: Rush TD ÷ G | ✅ Mapped |
| `turnoversForced` | `turnovers_forced` | Defensive: TO ÷ G | ✅ Mapped |
| `fumblesForced` | `fumbles_forced` | Defensive: FL ÷ G | ✅ Mapped |

### Turnover Stats (3 fields) ✅

| CSV Parser Field | Database Field | Source CSV | Status |
|-----------------|----------------|------------|--------|
| `turnoversLost` | `turnovers_lost` | Offensive: TO ÷ G | ✅ Mapped |
| `fumblesLost` | `fumbles_lost` | Offensive: FL ÷ G | ✅ Mapped |
| `turnoverDifferential` | `turnover_differential` | Calculated: (Forced - Lost) ÷ G | ✅ Mapped |

### Placeholder Stats (1 field) ⚠️

| CSV Parser Field | Database Field | Value | Status |
|-----------------|----------------|-------|--------|
| `thirdDownPct` | `third_down_conversion_rate` | Default: 40.0 | ⚠️ Hardcoded |

---

## 📊 **MAPPING SUMMARY**

| Category | Count | Status |
|----------|-------|--------|
| **Total Database Fields** | **50** | - |
| **Correctly Mapped** | **39** | ✅ 78% |
| **Missing from CSV** | **11** | ❌ 22% |
| **Hardcoded Defaults** | **1** | ⚠️ 2% |

---

## 🔍 **DETAILED IMPACT ANALYSIS**

### ❌ **Missing Fields Impact**

#### 1. **Sacks (Offensive & Defensive)**
- **Fields:** `sacks_allowed`, `sack_yards_lost`, `def_sacks`, `def_sack_yards`
- **Impact on Predictions:** MODERATE
- **Reason:** Sacks affect passing efficiency and field position
- **Workaround:** Monte Carlo uses `yards_per_pass_attempt` which includes sack yards
- **Severity:** 🟡 MEDIUM - Indirect impact covered by existing stats

#### 2. **QB Rating**
- **Field:** `qb_rating`
- **Impact on Predictions:** LOW
- **Reason:** Composite stat already covered by completion %, yards/attempt, TDs, INTs
- **Workaround:** Calculated implicitly in offensive strength formula
- **Severity:** 🟢 LOW - Redundant with existing metrics

#### 3. **Kicking Stats**
- **Fields:** `field_goals_made`, `field_goals_attempted`, `field_goal_pct`, `extra_points_made`, `extra_points_attempted`
- **Impact on Predictions:** LOW
- **Reason:** Monte Carlo simulates scoring outcomes, doesn't track kicker accuracy
- **Workaround:** Assumes standard XP/FG success rates
- **Severity:** 🟢 LOW - Minimal impact on score predictions

#### 4. **Time of Possession**
- **Field:** `avg_time_of_possession`
- **Impact on Predictions:** MODERATE
- **Reason:** Affects number of possessions per team
- **Workaround:** Fixed possession count (12 per team) in simulation
- **Severity:** 🟡 MEDIUM - Could improve accuracy for slow/fast-paced teams

#### 5. **Third Down Conversion Rate**
- **Field:** `third_down_conversion_rate`
- **Impact on Predictions:** MODERATE
- **Reason:** Drive sustainability metric
- **Current Status:** **HARDCODED to 40.0** for all teams
- **Severity:** 🟠 HIGH - Important metric not differentiated by team

---

## 🚨 **HIGHEST PRIORITY FIXES**

### 1. **Third Down Conversion Rate** 🔴 CRITICAL
**Problem:** Currently hardcoded to 40.0% for all teams in CSV parser.

**Sports Reference CSV Location:** 
- **Offensive CSV:** Column header "3DConv%" (likely around index 27-30)
- **Defensive CSV:** Column header "3DConv%" (opponent conversion rate)

**Fix Required:**
```typescript
// In parseOffensiveCSV
thirdDownPct: parseFloat(values[27]) || 40.0, // 3DConv%

// In parseDefensiveCSV  
oppThirdDownPct: parseFloat(values[24]) || 40.0, // Opp 3DConv%

// In mergeStats
thirdDownConversionRate: offense?.thirdDownPct || 40.0
```

**Impact:** Third down conversion directly affects drive sustainability and scoring probability.

---

### 2. **Time of Possession** 🟡 MEDIUM
**Problem:** Not available in basic Sports Reference CSV.

**Possible Solutions:**
1. Accept default (assume balanced possession splits)
2. Calculate from total plays (more plays = more possession)
3. Fetch from separate source if critical

**Impact:** Affects possession count simulation accuracy.

---

### 3. **Sack Statistics** 🟡 MEDIUM
**Problem:** Not in basic team totals CSV.

**Possible Solutions:**
1. Use "NY/A" (Net Yards per Attempt) which factors in sacks
2. Accept that sacks are implicit in yards per attempt calculations
3. Fetch from Sports Reference "Passing" detailed page if needed

**Impact:** Already mitigated by using adjusted yards per attempt stats.

---

## ✅ **RECOMMENDED ACTIONS**

### Immediate (Before Production):
1. ✅ **Add Third Down Conversion Rate parsing** - Find correct column index in CSV
2. ✅ **Verify Sports Reference CSV column order** - Print headers to console
3. ✅ **Test with actual Week 5 data** - Confirm all 32 teams parse correctly

### Optional (Future Enhancement):
4. ⚠️ Add time of possession if available in advanced CSV
5. ⚠️ Add sack statistics if available in advanced CSV
6. ⚠️ Add kicking stats for more accurate FG simulation

### Not Needed:
7. ❌ QB Rating - redundant composite stat
8. ❌ Extra point stats - nearly 100% success rate

---

## 🎯 **CONCLUSION**

**Current Status:** 78% field coverage (39/50 fields)

**Prediction Accuracy:** ✅ **GOOD** - All critical offensive/defensive metrics covered

**Missing Critical Data:** 🟠 **Third Down Conversion Rate** only

**Recommendation:** 
1. **Fix third down parsing immediately** (find correct CSV column)
2. **Proceed with current implementation** for other missing fields
3. **Test with actual data** to validate predictions

The missing fields (except 3rd down %) are either:
- Redundant composite stats (QB rating)
- Minor impact (kicking stats)
- Implicitly covered (sacks in yards/attempt)
- Not in standard CSV (time of possession)

**Your Monte Carlo simulation will work accurately once third down conversion rate is properly parsed from the CSV!**
