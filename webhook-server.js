// webhook-server.js
// Standalone webhook server for Relevance AI integration

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple FTN Auth implementation for server use
class FTNAuthManagerServer {
  constructor() {
    this.credentials = null;
    this.loginInProgress = false;
  }

  async login(email, password) {
    if (this.loginInProgress) {
      throw new Error('Login already in progress');
    }

    this.loginInProgress = true;

    try {
      const loginEmail = email || process.env.VITE_FTN_EMAIL;
      const loginPassword = password || process.env.VITE_FTN_PASSWORD;

      if (!loginEmail || !loginPassword) {
        throw new Error('FTN credentials not provided. Set VITE_FTN_EMAIL and VITE_FTN_PASSWORD environment variables.');
      }

      console.log('🔑 Attempting FTN login (server-side)...');

      // Step 1: Get login page
      const loginPageResponse = await fetch('https://www.fantasythenerds.com/nfl/player-login.php', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!loginPageResponse.ok) {
        throw new Error(`Failed to load login page: ${loginPageResponse.status}`);
      }

      // Extract cookies
      const setCookieHeaders = loginPageResponse.headers.get('set-cookie');
      let initialCookies = '';
      if (setCookieHeaders) {
        initialCookies = setCookieHeaders.split(',')
          .map(cookie => cookie.split(';')[0])
          .join('; ');
      }

      // Step 2: Login with credentials
      const loginData = new FormData();
      loginData.append('email', loginEmail);
      loginData.append('password', loginPassword);
      loginData.append('login', 'Login');

      const loginResponse = await fetch('https://www.fantasythenerds.com/nfl/player-login.php', {
        method: 'POST',
        body: loginData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': initialCookies,
          'Referer': 'https://www.fantasythenerds.com/nfl/player-login.php'
        },
        redirect: 'manual'
      });

      // Extract session cookies
      const loginSetCookieHeaders = loginResponse.headers.get('set-cookie');
      let sessionCookie = initialCookies;
      
      if (loginSetCookieHeaders) {
        const newCookies = loginSetCookieHeaders.split(',')
          .map(cookie => cookie.split(';')[0])
          .filter(cookie => cookie.includes('='))
          .join('; ');
        
        sessionCookie = newCookies || sessionCookie;
      }

      // Step 3: Verify session
      const verifyResponse = await fetch('https://www.fantasythenerds.com/nfl/weather.php', {
        headers: {
          'Cookie': sessionCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const verifyText = await verifyResponse.text();
      const isVerified = !verifyText.includes('login') && !verifyText.includes('Login');

      if (!isVerified) {
        throw new Error('Login successful but session verification failed');
      }

      // Save credentials
      this.credentials = {
        sessionCookie,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        lastRefreshed: new Date(),
        isValid: true
      };

      console.log('✅ FTN login successful (server-side)');

      return {
        success: true,
        sessionCookie,
      };

    } catch (error) {
      console.error('❌ FTN login failed (server-side):', error.message);
      this.credentials = null;
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.loginInProgress = false;
    }
  }

  async getValidSession() {
    if (this.credentials && 
        this.credentials.isValid && 
        this.credentials.expiresAt > new Date()) {
      console.log('📋 Using existing FTN session (server-side)');
      return this.credentials.sessionCookie;
    }

    console.log('🔄 FTN session expired or missing, logging in (server-side)...');
    const loginResult = await this.login();
    
    if (!loginResult.success) {
      throw new Error(`FTN login failed: ${loginResult.error}`);
    }

    return loginResult.sessionCookie || null;
  }

  async fetchData(endpoint, options = {}) {
    const session = await this.getValidSession();
    if (!session) {
      throw new Error('No valid FTN session available');
    }

    console.log(`🌐 Fetching FTN data (server-side): ${endpoint}`);

    const response = await fetch(`https://www.fantasythenerds.com${endpoint}`, {
      ...options,
      headers: {
        'Cookie': session,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Referer': 'https://www.fantasythenerds.com',
        ...options.headers
      }
    });

    if (response.url.includes('login') || response.status === 401) {
      console.log('🔄 FTN session expired, re-authenticating (server-side)...');
      if (this.credentials) {
        this.credentials.isValid = false;
      }
      const newSession = await this.getValidSession();
      if (newSession) {
        return this.fetchData(endpoint, options);
      }
    }

    return response;
  }

  async getPlayerInjuries(week) {
    try {
      const endpoint = `/nfl/injury-report.php${week ? `?week=${week}` : ''}`;
      const response = await this.fetchData(endpoint);
      const html = await response.text();
      
      const injuries = this.parseInjuryData(html);
      
      console.log(`📊 Retrieved ${injuries.length} injury reports (server-side)`);
      return injuries;
    } catch (error) {
      console.error('Failed to get injury data (server-side):', error);
      throw error;
    }
  }

  parseInjuryData(html) {
    const injuries = [];
    const tableRows = html.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
    
    for (const row of tableRows) {
      const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs) || [];
      if (cells.length >= 4) {
        injuries.push({
          player: cells[0]?.replace(/<[^>]*>/g, '').trim(),
          team: cells[1]?.replace(/<[^>]*>/g, '').trim(),
          position: cells[2]?.replace(/<[^>]*>/g, '').trim(),
          injury: cells[3]?.replace(/<[^>]*>/g, '').trim(),
          status: cells[4]?.replace(/<[^>]*>/g, '').trim()
        });
      }
    }
    
    return injuries;
  }

  getStatus() {
    if (!this.credentials) {
      return { isLoggedIn: false };
    }

    return {
      isLoggedIn: this.credentials.isValid && this.credentials.expiresAt > new Date(),
      expiresAt: this.credentials.expiresAt,
      lastRefreshed: this.credentials.lastRefreshed
    };
  }
}

// Create FTN auth instance
const ftnAuthServer = new FTNAuthManagerServer();

// Create Express app
const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'FTN Webhook Server'
  });
});

// FTN data webhook endpoint for Relevance AI
app.post('/api/ftn-webhook', async (req, res) => {
  try {
    // Verify the request is from Relevance AI
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const expectedApiKey = process.env.RELEVANCE_API_KEY;
    
    if (!expectedApiKey) {
      console.warn('⚠️ RELEVANCE_API_KEY not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'API key not configured' 
      });
    }
    
    if (apiKey !== expectedApiKey) {
      console.warn('🚫 Unauthorized webhook access attempt');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid API key' 
      });
    }

    const { dataType, week, team } = req.body;
    
    if (!dataType) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dataType is required. Options: injuries, depth-charts, weather'
      });
    }

    console.log(`🔗 Webhook request: ${dataType}${week ? ` (week ${week})` : ''}${team ? ` (team ${team})` : ''}`);

    let data;
    let message = '';

    try {
      switch (dataType) {
        case 'injuries':
          data = await ftnAuthServer.getPlayerInjuries(week);
          message = `Retrieved ${data.length} injury reports from FTN`;
          break;

        default:
          throw new Error(`Unsupported data type: ${dataType}. Currently only 'injuries' is implemented.`);
      }

      console.log(`✅ ${message}`);

      res.json({
        success: true,
        data: data,
        message: message,
        timestamp: new Date().toISOString(),
        source: 'FTN authenticated access'
      });

    } catch (ftnError) {
      console.error('❌ FTN data fetch failed:', ftnError.message);
      
      res.json({
        success: false,
        error: ftnError.message,
        message: "FTN data unavailable - check credentials and connection",
        timestamp: new Date().toISOString(),
        source: 'FTN authenticated access'
      });
    }

  } catch (error) {
    console.error('💥 Webhook error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint
app.post('/api/ftn-test', async (req, res) => {
  try {
    console.log('🧪 Testing FTN connection...');
    
    const status = ftnAuthServer.getStatus();
    console.log('FTN Status:', status);
    
    const injuries = await ftnAuthServer.getPlayerInjuries();
    
    res.json({
      success: true,
      message: `FTN test successful - retrieved ${injuries.length} injury reports`,
      data: {
        authStatus: status,
        sampleData: injuries.slice(0, 3)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ FTN test failed:', error.message);
    
    res.json({
      success: false,
      error: error.message,
      message: "FTN test failed",
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FTN Webhook Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/api/ftn-webhook`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/ftn-test`);
  
  const hasApiKey = !!process.env.RELEVANCE_API_KEY;
  const hasCredentials = !!(process.env.VITE_FTN_EMAIL && process.env.VITE_FTN_PASSWORD);
  
  console.log(`🔐 API Key configured: ${hasApiKey ? '✅' : '❌'}`);
  console.log(`🔑 FTN credentials configured: ${hasCredentials ? '✅' : '❌'}`);
  
  if (!hasApiKey) {
    console.warn('⚠️  Set RELEVANCE_API_KEY in .env for webhook security');
  }
  
  if (!hasCredentials) {
    console.warn('⚠️  Set VITE_FTN_EMAIL and VITE_FTN_PASSWORD in .env for FTN access');
  }
});