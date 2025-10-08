# Architecture Refactoring - Services & Hooks

## Overview
This refactoring separates business logic from UI components, following the principle of "dumb components" and "smart services".

## Structure

```
src/
  services/              # Business logic layer
    pickManagement.ts    # Pick CRUD operations
    duplicateDetection.ts # Duplicate detection & cleanup
    statsCalculation.ts  # Statistics calculations
    index.ts            # Barrel export
  
  hooks/                # React hooks layer
    usePickManager.ts   # Pick management with state
    useStatistics.ts    # Statistics with memoization
    useDuplicateDetection.ts # Duplicate detection with state
    useErrorHandler.ts  # Error handling (existing)
    useOptimisticUpdates.ts # Optimistic updates (existing)
    index.ts           # Barrel export
  
  components/          # UI layer (presentation only)
    AdminPickResults.tsx # Results management UI
    AdminPickManager.tsx # Pick management UI
    ATSStatsComponent.tsx # Stats display UI
    APIPredictionsGenerator.tsx # Prediction generation UI
```

## Services

### pickManagement.ts
Pure functions for pick operations:
- `loadAllPicks()` - Fetch all picks
- `groupPicksByWeek()` - Group picks by NFL week
- `getAvailableWeeks()` - Get list of weeks with picks
- `updatePickResult()` - Update pick outcome
- `updatePickWithScores()` - Update scores and auto-calculate results
- `deletePick()` - Delete a single pick
- `deleteAllPicks()` - Delete all picks (admin)
- `filterPicks()` - Filter by week/search term
- `createPick()` - Create a new pick

### duplicateDetection.ts
Duplicate detection and cleanup:
- `normalizeTeamName()` - Normalize team names for comparison
- `createGameKey()` - Create unique key for game identification
- `findDuplicates()` - Find all duplicate pick groups
- `countDuplicates()` - Count total duplicates
- `cleanDuplicates()` - Remove duplicates (keep oldest)
- `isDuplicate()` - Check if a pick is a duplicate
- `findOriginalPick()` - Find the original (oldest) pick

### statsCalculation.ts
Statistical calculations:
- `calculateOverallStats()` - Overall win/loss records
- `calculateWeeklyStats()` - Stats grouped by week
- `calculateTeamStats()` - Stats grouped by team
- `calculateStatsForWeek()` - Stats for specific week
- `calculateStatsForTeam()` - Stats for specific team
- `getUniqueWeeks()` - List of weeks
- `getUniqueTeams()` - List of teams
- `calculateWinStreaks()` - Current and longest streaks
- `calculateUnits()` - Betting units (profit/loss)
- `calculateROI()` - Return on investment
- `getBestTeams()` - Top performing teams
- `getWorstTeams()` - Worst performing teams

## Hooks

### usePickManager
State management for picks:
```typescript
const {
  picks,
  loading,
  error,
  loadPicks,
  updateResult,
  updateScores,
  deletePick,
  deleteAllPicks,
  createPick,
  refreshPicks,
  getAvailableWeeks,
  getPicksByWeek,
  filterPicks,
  clearError
} = usePickManager();
```

### useStatistics
Statistics with automatic memoization:
```typescript
const {
  overallStats,
  weeklyStats,
  teamStats,
  availableWeeks,
  availableTeams,
  winStreaks,
  units,
  roi,
  bestTeams,
  worstTeams,
  getStatsForWeek,
  getStatsForTeam
} = useStatistics(picks, betSize);
```

### useDuplicateDetection
Duplicate detection and cleanup:
```typescript
const {
  duplicateGroups,
  duplicateCount,
  hasDuplicates,
  cleaning,
  error,
  cleanDuplicates,
  isDuplicate,
  findOriginal,
  clearError
} = useDuplicateDetection(picks);
```

## Component Refactoring Pattern

### Before (Monolithic):
```typescript
const AdminPickResults = () => {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... 50 more lines of state and logic
  
  const loadPicks = async () => {
    // ... 30 lines of API logic
  };
  
  const updateResult = async () => {
    // ... 20 lines of update logic
  };
  
  // ... 400 more lines
  
  return (
    // ... 100 lines of JSX
  );
};
```

### After (Dumb Component):
```typescript
const AdminPickResults = () => {
  const { picks, loading, updateResult, deletePick } = usePickManager();
  const { overallStats } = useStatistics(picks);
  
  return (
    // ... 100 lines of JSX (just presentation)
  );
};
```

## Benefits

1. **Testability**: Services are pure functions, easy to unit test
2. **Reusability**: Logic can be reused across components
3. **Maintainability**: Changes to business logic don't affect UI
4. **Performance**: Hooks use memoization to prevent unnecessary calculations
5. **Type Safety**: Full TypeScript support throughout
6. **Separation of Concerns**: Clear boundaries between data, logic, and presentation

## Migration Guide

### Step 1: Import the new hooks
```typescript
import { usePickManager, useStatistics, useDuplicateDetection } from '../hooks';
```

### Step 2: Replace state management
```typescript
// Old:
const [picks, setPicks] = useState([]);
const loadPicks = async () => { /* ... */ };

// New:
const { picks, loadPicks } = usePickManager();
```

### Step 3: Replace calculations
```typescript
// Old:
const stats = ATSCalculator.calculateComprehensiveATSRecord(picks);

// New:
const { overallStats } = useStatistics(picks);
```

### Step 4: Simplify JSX
Remove business logic from JSX, keep only presentation logic.

## Next Steps

Components to refactor (in order of priority):
1. ✅ AdminPickResults.tsx - Use `usePickManager` + `useOptimisticUpdates`
2. ✅ AdminPickManager.tsx - Use `usePickManager` + `useDuplicateDetection`
3. ✅ ATSStatsComponent.tsx - Use `useStatistics`
4. ✅ APIPredictionsGenerator.tsx - Use `usePickManager`

## Notes

- All services return consistent `{ data, error }` objects
- Hooks follow React best practices (useCallback, useMemo)
- Global events system still used for cross-component communication
- Error handling centralized through `useErrorHandler`
