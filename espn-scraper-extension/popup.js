// popup.js - Enhanced popup interface with auto-scraping controls

// Configuration - Update these URLs for your app
const CONFIG = {
  adminPanelURL: 'http://localhost:5173/admin', // Your React app admin panel
  supportedPages: [
    'espn.com/nfl/stats/team/',
    'espn.com/nfl/stats/team/_/view/defense',
    'espn.com/nfl/stats/team/_/view/special',
    'espn.com/nfl/stats/team/_/view/turnovers',
    'espn.com/nfl/injuries', 
    'sportsbook.espn.com',
    'espn.com/nfl/schedule'
  ]
};

// DOM elements
const elements = {
  // Page info
  currentUrl: document.getElementById('current-url'),
  pageStatus: document.getElementById('page-status'),
  pageType: document.getElementById('page-type'),
  
  // Manual controls
  scrapeBtn: document.getElementById('scrape-btn'),
  manualScrapeBtn: document.getElementById('manual-scrape'),
  adminLink: document.getElementById('admin-link'),
  loading: document.getElementById('loading'),
  
  // Auto-scraping controls
  autoScrapeToggle: document.getElementById('auto-scrape-toggle'),
  autoScrapeStatus: document.getElementById('auto-scrape-status'),
  
  // Statistics
  totalScrapes: document.getElementById('total-scrapes'),
  successfulScrapes: document.getElementById('successful-scrapes'),
  errorCount: document.getElementById('error-count'),
  lastScrapeTime: document.getElementById('last-scrape-time'),
  
  // Last scrape times by type
  lastTeamStats: document.getElementById('last-team-stats'),
  lastInjuries: document.getElementById('last-injuries'),
  lastBettingLines: document.getElementById('last-betting-lines'),
  
  // Actions
  clearErrorsBtn: document.getElementById('clear-errors-btn'),
  refreshStatsBtn: document.getElementById('refresh-stats-btn'),
  
  // Error log
  errorLog: document.getElementById('error-log'),
  errorLogContainer: document.getElementById('error-log-container'),
  toggleErrorsBtn: document.getElementById('toggle-errors-btn')
};

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
  console.log('🚀 Initializing Pachanga\'s ESPN Scraper popup');
  
  // Set admin panel link
  elements.adminLink.href = CONFIG.adminPanelURL;
  
  // Get current tab info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await updatePageInfo(tab);
      await checkPageSupport(tab);
    }
  } catch (error) {
    console.error('❌ Error getting tab info:', error);
    showNotification('Error loading page info', 'error');
  }
  
  // Load and display statistics
  await loadStatistics();
  
  // Set up event listeners
  setupEventListeners();
  
  // Auto-refresh stats every 30 seconds
  setInterval(loadStatistics, 30000);
}

function setupEventListeners() {
  // Manual scraping controls
  elements.scrapeBtn?.addEventListener('click', handleScrapeClick);
  elements.manualScrapeBtn?.addEventListener('click', handleManualScrape);
  
  // Auto-scraping toggle
  elements.autoScrapeToggle?.addEventListener('change', handleAutoScrapeToggle);
  
  // Statistics and management
  elements.refreshStatsBtn?.addEventListener('click', loadStatistics);
  elements.clearErrorsBtn?.addEventListener('click', handleClearErrors);
  elements.toggleErrorsBtn?.addEventListener('click', toggleErrorLog);
  
  // Admin panel link tracking
  elements.adminLink?.addEventListener('click', () => {
    console.log('🎯 Opening admin panel');
  });
}

async function updatePageInfo(tab) {
  try {
    if (elements.currentUrl) {
      elements.currentUrl.textContent = tab.url;
    }
    
    // Set page type
    if (elements.pageType) {
      elements.pageType.textContent = getPageType(tab.url);
    }
    
    // Try to get more detailed page info from content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
    
    if (response && response.canScrape !== undefined) {
      updatePageStatus(response.canScrape);
    } else {
      // Fallback to URL-based detection
      const isSupported = CONFIG.supportedPages.some(page => 
        tab.url.toLowerCase().includes(page)
      );
      updatePageStatus(isSupported);
    }
  } catch (error) {
    console.warn('⚠️ Could not communicate with content script, using URL detection');
    
    // Fallback to URL-based detection
    const isSupported = CONFIG.supportedPages.some(page => 
      tab.url.toLowerCase().includes(page)
    );
    updatePageStatus(isSupported);
  }
}

function updatePageStatus(canScrape) {
  if (elements.pageStatus) {
    if (canScrape) {
      elements.pageStatus.textContent = '✅ Supported';
      elements.pageStatus.className = 'status supported';
    } else {
      elements.pageStatus.textContent = '❌ Not Supported';
      elements.pageStatus.className = 'status not-supported';
    }
  }
  
  if (elements.scrapeBtn) {
    if (canScrape) {
      elements.scrapeBtn.disabled = false;
      elements.scrapeBtn.textContent = '🔄 Scrape Current Page';
    } else {
      elements.scrapeBtn.disabled = true;
      elements.scrapeBtn.textContent = '🔄 Navigate to ESPN NFL page';
    }
  }
}

async function checkPageSupport(tab) {
  const url = tab.url.toLowerCase();
  const isESPN = url.includes('espn.com');
  const isNFL = url.includes('nfl');
  const hasContent = CONFIG.supportedPages.some(page => url.includes(page));
  
  console.log('🔍 Page check:', { 
    url: tab.url, 
    isESPN, 
    isNFL, 
    hasContent,
    supported: isESPN && isNFL && hasContent 
  });
  
  return isESPN && isNFL && hasContent;
}

async function handleScrapeClick() {
  console.log('🎯 Scrape button clicked');
  
  if (elements.scrapeBtn.disabled) {
    showNotification('Navigate to a supported ESPN NFL page first', 'error');
    return;
  }
  
  setLoading(true);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeData' });
    
    if (response && response.success) {
      showNotification('✅ Data scraped successfully!', 'success');
      console.log('✅ Scraping completed successfully');
    } else {
      throw new Error('Scraping failed - no response from content script');
    }
  } catch (error) {
    console.error('❌ Scraping error:', error);
    showNotification('❌ Scraping failed. Try refreshing the page.', 'error');
  } finally {
    setLoading(false);
  }
}

async function handleManualScrape() {
  console.log('⚡ Manual scrape triggered');
  
  setLoading(true);
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script if not already present
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    // Wait a moment for script to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to scrape
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeData' });
    
    if (response && response.success) {
      showNotification('✅ Manual scrape completed!', 'success');
    } else {
      showNotification('⚠️ Scrape attempted - check console for details', 'success');
    }
  } catch (error) {
    console.error('❌ Manual scrape error:', error);
    showNotification('❌ Manual scrape failed', 'error');
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  if (isLoading) {
    elements.loading.classList.add('show');
    elements.scrapeBtn.disabled = true;
    elements.manualScrapeBtn.disabled = true;
  } else {
    elements.loading.classList.remove('show');
    elements.scrapeBtn.disabled = false;
    elements.manualScrapeBtn.disabled = false;
    
    // Re-check page support to update scrape button state
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(([tab]) => checkPageSupport(tab))
      .then(updatePageStatus);
  }
}

function showNotification(message, type = 'success') {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) {
    existing.remove();
  }
  
  // Create new notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Hide and remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Utility function to detect page type
function getPageType(url) {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('nfl/stats/team/_/stat/offense')) {
    return 'Team Offense Stats';
  } else if (lowerUrl.includes('nfl/stats/team/_/stat/defense')) {
    return 'Team Defense Stats';
  } else if (lowerUrl.includes('nfl/injuries')) {
    return 'Injury Reports';
  } else if (lowerUrl.includes('sportsbook') || lowerUrl.includes('odds')) {
    return 'Betting Lines';
  } else if (lowerUrl.includes('nfl/schedule')) {
    return 'Game Schedule';
  } else {
    return 'ESPN NFL Page';
  }
}

// Listen for tab updates to refresh page info
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updatePageInfo(tab);
  }
});

// Load and display statistics from service worker
async function loadStatistics() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    
    if (response.success) {
      updateStatisticsDisplay(response.data);
    } else {
      console.error('Failed to load statistics:', response.error);
    }
  } catch (error) {
    console.error('Error loading statistics:', error);
    displayOfflineStats();
  }
}

// Update the statistics display
function updateStatisticsDisplay(data) {
  const { scrapeStats, lastScrapeTime, autoScrapeEnabled, errorLog } = data;
  
  // Update auto-scrape status
  if (elements.autoScrapeToggle) {
    elements.autoScrapeToggle.checked = autoScrapeEnabled || false;
  }
  
  if (elements.autoScrapeStatus) {
    elements.autoScrapeStatus.textContent = autoScrapeEnabled ? 'Enabled' : 'Disabled';
    elements.autoScrapeStatus.className = `status ${autoScrapeEnabled ? 'enabled' : 'disabled'}`;
  }
  
  // Update statistics
  if (elements.totalScrapes && scrapeStats) {
    elements.totalScrapes.textContent = scrapeStats.totalScrapes || 0;
  }
  
  if (elements.successfulScrapes && scrapeStats) {
    elements.successfulScrapes.textContent = scrapeStats.successfulScrapes || 0;
  }
  
  if (elements.errorCount && scrapeStats) {
    elements.errorCount.textContent = scrapeStats.errors || 0;
  }
  
  // Update last scrape times
  const lastScrapes = lastScrapeTime || {};
  
  if (elements.lastTeamStats) {
    elements.lastTeamStats.textContent = formatLastScrapeTime(lastScrapes.teamStats);
  }
  
  if (elements.lastInjuries) {
    elements.lastInjuries.textContent = formatLastScrapeTime(lastScrapes.injuries);
  }
  
  if (elements.lastBettingLines) {
    elements.lastBettingLines.textContent = formatLastScrapeTime(lastScrapes.bettingLines);
  }
  
  // Update most recent scrape time
  if (elements.lastScrapeTime) {
    const mostRecent = Math.max(...Object.values(lastScrapes).filter(t => t));
    elements.lastScrapeTime.textContent = mostRecent ? formatLastScrapeTime(mostRecent) : 'Never';
  }
  
  // Update error log
  updateErrorLog(errorLog || []);
}

// Format timestamp for display
function formatLastScrapeTime(timestamp) {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

// Handle auto-scraping toggle
async function handleAutoScrapeToggle(event) {
  const enabled = event.target.checked;
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'toggleAutoScrape', 
      enabled 
    });
    
    if (response.success) {
      showNotification(
        enabled ? 'Auto-scraping enabled' : 'Auto-scraping disabled', 
        'success'
      );
      await loadStatistics(); // Refresh display
    } else {
      // Revert toggle on failure
      event.target.checked = !enabled;
      showNotification('Failed to toggle auto-scraping', 'error');
    }
  } catch (error) {
    console.error('Error toggling auto-scrape:', error);
    event.target.checked = !enabled;
    showNotification('Error toggling auto-scraping', 'error');
  }
}

// Handle clear errors
async function handleClearErrors() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearErrors' });
    
    if (response.success) {
      showNotification('Error log cleared', 'success');
      await loadStatistics(); // Refresh display
    } else {
      showNotification('Failed to clear errors', 'error');
    }
  } catch (error) {
    console.error('Error clearing errors:', error);
    showNotification('Error clearing error log', 'error');
  }
}

// Toggle error log visibility
function toggleErrorLog() {
  if (elements.errorLogContainer && elements.toggleErrorsBtn) {
    const isVisible = elements.errorLogContainer.style.display !== 'none';
    elements.errorLogContainer.style.display = isVisible ? 'none' : 'block';
    elements.toggleErrorsBtn.textContent = isVisible ? 'Show Errors' : 'Hide Errors';
  }
}

// Update error log display
function updateErrorLog(errors) {
  if (!elements.errorLog) return;
  
  elements.errorLog.innerHTML = '';
  
  if (errors.length === 0) {
    elements.errorLog.innerHTML = '<div class="no-errors">No recent errors</div>';
    return;
  }
  
  // Show last 5 errors
  const recentErrors = errors.slice(0, 5);
  
  recentErrors.forEach(error => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-item';
    
    const time = new Date(error.timestamp).toLocaleTimeString();
    errorDiv.innerHTML = `
      <div class="error-time">${time}</div>
      <div class="error-message">${error.message}</div>
    `;
    
    elements.errorLog.appendChild(errorDiv);
  });
}

// Display fallback stats when service worker is unavailable
function displayOfflineStats() {
  if (elements.autoScrapeStatus) {
    elements.autoScrapeStatus.textContent = 'Unknown';
    elements.autoScrapeStatus.className = 'status unknown';
  }
  
  // Set default values
  ['totalScrapes', 'successfulScrapes', 'errorCount'].forEach(id => {
    if (elements[id]) {
      elements[id].textContent = '0';
    }
  });
  
  ['lastTeamStats', 'lastInjuries', 'lastBettingLines', 'lastScrapeTime'].forEach(id => {
    if (elements[id]) {
      elements[id].textContent = 'Unknown';
    }
  });
}

// Enhanced manual scrape with service worker coordination
async function handleBackgroundScrape(scrapeType = 'current') {
  try {
    setLoading(true);
    
    const response = await chrome.runtime.sendMessage({ 
      action: 'manualScrape',
      scrapeType 
    });
    
    if (response.success) {
      showNotification('✅ Background scrape completed!', 'success');
      setTimeout(loadStatistics, 2000); // Refresh stats after delay
    } else {
      showNotification('❌ Background scrape failed', 'error');
    }
  } catch (error) {
    console.error('Background scrape error:', error);
    showNotification('❌ Background scrape error', 'error');
  } finally {
    setLoading(false);
  }
}

// Handle extension icon click analytics
console.log('📊 Pachanga\'s ESPN Scraper popup loaded');