# Ngrok Setup Guide for FTN Webhook Server

## Step 1: Get Your Ngrok Auth Token

1. Go to [ngrok.com](https://ngrok.com/) and sign up for a free account
2. Once logged in, go to the [Auth section](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Copy your auth token (it looks like: `2abc...xyz123`)

## Step 2: Configure Ngrok

Replace `YOUR_ACTUAL_TOKEN_HERE` with your real auth token:

```bash
ngrok config add-authtoken YOUR_ACTUAL_TOKEN_HERE
```

## Step 3: Start Your Services

### Terminal 1 - Start Webhook Server:
```bash
npm run webhook
```

### Terminal 2 - Start Ngrok Tunnel:
```bash
ngrok http 3001
```

## Step 4: Update Relevance AI Agent

Once ngrok is running, you'll see output like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3001
```

Update your Relevance AI agent webhook URL to:
```
https://abc123.ngrok-free.app/api/ftn-webhook
```

## Step 5: Test the Public Webhook

Test your public webhook:
```bash
curl -X POST https://abc123.ngrok-free.app/api/ftn-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-relevance-api-key" \
  -d '{"dataType": "injuries", "week": "3"}'
```

## Ngrok Dashboard

Visit the ngrok web interface at: http://localhost:4040
- View all requests to your webhook
- Inspect request/response data
- Debug webhook calls from Relevance AI

## Production Deployment Options

### Option 1: Ngrok (Development/Testing)
- Free tier: 1 tunnel, random URLs
- Paid tier: Custom domains, more tunnels

### Option 2: Cloud Hosting
- Deploy to Heroku, Railway, or similar
- Use environment variables for production
- Set up proper domain and SSL

### Option 3: VPS/Dedicated Server
- Install on your own server
- Configure reverse proxy (nginx)
- Set up SSL certificates

## Security Notes

- Keep your ngrok auth token private
- Use HTTPS URLs for production
- Monitor webhook access logs
- Rotate API keys regularly

## Troubleshooting

**Issue**: "Authentication failed"
**Solution**: Verify your auth token is correct

**Issue**: "Tunnel not found"
**Solution**: Ensure webhook server is running on port 3001

**Issue**: "Connection refused"
**Solution**: Check firewall settings and port availability