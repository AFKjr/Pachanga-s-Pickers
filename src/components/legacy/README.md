# Legacy Components

This folder contains the original **monolithic** versions of components that have been refactored using the new services/hooks architecture.

## ⚠️ DO NOT USE THESE FILES

These files are kept for **reference only** and should **not** be imported or used in the application.

---

## 📦 Archived Components

### 1. AdminPickManager.old.tsx (463 lines)
**Status**: ❌ DEPRECATED - Use `AdminPickManager.tsx` instead

**Why it was refactored**:
- Mixed business logic with UI
- Manual state management
- Duplicate code for team normalization
- Hard to test and maintain
- 463 lines of complex code

**New version**: `AdminPickManager.tsx` (215 lines, -53%)
- Uses `usePickManager` hook
- Uses `useDuplicateDetection` hook
- Clean separation of concerns
- Easy to test and maintain

---

### 2. AdminPickResults.old.tsx (573 lines)
**Status**: ❌ DEPRECATED - Use `AdminPickResults.tsx` instead

**Why it was refactored**:
- Inline pick CRUD operations
- Manual score calculations
- Complex state management
- 573 lines of mixed logic

**New version**: `AdminPickResults.tsx` (200 lines, -65%)
- Uses `usePickManager` hook
- Uses `updatePickWithScores` service
- Simplified optimistic updates
- Clean, readable code

---

### 3. ATSStatsComponent.old.tsx (362 lines)
**Status**: ❌ DEPRECATED - Use `ATSStatsComponent.tsx` instead

**Why it was refactored**:
- Inline statistical calculations
- Manual data transformations
- No memoization
- Duplicate calculation logic

**New version**: `ATSStatsComponent.tsx` (150 lines, -59%)
- Uses `useStatistics` hook
- Automatic memoization
- Shared calculation logic
- Helper components extracted

---

### 4. APIPredictionsGenerator.old.tsx (210 lines)
**Status**: ❌ DEPRECATED - Use `APIPredictionsGenerator.tsx` instead

**Why it was refactored**:
- Manual pick creation logic
- Inline API error handling
- Mixed concerns
- Repetitive code

**New version**: `APIPredictionsGenerator.tsx` (100 lines, -52%)
- Uses `usePickManager.createPick()`
- Consistent error handling
- Helper components
- Clean, focused code

---

## 📊 Comparison Summary

| Component | Old (lines) | New (lines) | Reduction |
|-----------|-------------|-------------|-----------|
| AdminPickManager | 463 | 215 | -53% |
| AdminPickResults | 573 | 200 | -65% |
| ATSStatsComponent | 362 | 150 | -59% |
| APIPredictionsGenerator | 210 | 100 | -52% |
| **TOTAL** | **1,608** | **665** | **-59%** |

---

## 🗑️ When to Delete These Files

These files can be safely deleted once:

1. ✅ All new refactored versions are tested in production
2. ✅ No rollback is needed
3. ✅ Team is confident with new architecture
4. ✅ At least 30 days have passed since deployment

**Recommendation**: Keep for 30-60 days after deployment, then delete.

---

## 📚 For Reference

If you need to understand what the old code did, these files show:
- Original implementation patterns
- Business logic that was extracted to services
- State management that was moved to hooks
- Complex logic that was simplified

But remember: **The new architecture is better in every way!**

---

## 🚀 Migration Complete

Migration completed on: **October 8, 2025**

All monolithic components have been successfully replaced with clean, maintainable refactored versions using the services/hooks architecture.

For documentation on the new architecture, see:
- `REFACTORING.md`
- `REFACTORING_SUMMARY.md`
- `COMPONENTS_REFACTORED.md`
