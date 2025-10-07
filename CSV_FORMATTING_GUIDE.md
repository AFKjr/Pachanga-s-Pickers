# How to Make Your CSV Files Look Clean

## ✅ Quick Start (You Already Have Rainbow CSV!)

### **Method 1: Rainbow CSV Auto-Align** (Easiest!)

1. Open your CSV file in VS Code
2. Press `Ctrl+Shift+P` (Command Palette)
3. Type: `CSV: Align`
4. Press Enter

**Or:**
- Right-click in the CSV → Select "CSV: Align"

This will automatically align all columns perfectly!

---

## 🎨 **Rainbow CSV Features You Can Use Now**

### **View as Table:**
1. Press `Ctrl+Shift+P`
2. Type: `CSV: Rainbow CSV: Open in New Tab`
3. Get a nice table view with sorting and filtering!

### **Column Highlighting:**
- Rainbow CSV automatically colors each column
- Hover over values to see column name
- Click column separators to adjust width

### **Query Your Data:**
1. Press `Ctrl+Shift+P`
2. Type: `CSV: RBQL`
3. Run SQL-like queries on your CSV!

Example:
```sql
SELECT a.Tm, a.PF, a.Yds WHERE a.PF > 150
```

---

## 🛠️ **Additional Formatting Options**

### **Option 1: Use the PowerShell Script**

Run in terminal:
```powershell
.\format-csv.ps1 -InputFile "nfl_2025_offensive_stats.csv"
```

### **Option 2: Excel/Google Sheets**
1. Open CSV in Excel
2. Select all data (Ctrl+A)
3. Go to Home → Format → AutoFit Column Width
4. Save as CSV

### **Option 3: Install Excel Viewer Extension**
For viewing and editing CSVs like Excel in VS Code!

---

## 📋 **CSV Best Practices**

### **Good CSV Structure:**
✅ Consistent column names (no spaces, use underscores)
✅ One header row
✅ No blank rows
✅ Consistent data types per column
✅ No special characters (except comma separator)

### **Your Current CSV Structure:**
Your CSVs are already well-structured! They have:
✅ Clear header row
✅ Consistent columns
✅ Numeric data properly formatted
✅ No blank rows

### **To Make Them Even Better:**

**Option A: Add Descriptive Headers**
Current:
```csv
Rk,Tm,G,PF,Yds,Ply,Y/P,TO,FL,1stD
```

Better:
```csv
Rank,Team,Games,PointsFor,TotalYards,Plays,YardsPerPlay,Turnovers,Fumbles,FirstDowns
```

**Option B: Add Metadata Row** (optional)
```csv
# NFL 2025 Offensive Statistics - Week 5
# Generated: October 7, 2025
# Source: ESPN
Rank,Team,Games,PointsFor,TotalYards,Plays,YardsPerPlay,Turnovers,Fumbles,FirstDowns
1,Detroit Lions,5,174,1825,306,6.0,3,1,104
```

---

## 🚀 **Quick Commands Cheat Sheet**

| Command | What It Does |
|---------|-------------|
| `Ctrl+Shift+P` → `CSV: Align` | Align all columns |
| `Ctrl+Shift+P` → `CSV: Set Column Width` | Adjust column width |
| `Ctrl+Shift+P` → `CSV: Rainbow CSV: Open in New Tab` | View as table |
| `Ctrl+Shift+P` → `CSV: RBQL` | Query data with SQL |
| `Ctrl+Click` column border | Resize column |

---

## 📊 **Recommended Settings for Rainbow CSV**

Add to your VS Code settings (Ctrl+,):

```json
{
  "rainbow_csv.autodetect_separators": [",", "\t", ";", "|"],
  "rainbow_csv.align_on_save": false,
  "rainbow_csv.comment_prefix": "#",
  "rainbow_csv.trim_trailing_whitespace": true
}
```

---

## 💡 **Pro Tips**

1. **Keep Original Files**: Always work on copies when formatting
2. **Use UTF-8 Encoding**: Ensures compatibility everywhere
3. **Validate Data**: Use RBQL to check for inconsistencies
4. **Version Control**: Git tracks CSV changes well
5. **Document Structure**: Add a README explaining column meanings

---

## 🎯 **Your CSV Files Are Already Good!**

Your current files have:
✅ Clean structure
✅ Consistent formatting
✅ No blank rows
✅ Proper numeric formatting
✅ Clear team names

**Just use Rainbow CSV's "Align" feature to make them even prettier!**
