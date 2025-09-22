# FTN Webhook Server Setup

## Overview

The FTN Webhook Server provides a secure API endpoint for Relevance AI agents to access Fantasy The Nerds (FTN) data. This server handles authentication, session management, and data retrieval from FTN's protected endpoints.

## Quick Start

### 1. Environment Configuration

Ensure your `.env` file contains:

```bash
# FTN Authentication
VITE_FTN_EMAIL=your-ftn-email@example.com
VITE_FTN_PASSWORD=your-ftn-password

# Webhook Security
RELEVANCE_API_KEY=your-relevance-api-key-here
WEBHOOK_PORT=3001
```

### 2. Start the Webhook Server

```bash
# Development mode (with auto-restart)
npm run webhook:dev

# Production mode
npm run webhook
```

### 3. Server Endpoints

Once running on port 3001:

- **Health Check**: `GET http://localhost:3001/health`
- **Webhook Endpoint**: `POST http://localhost:3001/api/ftn-webhook`
- **Test Endpoint**: `POST http://localhost:3001/api/ftn-test`

## Webhook API Reference

### Authentication

All webhook requests require authentication via the `x-api-key` header:

```bash
curl -X POST http://localhost:3001/api/ftn-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-relevance-api-key-here" \
  -d '{"dataType": "injuries"}'
```

### Supported Data Types

#### 1. Injury Reports

**Request:**
```json
{
  "dataType": "injuries",
  "week": "3" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "player": "Player Name",
      "team": "KC",
      "position": "QB",
      "injury": "Ankle",
      "status": "Questionable"
    }
  ],
  "message": "Retrieved 45 injury reports from FTN",
  "timestamp": "2025-09-22T13:30:00.000Z",
  "source": "FTN authenticated access"
}
```

#### 2. Future Data Types (Coming Soon)

- **Depth Charts**: `{"dataType": "depth-charts", "team": "KC"}`
- **Weather Data**: `{"dataType": "weather"}`
- **Custom Endpoints**: `{"dataType": "custom", "customEndpoint": "/nfl/..."}`

## Integration with Relevance AI

### Webhook Configuration

In your Relevance AI agent, configure the webhook as follows:

**Webhook URL**: `http://your-server:3001/api/ftn-webhook`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-api-key": "your-relevance-api-key-here"
}
```

**Request Body**:
```json
{
  "dataType": "injuries",
  "week": "{{week_number}}"
}
```

### Sample Agent Usage

```javascript
// In your Relevance AI agent
const ftnData = await webhook({
  url: "http://localhost:3001/api/ftn-webhook",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.RELEVANCE_API_KEY
  },
  body: {
    dataType: "injuries",
    week: "3"
  }
});

if (ftnData.success) {
  const injuries = ftnData.data;
  // Process injury data for predictions
  console.log(`Found ${injuries.length} injury reports`);
} else {
  console.log("FTN data unavailable:", ftnData.error);
}
```

## Error Handling

### Common Error Responses

#### Unauthorized Access
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

#### Missing Parameters
```json
{
  "error": "Bad Request",
  "message": "dataType is required. Options: injuries, depth-charts, weather"
}
```

#### FTN Connection Issues
```json
{
  "success": false,
  "error": "FTN login failed: Invalid credentials",
  "message": "FTN data unavailable - check credentials and connection",
  "timestamp": "2025-09-22T13:30:00.000Z"
}
```

## Testing

### Health Check

```bash
curl http://localhost:3001/health
```

### Test FTN Connection

```bash
curl -X POST http://localhost:3001/api/ftn-test \
  -H "Content-Type: application/json"
```

### Test Webhook with Auth

```bash
curl -X POST http://localhost:3001/api/ftn-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"dataType": "injuries"}'
```

### Automated Testing

Run the test suite:
```bash
node test-webhook.js
```

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run webhook:dev
```

### Local Development with Ngrok (External Access)

For testing with external services like Relevance AI:

1. **Get ngrok auth token**: Visit [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
2. **Configure ngrok**: `ngrok config add-authtoken YOUR_ACTUAL_TOKEN`
3. **Start webhook server**: `npm run webhook`
4. **Start ngrok tunnel**: `ngrok http 3001`
5. **Update agent URL**: Use the ngrok HTTPS URL in your Relevance AI agent

See `NGROK_SETUP.md` for detailed ngrok configuration instructions.

### Production Deployment

```bash
# Start production server
npm run webhook

# Or with PM2 for process management
pm2 start webhook-server.js --name "ftn-webhook"
```

### Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "run", "webhook"]
```

## Security Considerations

1. **API Key Protection**: Never expose `RELEVANCE_API_KEY` in client-side code
2. **Environment Variables**: Keep `.env` files out of version control
3. **Network Security**: Use HTTPS in production environments
4. **Rate Limiting**: Consider implementing rate limiting for production use
5. **Access Logs**: Monitor webhook access for unauthorized attempts

## Troubleshooting

### Server Won't Start

1. Check that port 3001 is available
2. Verify all dependencies are installed: `npm install`
3. Ensure `.env` file exists with required variables

### Authentication Failures

1. Verify FTN credentials are correct
2. Check that FTN account has necessary permissions
3. Review console logs for detailed error messages

### Data Retrieval Issues

1. Check FTN website availability
2. Verify session hasn't expired (12-hour limit)
3. Review HTML parsing logic if FTN changes their structure

### Connection Timeouts

1. Check network connectivity to FTN
2. Verify firewall settings allow outbound HTTPS
3. Consider increasing timeout values for slow connections

## Monitoring

### Server Logs

The webhook server provides detailed logging:

```
🚀 FTN Webhook Server running on port 3001
🔑 Attempting FTN login (server-side)...
✅ FTN login successful (server-side)
📊 Retrieved 45 injury reports (server-side)
🔗 Webhook request: injuries (week 3)
✅ Retrieved 45 injury reports from FTN
```

### Health Monitoring

Set up automated health checks:

```bash
# Simple health check script
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)
if [ $response != "200" ]; then
  echo "Webhook server is down"
  # Send alert or restart service
fi
```

## Support

For issues with the FTN webhook integration:

1. Check the console logs for detailed error messages
2. Verify FTN credentials and account status
3. Test the health and test endpoints
4. Review the FTN website for any service changes