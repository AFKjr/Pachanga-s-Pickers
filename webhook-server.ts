// webhook-server.ts
// Standalone webhook server for Relevance AI integration

import express from 'express';
import cors from 'cors';
import { ftnAuthServer } from './src/lib/ftn-auth-server.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

    const { dataType, week, team, customEndpoint } = req.body;
    
    if (!dataType) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dataType is required. Options: injuries, depth-charts, weather, custom'
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

        case 'depth-charts':
          data = await ftnAuthServer.getDepthCharts(team);
          message = `Retrieved depth chart data from FTN`;
          break;

        case 'weather':
          data = await ftnAuthServer.getWeatherData();
          message = `Retrieved weather data for ${data.length} games from FTN`;
          break;

        case 'custom':
          if (!customEndpoint) {
            throw new Error('customEndpoint required for custom data type');
          }
          const response = await ftnAuthServer.fetchData(customEndpoint);
          data = await response.text();
          message = `Retrieved custom data from FTN endpoint: ${customEndpoint}`;
          break;

        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      console.log(`✅ ${message}`);

      res.json({
        success: true,
        data: data,
        message: message,
        timestamp: new Date().toISOString(),
        source: 'FTN authenticated access'
      });

    } catch (ftnError: any) {
      console.error('❌ FTN data fetch failed:', ftnError.message);
      
      // Return error but with 200 status so Relevance AI can handle it
      res.json({
        success: false,
        error: ftnError.message,
        message: "FTN data unavailable - check credentials and connection",
        timestamp: new Date().toISOString(),
        source: 'FTN authenticated access'
      });
    }

  } catch (error: any) {
    console.error('💥 Webhook error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for manual testing
app.post('/api/ftn-test', async (req, res) => {
  try {
    console.log('🧪 Testing FTN connection...');
    
    // Test authentication
    const status = ftnAuthServer.getStatus();
    console.log('FTN Status:', status);
    
    // Try to fetch some data
    const injuries = await ftnAuthServer.getPlayerInjuries();
    
    res.json({
      success: true,
      message: `FTN test successful - retrieved ${injuries.length} injury reports`,
      data: {
        authStatus: status,
        sampleData: injuries.slice(0, 3) // First 3 records
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
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
  
  // Log configuration status
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

export default app;