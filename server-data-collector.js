// Server-Side NFL Data Collector
// Node.js script to fetch NFL data and save to Supabase
// Run this on your server/computer instead of browser extension

const fetch = require('node-fetch'); // npm install node-fetch
const { createClient } = require('@supabase/supabase-js'); // npm install @supabase/supabase-js

// Supabase configuration
const SUPABASE_URL = 'https://wbfvfzrxdqwrnqmpnfel.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiZnZmenJ4ZHF3cm5xbXBuZmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzAwNzIsImV4cCI6MjA3MzQ0NjA3Mn0.Vxr0N4xCFwUu229UxdPy5GKwH2dQahKM1DAbcCRjnyo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Data sources configuration
const DATA_SOURCES = {
  sportsdb: {
    schedule: 'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4391&s=2025',
    teams: 'https://www.thesportsdb.com/api/v1/json/3/lookup_all_teams.php?id=4391'
  }
};

// Rate limiting
let lastRequest = 0;
const RATE_LIMIT = 1000; // 1 second between requests

async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  const timeSince = now - lastRequest;
  
  if (timeSince < RATE_LIMIT) {
    const waitTime = RATE_LIMIT - timeSince;
    console.log(`⏱️ Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequest = Date.now();
  
  try {
    console.log(`🌐 Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Successfully fetched from ${url}`);
    return data;
    
  } catch (error) {
    console.error(`❌ Error fetching ${url}:`, error.message);
    throw error;
  }
}

// Data processors

// Main data collection functions

// Utility functions
function getCurrentWeek() {
  const now = new Date();
  const seasonStart = new Date(2025, 8, 1); // September 1st, 2025
  const diffWeeks = Math.ceil((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(18, diffWeeks));
}

// Main execution function
async function runDataCollection() {
  console.log('🚀 Starting NFL data collection...');
  console.log(`📅 Current week: ${getCurrentWeek()}`);
  
  const results = {
    timestamp: new Date().toISOString(),
    message: 'ESPN data collection removed - using alternative data sources'
  };
  
  console.log('📋 Collection Summary:');
  console.log('  ESPN data collection has been removed');
  console.log('  Consider implementing alternative data sources');
  
  return results;
}

// Export for module usage or run directly
if (require.main === module) {
  // Run directly
  runDataCollection()
    .then(results => {
      console.log('✅ Data collection completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
} else {
  // Export for use as module
  module.exports = {
    runDataCollection,
    DATA_SOURCES
  };
}