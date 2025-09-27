// popup-firefox.js - Firefox-compatible popup interface

// Firefox uses browser namespace instead of chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Configuration - Update these URLs for your app
const CONFIG = {
  adminPanelURL: 'http://localhost:5173/admin', // Your React app admin panel
  supportedPages: [
    'espn.com/nfl/stats/team',
    'espn.com/nfl/injuries',
    'espn.com/nfl/scoreboard',
    'espn.com/nfl/standings',
    'espn.com/nfl/odds',
    'espn.com/nfl/qbr',
    'espn.com/nfl/fpi',
    'espn.com/nfl/story'
  ]
};

// DOM elements (same as Chrome version)
const elements = {
  currentUrl: document.getElementById('current-url'),
  pageStatus: document.getElementById('page-status'),
  pageType: document.getElementById('page-type'),
  scrapeBtn: document.getElementById('scrape-btn'),
  manualScrapeBtn: document.getElementById('manual-scrape'),
  adminLink: document.getElementById('admin-link'),
  loading: document.getElementById('loading'),
  autoScrapeToggle: document.getElementById('auto-scrape-toggle'),
  autoScrapeStatus: document.getElementById('auto-scrape-status'),
  totalScrapes: document.getElementById('total-scrapes'),
  successfulScrapes: document.getElementById('successful-scrapes'),
  errorCount: document.getElementById('error-count'),
  lastScrapeTime: document.getElementById('last-scrape-time'),
  lastTeamStats: document.getElementById('last-team-stats'),
  lastInjuries: document.getElementById('last-injuries'),
  lastBettingLines: document.getElementById('last-betting-lines'),
  clearErrorsBtn: document.getElementById('clear-errors-btn'),
  refreshStatsBtn: document.getElementById('refresh-stats-btn'),
  errorLog: document.getElementById('error-log'),
  errorLogContainer: document.getElementById('error-log-container'),
  toggleErrorsBtn: document.getElementById('toggle-errors-btn')
};

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);

async function initializePopup() {
  console.log('🚀 Initializing Pachanga\'s ESPN Scraper popup (Firefox)');
  
  // Set admin panel link
  elements.adminLink.href = CONFIG.adminPanelURL;
  
  // Get current tab info (Firefox compatible)
  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await updatePageInfo(tabs[0]);
      await checkPageSupport(tabs[0]);
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
      elements.currentUrl.textContent = tab.url || 'Unknown';
    }
    
    // Send message to content script to get page info (Firefox compatible)
    try {
      const response = await browserAPI.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
      
      if (response) {
        updatePageStatus(response.canScrape ? 'supported' : 'unsupported');
        updatePageType(getPageType(tab.url));
      } else {
        updatePageStatus('no-script');
        updatePageType('unknown');
      }
    } catch (error) {
      console.log('Content script not available, checking URL manually');
      const canScrape = CONFIG.supportedPages.some(page => tab.url?.includes(page));
      updatePageStatus(canScrape ? 'supported' : 'unsupported');
      updatePageType(getPageType(tab.url));
    }
  } catch (error) {
    console.error('❌ Error updating page info:', error);
    updatePageStatus('error');
  }
}

function getPageType(url) {
  if (!url) return 'unknown';
  
  if (url.includes('nfl/stats/team') && !url.includes('/view/')) return 'Team Offense Stats';
  if (url.includes('nfl/stats/team/_/view/defense')) return 'Team Defense Stats';
  if (url.includes('nfl/stats/team/_/view/special')) return 'Special Teams Stats';
  if (url.includes('nfl/stats/team/_/view/turnovers')) return 'Turnovers Stats';
  if (url.includes('nfl/injuries')) return 'Injury Reports';
  if (url.includes('nfl/scoreboard')) return 'Scoreboard';
  if (url.includes('nfl/standings')) return 'Standings';
  if (url.includes('nfl/odds')) return 'Betting Odds';
  if (url.includes('nfl/qbr')) return 'QB Ratings (QBR)';
  if (url.includes('nfl/fpi')) return 'Football Power Index';
  if (url.includes('nfl/story') && url.includes('power-rankings')) return 'Power Rankings';
  
  return 'ESPN NFL Page';
}

function updatePageStatus(status) {
  if (!elements.pageStatus) return;
  
  const statusMap = {
    'supported': { text: '✅ Supported', class: 'status-success' },
    'unsupported': { text: '❌ Not Supported', class: 'status-error' },
    'no-script': { text: '⚠️ Script Loading', class: 'status-warning' },
    'error': { text: '❌ Error', class: 'status-error' }
  };
  
  const statusInfo = statusMap[status] || statusMap.error;
  elements.pageStatus.textContent = statusInfo.text;
  elements.pageStatus.className = `status ${statusInfo.class}`;
}

function updatePageType(type) {
  if (elements.pageType) {
    elements.pageType.textContent = type;
  }
}

async function checkPageSupport(tab) {
  const isSupported = CONFIG.supportedPages.some(page => tab.url?.includes(page));
  
  if (elements.scrapeBtn) {
    elements.scrapeBtn.disabled = !isSupported;
    elements.scrapeBtn.textContent = isSupported ? 'Scrape Current Page' : 'Page Not Supported';
  }
}

// Handle scrape button click
async function handleScrapeClick() {
  try {
    showLoading(true);
    
    // Get current tab
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    // Send scrape message to content script
    const response = await browserAPI.tabs.sendMessage(tab.id, { action: 'scrape' });
    
    if (response && response.success) {
      showNotification('✅ Scraping started!', 'success');
      // Refresh stats after a delay
      setTimeout(loadStatistics, 3000);
    } else {
      throw new Error('Scrape failed');
    }
    
  } catch (error) {
    console.error('❌ Scrape error:', error);
    showNotification('❌ Scraping failed', 'error');
  } finally {
    showLoading(false);
  }
}

// Handle manual scrape
async function handleManualScrape() {
  try {
    showLoading(true);
    
    const response = await browserAPI.runtime.sendMessage({ 
      action: 'manualScrape',
      scrapeType: 'teamStats'
    });
    
    if (response && response.success) {
      showNotification('✅ Manual scrape completed!', 'success');
      setTimeout(loadStatistics, 2000);
    } else {
      throw new Error(response?.error || 'Manual scrape failed');
    }
    
  } catch (error) {
    console.error('❌ Manual scrape error:', error);
    showNotification('❌ Manual scrape failed', 'error');
  } finally {
    showLoading(false);
  }
}

// Handle auto-scrape toggle
async function handleAutoScrapeToggle() {
  try {
    const enabled = elements.autoScrapeToggle.checked;
    
    const response = await browserAPI.runtime.sendMessage({
      action: 'toggleAutoScrape',
      enabled: enabled
    });
    
    if (response && response.success) {
      updateAutoScrapeStatus(enabled);
      showNotification(
        enabled ? '✅ Auto-scraping enabled' : '⏸️ Auto-scraping disabled',
        'success'
      );
    } else {
      // Revert toggle on error
      elements.autoScrapeToggle.checked = !enabled;
      throw new Error(response?.error || 'Failed to toggle auto-scrape');
    }
    
  } catch (error) {
    console.error('❌ Auto-scrape toggle error:', error);
    showNotification('❌ Failed to toggle auto-scraping', 'error');
  }
}

// Load and display statistics
async function loadStatistics() {
  try {
    const response = await browserAPI.runtime.sendMessage({ action: 'getStats' });
    
    if (response && response.success) {
      displayStatistics(response.data);
    } else {
      throw new Error(response?.error || 'Failed to load stats');
    }
    
  } catch (error) {
    console.error('❌ Stats loading error:', error);
    showNotification('❌ Failed to load statistics', 'error');
  }
}

// Display statistics in UI
function displayStatistics(data) {
  // Update main stats
  if (elements.totalScrapes) {
    elements.totalScrapes.textContent = data.scrapeStats?.totalScrapes || 0;
  }
  
  if (elements.successfulScrapes) {
    elements.successfulScrapes.textContent = data.scrapeStats?.successfulScrapes || 0;
  }
  
  if (elements.errorCount) {
    elements.errorCount.textContent = data.scrapeStats?.errors || 0;
  }
  
  // Update auto-scrape status
  const autoEnabled = data.autoScrapeEnabled;
  if (elements.autoScrapeToggle) {
    elements.autoScrapeToggle.checked = autoEnabled;
  }
  updateAutoScrapeStatus(autoEnabled);
  
  // Update last scrape times
  const lastScrapes = data.lastScrapeTime || {};
  updateLastScrapeTime('lastTeamStats', lastScrapes.teamStats);
  updateLastScrapeTime('lastInjuries', lastScrapes.injuries);
  updateLastScrapeTime('lastBettingLines', lastScrapes.bettingLines);
  
  // Update error log
  displayErrorLog(data.errorLog || []);
}

function updateAutoScrapeStatus(enabled) {
  if (elements.autoScrapeStatus) {
    elements.autoScrapeStatus.textContent = enabled ? '🟢 Enabled' : '🔴 Disabled';
    elements.autoScrapeStatus.className = enabled ? 'status-success' : 'status-error';
  }
}

function updateLastScrapeTime(elementKey, timestamp) {
  const element = elements[elementKey];
  if (element) {
    if (timestamp) {
      const date = new Date(timestamp);
      element.textContent = date.toLocaleString();
    } else {
      element.textContent = 'Never';
    }
  }
}

function displayErrorLog(errors) {
  if (!elements.errorLog) return;
  
  elements.errorLog.innerHTML = '';
  
  if (errors.length === 0) {
    elements.errorLog.innerHTML = '<div class="no-errors">No recent errors</div>';
    return;
  }
  
  errors.slice(0, 10).forEach(error => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-item';
    errorDiv.innerHTML = `
      <div class="error-time">${new Date(error.timestamp).toLocaleString()}</div>
      <div class="error-message">${error.message}</div>
      <div class="error-details">${error.error}</div>
    `;
    elements.errorLog.appendChild(errorDiv);
  });
}

// Handle clear errors
async function handleClearErrors() {
  try {
    const response = await browserAPI.runtime.sendMessage({ action: 'clearErrors' });
    
    if (response && response.success) {
      showNotification('✅ Error log cleared', 'success');
      await loadStatistics(); // Refresh stats
    } else {
      throw new Error(response?.error || 'Failed to clear errors');
    }
    
  } catch (error) {
    console.error('❌ Clear errors failed:', error);
    showNotification('❌ Failed to clear errors', 'error');
  }
}

// Toggle error log visibility
function toggleErrorLog() {
  if (elements.errorLogContainer && elements.toggleErrorsBtn) {
    const isVisible = elements.errorLogContainer.style.display !== 'none';
    elements.errorLogContainer.style.display = isVisible ? 'none' : 'block';
    elements.toggleErrorsBtn.textContent = isVisible ? 'Show Error Log' : 'Hide Error Log';
  }
}

// Utility functions
function showLoading(show) {
  if (elements.loading) {
    elements.loading.style.display = show ? 'block' : 'none';
  }
}

function showNotification(message, type = 'info') {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  // Create temporary notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 10px 15px;
    border-radius: 4px;
    color: white;
    font-size: 12px;
    z-index: 1000;
    max-width: 200px;
    word-wrap: break-word;
  `;
  
  // Set background color based on type
  switch (type) {
    case 'success': notification.style.backgroundColor = '#10b981'; break;
    case 'error': notification.style.backgroundColor = '#ef4444'; break;
    case 'warning': notification.style.backgroundColor = '#f59e0b'; break;
    default: notification.style.backgroundColor = '#6b7280'; break;
  }
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

console.log('✅ Pachanga\'s ESPN Scraper popup (Firefox) loaded successfully');