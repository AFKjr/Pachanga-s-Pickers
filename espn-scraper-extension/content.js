// content.js - Runs on ESPN pages and scrapes data
console.log('🏈 Pachanga\'s ESPN Scraper loaded on:', window.location.href);

// ⚠️ IMPORTANT: Replace these with your actual Supabase credentials from your .env file
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL',        // Replace with your actual Supabase project URL
  key: 'YOUR_SUPABASE_ANON_KEY'    // Replace with your actual anon key
};

// Example of what your credentials should look like:
// const SUPABASE_CONFIG = {
//   url: 'https://abcdefghijklmnop.supabase.co',
//   key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...'
// };

// Import Supabase (we'll load it dynamically)
let supabase = null;

// Initialize Supabase client
async function initSupabase() {
  if (supabase) return supabase;
  
  try {
    // Load Supabase from CDN
    if (!window.supabase) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      document.head.appendChild(script);
      
      await new Promise(resolve => {
        script.onload = resolve;
      });
    }
    
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
    console.log('✅ Supabase initialized successfully');
    return supabase;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    showNotification('❌ Database connection failed', 'error');
    return null;
  }
}

// Validation functions (simplified versions of your existing validation utils)
function validateTeamName(teamName) {
  if (!teamName || typeof teamName !== 'string') {
    return { isValid: false, sanitized: '' };
  }
  
  const sanitized = teamName
    .replace(/[<>\"'&]/g, '') // Remove dangerous chars
    .trim()
    .substring(0, 50); // Max length
    
  return { 
    isValid: sanitized.length > 0 && sanitized.length <= 50,
    sanitized 
  };
}

function sanitizeNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

// Data extraction functions for different ESPN pages
const scrapers = {
  // Scrape team offensive stats from ESPN team stats page
  teamOffense: () => {
    console.log('🔍 Scraping team offense stats...');
    const teams = [];
    
    // ESPN team stats table - multiple possible selectors
    const rows = document.querySelectorAll('tbody tr, .Table__TR, .ResponsiveTable tr');
    
    rows.forEach(row => {
      try {
        const teamCell = row.querySelector('td:first-child, .Table__TD:first-child, .team-name');
        const cells = row.querySelectorAll('td, .Table__TD');
        
        if (!teamCell || cells.length < 6) return;
        
        // Extract team name (handle both text and link formats)
        const teamLink = teamCell.querySelector('a');
        let teamName = teamLink ? teamLink.textContent : teamCell.textContent;
        
        // Clean up team name
        teamName = teamName.replace(/^\d+\s*/, '').trim(); // Remove ranking numbers
        
        const validation = validateTeamName(teamName);
        if (!validation.isValid) return;
        
        // Extract stats (positions may vary, so we'll be flexible)
        const stats = Array.from(cells).slice(1).map(cell => cell.textContent.trim());
        
        // Try to find specific stats by header or position
        teams.push({
          team: validation.sanitized,
          points_per_game: sanitizeNumber(stats[0]), 
          yards_per_game: sanitizeNumber(stats[1]),
          passing_yards_per_game: sanitizeNumber(stats[2]),
          rushing_yards_per_game: sanitizeNumber(stats[3]),
          turnovers_per_game: sanitizeNumber(stats[4]),
          scraped_from: 'espn_team_offense',
          scraped_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error parsing team row:', error);
      }
    });
    
    console.log(`✅ Scraped ${teams.length} offensive team stats`);
    return teams;
  },
  
  // Scrape team defensive stats  
  teamDefense: () => {
    console.log('🔍 Scraping team defense stats...');
    const teams = [];
    
    const rows = document.querySelectorAll('tbody tr, .Table__TR, .ResponsiveTable tr');
    
    rows.forEach(row => {
      try {
        const teamCell = row.querySelector('td:first-child, .Table__TD:first-child');
        const cells = row.querySelectorAll('td, .Table__TD');
        
        if (!teamCell || cells.length < 6) return;
        
        const teamLink = teamCell.querySelector('a');
        let teamName = teamLink ? teamLink.textContent : teamCell.textContent;
        teamName = teamName.replace(/^\d+\s*/, '').trim();
        
        const validation = validateTeamName(teamName);
        if (!validation.isValid) return;
        
        const stats = Array.from(cells).slice(1).map(cell => cell.textContent.trim());
        
        teams.push({
          team: validation.sanitized,
          points_allowed_per_game: sanitizeNumber(stats[0]),
          yards_allowed_per_game: sanitizeNumber(stats[1]),
          passing_yards_allowed: sanitizeNumber(stats[2]),
          rushing_yards_allowed: sanitizeNumber(stats[3]),
          forced_turnovers_per_game: sanitizeNumber(stats[4]),
          scraped_from: 'espn_team_defense',
          scraped_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error parsing defense row:', error);
      }
    });
    
    console.log(`✅ Scraped ${teams.length} defensive team stats`);
    return teams;
  },
  
  // Scrape injury reports
  injuries: () => {
    console.log('🔍 Scraping injury reports...');
    const injuries = [];
    
    // ESPN injury report structure - multiple possible selectors
    const injuryRows = document.querySelectorAll('.injuries-table tr, .Table__TR, .injury-row');
    
    injuryRows.forEach(row => {
      try {
        const cells = row.querySelectorAll('td, .Table__TD');
        if (cells.length < 4) return;
        
        const playerName = cells[0]?.textContent?.trim();
        const position = cells[1]?.textContent?.trim();
        const status = cells[2]?.textContent?.trim();
        const injury = cells[3]?.textContent?.trim();
        
        // Try to extract team from context or page
        const teamElement = row.closest('[data-team]') || 
                           document.querySelector('.team-name, .clubhouse-header h1, .TeamHeader__Name');
        let teamName = teamElement?.textContent?.trim() || 
                       teamElement?.dataset?.team ||
                       extractTeamFromURL();
        
        // Additional team extraction methods
        if (!teamName) {
          const breadcrumb = document.querySelector('.Breadcrumb a:last-child');
          teamName = breadcrumb?.textContent?.trim();
        }
        
        const teamValidation = validateTeamName(teamName);
        if (!teamValidation.isValid || !playerName) return;
        
        injuries.push({
          team: teamValidation.sanitized,
          player_name: playerName.substring(0, 100),
          position: position.substring(0, 10),
          status: status.substring(0, 20),
          injury_type: injury.substring(0, 50),
          scraped_from: 'espn_injuries',
          scraped_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error parsing injury row:', error);
      }
    });
    
    console.log(`✅ Scraped ${injuries.length} injury reports`);
    return injuries;
  },
  
  // Scrape betting lines from ESPN Sportsbook
  bettingLines: () => {
    console.log('🔍 Scraping betting lines...');
    const lines = [];
    
    // ESPN Sportsbook game cards - multiple possible selectors
    const gameCards = document.querySelectorAll('.game-card, .event-cell, [data-testid="event-cell"], .GameCard');
    
    gameCards.forEach(card => {
      try {
        // Extract team names - multiple possible structures
        const teamElements = card.querySelectorAll('.team-name, .competitor-name, .TeamName, .Competitor');
        
        if (teamElements.length < 2) return;
        
        const awayTeam = teamElements[0]?.textContent?.trim();
        const homeTeam = teamElements[1]?.textContent?.trim();
        
        const awayValidation = validateTeamName(awayTeam);
        const homeValidation = validateTeamName(homeTeam);
        
        if (!awayValidation.isValid || !homeValidation.isValid) return;
        
        // Extract betting lines - multiple possible selectors
        const spreadElement = card.querySelector('[data-testid="spread"], .spread, .point-spread');
        const totalElement = card.querySelector('[data-testid="total"], .total, .over-under');
        const moneylineElements = card.querySelectorAll('.moneyline, [data-testid="moneyline"], .ml');
        
        const gameData = {
          away_team: awayValidation.sanitized,
          home_team: homeValidation.sanitized,
          spread: spreadElement ? sanitizeNumber(spreadElement.textContent) : null,
          over_under: totalElement ? sanitizeNumber(totalElement.textContent) : null,
          away_ml: moneylineElements[0] ? sanitizeNumber(moneylineElements[0].textContent) : null,
          home_ml: moneylineElements[1] ? sanitizeNumber(moneylineElements[1].textContent) : null,
          scraped_from: 'espn_sportsbook',
          scraped_at: new Date().toISOString()
        };
        
        lines.push(gameData);
      } catch (error) {
        console.error('Error parsing game card:', error);
      }
    });
    
    console.log(`✅ Scraped ${lines.length} betting lines`);
    return lines;
  }
};

// Helper function to extract team from URL
function extractTeamFromURL() {
  const urlParts = window.location.pathname.split('/');
  const teamIndex = urlParts.findIndex(part => part === 'team' || part === 'teams');
  if (teamIndex !== -1 && urlParts[teamIndex + 1]) {
    return urlParts[teamIndex + 1].replace(/-/g, ' ').replace(/_/g, ' ');
  }
  return null;
}

// Save data to Supabase with error handling and retries
async function saveToSupabase(tableName, data) {
  if (!data || data.length === 0) {
    console.log(`ℹ️ No data to save to ${tableName}`);
    return;
  }
  
  const client = await initSupabase();
  if (!client) {
    console.error('❌ Supabase not available');
    showNotification('❌ Database connection failed', 'error');
    return;
  }
  
  try {
    console.log(`💾 Saving ${data.length} records to ${tableName}...`);
    
    const { data: result, error } = await client
      .from(tableName)
      .upsert(data, { 
        onConflict: 'team,scraped_at',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`❌ Error saving to ${tableName}:`, error);
      showNotification(`❌ Failed to save ${tableName}: ${error.message}`, 'error');
    } else {
      console.log(`✅ Successfully saved ${data.length} records to ${tableName}`);
      showNotification(`✅ Saved ${data.length} ${tableName.replace('_', ' ')} records`);
    }
  } catch (error) {
    console.error(`❌ Exception saving to ${tableName}:`, error);
    showNotification(`❌ Error saving ${tableName}`, 'error');
  }
}

// Show notification to user with better styling
function showNotification(message, type = 'success') {
  // Remove existing notifications
  const existing = document.querySelectorAll('.pachanga-notification');
  existing.forEach(el => el.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'pachanga-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#dc2626' : '#059669'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    max-width: 350px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid ${type === 'error' ? '#b91c1c' : '#047857'};
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">${type === 'error' ? '❌' : '✅'}</span>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Auto-detect and scrape based on current page
function detectAndScrape() {
  const url = window.location.href.toLowerCase();
  
  console.log('🔍 Detecting page type for:', url);
  
  if (url.includes('nfl/stats/team') && url.includes('offense')) {
    const data = scrapers.teamOffense();
    if (data.length > 0) {
      saveToSupabase('team_stats_offense', data);
    }
  }
  else if (url.includes('nfl/stats/team') && url.includes('defense')) {
    const data = scrapers.teamDefense();
    if (data.length > 0) {
      saveToSupabase('team_stats_defense', data);
    }
  }
  else if (url.includes('nfl/injuries')) {
    const data = scrapers.injuries();
    if (data.length > 0) {
      saveToSupabase('injury_reports', data);
    }
  }
  else if (url.includes('sportsbook.espn.com') || (url.includes('espn.com') && url.includes('odds'))) {
    const data = scrapers.bettingLines();
    if (data.length > 0) {
      saveToSupabase('betting_lines', data);
    }
  }
  else {
    console.log('ℹ️ Page not supported for scraping:', url);
  }
}

// Manual scrape trigger (called from popup)
function manualScrape() {
  console.log('🚀 Manual scrape triggered');
  showNotification('🔄 Starting manual scrape...', 'info');
  detectAndScrape();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('💬 Content script received message:', request);
  
  if (request.action === 'scrape') {
    manualScrape();
    sendResponse({ success: true });
  }
  
  if (request.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      canScrape: isScrapablePage()
    });
  }
});

// Check if current page can be scraped
function isScrapablePage() {
  const url = window.location.href.toLowerCase();
  return url.includes('espn.com') && (
    (url.includes('nfl') && (url.includes('stats') || url.includes('injuries'))) ||
    url.includes('sportsbook')
  );
}

// Auto-scrape when page loads (with retry logic)
function initAutoScrape() {
  if (isScrapablePage()) {
    console.log('🤖 Auto-scraping detected ESPN NFL page');
    
    // Wait for content to load, then scrape
    setTimeout(() => {
      detectAndScrape();
    }, 3000);
    
    // Retry after additional time if first attempt found no data
    setTimeout(() => {
      if (document.querySelectorAll('tbody tr, .Table__TR').length === 0) {
        console.log('🔄 Retrying scrape - content may have loaded late');
        detectAndScrape();
      }
    }, 8000);
  }
}

// Initialize when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoScrape);
} else {
  initAutoScrape();
}

// Export functions for popup access
window.pachangaScraper = {
  manualScrape,
  isScrapablePage,
  scrapers,
  detectAndScrape
};

console.log('✅ Pachanga\'s ESPN Scraper content script loaded successfully');