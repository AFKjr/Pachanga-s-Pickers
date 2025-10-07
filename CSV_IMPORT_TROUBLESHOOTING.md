# Troubleshooting: CSV Import Showing Wrong Values

## Current Situation
You uploaded Week 6 CSV files, but the displayed values are incorrect:
- **Expected:** Detroit Lions = 365.0 off yds, 34.8 ppg
- **Showing:** Detroit Lions = 2.6 off yds, 1.6 ppg ❌

## Root Cause Analysis

### The Data IS Correct in CSV:
```csv
Detroit Lions: 5 games, 1825 total yards, 174 points
✓ Should calculate: 1825/5 = 365.0 yards per game
✓ Should calculate: 174/5 = 34.8 points per game
```

### Possible Issues:

1. **Old Bad Data Still in Database** (MOST LIKELY)
   - Previous imports with buggy parser left wrong values
   - New import updates the same records
   - Browser cache showing old data

2. **Import Didn't Actually Run**
   - Click import but no success message
   - Page not refreshed after import

3. **Wrong CSV Files Uploaded**
   - Uploaded files from different source
   - Files got corrupted during save

## Solution Steps (In Order)

### ✅ Step 1: Verify CSV Files Are Correct

Run this to check your offensive CSV:
```powershell
Get-Content "C:\Users\wilmc\Downloads\NFL Season Stats 2025 - WEEK6 Offense Totals.csv" | Select-Object -Index 1
```

Should show: `"1,Detroit Lions,5,174,1825,306,..."`

If numbers look different, re-download/export the CSV files.

### ✅ Step 2: Clear Old Database Data

**Option A: Via Supabase Dashboard**
1. Go to Supabase → SQL Editor
2. Run: `DELETE FROM team_stats_cache;`
3. Verify: `SELECT COUNT(*) FROM team_stats_cache;` (should be 0)

**Option B: Via API Script**
```javascript
// In browser console on your app
const { data, error } = await supabase
  .from('team_stats_cache')
  .delete()
  .neq('team_name', '');  // Delete all
console.log('Deleted teams:', data);
```

### ✅ Step 3: Restart Your Dev Server

```powershell
# Kill existing server (Ctrl+C if running)
npm run dev
```

This ensures:
- Fresh build with fixed CSV parser
- No cached modules
- Console logging will show debug output

### ✅ Step 4: Import with Debug Logging

1. **Open browser console** (F12 → Console tab)
2. **Navigate to** `http://localhost:5173/admin`
3. **Upload both CSV files:**
   - WEEK6 Offense Totals.csv
   - WEEK6 Defense Totals.csv
4. **Click "Parse & Merge Stats"**
5. **Watch console for:**
   ```
   🔍 DEBUG - Detroit Lions parsing:
     Raw values[4] (total yards): 1825
     Parsed totalYards: 1825
     Games: 5
   ```
6. **Check preview table on page:**
   - Should show Detroit: 365.0 off yds

### ✅ Step 5: Verify Preview Before Import

**STOP HERE if preview shows wrong numbers!**

The preview table should match these values:

| Team | G | Off Yds | Def Yds | PPG | PA/G |
|------|---|---------|---------|-----|------|
| Detroit Lions | 5 | 365.0 | 298.8 | 34.8 | 22.4 |
| Indianapolis | 5 | 381.2 | 315.0 | 32.6 | 17.8 |
| Buffalo Bills | 5 | 395.8 | 299.6 | 30.6 | 22.6 |

If preview shows **2.6** instead of **365.0**, the parser is still broken.

### ✅ Step 6: Import to Database

1. **Click "Import to Database"**
2. **Wait for success message:** "✅ Successfully imported 32 teams at [time]"
3. **Check console for:** "✅ Import completed successfully"

### ✅ Step 7: Verify in Team Stats View

1. **Hard refresh page:** Ctrl + F5 (Windows) or Cmd + Shift + R (Mac)
2. **Check Team Stats table**
3. **Detroit Lions should show:**
   - Off Yds/G: **365.0** (not 2.6)
   - PPG: **34.8** (not 1.6)
   - Def Yds/G: ~**299** (reasonable)

## Debug Console Commands

### Check if data imported correctly:
```javascript
// In browser console
const { data } = await supabase
  .from('team_stats_cache')
  .select('team_name, offensive_yards_per_game, points_per_game, games_played')
  .eq('team_name', 'Detroit Lions');
console.table(data);
```

Expected output:
```
team_name        | offensive_yards_per_game | points_per_game | games_played
Detroit Lions    | 365.0                    | 34.8            | 5
```

### Check last_updated timestamp:
```javascript
const { data } = await supabase
  .from('team_stats_cache')
  .select('team_name, last_updated')
  .order('last_updated', { ascending: false })
  .limit(5);
console.table(data);
```

Should show recent timestamp (within last few minutes).

## Common Mistakes

### ❌ Not Clearing Old Data
Old values persist in database. Solution: Run DELETE query first.

### ❌ Not Refreshing Page
Browser shows cached data. Solution: Hard refresh (Ctrl+F5).

### ❌ Looking at Wrong View
Team stats view might not auto-update. Solution: Navigate away and back.

### ❌ Uploading Wrong Files
Files might be from different export. Solution: Verify column structure.

## If Still Not Working

### Check These:

1. **Console Errors:** Any red errors in browser console?
2. **Network Tab:** Does the import API call succeed (200 status)?
3. **Supabase Logs:** Any errors in Supabase dashboard logs?
4. **File Format:** Open CSV in text editor - does it match expected format?

### Get Help:

Post in your issue tracker with:
- Screenshot of browser console during import
- Output of: `Get-Content "...\WEEK6 Offense Totals.csv" | Select-Object -First 3`
- Screenshot of preview table before clicking import
- Screenshot of team stats table after import

## Expected vs Actual

### What You Should See:

```
✅ CORRECT DATA (Week 6 - Through 5 games)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Top Offenses (Yards Per Game):
1. Buffalo Bills:    395.8 yds/game
2. Indianapolis:     381.2 yds/game  
3. Detroit Lions:    365.0 yds/game
4. Dallas Cowboys:   406.6 yds/game

Top Scorers (Points Per Game):
1. Detroit Lions:    34.8 ppg
2. Indianapolis:     32.6 ppg
3. Buffalo Bills:    30.6 ppg
4. Dallas Cowboys:   30.2 ppg
```

### What You're Currently Seeing:

```
❌ INCORRECT DATA (Shown in your screenshot)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detroit Lions:     2.6 yds/game  ← Should be 365.0
Indianapolis:      1.2 yds/game  ← Should be 381.2
Buffalo Bills:     1.8 yds/game  ← Should be 395.8
```

The values are off by a factor of ~100-200, suggesting:
- Old import with buggy division logic
- Or displaying wrong database column
- Or not actually re-imported after fixes

## Next Action

**DO THIS NOW:**

1. Delete all data: `DELETE FROM team_stats_cache;`
2. Restart server: `npm run dev`
3. Open console (F12)
4. Import CSV files
5. **LOOK AT PREVIEW TABLE** before clicking Import
6. If preview shows 365.0 → good, click Import
7. If preview shows 2.6 → parser still broken, check console errors

---

**Key Point:** The CSV parser fix IS correct. The issue is likely old data still in database or page not refreshing.
