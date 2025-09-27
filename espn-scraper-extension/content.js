// content.js - Runs on ESPN pages and scrapes data
console.log('Pachanga\'s ESPN Scraper loaded on:', window.location.href);

// ⚠️ IMPORTANT: Replace these with your actual Supabase credentials from your .env file
const SUPABASE_CONFIG = {
  url: 'https://wbfvfzrxdqwrnqmpnfel.supabase.co',      
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiZnZmenJ4ZHF3cm5xbXBuZmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzAwNzIsImV4cCI6MjA3MzQ0NjA3Mn0.Vxr0N4xCFwUu229UxdPy5GKwH2dQahKM1DAbcCRjnyo'
};

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
function validateTeamName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, sanitized: '' };
  }
  
  const sanitized = name.trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .substring(0, 50);
    
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
    
    // Try multiple selectors for ESPN table structures
    let rows = Array.from(document.querySelectorAll('.Table__TR'));
    if (rows.length === 0) {
      rows = Array.from(document.querySelectorAll('tbody tr'));
    }
    if (rows.length === 0) {
      rows = Array.from(document.querySelectorAll('table tr'));
    }
    
    console.log(`🔍 Found ${rows.length} table rows using available selectors`);
    
    if (rows.length === 0) {
      console.error('❌ No table rows found with any selector');
      return teams;
    }
    
    // Check if this is a standard table (team and data in same row) or split table
    const sampleRow = rows[1] || rows[0]; // Skip header row if exists
    const sampleCells = sampleRow.querySelectorAll('td, .Table__TD');
    const isStandardTable = sampleCells.length > 3; // Standard tables have many columns
    
    console.log(`📊 Table structure detected: ${isStandardTable ? 'Standard' : 'Split'} (sample row has ${sampleCells.length} cells)`);
    
    if (isStandardTable) {
      // Standard table format: team and stats in same row
      rows.forEach((row, index) => {
        try {
          const cells = row.querySelectorAll('td, .Table__TD');
          if (cells.length < 5) return; // Skip header rows or incomplete rows
          
          // First cell usually contains team info
          const teamCell = cells[0];
          let teamLink = teamCell.querySelector('a[data-clubhouse-uid]');
          if (!teamLink) teamLink = teamCell.querySelector('a[href*="/nfl/team/"]');
          if (!teamLink) teamLink = teamCell.querySelector('a');
          
          if (!teamLink) {
            console.log(`❌ No team link found in row ${index}`);
            return;
          }
          
          const teamName = teamLink.textContent.trim();
          const validation = validateTeamName(teamName);
          if (!validation.isValid) {
            console.log(`❌ Invalid team name: ${teamName}`);
            return;
          }
          
          // Extract stats from remaining cells (column order may vary)
          const cellData = Array.from(cells).slice(1).map(cell => cell.textContent.trim());
          console.log(`📊 Processing ${teamName}: [${cellData.slice(0, 4).join(', ')}...]`);
          
          // Try to identify key stats by position (ESPN typically orders: Games, Total Yards, Yards/Game, etc.)
          let pointsPerGame = 0, yardsPerGame = 0, passingYards = 0, rushingYards = 0, turnovers = 0;
          
          // Look for recognizable patterns in the data
          cellData.forEach((value, i) => {
            const num = sanitizeNumber(value);
            if (num > 0) {
              // Heuristics based on typical NFL stats ranges
              if (num >= 15 && num <= 35 && pointsPerGame === 0) {
                pointsPerGame = num; // Points per game range
              } else if (num >= 250 && num <= 450 && yardsPerGame === 0) {
                yardsPerGame = num; // Yards per game range
              } else if (num >= 150 && num <= 300 && passingYards === 0) {
                passingYards = num; // Passing yards per game
              } else if (num >= 80 && num <= 180 && rushingYards === 0) {
                rushingYards = num; // Rushing yards per game
              } else if (num >= 0.5 && num <= 3 && turnovers === 0) {
                turnovers = num; // Turnovers per game
              }
            }
          });
          
          teams.push({
            team: validation.sanitized,
            points_per_game: pointsPerGame,
            yards_per_game: yardsPerGame,
            passing_yards_per_game: passingYards,
            rushing_yards_per_game: rushingYards,
            turnovers_per_game: turnovers,
            scraped_from: 'espn_team_offense',
            scraped_at: new Date().toISOString()
          });
          
          console.log(`✅ Added team: ${validation.sanitized} - ${pointsPerGame} PPG, ${yardsPerGame} YPG`);
        } catch (error) {
          console.error(`Error processing row ${index}:`, error);
        }
      });
    } else {
      // Split table format: team names and data in separate rows
      const teamRows = [];
      const dataRows = [];
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td, .Table__TD');
        
        if (cells.length === 1) {
          // Team name row
          const teamCell = cells[0];
          let teamLink = teamCell.querySelector('a[data-clubhouse-uid]');
          if (!teamLink) teamLink = teamCell.querySelector('a[href*="/nfl/team/"]');
          if (!teamLink) teamLink = teamCell.querySelector('a');
          
          if (teamLink) {
            const teamName = teamLink.textContent.trim();
            teamRows.push({ index, teamName });
            console.log(`📋 Found team: ${teamName}`);
          }
        } else if (cells.length >= 5) {
          // Data row
          const cellData = Array.from(cells).map(cell => cell.textContent.trim());
          dataRows.push({ index, cells: cellData });
          console.log(`📊 Found data row: [${cellData.slice(0, 4).join(', ')}...]`);
        }
      });
      
      console.log(`📊 Split table: ${teamRows.length} team rows, ${dataRows.length} data rows`);
      
      // Match teams with their data (assuming sequential order)
      const minLength = Math.min(teamRows.length, dataRows.length);
      for (let i = 0; i < minLength; i++) {
        try {
          const teamRow = teamRows[i];
          const dataRow = dataRows[i];
          
          const validation = validateTeamName(teamRow.teamName);
          if (!validation.isValid) continue;
          
          // Extract stats from data row
          const [games, totalYards, avgYardsPerGame, passYards, rushYards, totalPoints, avgPointsPerGame, turnovers, ...rest] = dataRow.cells;
          
          teams.push({
            team: validation.sanitized,
            points_per_game: sanitizeNumber(avgPointsPerGame),
            yards_per_game: sanitizeNumber(avgYardsPerGame),
            passing_yards_per_game: sanitizeNumber(passYards),
            rushing_yards_per_game: sanitizeNumber(rushYards),
            turnovers_per_game: sanitizeNumber(turnovers),
            scraped_from: 'espn_team_offense',
            scraped_at: new Date().toISOString()
          });
          
          console.log(`✅ Added team: ${validation.sanitized} - ${avgPointsPerGame} PPG, ${avgYardsPerGame} YPG`);
        } catch (error) {
          console.error(`Error processing team ${i}:`, error);
        }
      }
    }
    
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
        const teamCell = row.querySelector('td:first-child, .Table__TD:first-child, .team-name, [data-testid="team-name"]');
        const cells = row.querySelectorAll('td, .Table__TD');
        
        if (!teamCell || cells.length < 3) return;
        
        // Extract team name
        const teamLink = teamCell.querySelector('a');
        let teamName = teamLink ? teamLink.textContent : teamCell.textContent;
        teamName = teamName.replace(/^\d+\s*/, '').trim();
        
        const validation = validateTeamName(teamName);
        if (!validation.isValid) return;
        
        // Extract defensive stats
        const stats = Array.from(cells).slice(1).map(cell => cell.textContent.trim());
        
        teams.push({
          team: validation.sanitized,
          points_allowed_per_game: sanitizeNumber(stats[0]),
          yards_allowed_per_game: sanitizeNumber(stats[1]),
          passing_yards_allowed_per_game: sanitizeNumber(stats[2]),
          rushing_yards_allowed_per_game: sanitizeNumber(stats[3]),
          turnovers_forced_per_game: sanitizeNumber(stats[4]),
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

  // Additional scraper functions...
  injuries: () => {
    console.log('🔍 Scraping injury reports...');
    const injuries = [];
    
    const rows = document.querySelectorAll('tbody tr, .Table__TR, .ResponsiveTable tr');
    
    rows.forEach(row => {
      try {
        const cells = row.querySelectorAll('td, .Table__TD');
        if (cells.length < 4) return;
        
        const playerName = cells[0].textContent.trim();
        const teamName = cells[1].textContent.trim();
        const position = cells[2].textContent.trim(); 
        const injuryStatus = cells[3].textContent.trim();
        const injuryType = cells[4] ? cells[4].textContent.trim() : '';
        
        if (!playerName || !teamName) return;
        
        const teamValidation = validateTeamName(teamName);
        if (!teamValidation.isValid) return;
        
        injuries.push({
          player_name: playerName.substring(0, 100),
          team: teamValidation.sanitized,
          position: position.substring(0, 10),
          injury_status: injuryStatus.substring(0, 50),
          injury_type: injuryType.substring(0, 100),
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

  bettingLines: () => {
    console.log('🔍 Scraping betting lines...');
    const lines = [];
    
    const rows = document.querySelectorAll('tbody tr, .Table__TR, .ResponsiveTable tr');
    
    rows.forEach(row => {
      try {
        const cells = row.querySelectorAll('td, .Table__TD');
        if (cells.length < 3) return;
        
        const gameInfo = cells[0].textContent.trim();
        const spread = cells[1].textContent.trim();
        const overUnder = cells[2].textContent.trim();
        
        if (!gameInfo) return;
        
        lines.push({
          game_info: gameInfo.substring(0, 200),
          point_spread: sanitizeNumber(spread.replace(/[^\d.-]/g, '')),
          over_under: sanitizeNumber(overUnder.replace(/[^\d.-]/g, '')),
          scraped_from: 'espn_betting',
          scraped_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error parsing betting line:', error);
      }
    });
    
    console.log(`✅ Scraped ${lines.length} betting lines`);
    return lines;
  }
};

// Notification system
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
    color: white;
    border-radius: 4px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 5000);
}

// Database operations
async function saveToDatabase(tableName, data) {
  if (!data || data.length === 0) {
    console.log('No data to save');
    return { success: false, message: 'No data provided' };
  }
  
  const client = await initSupabase();
  if (!client) {
    return { success: false, message: 'Database connection failed' };
  }
  
  try {
    const { data: result, error } = await client
      .from(tableName)
      .insert(data);
    
    if (error) {
      console.error(`Database error:`, error);
      return { success: false, message: error.message };
    }
    
    console.log(`✅ Successfully saved ${data.length} records to ${tableName}`);
    showNotification(`✅ Saved ${data.length} records to database`, 'success');
    return { success: true, count: data.length };
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: error.message };
  }
}

// Page detection and scraping logic
function detectPageType() {
  const url = window.location.href;
  console.log('🔍 Detecting page type for:', url);
  
  if (url.includes('/nfl/stats/team/_/stat/offense')) {
    return 'team_offense';
  } else if (url.includes('/nfl/stats/team/_/stat/defense')) {
    return 'team_defense';
  } else if (url.includes('/nfl/injuries')) {
    return 'injuries';
  } else if (url.includes('/nfl/lines') || url.includes('/betting')) {
    return 'betting_lines';
  }
  
  return 'unknown';
}

async function scrapeCurrentPage() {
  const pageType = detectPageType();
  console.log(`📄 Page type detected: ${pageType} for URL: ${window.location.href}`);
  
  if (pageType === 'unknown') {
    const supportedUrls = [
      '/nfl/stats/team/_/stat/offense',
      '/nfl/stats/team/_/stat/defense', 
      '/nfl/injuries',
      '/nfl/lines'
    ];
    showNotification(`⚠️ Page not supported. Try: ${supportedUrls.join(', ')}`, 'error');
    return;
  }
  
  showNotification(`🔄 Scraping ${pageType.replace('_', ' ')} data...`, 'info');
  
  let data = [];
  let tableName = '';
  
  try {
    switch (pageType) {
      case 'team_offense':
        console.log('🏈 Starting team offense scraping...');
        data = scrapers.teamOffense();
        tableName = 'team_stats_offense';
        break;
      case 'team_defense':
        console.log('🛡️ Starting team defense scraping...');
        data = scrapers.teamDefense();
        tableName = 'team_stats_defense';
        break;
      case 'injuries':
        console.log('🏥 Starting injury reports scraping...');
        data = scrapers.injuries();
        tableName = 'injury_reports';
        break;
      case 'betting_lines':
        console.log('💰 Starting betting lines scraping...');
        data = scrapers.bettingLines();
        tableName = 'betting_lines';
        break;
    }
  } catch (scrapingError) {
    console.error('❌ Scraping error:', scrapingError);
    showNotification(`❌ Scraping failed: ${scrapingError.message}`, 'error');
    return;
  }
  
  console.log(`📊 Scraping completed. Found ${data.length} records.`);
  
  if (data.length === 0) {
    showNotification('⚠️ No data found. Page may have loaded incompletely or structure changed.', 'error');
    console.log('⚠️ No data found. Check if page has finished loading.');
    return;
  }
  
  // Save to database
  showNotification(`💾 Saving ${data.length} records to database...`, 'info');
  const result = await saveToDatabase(tableName, data);
  
  if (result.success) {
    console.log(`✅ Successfully scraped and saved ${result.count} records to ${tableName}`);
    showNotification(`✅ Success! Saved ${result.count} ${pageType.replace('_', ' ')} records`, 'success');
  } else {
    console.error('❌ Failed to save to database:', result.message);
    showNotification(`❌ Database error: ${result.message}`, 'error');
  }
}

// Message listener for popup communication
(typeof browser !== 'undefined' ? browser : chrome).runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('💬 Content script received message:', message);
  console.log('📍 Current URL:', window.location.href);
  
  if (message.action === 'getPageInfo') {
    const pageType = detectPageType();
    const response = {
      url: window.location.href,
      pageType: pageType,
      supported: pageType !== 'unknown',
      canScrape: pageType !== 'unknown'
    };
    console.log('📋 Sending page info response:', response);
    sendResponse(response);
  } else if (message.action === 'scrapeData') {
    console.log('🚀 Starting scrape operation...');
    scrapeCurrentPage().then(() => {
      console.log('✅ Scrape operation completed successfully');
      sendResponse({ success: true });
    }).catch(error => {
      console.error('❌ Scrape operation failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  } else {
    console.log('❓ Unknown message action:', message.action);
    sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🏈 ESPN Scraper content script ready');
});

console.log('🏈 ESPN Scraper content script loaded');