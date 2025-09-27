# ESPN Scraper Extension Security Setup

## Important Security Notice
The `content.js` file contains your actual Supabase API credentials and should **NEVER** be committed to git.

## Setup Instructions

1. **Copy the template:**
   ```bash
   cp content.js.template content.js
   ```

2. **Edit `content.js` and replace:**
   - `YOUR_SUPABASE_URL_HERE` with your actual `VITE_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY_HERE` with your actual `VITE_SUPABASE_ANON_KEY`

3. **Install the extension:**

   ### For Firefox (Recommended):
   - Open Firefox and go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `manifest-firefox.json` from the `espn-scraper-extension` folder
   
   ### For Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `espn-scraper-extension` folder (uses regular `manifest.json`)

## Git Security
- ✅ `content.js` is in `.gitignore` - your credentials are safe
- ✅ `content.js.template` is committed - others can set up their own version
- ✅ All other extension files are safely committed

## Files in this directory:

### Shared Files:
- `content.js.template` - Safe template (committed to git)
- `content.js` - Your actual file with credentials (NOT committed)
- `README-SECURITY.md` - This setup guide

### Firefox Version:
- `manifest-firefox.json` - Firefox manifest (Manifest V2)
- `background-firefox.js` - Firefox background script  
- `popup-firefox.js` - Firefox popup script
- `popup-firefox.html` - Firefox popup UI

### Chrome Version:
- `manifest.json` - Chrome manifest (Manifest V3)
- `background.js` - Chrome service worker
- `popup.js` - Chrome popup script  
- `popup.html` - Chrome popup UI

## Testing the Extension
1. Navigate to ESPN NFL pages:
   - https://www.espn.com/nfl/stats/team/_/view/offense
   - https://www.espn.com/nfl/stats/team/_/view/defense
   - https://www.espn.com/nfl/injuries
   - https://sportsbook.espn.com

2. Click the extension icon in Chrome toolbar
3. Click "Scrape Current Page"
4. Check your Supabase tables for new data!