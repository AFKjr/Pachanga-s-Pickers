# Cloudflare Tunnel Setup Guide

## Overview

Cloudflare Tunnel provides a secure way to expose your local webhook server to the internet without opening firewall ports. It's more reliable than ngrok and offers better performance.

## Quick Setup (Current Configuration)

### Step 1: Install Cloudflared
```powershell
winget install --id Cloudflare.cloudflared
```

### Step 2: Start Your Webhook Server
```powershell
npm run webhook
```

### Step 3: Create Quick Tunnel
```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3001
```

## Current Active Tunnel

**Tunnel URL**: `https://seek-considers-commerce-sunday.trycloudflare.com`

**Webhook Endpoints**:
- Health Check: `https://seek-considers-commerce-sunday.trycloudflare.com/health`
- Webhook: `https://seek-considers-commerce-sunday.trycloudflare.com/api/ftn-webhook`
- Test: `https://seek-considers-commerce-sunday.trycloudflare.com/api/ftn-test`

## Testing Your Public Webhook

### Test Health Endpoint
```bash
curl https://seek-considers-commerce-sunday.trycloudflare.com/health
```

### Test FTN Webhook
```bash
curl -X POST https://seek-considers-commerce-sunday.trycloudflare.com/api/ftn-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-OGY2NWFlMjUtMGUyYS00YjMwLWI3OWUtMDkyNzQxYjkwZmE4" \
  -d '{"dataType": "injuries", "week": "3"}'
```

## Integration with Relevance AI

Update your Relevance AI agent webhook configuration:

**Webhook URL**: `https://seek-considers-commerce-sunday.trycloudflare.com/api/ftn-webhook`

**Headers**:
```json
{
  "Content-Type": "application/json",
  "x-api-key": "sk-OGY2NWFlMjUtMGUyYS00YjMwLWI3OWUtMDkyNzQxYjkwZmE4"
}
```

**Sample Request Body**:
```json
{
  "dataType": "injuries",
  "week": "3"
}
```

## Advantages Over Ngrok

1. **No Authentication Required**: Quick tunnels work immediately
2. **Better Performance**: Cloudflare's global network
3. **More Reliable**: Enterprise-grade infrastructure
4. **Free Tier**: No limits on quick tunnels
5. **HTTPS by Default**: Automatic SSL certificates

## Production Setup (Optional)

For production use, create a named tunnel:

### 1. Create Cloudflare Account
- Sign up at [cloudflare.com](https://cloudflare.com)
- Add your domain (optional)

### 2. Authenticate
```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" login
```

### 3. Create Named Tunnel
```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel create ftn-webhook
```

### 4. Configure Tunnel
Create `config.yml`:
```yaml
tunnel: ftn-webhook
credentials-file: C:\Users\[username]\.cloudflared\[tunnel-id].json

ingress:
  - hostname: your-webhook.your-domain.com
    service: http://localhost:3001
  - service: http_status:404
```

### 5. Route Traffic
```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel route dns ftn-webhook your-webhook.your-domain.com
```

### 6. Run Named Tunnel
```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run ftn-webhook
```

## Automation Scripts

### Start Both Services (PowerShell)
```powershell
# start-webhook-tunnel.ps1
Start-Job -Name "WebhookServer" -ScriptBlock { 
    Set-Location "C:\Users\wilmc\Mobile Apps\SportsBettingForum"
    npm run webhook 
}

Start-Sleep -Seconds 3

& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3001
```

### Package.json Scripts
Add to your `package.json`:
```json
{
  "scripts": {
    "tunnel": "cloudflared tunnel --url http://localhost:3001",
    "webhook:tunnel": "concurrently \"npm run webhook\" \"npm run tunnel\""
  }
}
```

## Monitoring and Logs

### Cloudflare Dashboard
- Visit [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
- Monitor tunnel connections and traffic
- View real-time logs and analytics

### Local Metrics
- Tunnel metrics: `http://127.0.0.1:20241/metrics`
- Webhook health: `http://localhost:3001/health`

## Security Considerations

1. **API Key Protection**: Keep your Relevance API key secure
2. **HTTPS Only**: Always use HTTPS tunnel URLs
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **Access Logs**: Monitor webhook access patterns
5. **Quick Tunnels**: Remember that quick tunnels have no uptime guarantee

## Troubleshooting

### Tunnel Won't Start
- Ensure port 3001 isn't already in use
- Check firewall settings
- Verify cloudflared installation

### Webhook Not Responding
- Confirm webhook server is running on port 3001
- Test local endpoints first: `http://localhost:3001/health`
- Check webhook server logs for errors

### Connection Issues
- Quick tunnels may occasionally reset (create new URL)
- For stability, use named tunnels in production
- Monitor Cloudflare status page for service issues

## Support Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Troubleshooting Guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/troubleshooting/)
- [Community Forum](https://community.cloudflare.com/)

## Current Status

✅ **Cloudflared Installed**: Version 2025.8.1  
✅ **Webhook Server Running**: Port 3001  
✅ **Tunnel Active**: https://seek-considers-commerce-sunday.trycloudflare.com  
✅ **Ready for Relevance AI Integration**