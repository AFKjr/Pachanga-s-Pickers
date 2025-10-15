# Sports Radar API Disabled - CSV-Only Stats System

**Date:** October 15, 2025  
**Status:** ✅ Complete  

---

## Overview

All Sports Radar API functionality has been **permanently disabled** throughout the codebase. The system now operates exclusively on **CSV-imported team statistics**.

---

## What Changed

### 1. **Backend Changes (Supabase Edge Functions)**

#### `supabase/functions/generate-predictions/lib/database/fetch-stats.ts`
- ❌ Removed Sports Radar API calls
- ✅ Database-first approach with fallback to defaults
- ✅ No external API dependencies for stats

**Before:**
```typescript
// Only use Sports Radar API - no fallbacks
if (!rapidApiKey) {
  throw new Error(`Sports Radar API key not provided`);
}
const rapidStats = await fetchTeamStatsWithCache(...);
```

**After:**
```typescript
// Sports Radar API DISABLED - using database-only approach
const dbStats = await fetchTeamStats(teamName, supabaseUrl, supabaseKey, week);
if (dbStats) return dbStats;
// Fallback to defaults if not in database
return getDefaultTeamStats(teamName);
```

#### `supabase/functions/generate-predictions/index.ts`
- ❌ Removed `SPORTSRADAR_API_KEY` environment variable requirement
- ❌ Removed API key validation logic
- ✅ Set `RAPIDAPI_KEY = undefined` to disable all API calls

**Before:**
```typescript
const RAPIDAPI_KEY = Deno.env.get('SPORTSRADAR_API_KEY');
if (!RAPIDAPI_KEY) {
  throw new Error('Sports Radar API key missing');
}
```

**After:**
```typescript
const RAPIDAPI_KEY = undefined; // Sports Radar API DISABLED
console.log('ℹ️ Sports Radar API disabled - using team_stats_cache database');
```

---

### 2. **Frontend Changes**

#### `src/components/APIPredictionsGenerator.tsx`
Updated all user-facing text to reflect CSV-only workflow:

- **Prerequisites Section:**
  - ❌ "Stats fetched automatically from Sports Radar API"
  - ✅ "Team stats must be imported via CSV upload"
  - ✅ "Upload offensive/defensive CSVs on the Team Stats page"

- **Historical Mode:**
  - ❌ "Uses current team stats from Sports Radar API"
  - ✅ "Uses team stats from database (CSV imports)"

- **Hybrid Mode:**
  - ❌ "Uses current team stats from Sports Radar API"
  - ✅ "Uses team stats from database (CSV imports)"

#### `src/pages/admin/TeamStatsPage.tsx`
- Changed banner from "Hybrid Stats System" → **"CSV-Only Stats System"**
- Changed color from blue → **orange (warning)**
- Added explicit warning: "Sports Radar API has been disabled"
- Emphasized: "Team statistics MUST be imported via CSV files"

---

### 3. **Documentation Updates**

#### `.github/copilot-instructions.md`
Updated all references:

- **Data Sources:**
  - ❌ "team stats from ESPN API"
  - ✅ "CSV imports only (Sports Radar API disabled)"

- **Database Tables:**
  - ❌ "Cached team statistics from ESPN API"
  - ✅ "Team statistics from CSV imports (Sports Radar API disabled)"

- **Team Stats Schema:**
  - ❌ "with ESPN API integration"
  - ✅ "via CSV imports (Sports Radar API disabled)"

---

## System Architecture

### Data Flow (CSV-Only):

```
┌─────────────────────────────────────────────────────────┐
│ 1. ADMIN: Upload CSV Files                             │
│    - Offensive Stats (Week X)                          │
│    - Defensive Stats (Week X)                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. NFLStatsParser Utility                              │
│    - parseCompleteStats()                              │
│    - Team name normalization                           │
│    - Week/season extraction                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Supabase Database (team_stats_cache)                │
│    - 40+ stats per team                                │
│    - Week/season tracking                              │
│    - Source: 'csv'                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Prediction Generation (Edge Function)               │
│    - fetchTeamStatsWithFallback()                      │
│    - Database lookup only (no API calls)               │
│    - Fallback to defaults if missing                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Monte Carlo Simulation                              │
│    - 10,000 iterations per game                        │
│    - Uses CSV-imported stats                           │
│    - Generates predictions                             │
└─────────────────────────────────────────────────────────┘
```

---

## Files Modified

### Backend (Supabase Functions):
1. ✅ `supabase/functions/generate-predictions/lib/database/fetch-stats.ts`
2. ✅ `supabase/functions/generate-predictions/index.ts`

### Frontend (React Components):
3. ✅ `src/components/APIPredictionsGenerator.tsx`
4. ✅ `src/pages/admin/TeamStatsPage.tsx`

### Documentation:
5. ✅ `.github/copilot-instructions.md`
6. ✅ `docs/SPORTS_RADAR_API_DISABLED.md` (this file)

---

## Files NOT Changed (API Code Preserved)

The following files contain Sports Radar API logic but are **no longer called**:

- `supabase/functions/generate-predictions/lib/database/fetch-stats-rapidapi.ts`
  - Contains `fetchTeamStatsFromRapidAPI()` function
  - Contains NFL team ID mappings for Sports Radar
  - Contains caching logic for API responses
  - **Status:** Code preserved but unreachable (import commented out)

**Reason for Preservation:** Can be re-enabled if needed in the future by uncommenting the import.

---

## Admin Workflow (CSV-Only)

### Step-by-Step Process:

1. **Navigate to Team Stats Page**
   - Go to `/admin/team-stats`

2. **Upload Weekly CSV Files**
   - Download offensive stats from ESPN/Sports Reference
   - Download defensive stats from ESPN/Sports Reference
   - Upload both files using the CSV Import section

3. **Parse & Preview**
   - Click "Parse & Merge Stats"
   - Review the 32 teams preview table
   - Verify offensive/defensive yards, points, etc.

4. **Import to Database**
   - Click "Import to Database"
   - Wait for confirmation (e.g., "✅ Successfully imported 32 teams")

5. **Generate Predictions**
   - Go to `/admin/generate`
   - Select Live or Historical mode
   - Click "Generate Predictions"
   - System will use CSV-imported stats from database

---

## Environment Variables

### REMOVED (No Longer Required):
- ❌ `SPORTSRADAR_API_KEY` - Not needed, API disabled

### STILL REQUIRED:
- ✅ `VITE_SUPABASE_URL` - Database connection
- ✅ `VITE_SUPABASE_ANON_KEY` - Database authentication
- ✅ `ODDS_API_KEY` - Betting lines (The Odds API)
- ⚠️ `OPENWEATHER_API_KEY` - Weather data (optional)

---

## Benefits of CSV-Only Approach

### ✅ Advantages:

1. **No API Costs** - Eliminates Sports Radar subscription fees
2. **No Rate Limits** - No throttling or request limits
3. **Full Control** - Manually verify data accuracy before import
4. **Historical Data** - Import past weeks for backtesting
5. **Data Transparency** - Know exactly what stats are being used
6. **Offline Development** - No external dependencies for testing

### ⚠️ Trade-offs:

1. **Manual Updates** - Requires admin to upload CSV weekly
2. **Data Freshness** - Depends on when CSV was downloaded
3. **Human Error** - Possible to upload wrong week/file
4. **No Auto-Refresh** - Can't automatically sync latest stats

---

## Validation & Testing

### ✅ Verified Working:

1. **CSV Upload** - NFLStatsParser utility works correctly
2. **Database Storage** - team_stats_cache populates properly
3. **Prediction Generation** - Edge function uses database stats
4. **Fallback Logic** - Defaults used if CSV not imported
5. **UI Warnings** - Clear messaging about CSV requirement

### ⚠️ Known Limitations:

1. **No Stats Validation** - System trusts CSV data accuracy
2. **Missing Week Handling** - Uses defaults if week not imported
3. **Team Name Matching** - Requires exact name matching (handled by parser)

---

## Migration Notes

### For Developers:

- All Sports Radar API code is **commented out** but preserved
- Can be re-enabled by uncommenting imports in `fetch-stats.ts`
- No database schema changes required
- Frontend components updated to reflect CSV-only workflow

### For Admins:

- Must upload CSV files before generating predictions
- Use Team Stats page to import weekly data
- Verify imports using the stats table below CSV upload
- Missing weeks will use default league averages

---

## Future Considerations

### Potential Enhancements:

1. **Automated CSV Fetching** - Scrape ESPN automatically (requires scraper)
2. **CSV Validation** - Check for missing columns, invalid data
3. **Multi-Week Uploads** - Bulk import multiple weeks at once
4. **API Toggle** - Environment variable to enable/disable Sports Radar
5. **Hybrid Mode** - Use API as backup if CSV missing

### Re-enabling Sports Radar API:

If needed, uncomment this line in `fetch-stats.ts`:
```typescript
import { fetchTeamStatsWithCache } from './fetch-stats-rapidapi.ts';
```

And restore API key validation in `index.ts`:
```typescript
const RAPIDAPI_KEY = Deno.env.get('SPORTSRADAR_API_KEY');
```

---

## Summary

**Sports Radar API is now fully disabled.** The system operates exclusively on CSV-imported team statistics stored in the `team_stats_cache` database table. All UI text, documentation, and code comments have been updated to reflect this change.

**Admin Action Required:** Upload weekly CSV files for predictions to work correctly.

---

**Last Updated:** October 15, 2025  
**Maintainer:** Dev Team  
**Status:** ✅ Production Ready
