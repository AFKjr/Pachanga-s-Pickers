# Quick Start: Import Week 6 Stats

## ✅ Problem Fixed!
The CSV parser now accepts your Week 6 data files. The issue was that each row was wrapped in quotes - this has been resolved.

## 🚀 Import Steps (3 Minutes)

### 1. Start Your App
```powershell
npm run dev
```

### 2. Navigate to Admin → CSV Import
- Open browser → `http://localhost:5173`
- Click **Admin** in navigation
- Scroll to **"Import Extended Team Stats from CSV"** section

### 3. Upload Both Files
📁 **Files Ready:**
- `NFL Season Stats 2025 - WEEK6 Offense Totals.csv`
- `NFL Season Stats 2025 - WEEK6 Defense Totals.csv`

**Actions:**
1. Click "Choose File" under Offensive Stats → Select Offense file
2. Click "Choose File" under Defensive Stats → Select Defense file
3. Click **"Parse & Merge Stats"** button

### 4. Verify Preview
You should see a table with 32 teams showing:
- Detroit Lions: 5 games, 365.0 off yds, 298.8 def yds
- Indianapolis: 5 games, 381.2 off yds, 315.0 def yds
- Buffalo Bills: 5 games, 395.8 off yds, 299.6 def yds
- (29 more teams...)

### 5. Import to Database
- Click **"Import to Database"**
- Wait for: ✅ "Successfully imported 32 teams with extended stats!"

## ✨ What This Enables

### For Week 7 Predictions:
- **Better accuracy** with 5+ games of data vs 1-2 early season
- **Current team form** reflected in stats
- **40+ metrics per team** for Monte Carlo simulations

### Stats Now Available:
- Offensive yards, points, turnovers per game
- Defensive yards allowed, points allowed per game
- 3rd down conversion % and red zone efficiency
- Passing/rushing breakdowns for both offense and defense
- Turnover differential

## 🔄 Weekly Update Process

After each week's games complete:

1. **Export new CSVs** with updated cumulative stats
2. **Upload via same interface** (offense + defense files)
3. **Parse & Import** - system automatically updates all teams
4. **Generate new predictions** with fresh data

**Time Required:** 2-3 minutes per week

## 📊 Expected Data (Week 6)

All teams should show **5 games played** (except teams with bye weeks showing 4 games):
- Green Bay Packers: 4 games (had bye week)
- Most teams: 5 games

Stats are **cumulative season totals** → parser converts to **per-game averages** automatically.

## ❓ Common Questions

**Q: Do I need to delete old stats first?**
A: No - the import uses UPSERT (insert or update), so it automatically overwrites existing data.

**Q: Can I import just offense or just defense?**
A: Yes, but for best accuracy, always import both files together.

**Q: What if Week 7 games haven't finished yet?**
A: Wait until all Week 6 games are complete before importing Week 7 data.

**Q: Will this affect existing predictions?**
A: No - existing picks are saved with their original analysis. New predictions will use updated stats.

## 🔍 Verification

After import, check that stats updated:
1. Go to Admin → Team Stats page
2. Verify `last_updated` timestamp is recent
3. Check games_played = 5 for most teams
4. Spot-check a few teams' yards/points match your CSV

## 🛠️ Technical Notes

**What Was Fixed:**
- CSV parser now strips surrounding quotes from each line
- Handles both standard CSV and quoted-row CSV formats
- Applied to offensive, defensive, and conversions table parsing

**Files Modified:**
- `src/components/CSVImportStats.tsx` - Added quote-stripping logic

**Build Status:** ✅ Compiled successfully

---

**You're Ready!** Your Week 6 data files will now import correctly. 🎉
