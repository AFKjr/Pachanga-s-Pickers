// lib/api/ftn-data.ts

import { ftnAuth } from '../ftn-auth';

interface FTNDataRequest {
  dataType: 'injuries' | 'depth-charts' | 'weather' | 'custom';
  week?: string;
  team?: string;
  customEndpoint?: string;
  parameters?: Record<string, string>;
}

interface FTNDataResponse {
  success: boolean;
  data?: any;
  error?: string;
  source: string;
  timestamp: string;
  cacheExpiry?: string;
}

// For Next.js API route (if applicable)
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dataType, week, team, customEndpoint }: FTNDataRequest = req.body;

  if (!dataType) {
    return res.status(400).json({ 
      error: 'dataType is required. Options: injuries, depth-charts, weather, custom' 
    });
  }

  try {
    let data;
    let cacheExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes default

    switch (dataType) {
      case 'injuries':
        console.log(`📋 Fetching injury data${week ? ` for week ${week}` : ''}`);
        data = await ftnAuth.getPlayerInjuries(week);
        cacheExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for injuries
        break;

      case 'depth-charts':
        console.log(`📊 Fetching depth charts${team ? ` for ${team}` : ''}`);
        data = await ftnAuth.getDepthCharts(team);
        cacheExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for depth charts
        break;

      case 'weather':
        console.log('🌤️ Fetching weather data');
        data = await ftnAuth.getWeatherData();
        cacheExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours for weather
        break;

      case 'custom':
        if (!customEndpoint) {
          throw new Error('customEndpoint required for custom data type');
        }
        console.log(`🔧 Fetching custom data: ${customEndpoint}`);
        const response = await ftnAuth.fetchData(customEndpoint);
        data = await response.text();
        break;

      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }

    const response: FTNDataResponse = {
      success: true,
      data,
      source: 'FTN authenticated access',
      timestamp: new Date().toISOString(),
      cacheExpiry: cacheExpiry.toISOString()
    };

    // Set cache headers
    res.setHeader('Cache-Control', `public, max-age=${Math.floor((cacheExpiry.getTime() - Date.now()) / 1000)}`);

    res.status(200).json(response);

  } catch (error: any) {
    console.error('❌ FTN data fetch failed:', error.message);

    const errorResponse: FTNDataResponse = {
      success: false,
      error: error.message,
      source: 'FTN authenticated access',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(errorResponse);
  }
}

// Alternative: Standalone function for use in other contexts
export async function getFTNData(request: FTNDataRequest): Promise<FTNDataResponse> {
  const { dataType, week, team, customEndpoint } = request;

  try {
    let data;

    switch (dataType) {
      case 'injuries':
        data = await ftnAuth.getPlayerInjuries(week);
        break;
      case 'depth-charts':
        data = await ftnAuth.getDepthCharts(team);
        break;
      case 'weather':
        data = await ftnAuth.getWeatherData();
        break;
      case 'custom':
        if (!customEndpoint) throw new Error('customEndpoint required');
        const response = await ftnAuth.fetchData(customEndpoint);
        data = await response.text();
        break;
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }

    return {
      success: true,
      data,
      source: 'FTN authenticated access',
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      source: 'FTN authenticated access',
      timestamp: new Date().toISOString()
    };
  }
}

// Utility functions for testing
export async function testFTNConnection(): Promise<boolean> {
  try {
    const status = ftnAuth.getStatus();
    console.log('FTN Status:', status);

    if (!status.isLoggedIn) {
      console.log('🔄 Testing FTN login...');
      const loginResult = await ftnAuth.login();
      return loginResult.success;
    }

    return true;
  } catch (error) {
    console.error('FTN connection test failed:', error);
    return false;
  }
}

export async function refreshFTNSession(): Promise<boolean> {
  try {
    ftnAuth.logout(); // Clear current session
    const loginResult = await ftnAuth.login();
    return loginResult.success;
  } catch (error) {
    console.error('FTN session refresh failed:', error);
    return false;
  }
}

// Client-side API functions
export const ftnDataApi = {
  async getInjuryReport(week?: string): Promise<FTNDataResponse> {
    return getFTNData({ dataType: 'injuries', week });
  },

  async getDepthCharts(team?: string): Promise<FTNDataResponse> {
    return getFTNData({ dataType: 'depth-charts', team });
  },

  async getWeatherData(): Promise<FTNDataResponse> {
    return getFTNData({ dataType: 'weather' });
  },

  async getCustomData(endpoint: string): Promise<FTNDataResponse> {
    return getFTNData({ dataType: 'custom', customEndpoint: endpoint });
  },

  async testConnection(): Promise<boolean> {
    return testFTNConnection();
  },

  async refreshSession(): Promise<boolean> {
    return refreshFTNSession();
  }
};