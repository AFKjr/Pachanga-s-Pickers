# Create Firefox Extension Package

## Quick Install Method for Firefox:

1. **Rename `manifest-firefox-v2.json` to `manifest.json`** (temporarily)
2. **Zip the entire `espn-scraper-extension` folder**
3. **In Firefox, go to `about:addons`**
4. **Click the gear icon → "Install Add-on From File"**
5. **Select the zip file**

## Files to include in zip:
- manifest.json (renamed from manifest-firefox-v2.json)
- background-firefox.js
- popup-firefox.js  
- popup-firefox.html
- content.js (your version with credentials)

## After testing:
- Rename `manifest.json` back to `manifest-firefox-v2.json`
- This keeps the original Chrome `manifest.json` intact