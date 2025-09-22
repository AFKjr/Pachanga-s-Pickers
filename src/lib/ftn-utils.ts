// lib/ftn-utils.ts

import { ftnAuth } from './ftn-auth';
import { ftnDataApi } from './api/ftn-data';

/**
 * Comprehensive FTN integration utilities for testing and management
 */

export interface FTNTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export interface FTNHealthCheck {
  authStatus: 'connected' | 'expired' | 'failed' | 'not-configured';
  sessionValid: boolean;
  lastRefresh?: Date;
  expiresAt?: Date;
  testResults: {
    injuries: FTNTestResult;
    weather: FTNTestResult;
    depthCharts: FTNTestResult;
  };
}

/**
 * Test FTN authentication and basic connectivity
 */
export async function testFTNAuth(): Promise<FTNTestResult> {
  try {
    console.log('🔍 Testing FTN authentication...');
    
    const status = ftnAuth.getStatus();
    console.log('Current FTN status:', status);
    
    // Test login if not already logged in
    if (!status.isLoggedIn) {
      const loginResult = await ftnAuth.login();
      if (!loginResult.success) {
        return {
          success: false,
          message: `Authentication failed: ${loginResult.error}`,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // Verify session by fetching a simple endpoint
    const testResponse = await ftnAuth.fetchData('/nfl/weather.php');
    const isValid = testResponse.ok && !testResponse.url.includes('login');
    
    return {
      success: isValid,
      message: isValid ? 'FTN authentication successful' : 'Session verification failed',
      details: { 
        status: ftnAuth.getStatus(),
        responseStatus: testResponse.status,
        responseUrl: testResponse.url
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Authentication test failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test FTN data fetching capabilities
 */
export async function testFTNDataAccess(): Promise<{
  injuries: FTNTestResult;
  weather: FTNTestResult;
  depthCharts: FTNTestResult;
}> {
  const results = {
    injuries: await testInjuryData(),
    weather: await testWeatherData(),
    depthCharts: await testDepthChartData()
  };
  
  return results;
}

/**
 * Test injury data fetching
 */
async function testInjuryData(): Promise<FTNTestResult> {
  try {
    console.log('🏥 Testing injury data access...');
    const result = await ftnDataApi.getInjuryReport();
    
    if (!result.success) {
      return {
        success: false,
        message: `Injury data fetch failed: ${result.error}`,
        timestamp: new Date().toISOString()
      };
    }
    
    const dataLength = Array.isArray(result.data) ? result.data.length : 0;
    
    return {
      success: true,
      message: `Successfully fetched ${dataLength} injury reports`,
      details: { 
        dataCount: dataLength,
        sampleData: Array.isArray(result.data) ? result.data.slice(0, 2) : null
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Injury data test failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test weather data fetching
 */
async function testWeatherData(): Promise<FTNTestResult> {
  try {
    console.log('🌤️ Testing weather data access...');
    const result = await ftnDataApi.getWeatherData();
    
    if (!result.success) {
      return {
        success: false,
        message: `Weather data fetch failed: ${result.error}`,
        timestamp: new Date().toISOString()
      };
    }
    
    const dataLength = Array.isArray(result.data) ? result.data.length : 0;
    
    return {
      success: true,
      message: `Successfully fetched weather data for ${dataLength} games`,
      details: { 
        dataCount: dataLength,
        sampleData: Array.isArray(result.data) ? result.data.slice(0, 2) : null
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Weather data test failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test depth chart data fetching
 */
async function testDepthChartData(): Promise<FTNTestResult> {
  try {
    console.log('📊 Testing depth chart data access...');
    const result = await ftnDataApi.getDepthCharts();
    
    if (!result.success) {
      return {
        success: false,
        message: `Depth chart data fetch failed: ${result.error}`,
        timestamp: new Date().toISOString()
      };
    }
    
    const dataLength = Array.isArray(result.data) ? result.data.length : 0;
    
    return {
      success: true,
      message: `Successfully fetched depth chart data`,
      details: { 
        dataCount: dataLength,
        sampleData: Array.isArray(result.data) ? result.data.slice(0, 2) : null
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Depth chart data test failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Comprehensive health check for FTN integration
 */
export async function performFTNHealthCheck(): Promise<FTNHealthCheck> {
  console.log('🔍 Performing comprehensive FTN health check...');
  
  const status = ftnAuth.getStatus();
  const testResults = await testFTNDataAccess();
  
  let authStatus: FTNHealthCheck['authStatus'];
  
  if (!import.meta.env.VITE_FTN_EMAIL || !import.meta.env.VITE_FTN_PASSWORD) {
    authStatus = 'not-configured';
  } else if (!status.isLoggedIn) {
    authStatus = 'expired';
  } else {
    // Test if auth actually works
    const authTest = await testFTNAuth();
    authStatus = authTest.success ? 'connected' : 'failed';
  }
  
  return {
    authStatus,
    sessionValid: status.isLoggedIn,
    lastRefresh: status.lastRefreshed,
    expiresAt: status.expiresAt,
    testResults
  };
}

/**
 * Force refresh FTN session
 */
export async function refreshFTNSession(): Promise<FTNTestResult> {
  try {
    console.log('🔄 Forcing FTN session refresh...');
    
    // Logout current session
    ftnAuth.logout();
    
    // Attempt new login
    const loginResult = await ftnAuth.login();
    
    if (!loginResult.success) {
      return {
        success: false,
        message: `Session refresh failed: ${loginResult.error}`,
        timestamp: new Date().toISOString()
      };
    }
    
    // Verify new session
    const verifyResult = await testFTNAuth();
    
    return {
      success: verifyResult.success,
      message: verifyResult.success ? 'Session refreshed successfully' : 'Session refresh verification failed',
      details: verifyResult.details,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Session refresh error: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get FTN configuration status
 */
export function getFTNConfigStatus(): {
  emailConfigured: boolean;
  passwordConfigured: boolean;
  allConfigured: boolean;
  message: string;
} {
  const emailConfigured = !!(import.meta.env.VITE_FTN_EMAIL && import.meta.env.VITE_FTN_EMAIL !== 'your-ftn-email@example.com');
  const passwordConfigured = !!(import.meta.env.VITE_FTN_PASSWORD && import.meta.env.VITE_FTN_PASSWORD !== 'your-ftn-password');
  const allConfigured = emailConfigured && passwordConfigured;
  
  let message = '';
  if (!emailConfigured && !passwordConfigured) {
    message = 'FTN credentials not configured. Please set VITE_FTN_EMAIL and VITE_FTN_PASSWORD in your .env file.';
  } else if (!emailConfigured) {
    message = 'FTN email not configured. Please set VITE_FTN_EMAIL in your .env file.';
  } else if (!passwordConfigured) {
    message = 'FTN password not configured. Please set VITE_FTN_PASSWORD in your .env file.';
  } else {
    message = 'FTN credentials are configured.';
  }
  
  return {
    emailConfigured,
    passwordConfigured,
    allConfigured,
    message
  };
}

/**
 * Utility to log FTN integration status to console
 */
export async function logFTNStatus(): Promise<void> {
  console.group('🔍 FTN Integration Status');
  
  const config = getFTNConfigStatus();
  console.log('Configuration:', config);
  
  if (config.allConfigured) {
    const health = await performFTNHealthCheck();
    console.log('Health Check:', health);
  }
  
  console.groupEnd();
}