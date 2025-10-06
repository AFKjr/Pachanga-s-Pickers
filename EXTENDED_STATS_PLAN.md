# Extended Team Stats Implementation Plan

## Overview
Upgrading from basic 8-stat model to comprehensive 60+ stat model for more granular Monte Carlo simulations.

## Database Schema Changes

### New Table Structure (see `supabase/migrations/extended_team_stats.sql`)

**Total Fields: ~70**

#### Basic Info (3 fields)
- `team_name` - Primary key
- `games_played` - Number of games in dataset
- `source` - Data source ('csv', 'manual', etc.)
- `last_updated` - Timestamp

#### Offensive Passing (10 fields)
- `pass_completions`
- `pass_attempts`
- `pass_completion_pct`
- `passing_yards`
- `passing_tds`
- `interceptions_thrown`
- `sacks_allowed`
- `sack_yards_lost`
- `qb_rating`
- `yards_per_pass_attempt`

#### Offensive Rushing (4 fields)
- `rushing_attempts`
- `rushing_yards`
- `rushing_tds`
- `yards_per_rush`

#### Offensive Totals (7 fields)
- `total_plays`
- `offensive_yards_per_game`
- `yards_per_play`
- `first_downs`
- `points_per_game`
- `third_down_conversion_rate`
- `red_zone_efficiency`

#### Penalties (2 fields)
- `penalties`
- `penalty_yards`

#### Kicking (5 fields)
- `field_goals_made`
- `field_goals_attempted`
- `field_goal_pct`
- `extra_points_made`
- `extra_points_attempted`

#### Defensive Passing (7 fields)
- `def_pass_completions_allowed`
- `def_pass_attempts`
- `def_passing_yards_allowed`
- `def_passing_tds_allowed`
- `def_interceptions`
- `def_sacks`
- `def_sack_yards`

#### Defensive Rushing (3 fields)
- `def_rushing_attempts_allowed`
- `def_rushing_yards_allowed`
- `def_rushing_tds_allowed`

#### Defensive Totals (4 fields)
- `defensive_yards_allowed`
- `def_yards_per_play_allowed`
- `def_first_downs_allowed`
- `points_allowed_per_game`

#### Turnovers (5 fields)
- `turnovers_forced` - INTs + fumbles recovered
- `turnovers_lost` - INTs thrown + fumbles lost
- `turnover_differential` - Forced - Lost
- `fumbles_forced`
- `fumbles_lost`

#### Miscellaneous (1 field)
- `avg_time_of_possession`

## CSV Column Mapping

### Sports Reference Offensive Stats CSV
```
Rk,Tm,G,PF,Yds,Ply,Y/P,TO,FL,1stD,
Cmp,Att,Yds,TD,Int,NY/A,1stD,      <- Passing stats
Att,Yds,TD,Y/A,1stD,                <- Rushing stats  
Pen,Yds,1stPy,Sc%,TO%,EXP          <- Penalties, scoring
```

**Maps to:**
- `Tm` → `team_name`
- `G` → `games_played`
- `PF` → `points_per_game` (divide by G)
- `Yds` (first) → `offensive_yards_per_game` (divide by G)
- `Ply` → `total_plays` (divide by G)
- `Y/P` → `yards_per_play`
- `TO` → `turnovers_lost`
- `FL` → `fumbles_lost`
- `1stD` (first) → `first_downs` (divide by G)
- `Cmp` → `pass_completions` (divide by G)
- `Att` (passing) → `pass_attempts` (divide by G)
- `Yds` (passing) → `passing_yards` (divide by G)
- `TD` (passing) → `passing_tds` (divide by G)
- `Int` → `interceptions_thrown` (divide by G)
- `Att` (rushing) → `rushing_attempts` (divide by G)
- `Yds` (rushing) → `rushing_yards` (divide by G)
- `TD` (rushing) → `rushing_tds` (divide by G)
- `Y/A` → `yards_per_rush`
- `Pen` → `penalties` (divide by G)
- `Yds` (penalties) → `penalty_yards` (divide by G)
- `Sc%` → `red_zone_efficiency` (direct value)

### Sports Reference Defensive Stats CSV
```
Rk,Tm,G,PA,Yds,Ply,Y/P,TO,FL,1stD,
Cmp,Att,Yds,TD,Int,NY/A,1stD,      <- Passing defense
Att,Yds,TD,Y/A,1stD,                <- Rushing defense
Pen,Yds,1stPy,Sc%,TO%,EXP
```

**Maps to:**
- `Tm` → match to team_name
- `PA` → `points_allowed_per_game` (divide by G)
- `Yds` (first) → `defensive_yards_allowed` (divide by G)
- `Ply` → `def_total_plays` (divide by G)
- `Y/P` → `def_yards_per_play_allowed`
- `TO` → `turnovers_forced` (INTs + fumbles)
- `FL` → `fumbles_forced`
- `1stD` (first) → `def_first_downs_allowed` (divide by G)
- `Cmp` → `def_pass_completions_allowed` (divide by G)
- `Att` (passing) → `def_pass_attempts` (divide by G)
- `Yds` (passing) → `def_passing_yards_allowed` (divide by G)
- `TD` (passing) → `def_passing_tds_allowed` (divide by G)
- `Int` → `def_interceptions` (divide by G)
- `Att` (rushing) → `def_rushing_attempts_allowed` (divide by G)
- `Yds` (rushing) → `def_rushing_yards_allowed` (divide by G)
- `TD` (rushing) → `def_rushing_tds_allowed` (divide by G)
- `Sc%` → Used to calculate defensive efficiency

### Additional CSV Sheets (if available)
- Passing details (sacks, QB rating) 
- Scoring (FG, XP)
- Third down conversions

## Implementation Steps

### Phase 1: Database Migration ✅
- [x] Create migration SQL file
- [ ] Run migration in Supabase dashboard
- [ ] Verify all columns created

### Phase 2: TypeScript Interfaces
- [ ] Update `TeamStatsRow` interface in CSVImportStats
- [ ] Update `TeamStatsData` interface in AdminTeamStats
- [ ] Create extended stats type in `src/types/index.ts`

### Phase 3: CSV Parser Enhancement
- [ ] Update `parseSportsReferenceCSV()` to extract all columns
- [ ] Handle multiple "Yds", "TD", "Att" columns correctly
- [ ] Map column indices by position and context
- [ ] Calculate per-game averages
- [ ] Merge offensive + defensive data

### Phase 4: Database Import
- [ ] Update Supabase upsert to include all new fields
- [ ] Add data validation
- [ ] Handle missing/null values with defaults

### Phase 5: UI Display
- [ ] Update AdminTeamStats table to show key stats
- [ ] Add expandable rows for detailed stats
- [ ] Create stat categories/tabs
- [ ] Add sorting/filtering

### Phase 6: Monte Carlo Integration
- [ ] Update `generate-predictions.ts` to use extended stats
- [ ] Enhance simulation algorithms with new data
- [ ] Weight factors appropriately
- [ ] Test prediction accuracy

## Data Validation Rules

- All numeric fields must be >= 0
- Percentages must be 0-100
- Games played must be > 0
- Divide all totals by games_played for per-game stats
- Handle missing data with league averages

## Testing Checklist

- [ ] Upload offensive CSV only - should populate offensive fields
- [ ] Upload defensive CSV only - should populate defensive fields
- [ ] Upload both CSVs - should merge correctly
- [ ] Verify turnover differential calculation
- [ ] Check per-game calculations
- [ ] Validate all database fields populated
- [ ] Test with partial data (missing columns)
- [ ] Test with Week 5 data provided

## Notes

- Sports Reference uses multiple columns with same name (Yds, TD, Att)
- Must parse by position in header, not just name
- Offensive CSV has passing Yds at column ~12, rushing Yds at column ~18
- Need to track column indices carefully
- Consider using column position + preceding column name to disambiguate

## Next Steps

1. Run database migration in Supabase
2. Update TypeScript interfaces
3. Rewrite CSV parser with comprehensive mapping
4. Test with user's Week 5 data
5. Update Monte Carlo algorithms
