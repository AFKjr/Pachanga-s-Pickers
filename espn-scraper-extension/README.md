# 🏈 Pachanga's ESPN Data Scraper Extension

A Chrome extension that automatically scrapes NFL data from ESPN and saves it to your Supabase database for Pachanga's Picks.

## ✨ Features

### 🤖 **Automatic Scraping**
- **Team Stats**: Every 2 hours
- **Injury Reports**: Every hour  
- **Betting Lines**: Every 30 minutes
- **Game Schedule**: Every 4 hours
- **Smart Scheduling**: Only during active hours (6 AM - 12 AM)

### 📊 **Data Collection**
- Team offensive/defensive statistics
- Player injury reports with status
- Real-time betting lines and odds
- Game schedules and matchups
- Comprehensive error logging

### 🎛️ **User Controls**
- Toggle auto-scraping on/off
- Manual scrape triggers
- Real-time statistics
- Error monitoring and clearing
- Quick ESPN navigation links

## 🚀 Installation

### Prerequisites
1. **Supabase Database**: You need a Supabase project with the required tables
2. **Chrome Browser**: Extension works with Chrome/Chromium browsers
3. **Database Tables**: Ensure these tables exist in your Supabase:
   - `team_stats_offense`
   - `team_stats_defense` 
   - `injury_reports`
   - `betting_lines`

### Setup Steps

1. **Configure Supabase Credentials**
   ```javascript
   // Edit content.js lines 5-8
   const SUPABASE_CONFIG = {
     url: 'https://your-project.supabase.co',        // Your Supabase URL
     key: 'your-anon-key-here'                       // Your anon key
   };
   ```

2. **Update Admin Panel URL**
   ```javascript
   // Edit popup.js line 4
   adminPanelURL: 'http://localhost:5173/admin',     // Your React app URL
   ```

3. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `espn-scraper-extension` folder
   - The extension icon should appear in your toolbar

## 📖 Usage

### Automatic Mode
1. **Enable Auto-Scraping**: Click the extension icon and toggle "Auto-Scraping" on
2. **Monitor Progress**: View statistics and last scrape times in the popup
3. **Check Errors**: Use "Show Errors" to see any issues

### Manual Mode
1. **Visit ESPN Pages**: Navigate to supported ESPN NFL pages
2. **Check Status**: Extension popup shows if page is supported
3. **Scrape Data**: Click "Scrape Current Page" or "Force Scrape"

### Supported Pages
- `espn.com/nfl/stats/team/_/view/offense` - Team offensive stats
- `espn.com/nfl/stats/team/_/view/defense` - Team defensive stats  
- `espn.com/nfl/injuries` - Injury reports
- `sportsbook.espn.com` - Betting lines and odds
- `espn.com/nfl/schedule` - Game schedules

## 🔧 Configuration

### Scraping Intervals
Edit `background.js` to adjust scraping frequency:
```javascript
intervals: {
  teamStats: 120,      // Every 2 hours
  injuries: 60,        // Every hour
  bettingLines: 30,    // Every 30 minutes
  schedule: 240        // Every 4 hours
}
```

### Active Hours
Modify when auto-scraping runs:
```javascript
activeHours: {
  start: 6,   // 6 AM
  end: 24     // 12 AM (midnight)
}
```

## 📊 Database Schema

Your Supabase tables should have these columns:

### `team_stats_offense`
```sql
- team (text)
- points_per_game (numeric)
- yards_per_game (numeric) 
- passing_yards_per_game (numeric)
- rushing_yards_per_game (numeric)
- turnovers_per_game (numeric)
- scraped_from (text)
- scraped_at (timestamp)
```

### `team_stats_defense`
```sql
- team (text)
- points_allowed_per_game (numeric)
- yards_allowed_per_game (numeric)
- passing_yards_allowed (numeric) 
- rushing_yards_allowed (numeric)
- forced_turnovers_per_game (numeric)
- scraped_from (text)
- scraped_at (timestamp)
```

### `injury_reports`
```sql
- team (text)
- player_name (text)
- position (text)
- status (text)
- injury_type (text)
- scraped_from (text)
- scraped_at (timestamp)
```

### `betting_lines`
```sql
- away_team (text)
- home_team (text)
- spread (numeric)
- over_under (numeric)
- away_ml (numeric)
- home_ml (numeric)
- scraped_from (text)
- scraped_at (timestamp)
```

## 🐛 Troubleshooting

### Common Issues

**Extension not scraping automatically**
- Check if auto-scraping is enabled in popup
- Verify you're within active hours (6 AM - 12 AM)
- Look for errors in the popup error log

**Database connection failed**
- Verify Supabase credentials in `content.js`
- Check if your Supabase project is active
- Ensure anon key has proper permissions

**Page not supported**
- Make sure you're on an ESPN NFL page
- Check if URL matches supported page patterns
- Try refreshing the page and extension

**No data being scraped**
- ESPN may have changed their HTML structure
- Check browser console for JavaScript errors
- Try manual scraping first to test

### Debugging

1. **Chrome DevTools**: Right-click extension icon → "Inspect popup"
2. **Service Worker**: Go to `chrome://extensions/` → Click "service worker" link
3. **Console Logs**: Check for error messages and scraping activity
4. **Storage**: View `chrome://extensions/` → Extension details → Storage

## 🔄 Updates

To update the extension:
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Test the changes

## 📝 Notes

- The extension respects ESPN's rate limits with smart timing
- Data is automatically deduplicated in Supabase
- All scraped data includes timestamps for freshness tracking
- Extension works in background - no need to keep browser open

## 🤝 Support

For issues related to:
- **Extension functionality**: Check console logs and error popup
- **Database problems**: Verify Supabase configuration
- **ESPN changes**: Extension may need updates if ESPN changes their layout

---

**Happy scraping!** 🏈📊