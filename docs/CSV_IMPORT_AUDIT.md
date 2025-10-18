# CSV Import Data Quality Audit

## Issue Summary
The CSV parser is **NOT correctly mapping** many columns from the CSV files to the database fields. Many critical stats are showing as `0` or `null` when they should have actual values.

---

## Critical Missing Data Mappings

### ❌ **OFFENSIVE STATS - NOT BEING IMPORTED**

| Database Field | CSV Column Name | Current Value in DB | Should Be |
|----------------|-----------------|---------------------|-----------|
| `pass_completions` | "Passes completed" | **0** | ✅ Has data |
| `pass_attempts` | "Passes attempted" | **0** | ✅ Has data |
| `pass_completion_pct` | *(needs calculation)* | **0** | ✅ Calc from completions/attempts |
| `passing_tds` | "Passing touchdowns" | **0** | ✅ Has data |
| `interceptions_thrown` | "Interceptions thrown" | **0** | ✅ Has data |
| `yards_per_pass_attempt` | "Net yards gain per pass attempt" | **0** | ✅ Has data |
| `rushing_attempts` | "Rushing Attempts" | **0** | ✅ Has data |
| `rushing_tds` | "Rushinig touchdowns" *(typo in CSV)* | **0** | ✅ Has data |
| `yards_per_rush` | "Rushing yards per attempt" | **0** | ✅ Has data |
| `first_downs` | "1st downs" | **0** | ✅ Has data |
| `penalties` | "Penalites commited by team and accepted" | **0** | ✅ Has data |
| `penalty_yards` | "Penalties in yards commited by team" | **0** | ✅ Has data |
| `total_plays` | "Plays" | **0** | ✅ Has data |
| `yards_per_play` | "Yards per play" | **0** | ✅ Has data |
| `fumbles_lost` | "Fumbles lost by player or team" | **0** | ✅ Has data |

### ❌ **DEFENSIVE STATS - NOT BEING IMPORTED**

| Database Field | CSV Column Name | Current Value in DB | Should Be |
|----------------|-----------------|---------------------|-----------|
| `def_total_plays` | "Offensive plays allowed" | **0** | ✅ Has data |
| `def_yards_per_play_allowed` | "Yards per offensive play" | **0** | ✅ Has data |
| `def_first_downs_allowed` | "1st downs allowed" | **0** | ✅ Has data |
| `def_pass_completions_allowed` | "Passes completed" | **0** | ✅ Has data |
| `def_pass_attempts` | "Passing attempts" | **0** | ✅ Has data |
| `def_passing_yards_allowed` | "Yards gained by passing" | **0** | ✅ Has data |
| `def_passing_tds_allowed` | "Passing touchdowns allowed" | **0** | ✅ Has data |
| `def_rushing_attempts_allowed` | "Rushing attempts allowed" | **0** | ✅ Has data |
| `def_rushing_yards_allowed` | "Rushing yards allowed" | **0** | ✅ Has data |
| `def_rushing_tds_allowed` | "Rushing Touchdowns" | **0** | ✅ Has data |
| `turnovers_forced` | "Takeaways" | **0** | ✅ Has data |
| `fumbles_forced` | "Fumbles caused by defense" | **0** | ✅ Has data |

---

## ✅ **STATS CORRECTLY IMPORTED**

| Database Field | CSV Column | Status |
|----------------|------------|--------|
| `points_per_game` | "Points for" / Games | ✅ Working |
| `offensive_yards_per_game` | "Yards" / Games | ✅ Working |
| `passing_yards` | "Passing yards" | ✅ Working |
| `rushing_yards` | "Rushing yards" | ✅ Working |
| `turnovers_lost` | "Turnovers" | ✅ Working |
| `defensive_yards_allowed` | "Yards allowed" | ✅ Working |
| `points_allowed_per_game` | "Points allowed by team" / Games | ✅ Working (shows as 0 due to bug) |
| `def_interceptions` | "Interceptions" | ✅ Working |
| `scoring_percentage` | "Percentage of drives ending in a score" | ✅ Working |

---

## 🚨 **NEW FIELDS IN CSV NOT IN PARSER**

These columns exist in the CSV but are **NOT** being extracted:

### Offensive CSV - Additional Columns:
1. `"1st downs by passing"` - Not mapped
2. `"1st down by penalty"` - Not mapped  
3. `"Percentage of drives ending in a turnover"` - Not mapped
4. `"Expected points contributed by all offense"` - Not mapped

### Defensive CSV - Additional Columns:
1. `"Net yards gained per pass attempt"` - Not mapped (defensive version)
2. `"1st downs by passing"` - Not mapped (defensive)
3. `"1st downs by rushing allowed"` - Not mapped
4. `"Percentages of drives ending in a offensive turnover"` - Not mapped
5. `"Expected points contributed by all defense"` - Not mapped

---

## 📊 **ROOT CAUSE ANALYSIS**

### Problem 1: Incorrect CSV Column Name Mapping
The `csvParser.ts` file has **hardcoded column names** that don't match the actual CSV headers:

```typescript
// Parser expects:
pass_completions: offRow['Pass completions']

// But CSV has:
"Passes completed"  // ❌ Doesn't match!
```

### Problem 2: Missing Fields
Several fields are defined in the `ParsedTeamStats` interface but are **never populated** from CSV data:
- `pass_first_downs`
- `rush_first_downs`
- `penalty_first_downs`
- `turnover_percentage`
- `expected_points_offense`
- `def_pass_first_downs`
- `def_rush_first_downs`
- `def_net_yards_per_pass`
- `def_yards_per_rush_allowed`
- `def_scoring_percentage`
- `def_turnover_percentage`
- `expected_points_defense`

These show as `null` in your database because they're never set in the parser.

---

## 🔧 **REQUIRED FIXES**

### Fix 1: Update Column Name Mappings in `csvParser.ts`

**Lines 147-157** - Offensive stats need corrections:
```typescript
// CURRENT (WRONG):
pass_completions: offRow['Pass completions'] || 0,
pass_attempts: offRow['Pass attempts'] || 0,
passing_tds: offRow['Passing TDs'] || 0,
interceptions_thrown: offRow['Interceptions thrown'] || 0,
yards_per_pass_attempt: offRow['Yards per pass attempt'] || 0,
rushing_attempts: offRow['Rushing attempts'] || 0,
rushing_tds: offRow['Rushing TDs'] || 0,
yards_per_rush: offRow['Yards per rush attempt'] || 0,
penalties: offRow['Penalties'] || 0,
penalty_yards: offRow['Penalty yards'] || 0,
fumbles_lost: offRow['Fumbles lost'] || 0,

// SHOULD BE:
pass_completions: offRow['Passes completed'] || 0,
pass_attempts: offRow['Passes attempted'] || 0,
passing_tds: offRow['Passing touchdowns'] || 0,
interceptions_thrown: offRow['Interceptions thrown'] || 0,
yards_per_pass_attempt: offRow['Net yards gain per pass attempt'] || 0,
rushing_attempts: offRow['Rushing Attempts'] || 0,
rushing_tds: offRow['Rushinig touchdowns'] || 0,  // Note: CSV has typo
yards_per_rush: offRow['Rushing yards per attempt'] || 0,
penalties: offRow['Penalites commited by team and accepted'] || 0,
penalty_yards: offRow['Penalties in yards commited by team'] || 0,
fumbles_lost: offRow['Fumbles lost by player or team'] || 0,
```

**Lines 168-179** - Defensive stats need corrections:
```typescript
// CURRENT (WRONG):
def_total_plays: defRow['Total plays'] || 0,
def_pass_completions_allowed: defRow['Pass completions allowed'] || 0,
def_pass_attempts: defRow['Pass attempts'] || 0,
def_passing_yards_allowed: defRow['Passing yards allowed'] || 0,
def_passing_tds_allowed: defRow['Passing TDs allowed'] || 0,
def_rushing_attempts_allowed: defRow['Rushing attempts allowed'] || 0,
def_rushing_yards_allowed: defRow['Rushing yards allowed'] || 0,
def_rushing_tds_allowed: defRow['Rushing TDs allowed'] || 0,
fumbles_forced: defRow['Fumbles forced'] || 0,

// SHOULD BE:
def_total_plays: defRow['Offensive plays allowed'] || 0,
def_pass_completions_allowed: defRow['Passes completed'] || 0,
def_pass_attempts: defRow['Passing attempts'] || 0,
def_passing_yards_allowed: defRow['Yards gained by passing'] || 0,
def_passing_tds_allowed: defRow['Passing touchdowns allowed'] || 0,
def_rushing_attempts_allowed: defRow['Rushing attempts allowed'] || 0,
def_rushing_yards_allowed: defRow['Rushing yards allowed'] || 0,
def_rushing_tds_allowed: defRow['Rushing Touchdowns'] || 0,
fumbles_forced: defRow['Fumbles caused by defense'] || 0,
```

### Fix 2: Add Missing Field Mappings

Add these new fields to the parser to capture ALL CSV data:

```typescript
// Offensive - add after existing fields
pass_first_downs: offRow['1st downs by passing'] || 0,
rush_first_downs: offRow['1st downs by rushing'] || 0,
penalty_first_downs: offRow['1st down by penalty'] || 0,
turnover_percentage: offRow['Percentage of drives ending in a turnover'] || 0,
expected_points_offense: offRow['Expected points contributed by all offense'] || 0,

// Defensive - add after existing fields
def_pass_first_downs: defRow['1st downs by passing'] || 0,
def_rush_first_downs: defRow['1st downs by rushing allowed'] || 0,
def_net_yards_per_pass: defRow['Net yards gained per pass attempt'] || 0,
def_yards_per_rush_allowed: defRow['Rushing yards per attempt allowed'] || 0,
def_scoring_percentage: defRow['Percentage of drives ending in a offensive score'] || 0,
def_turnover_percentage: defRow['Percentages of drives ending in a offensive turnover'] || 0,
expected_points_defense: defRow['Expected points contributed by all defense'] || 0,
```

### Fix 3: Calculate Pass Completion Percentage

```typescript
const passAttempts = offRow['Passes attempted'] || 0;
const passCompletions = offRow['Passes completed'] || 0;
const passCompletionPct = passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0;

// Then in stats object:
pass_completion_pct: passCompletionPct,
```

---

## 🎯 **IMPACT ON PREDICTIONS**

### Critical Missing Data:
- **Pass completion rates** - Monte Carlo uses this for pass success probability
- **Yards per play** - Core efficiency metric
- **Total plays** - Needed to calculate pace and possessions
- **First downs** - Drive sustainability indicator
- **Turnover rates** - Critical for simulation variance

### Result:
Without this data, your Monte Carlo simulations are likely using **default/fallback values** which would significantly reduce prediction accuracy.

---

## ✅ **NEXT STEPS**

1. **Fix `csvParser.ts`** - Update all column name mappings
2. **Re-import Week 7 data** - Test that all fields populate correctly
3. **Verify in Supabase** - Check that previously `0` or `null` fields now have real values
4. **Re-import historical data** - Update Weeks 1-6 with correct mappings
5. **Test Monte Carlo predictions** - Verify improved accuracy with complete data

---

## 📝 **SQL Query to Verify After Fix**

Run this after re-importing to verify data quality:

```sql
SELECT 
  team_name,
  week,
  -- Should NOT be 0:
  total_plays,
  pass_completions,
  pass_attempts,
  yards_per_play,
  def_total_plays,
  def_pass_completions_allowed,
  -- Should NOT be NULL:
  pass_first_downs,
  expected_points_offense,
  expected_points_defense
FROM team_stats_cache
WHERE week = 7 AND season_year = 2025
ORDER BY team_name;
```

**Expected Result:** No zeros or nulls in these fields after correct import.
