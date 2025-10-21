# Team Stats Default Values Analysis

## Summary
Your Monte Carlo simulations are **using fallback default values (40% and 55%)** instead of real team stats from the database. This explains why predictions show identical 3D% and RZ% values across different teams.

---

## 🔍 Root Cause Analysis

### 1. **Database Query Returns Data**
**Location:** `supabase/functions/generate-predictions/lib/database/fetch-stats.ts` (Lines 87-118)

The query **IS successfully fetching data** from the database:
```typescript
let query = `${supabaseUrl}/rest/v1/team_stats_cache?team_name=eq.${encodeURIComponent(queryName)}&season_year=eq.2025`;
if (week) {
  query += `&week=eq.${week}`;
}
query += '&order=week.desc&limit=1&select=*';
```

**Evidence:** You see the log message: `✅ Loaded stats for [Team] - Week 7`

### 2. **Database Columns Are NULL**
The query returns a row, but **critical columns contain NULL values**:
- `third_down_conversion_rate` is NULL
- `red_zone_efficiency` is NULL
- Other stats columns are also NULL

### 3. **Nullish Coalescing Operator (`??`) Triggers Defaults**
**Location:** Lines 136-137

```typescript
thirdDownConversionRate: dbStats.third_down_conversion_rate ?? 40.0,
redZoneEfficiency: dbStats.red_zone_efficiency ?? 55.0,
```

**How it works:**
- If `dbStats.third_down_conversion_rate` is `null` or `undefined`, it defaults to `40.0`
- If `dbStats.red_zone_efficiency` is `null` or `undefined`, it defaults to `55.0`

**Result:** Every team gets the same fallback values when database columns are empty.

---

## 📊 Where Default Values Come From

### Source: `default-stats.ts`
**Location:** `supabase/functions/generate-predictions/lib/database/default-stats.ts` (Lines 13-14)

```typescript
export function getDefaultTeamStats(teamName: string): TeamStats {
  return {
    team: teamName,
    gamesPlayed: 5,
    thirdDownConversionRate: 40.0,    // ← This is your 40%
    redZoneEfficiency: 55.0,          // ← This is your 55%
    // ... 50+ other NFL average stats
  };
}
```

These are **NFL league averages** used when:
1. Team is not found in database at all
2. Team row exists but columns are NULL

---

## 🚨 The Problem: Partial Data in Database

### What's Happening
Your `team_stats_cache` table has:
- ✅ Rows for teams (e.g., Chiefs, Bills)
- ✅ Week numbers
- ✅ Basic stats (games_played, points_per_game, etc.)
- ❌ **NULL values for critical columns** (third_down_conversion_rate, red_zone_efficiency)

### Why Log Shows Only 3D% and RZ%
**Location:** `live-predictions.ts` (Lines 258-259)

```typescript
console.log(`📈 ${game.home_team} stats: 3D%=${homeStats.thirdDownConversionRate}, RZ%=${homeStats.redZoneEfficiency}`);
console.log(`📈 ${game.away_team} stats: 3D%=${awayStats.thirdDownConversionRate}, RZ%=${awayStats.redZoneEfficiency}`);
```

The log **only prints these two stats**, but the `TeamStats` object has **60+ properties**. Most are falling back to defaults because database columns are NULL.

---

## 🔧 How to Diagnose Further

### Step 1: Enable DEBUG Logging
The code already has debug logging built in (Lines 121-130):

```typescript
if (Deno.env.get('DEBUG') === 'true') {
  console.log(`Raw DB values for ${teamName}:`, {
    thirdDownConversionRate: dbStats.third_down_conversion_rate,
    redZoneEfficiency: dbStats.red_zone_efficiency,
    defThirdDownConversionRate: dbStats.def_third_down_conversion_rate,
    defRedZoneEfficiency: dbStats.def_red_zone_efficiency,
    // ...
  });
}
```

**To enable:** Set environment variable `DEBUG=true` in your Supabase Edge Function settings.

### Step 2: Query Database Directly

Run this SQL query to check what data actually exists:

```sql
SELECT 
  team_name,
  week,
  season_year,
  third_down_conversion_rate,
  red_zone_efficiency,
  games_played,
  points_per_game,
  offensive_yards_per_game,
  defensive_yards_allowed
FROM team_stats_cache
WHERE season_year = 2025 
  AND week = 7
ORDER BY team_name;
```

**Expected Results:**
- If all columns show NULL except basic ones → **Data import issue**
- If columns have values → **Team name mismatch issue**

### Step 3: Check CSV Import Process

The stats are imported via CSV upload. Check if:
1. CSV files have the correct column headers
2. Column names match database schema exactly (snake_case)
3. Import service is mapping columns correctly

**CSV Import Service:** `src/services/teamStatsImporter.ts`

---

## 🔍 Database Schema Structure

### Core Columns (from fusion migration)
**File:** `supabase/migrations/add_fusion_data_columns.sql`

```sql
-- Situational offense
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS third_down_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS third_down_conversions DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS red_zone_attempts DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS red_zone_touchdowns DECIMAL(10,2);
ALTER TABLE team_stats_cache ADD COLUMN IF NOT EXISTS red_zone_scoring_pct DECIMAL(10,2);

-- 100+ other columns
```

**Note:** The schema has columns for raw stats (attempts, conversions) but `third_down_conversion_rate` and `red_zone_efficiency` are **percentage columns** that need to be:
1. Provided in CSV with correct header names
2. OR calculated from raw stats during import

---

## ✅ Solutions

### Option 1: Fix CSV Import (Recommended)
Ensure your CSV files have these exact column headers:
```
team_name,week,season_year,third_down_conversion_rate,red_zone_efficiency,...
Chiefs,7,2025,45.2,62.5,...
Bills,7,2025,41.8,58.3,...
```

**Column name format:** `snake_case` (matches database exactly)

### Option 2: Calculate During Import
If CSVs only have raw stats, modify the import service to calculate percentages:

```typescript
third_down_conversion_rate: (third_down_conversions / third_down_attempts) * 100
red_zone_efficiency: (red_zone_touchdowns / red_zone_attempts) * 100
```

### Option 3: Modify Fetch Logic to Calculate on-the-fly
Change `fetch-stats.ts` to calculate from raw columns if percentage columns are NULL:

```typescript
thirdDownConversionRate: dbStats.third_down_conversion_rate ?? 
  (dbStats.third_down_conversions && dbStats.third_down_attempts 
    ? (dbStats.third_down_conversions / dbStats.third_down_attempts) * 100 
    : 40.0),
```

---

## 🎯 Verification Steps

### 1. Check Current Database State
```sql
-- See what data exists for a specific team
SELECT * FROM team_stats_cache 
WHERE team_name = 'Kansas City Chiefs' 
  AND season_year = 2025 
  AND week = 7;
```

### 2. Test Fetch Function
Add temporary logging to see exact database values:

```typescript
console.log('FULL DB ROW:', JSON.stringify(dbStats, null, 2));
```

### 3. Validate Team Name Mapping
**File:** `lib/team-mappings.ts`

Ensure team names in CSV match the canonical names:
```typescript
const TEAM_NAME_MAPPINGS = {
  'chiefs': 'Kansas City Chiefs',
  'kansas city chiefs': 'Kansas City Chiefs',
  'kc chiefs': 'Kansas City Chiefs',
  // ...
};
```

---

## 📌 Key Takeaways

1. **Database query works** ✅ (returns rows)
2. **Database columns are NULL** ❌ (no stats data)
3. **Fallback defaults are working as designed** ✅ (40%, 55% are safety values)
4. **Root issue:** Stats not being imported into database properly
5. **Evidence:** Log shows "Loaded stats" but only prints default values

---

## 🔧 Immediate Action Items

1. **Run SQL query** (Step 2 above) to confirm NULL values
2. **Check CSV files** for column headers and data
3. **Review import logs** for errors during CSV upload
4. **Enable DEBUG mode** to see raw database values
5. **Verify team name mappings** match between CSV and database

---

## 📂 Related Files

- **Stats Fetching:** `lib/database/fetch-stats.ts` (Lines 82-300)
- **Default Values:** `lib/database/default-stats.ts` (Lines 1-54)
- **Team Mappings:** `lib/team-mappings.ts`
- **CSV Import:** `src/services/teamStatsImporter.ts`
- **Database Schema:** `supabase/migrations/add_fusion_data_columns.sql`
- **Prediction Generator:** `lib/generators/live-predictions.ts` (Lines 247-260)

---

## 🎓 Understanding the Nullish Coalescing Operator (`??`)

```typescript
const value = databaseValue ?? defaultValue;
```

**Behavior:**
- If `databaseValue` is `null` or `undefined` → use `defaultValue`
- If `databaseValue` is `0`, `""`, `false` → use `databaseValue` (NOT default)
- **Your case:** Database returns `null` → defaults to 40.0 and 55.0

**This is NOT a bug** — it's a safety mechanism. The issue is **why the database has NULL values** in the first place.
