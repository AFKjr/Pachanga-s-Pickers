# NFL Week Transition Logic

## How Week Transitions Work

### Standard NFL Week Structure
Each NFL week runs from **Thursday through Monday night**:
- **Thursday Night Football** - Week begins
- **Sunday** - Main slate of games
- **Sunday Night Football** 
- **Monday Night Football** - Week ends

**Important**: Tuesday is the first day of the new NFL week (after Monday Night Football concludes).

### Example: Week 5 → Week 6 Transition

```
Week 5 Schedule:
- Start: Thursday, October 2, 2025
- End: Monday, October 6, 2025
- Description: "Thu 10/2 - Mon 10/6"

Week 6 Schedule:
- Start: Thursday, October 9, 2025
- End: Monday, October 13, 2025
- Description: "Thu 10/9 - Mon 10/13"

Transition Day:
- Tuesday, October 7, 2025 → No NFL games (between weeks)
- Wednesday, October 8, 2025 → No NFL games (prep for TNF)
```

### How `getCurrentNFLWeek()` Works

```typescript
// On October 3, 2025 (Friday in Week 5)
getCurrentNFLWeek() // Returns: 5

// On October 6, 2025 (Monday Night Football)
getCurrentNFLWeek() // Returns: 5

// On October 7, 2025 (Tuesday - NO GAMES)
getCurrentNFLWeek() // Returns: null (between weeks)

// On October 9, 2025 (Thursday Night Football Week 6)
getCurrentNFLWeek() // Returns: 6
```

### Landing Page Behavior

**During Active Week (Thu-Mon)**:
```
Week 5 Performance
- Shows stats for games played Thu 10/2 - Mon 10/6
- Updates as admin enters scores
- Refreshes every 5 minutes during game days
```

**On Tuesday/Wednesday (Between Weeks)**:
```
This Week's Performance
- Shows "No completed picks yet for this week"
- OR continues showing previous week if new week hasn't started
- Week number: null or previous week
```

**New Week Begins (Thursday)**:
```
Week 6 Performance
- Automatically transitions to new week
- Shows new week's picks
- Resets to 0-0-0 until games are played and scored
```

## Edge Cases Handled

### 1. Monday Night Double-Header
Some weeks have TWO Monday Night Football games:
- Week 2: "doubleheader Mon"
- Both games still count as part of that week
- Week doesn't end until both games finish

### 2. International Games
Games played overseas (London, Germany, etc.):
- Still counted in the appropriate week
- Example: Week 5 has Vikings vs Browns in London (Sunday morning US time)
- Still part of Week 5 (Thu 10/2 - Mon 10/6)

### 3. Holiday Weeks
Special scheduling for holidays:
- **Thanksgiving (Week 13)**: Triple-header Thursday + Black Friday game
- **Christmas (Week 17)**: Games on Christmas Day
- All still follow Thu-Mon week structure

### 4. Late Season Saturday Games
Weeks 16-17 may have Saturday games:
- Saturday, December 20, 2025 (Week 16)
- Saturday, December 27, 2025 (Week 17)
- Still part of Thu-Mon week structure

## Landing Page Stats Update Schedule

### Real-World Example: Week 5 (Current)

**Thursday 10/2** - TNF: 49ers @ Rams
- Admin enters score after game
- Landing page shows: "Week 5: 1-0" (if win)

**Sunday 10/5** - Main slate of 13 games
- Admin enters scores throughout day
- Landing page updates: "Week 5: 9-4" (example)

**Sunday 10/5** - SNF
- One more game added
- Landing page updates: "Week 5: 10-4"

**Monday 10/6** - MNF
- Final game of Week 5
- Admin enters final score
- Landing page shows complete: "Week 5: 11-4" (example)

**Tuesday 10/7** - Off day
- Landing page still shows Week 5 stats OR "null" week
- No changes until Thursday

**Thursday 10/9** - TNF starts Week 6
- `getCurrentNFLWeek()` now returns 6
- Landing page automatically switches: "Week 6 Performance"
- Shows 0-0-0 until admin enters scores

## Implementation Details

The system uses date ranges defined in `src/utils/nflWeeks.ts`:

```typescript
5: { 
  start: '2025-10-02',  // Thursday
  end: '2025-10-06',    // Monday (inclusive)
  description: 'Thu 10/2 - Mon 10/6'
}
```

The `getNFLWeekFromDate()` function:
1. Takes current date
2. Checks if it falls within any week's start/end range
3. Returns week number or `null` if between weeks

This ensures:
- ✅ Monday games are included in their proper week
- ✅ Tuesday/Wednesday return `null` (no active week)
- ✅ Automatic transition on Thursday
- ✅ No manual configuration needed

## User Experience

Users never need to think about week transitions:
- **During games**: See live stats
- **Between weeks**: See message or previous week stats
- **New week starts**: Automatically updates
- **Auto-refresh**: Every 5 minutes ensures current data

Admin workflow:
- **During week**: Enter scores as games finish
- **Tuesday/Wednesday**: Prepare for next week (no urgency)
- **Thursday**: New week begins automatically
