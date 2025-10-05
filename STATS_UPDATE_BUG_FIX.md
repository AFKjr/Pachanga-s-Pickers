# Stats Update Bug Fix - Homepage Not Showing Updated Results

## Problem Description
After updating game scores for week 5 in the Admin interface (`AdminPickResults.tsx`), the homepage statistics for Moneyline (ML), Against the Spread (ATS), and Over/Under (O/U) were not updating to reflect the new results.

## Root Cause Analysis

### Issue 1: Stats Calculation Ignoring Database Fields
The primary issue was in `src/utils/calculations/index.ts` - the `calculateComprehensiveATSRecord()` function was **recalculating** ATS and O/U results on-the-fly instead of reading the stored `ats_result` and `ou_result` fields from the database.

**Flow of the problem:**
1. Admin updates scores in `AdminPickResults.tsx`
2. Component correctly calculates ATS/OU results using `calculateAllResultsFromScores()`
3. Results are saved to database with fields: `result`, `ats_result`, `ou_result`
4. Homepage component (`UnifiedAllTimeRecord.tsx`) fetches all picks from database
5. **BUT** - it then calls `ATSCalculator.calculateComprehensiveATSRecord(picks)` 
6. This function was **ignoring** the stored `ats_result` and `ou_result` fields
7. Instead, it was **recalculating** results from scratch using `calculateATSResult()` and `calculateOverUnderResult()`

### Issue 2: LandingPage Not Listening to Events
The `LandingPage.tsx` component (shown to non-authenticated users) was not listening to the `refreshStats` event that's emitted when admin saves changes. It only refreshed every 5 minutes on a timer.

## Solution Implemented

### Fix 1: Prefer Stored Database Fields (Primary Fix)
Modified `src/utils/calculations/index.ts` in the `calculateComprehensiveATSRecord()` function:

**Before:**
```typescript
// ATS tracking
if (pick.game_info.spread) {
  const atsResult = calculateATSResult(pick, actualScore);
  if (atsResult.result === 'win') {
    atsWins++;
    // ... count stats
  }
}

// Over/Under tracking
if (pick.game_info.over_under) {
  const ouResult = calculateOverUnderResult(pick, actualScore);
  if (ouResult.result === 'win') {
    ouWins++;
    // ... count stats
  }
}
```

**After:**
```typescript
// ATS tracking - PREFER stored ats_result field
if (pick.game_info.spread) {
  // Use stored result if available, otherwise calculate
  let atsResultValue: 'win' | 'loss' | 'push' | 'pending';
  if (pick.ats_result && pick.ats_result !== 'pending') {
    atsResultValue = pick.ats_result;
  } else {
    const atsResult = calculateATSResult(pick, actualScore);
    atsResultValue = atsResult.result;
  }
  
  if (atsResultValue === 'win') {
    atsWins++;
    // ... count stats
  }
}

// Over/Under tracking - PREFER stored ou_result field
if (pick.game_info.over_under) {
  // Use stored result if available, otherwise calculate
  let ouResultValue: 'win' | 'loss' | 'push' | 'pending';
  if (pick.ou_result && pick.ou_result !== 'pending') {
    ouResultValue = pick.ou_result;
  } else {
    const ouResult = calculateOverUnderResult(pick, actualScore);
    ouResultValue = ouResult.result;
  }
  
  if (ouResultValue === 'win') {
    ouWins++;
    // ... count stats
  }
}
```

**Key Changes:**
- Check if `pick.ats_result` exists and is not 'pending' - use it directly
- Check if `pick.ou_result` exists and is not 'pending' - use it directly
- Only calculate from scores as a fallback if stored values are missing
- This ensures consistency with what's saved in the database

### Fix 2: Add Event Listener to LandingPage
Modified `src/components/LandingPage.tsx` to listen for the `refreshStats` event:

```typescript
useEffect(() => {
  const fetchStats = async () => {
    // ... fetch stats logic
  };

  fetchStats();

  // Listen for stats refresh events from admin updates
  const { globalEvents } = require('../lib/events');
  const handleRefresh = () => {
    fetchStats();
  };
  
  globalEvents.on('refreshStats', handleRefresh);

  // Refresh stats every 5 minutes (during live games)
  const interval = setInterval(fetchStats, 5 * 60 * 1000);
  
  return () => {
    clearInterval(interval);
    globalEvents.off('refreshStats', handleRefresh);
  };
}, []);
```

**Benefits:**
- LandingPage now refreshes immediately when admin saves changes
- Non-authenticated users see updated stats in real-time
- Still maintains the 5-minute auto-refresh for live game updates

## Data Flow After Fix

### Correct Flow (After Fix):
1. Admin enters scores in `AdminPickResults.tsx`
2. `updatePickScores()` calculates all results:
   - `result` (moneyline) = win/loss/push/pending
   - `ats_result` = win/loss/push/pending
   - `ou_result` = win/loss/push/pending
3. All three fields saved to database via `picksApi.update()`
4. `globalEvents.emit('refreshStats')` is called
5. **HomePage** (`UnifiedAllTimeRecord.tsx`) catches event:
   - Fetches updated picks from database
   - Calls `calculateComprehensiveATSRecord(picks)`
   - **NOW READS** stored `ats_result` and `ou_result` fields
   - Displays updated stats immediately
6. **LandingPage** also catches event:
   - Fetches updated stats via `publicStatsApi`
   - Displays updated stats for public users

## Components Updated

### Modified Files:
1. `src/utils/calculations/index.ts`
   - Function: `calculateComprehensiveATSRecord()`
   - Change: Prefer stored `ats_result` and `ou_result` fields over recalculation

2. `src/components/LandingPage.tsx`
   - Added: Event listener for `refreshStats`
   - Change: Now responds to admin updates in real-time

### Already Working Correctly:
- `src/components/AdminPickResults.tsx` - correctly saves all result fields
- `src/components/UnifiedAllTimeRecord.tsx` - already listens to `refreshStats` event
- `src/lib/api.ts` - `picksApi.update()` correctly saves all fields
- `src/lib/atomicOperations.ts` - correctly executes batch updates

## Testing Verification

### Steps to Verify Fix:
1. Start the dev server: `npm run dev`
2. Login as admin and navigate to Admin → Update Results
3. Enter scores for a game (e.g., Home: 24, Away: 20)
4. Click "Save All Changes" button
5. Navigate to homepage (or refresh page)
6. **Expected Result:** Stats should immediately reflect the updated game results

### What to Look For:
- ✅ Moneyline stats update correctly
- ✅ ATS stats update correctly
- ✅ O/U stats update correctly
- ✅ All-time record matches individual pick results
- ✅ Weekly record (if viewing current week) matches game results

## Prevention for Future

### Best Practices:
1. **Always use stored database fields** when they exist
2. Only calculate results when:
   - Displaying real-time preview during data entry
   - Stored fields are missing or 'pending'
   - Need detailed analysis (cover margin, total points, etc.)
3. **Emit events** after database updates for real-time UI sync
4. **Listen to events** in components that display derived data

### Database Schema Consistency:
The picks table has three result fields:
- `result` - Moneyline result (win/loss/push/pending)
- `ats_result` - Against the Spread result (win/loss/push/pending)  
- `ou_result` - Over/Under result (win/loss/push/pending)

**Always update all three fields when scores are entered!**

## Build Verification

Build completed successfully:
```
npm run build
✓ built in 4.12s
No TypeScript errors
```

All changes are backward compatible and maintain existing functionality while fixing the stats update bug.
