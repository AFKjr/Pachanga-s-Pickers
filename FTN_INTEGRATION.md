# FTN (Fantasy The Nerds) Integration

This module provides authenticated access to Fantasy The Nerds data for enhanced sports predictions.

## Overview

The FTN integration consists of:
- **Authentication Manager** (`lib/ftn-auth.ts`): Handles login, session management, and credential rotation
- **Data API** (`lib/api/ftn-data.ts`): Provides structured access to FTN data endpoints
- **Utilities** (`lib/ftn-utils.ts`): Testing, health checks, and management functions

## Setup

### 1. Environment Configuration

Add your FTN credentials to the `.env` file:

```bash
# FTN (Fantasy The Nerds) Authentication
VITE_FTN_EMAIL=your-ftn-email@example.com
VITE_FTN_PASSWORD=your-ftn-password
```

**Important**: Never commit your actual credentials to version control!

### 2. Available Data Sources

The integration provides access to:
- **Injury Reports**: Player injury status and updates
- **Weather Data**: Game weather conditions
- **Depth Charts**: Team depth chart information
- **Custom Endpoints**: Direct access to any FTN endpoint

### 3. Authentication Features

- **Automatic Login**: Credentials stored securely in localStorage
- **Session Rotation**: 12-hour session expiry with auto-refresh
- **Error Handling**: Graceful fallback and re-authentication
- **Session Validation**: Automatic verification of session validity

## Usage

### Basic Data Fetching

```typescript
import { ftnDataApi } from './lib/api/ftn-data';

// Get injury reports
const injuries = await ftnDataApi.getInjuryReport();
console.log('Injuries:', injuries.data);

// Get weather data
const weather = await ftnDataApi.getWeatherData();
console.log('Weather:', weather.data);

// Get depth charts for specific team
const depthCharts = await ftnDataApi.getDepthCharts('KC');
console.log('Depth Charts:', depthCharts.data);
```

### Testing and Health Checks

```typescript
import { performFTNHealthCheck, testFTNAuth, logFTNStatus } from './lib/ftn-utils';

// Quick status check
await logFTNStatus();

// Comprehensive health check
const health = await performFTNHealthCheck();
console.log('Health:', health);

// Test authentication only
const authTest = await testFTNAuth();
console.log('Auth Test:', authTest);
```

### Manual Session Management

```typescript
import { ftnAuth } from './lib/ftn-auth';

// Check current status
const status = ftnAuth.getStatus();
console.log('Logged in:', status.isLoggedIn);
console.log('Expires at:', status.expiresAt);

// Force logout
ftnAuth.logout();

// Manual login with specific credentials
const result = await ftnAuth.login('email@example.com', 'password');
console.log('Login success:', result.success);
```

## Data Structure

### Injury Reports
```typescript
{
  player: string;
  team: string;
  position: string;
  injury: string;
  status: string;
}
```

### Weather Data
```typescript
{
  game: string;
  temperature: string;
  conditions: string;
  wind: string;
}
```

### API Response Format
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  source: string;
  timestamp: string;
  cacheExpiry?: string;
}
```

## Error Handling

The integration includes comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Authentication Errors**: Clear error messages and re-login attempts
- **Data Parsing Errors**: Graceful fallback with error logging
- **Session Expiry**: Automatic detection and re-authentication

## Security Features

- **Credential Storage**: Encrypted storage in localStorage
- **Session Validation**: Regular verification of session validity
- **Error Logging**: Detailed logging without exposing credentials
- **CORS Handling**: Proper headers for cross-origin requests

## Troubleshooting

### Common Issues

1. **"FTN credentials not provided"**
   - Check that `VITE_FTN_EMAIL` and `VITE_FTN_PASSWORD` are set in `.env`
   - Ensure credentials are not placeholder values

2. **"Login successful but session verification failed"**
   - FTN may have changed their authentication flow
   - Check if your account has the necessary access permissions

3. **"Session expired" errors**
   - Sessions automatically refresh, but network issues can cause failures
   - Use `refreshFTNSession()` to manually refresh

### Debug Mode

Enable detailed logging by setting:
```typescript
// In your component or testing code
import { logFTNStatus } from './lib/ftn-utils';
await logFTNStatus(); // Logs comprehensive status information
```

## Integration with AI Agent

The FTN data can be integrated with your AI prediction agent:

```typescript
// Example: Include weather data in predictions
const weatherData = await ftnDataApi.getWeatherData();
const injuryData = await ftnDataApi.getInjuryReport();

// Pass to your AI agent for enhanced predictions
const enhancedPrediction = await aiAgent.predict({
  gameData: gameInfo,
  weather: weatherData.data,
  injuries: injuryData.data
});
```

## Caching Strategy

Data is cached based on update frequency:
- **Injury Reports**: 1 hour cache
- **Weather Data**: 6 hour cache  
- **Depth Charts**: 24 hour cache
- **Custom Data**: 30 minute cache (default)

## Rate Limiting

The integration respects FTN's rate limits:
- Maximum 1 request per second
- Automatic retry with exponential backoff
- Session reuse to minimize login requests

## Support

For issues with the FTN integration:
1. Check the console for detailed error messages
2. Use the health check utilities to diagnose problems
3. Verify credentials and account access
4. Review FTN's website for any service changes