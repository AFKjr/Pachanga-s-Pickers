// background.js - Service Worker for automatic ESPN data scraping
console.log('🚀 Pachanga\'s ESPN Scraper service worker starting...');

// Configuration for auto-scraping
const SCRAPE_CONFIG = {
  // Scraping intervals (in minutes)
  intervals: {
    teamStats: 120,      // Every 2 hours for team stats
    injuries: 60,        // Every hour for injuries (more volatile)
    bettingLines: 30,    // Every 30 minutes for betting lines (most volatile)
    schedule: 240        // Every 4 hours for schedule
  },
  
  // ESPN URLs to scrape automatically
  espnUrls: {
    teamOffense: 'https://www.espn.com/nfl/stats/team/_/view/offense',
    teamDefense: 'https://www.espn.com/nfl/stats/team/_/view/defense', 
    injuries: 'https://www.espn.com/nfl/injuries',
    schedule: 'https://www.espn.com/nfl/schedule',
    sportsbook: 'https://sportsbook.espn.com/sports/football/nfl'
  },
  
  // Scraping schedule (only during active hours)
  activeHours: {
    start: 6,  // 6 AM
    end: 24    // 12 AM (midnight)
  }
};

// Storage keys for tracking scrape times
const STORAGE_KEYS = {
  lastScrapeTime: 'lastScrapeTime',
  scrapeStats: 'scrapeStats',
  autoScrapeEnabled: 'autoScrapeEnabled',
  errorLog: 'errorLog'
};

// Initialize service worker
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🔧 Extension installed/updated:', details.reason);
  
  // Set default configuration
  await initializeStorage();
  
  // Set up alarms for periodic scraping
  await setupScrapeAlarms();
  
  // Show welcome notification
  showNotification('Pachanga\'s ESPN Scraper installed! Auto-scraping enabled.', 'success');
});

// Initialize storage with default values
async function initializeStorage() {
  const defaults = {
    [STORAGE_KEYS.autoScrapeEnabled]: true,
    [STORAGE_KEYS.lastScrapeTime]: {},
    [STORAGE_KEYS.scrapeStats]: {
      totalScrapes: 0,
      successfulScrapes: 0,
      errors: 0,
      lastError: null
    },
    [STORAGE_KEYS.errorLog]: []
  };
  
  for (const [key, value] of Object.entries(defaults)) {
    const existing = await chrome.storage.local.get(key);
    if (!existing[key]) {
      await chrome.storage.local.set({ [key]: value });
    }
  }
}

// Set up periodic scraping alarms
async function setupScrapeAlarms() {
  console.log('⏰ Setting up scrape alarms...');
  
  // Clear existing alarms
  await chrome.alarms.clearAll();
  
  // Create alarms for each scrape type
  for (const [type, intervalMinutes] of Object.entries(SCRAPE_CONFIG.intervals)) {
    await chrome.alarms.create(`scrape_${type}`, {
      delayInMinutes: 1, // Start after 1 minute
      periodInMinutes: intervalMinutes
    });
    console.log(`⏰ Created alarm for ${type}: every ${intervalMinutes} minutes`);
  }
  
  // Create a general health check alarm
  await chrome.alarms.create('health_check', {
    delayInMinutes: 5,
    periodInMinutes: 60 // Every hour
  });
}

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('⏰ Alarm triggered:', alarm.name);
  
  // Check if auto-scraping is enabled
  const { autoScrapeEnabled } = await chrome.storage.local.get(STORAGE_KEYS.autoScrapeEnabled);
  if (!autoScrapeEnabled) {
    console.log('🛑 Auto-scraping disabled, skipping');
    return;
  }
  
  // Check if we're in active hours
  if (!isActiveHour()) {
    console.log('😴 Outside active hours, skipping scrape');
    return;
  }
  
  try {
    if (alarm.name === 'health_check') {
      await performHealthCheck();
    } else if (alarm.name.startsWith('scrape_')) {
      const scrapeType = alarm.name.replace('scrape_', '');
      await performAutoScrape(scrapeType);
    }
  } catch (error) {
    console.error('❌ Error handling alarm:', error);
    await logError(`Alarm ${alarm.name} failed`, error);
  }
});

// Check if current time is within active hours
function isActiveHour() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= SCRAPE_CONFIG.activeHours.start && hour < SCRAPE_CONFIG.activeHours.end;
}

// Perform automatic scraping for a specific type
async function performAutoScrape(scrapeType) {
  console.log(`🤖 Starting auto-scrape for ${scrapeType}...`);
  
  try {
    // Update scrape stats
    await updateScrapeStats('attempt');
    
    // Get the appropriate ESPN URL
    const url = getEspnUrlForScrapeType(scrapeType);
    if (!url) {
      console.warn(`⚠️ No URL configured for scrape type: ${scrapeType}`);
      return;
    }
    
    // Check if we've scraped this recently (avoid too frequent scraping)
    const lastScrapeTime = await getLastScrapeTime(scrapeType);
    const minInterval = SCRAPE_CONFIG.intervals[scrapeType] * 60 * 1000; // Convert to milliseconds
    
    if (lastScrapeTime && (Date.now() - lastScrapeTime) < minInterval * 0.8) {
      console.log(`⏭️ Skipping ${scrapeType} - scraped too recently`);
      return;
    }
    
    // Open tab and perform scrape
    await scrapeEspnPage(url, scrapeType);
    
    // Update last scrape time
    await setLastScrapeTime(scrapeType, Date.now());
    
    console.log(`✅ Auto-scrape completed for ${scrapeType}`);
    await updateScrapeStats('success');
    
  } catch (error) {
    console.error(`❌ Auto-scrape failed for ${scrapeType}:`, error);
    await updateScrapeStats('error');
    await logError(`Auto-scrape ${scrapeType} failed`, error);
  }
}

// Get ESPN URL for scrape type
function getEspnUrlForScrapeType(scrapeType) {
  const urlMap = {
    'teamStats': SCRAPE_CONFIG.espnUrls.teamOffense,
    'injuries': SCRAPE_CONFIG.espnUrls.injuries,
    'bettingLines': SCRAPE_CONFIG.espnUrls.sportsbook,
    'schedule': SCRAPE_CONFIG.espnUrls.schedule
  };
  
  return urlMap[scrapeType] || null;
}

// Scrape ESPN page by opening tab
async function scrapeEspnPage(url, scrapeType) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`🌐 Opening ${url} for ${scrapeType} scrape...`);
      
      // Create a new tab for scraping
      const tab = await chrome.tabs.create({ 
        url: url, 
        active: false // Don't make it the active tab
      });
      
      // Set up timeout
      const timeout = setTimeout(() => {
        chrome.tabs.remove(tab.id);
        reject(new Error('Scrape timeout'));
      }, 30000); // 30 second timeout
      
      // Listen for tab updates
      const onUpdated = async (tabId, changeInfo, updatedTab) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          try {
            // Wait a bit for content to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Inject and execute scraping
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: triggerScrapeOnPage,
              args: [scrapeType]
            });
            
            // Clean up
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(onUpdated);
            
            // Close the tab after a short delay
            setTimeout(() => {
              chrome.tabs.remove(tab.id);
            }, 5000);
            
            resolve();
            
          } catch (error) {
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(onUpdated);
            chrome.tabs.remove(tab.id);
            reject(error);
          }
        }
      };
      
      chrome.tabs.onUpdated.addListener(onUpdated);
      
    } catch (error) {
      reject(error);
    }
  });
}

// Function to inject into page and trigger scraping
function triggerScrapeOnPage(scrapeType) {
  console.log(`🎯 Triggering scrape on page for ${scrapeType}`);
  
  // Check if the Pachanga scraper is available
  if (window.pachangaScraper && window.pachangaScraper.detectAndScrape) {
    // Trigger the existing scraping logic
    window.pachangaScraper.detectAndScrape();
  } else {
    console.warn('⚠️ Pachanga scraper not found on page');
  }
}

// Perform health check
async function performHealthCheck() {
  console.log('🏥 Performing health check...');
  
  try {
    // Check storage health
    const stats = await chrome.storage.local.get(STORAGE_KEYS.scrapeStats);
    
    // Check if we've had recent activity
    const lastScrapes = await chrome.storage.local.get(STORAGE_KEYS.lastScrapeTime);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    let recentActivity = false;
    for (const [type, timestamp] of Object.entries(lastScrapes[STORAGE_KEYS.lastScrapeTime] || {})) {
      if (now - timestamp < oneHour) {
        recentActivity = true;
        break;
      }
    }
    
    // Log health status
    console.log('🏥 Health check results:', {
      stats: stats[STORAGE_KEYS.scrapeStats],
      recentActivity,
      activeHour: isActiveHour()
    });
    
    // Clean up old error logs (keep only last 50)
    await cleanupErrorLogs();
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    await logError('Health check failed', error);
  }
}

// Storage helper functions
async function getLastScrapeTime(scrapeType) {
  const { lastScrapeTime } = await chrome.storage.local.get(STORAGE_KEYS.lastScrapeTime);
  return lastScrapeTime[scrapeType] || null;
}

async function setLastScrapeTime(scrapeType, timestamp) {
  const { lastScrapeTime } = await chrome.storage.local.get(STORAGE_KEYS.lastScrapeTime);
  lastScrapeTime[scrapeType] = timestamp;
  await chrome.storage.local.set({ [STORAGE_KEYS.lastScrapeTime]: lastScrapeTime });
}

async function updateScrapeStats(type) {
  const { scrapeStats } = await chrome.storage.local.get(STORAGE_KEYS.scrapeStats);
  
  if (type === 'attempt') {
    scrapeStats.totalScrapes++;
  } else if (type === 'success') {
    scrapeStats.successfulScrapes++;
  } else if (type === 'error') {
    scrapeStats.errors++;
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.scrapeStats]: scrapeStats });
}

async function logError(message, error) {
  const { errorLog } = await chrome.storage.local.get(STORAGE_KEYS.errorLog);
  
  const errorEntry = {
    timestamp: new Date().toISOString(),
    message,
    error: error.message || error.toString(),
    stack: error.stack
  };
  
  errorLog.unshift(errorEntry); // Add to beginning
  
  // Keep only last 50 errors
  if (errorLog.length > 50) {
    errorLog.splice(50);
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.errorLog]: errorLog });
  
  // Update stats
  const { scrapeStats } = await chrome.storage.local.get(STORAGE_KEYS.scrapeStats);
  scrapeStats.lastError = errorEntry;
  await chrome.storage.local.set({ [STORAGE_KEYS.scrapeStats]: scrapeStats });
}

async function cleanupErrorLogs() {
  const { errorLog } = await chrome.storage.local.get(STORAGE_KEYS.errorLog);
  
  if (errorLog.length > 50) {
    const cleanedLog = errorLog.slice(0, 50);
    await chrome.storage.local.set({ [STORAGE_KEYS.errorLog]: cleanedLog });
    console.log('🧹 Cleaned up error logs, kept last 50 entries');
  }
}

// Show notifications
function showNotification(message, type = 'basic', priority = 1) {
  const iconUrl = chrome.runtime.getURL('icons/icon48.png');
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: 'Pachanga\'s ESPN Scraper',
    message: message,
    priority: priority
  });
}

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('💬 Background received message:', request);
  
  if (request.action === 'getStats') {
    handleGetStats(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'toggleAutoScrape') {
    handleToggleAutoScrape(request.enabled, sendResponse);
    return true;
  }
  
  if (request.action === 'manualScrape') {
    handleManualScrape(request.scrapeType, sendResponse);
    return true;
  }
  
  if (request.action === 'clearErrors') {
    handleClearErrors(sendResponse);
    return true;
  }
});

// Message handlers
async function handleGetStats(sendResponse) {
  try {
    const stats = await chrome.storage.local.get([
      STORAGE_KEYS.scrapeStats,
      STORAGE_KEYS.lastScrapeTime,
      STORAGE_KEYS.autoScrapeEnabled,
      STORAGE_KEYS.errorLog
    ]);
    
    sendResponse({ success: true, data: stats });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleToggleAutoScrape(enabled, sendResponse) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.autoScrapeEnabled]: enabled });
    
    if (enabled) {
      await setupScrapeAlarms();
      showNotification('Auto-scraping enabled', 'basic');
    } else {
      await chrome.alarms.clearAll();
      showNotification('Auto-scraping disabled', 'basic');
    }
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleManualScrape(scrapeType, sendResponse) {
  try {
    await performAutoScrape(scrapeType || 'teamStats');
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleClearErrors(sendResponse) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.errorLog]: [] });
    
    // Reset error count in stats
    const { scrapeStats } = await chrome.storage.local.get(STORAGE_KEYS.scrapeStats);
    scrapeStats.errors = 0;
    scrapeStats.lastError = null;
    await chrome.storage.local.set({ [STORAGE_KEYS.scrapeStats]: scrapeStats });
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle service worker activation
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Service worker started on browser startup');
});

// Keep service worker alive with periodic activity
setInterval(() => {
  console.log('💓 Service worker heartbeat');
}, 25000); // Every 25 seconds

console.log('✅ Pachanga\'s ESPN Scraper service worker loaded successfully');
