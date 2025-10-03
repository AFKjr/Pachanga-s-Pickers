# Landing Page Live Stats Implementation

## Overview
Implemented real-time current week NFL pick statistics on the landing page for social proof. The stats update automatically and only show completed games (admin-verified results).

## Implementation Details

### API Layer (`src/lib/api.ts`)
Created new **`publicStatsApi`** with `getCurrentWeekStats()` function:

**Features**:
- ✅ No authentication required (public access)
- ✅ Only fetches completed games (`game_result !== 'pending'`)
- ✅ Uses current NFL week from schedule (`getCurrentNFLWeek()`)
- ✅ Returns aggregate stats only (no individual pick details)
- ✅ Proper error handling with `AppError` system

**Data Returned**:
```typescript
{
  week: number | null,      // Current NFL week
  wins: number,             // Total wins
  losses: number,           // Total losses
  pushes: number,           // Total pushes
  total: number,            // Total completed picks
  winRate: number           // Win percentage (0-100)
}
```

### UI Layer (`src/components/LandingPage.tsx`)
Updated landing page with two dynamic sections:

**1. Value Proposition Card - "Proven Track Record"**
- Shows live current week record (e.g., "Week 5: 9-4 (69% win rate)")
- Falls back to generic text if no completed games yet
- Shows loading state during fetch

**2. Stats Preview Section - "Week X Performance"**
- Three stat cards: Win Rate %, Record, Completed Picks
- Only displays when there are completed games for the week
- Hides completely if no data available (clean UX)

### Caching & Performance
- **Initial Load**: Fetches stats on component mount
- **Auto-Refresh**: Updates every 5 minutes (handles live game results)
- **Cleanup**: Clears interval on component unmount
- **Minimal Queries**: Single database query returns all needed data

### Privacy & Security
- ✅ Only exposes aggregate win/loss numbers
- ✅ No pick details, analysis, or reasoning exposed
- ✅ No user information or admin data
- ✅ Safe for public unauthenticated access

## Database Query
```sql
SELECT game_result 
FROM picks 
WHERE nfl_week = [current_week]
  AND game_result != 'pending'
```

Only counts games that admin has manually updated with results.

## User Experience

### Scenario 1: Week in Progress
- **Value Card**: "Week 5: 3-1 (75% win rate)"
- **Stats Section**: Shows 75% / 3-1 / 4 completed picks

### Scenario 2: Week Just Started
- **Value Card**: Generic fallback text
- **Stats Section**: Hidden (no completed games)

### Scenario 3: Mid-Week
- **Stats Update**: Auto-refreshes as admin updates game results
- **User Benefit**: Real-time social proof during peak betting hours

## Testing Checklist
- [ ] Landing page loads without errors
- [ ] Stats display correctly when games are completed
- [ ] Stats section hidden when no completed games
- [ ] Loading state shows briefly
- [ ] Auto-refresh works (check after 5 minutes)
- [ ] Fallback text displays correctly
- [ ] No console errors in browser
- [ ] Database query performance acceptable

## Future Enhancements (Optional)
- Add season-to-date stats section
- Show last 3 weeks rolling average
- Add confidence trend indicator
- Implement Redis caching for high traffic
- Add "Updated X minutes ago" timestamp

## Files Modified
1. `src/lib/api.ts` - Added `publicStatsApi` with `getCurrentWeekStats()`
2. `src/components/LandingPage.tsx` - Added stats fetching and display logic
