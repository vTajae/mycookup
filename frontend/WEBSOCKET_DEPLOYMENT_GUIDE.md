# WebSocket Logger Deployment Guide

Complete guide for deploying and configuring the iOS PWA WebSocket logging system.

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Node.js 18+ and npm
- Access to your domain's DNS settings (optional, for custom domains)

## Quick Start

### 1. Deploy the WebSocket Worker

```bash
# Navigate to your project directory
cd frontend

# Login to Cloudflare (if not already logged in)
npx wrangler auth login

# Deploy development environment
npx wrangler deploy websocket-logger-worker.js --config wrangler-websocket.toml --env development

# Deploy production environment
npx wrangler deploy websocket-logger-worker.js --config wrangler-websocket.toml --env production
```

### 2. Update Configuration URLs

After deployment, update the WebSocket URLs in your configuration:

**File: `src/services/webSocketLoggerConfig.ts`**
```typescript
export const DEFAULT_WEBSOCKET_LOGGER_CONFIG: WebSocketLoggerEnvironmentConfig = {
  development: {
    workerUrl: 'wss://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev/ws',
    // ... other config
  },
  production: {
    workerUrl: 'wss://mycookup-websocket-logger.YOUR-SUBDOMAIN.workers.dev/ws',
    // ... other config
  }
};
```

**Replace `YOUR-SUBDOMAIN` with your actual Cloudflare Workers subdomain.**

### 3. Test the Deployment

```bash
# Test the worker health endpoint
curl https://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev/health

# Start the debug console
npm run debug:console:dev

# Enable WebSocket logging in your PWA
# In browser console: wsLogger.enable()
```

## Detailed Deployment Steps

### Step 1: Cloudflare Workers Setup

1. **Login to Cloudflare**
   ```bash
   npx wrangler auth login
   ```

2. **Verify your account**
   ```bash
   npx wrangler whoami
   ```

3. **Check available subdomains**
   ```bash
   npx wrangler subdomain list
   ```

### Step 2: Configure Worker Names

Edit `wrangler-websocket.toml` to match your preferences:

```toml
name = "your-app-websocket-logger"

[env.development]
name = "your-app-websocket-logger-dev"

[env.production]
name = "your-app-websocket-logger"
```

### Step 3: Deploy Workers

**Development Environment:**
```bash
npx wrangler deploy websocket-logger-worker.js \
  --config wrangler-websocket.toml \
  --env development
```

**Production Environment:**
```bash
npx wrangler deploy websocket-logger-worker.js \
  --config wrangler-websocket.toml \
  --env production
```

### Step 4: Verify Deployment

1. **Check worker status:**
   ```bash
   npx wrangler tail mycookup-websocket-logger-dev
   ```

2. **Test health endpoint:**
   ```bash
   curl https://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev/health
   ```

3. **Test WebSocket connection:**
   ```bash
   npm run debug:console:dev
   ```

## Configuration Updates

### Update WebSocket URLs

After deployment, you need to update the WebSocket URLs in several places:

1. **Client Configuration** (`src/services/webSocketLoggerConfig.ts`)
2. **Debug Console HTML** (`debug-console.html`)
3. **Debug Console Node.js** (`debug-console.js`)
4. **Package.json scripts** (`package.json`)

### Environment-Specific Configuration

**Development URLs:**
- Worker: `https://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev`
- WebSocket: `wss://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev/ws`

**Production URLs:**
- Worker: `https://mycookup-websocket-logger.YOUR-SUBDOMAIN.workers.dev`
- WebSocket: `wss://mycookup-websocket-logger.YOUR-SUBDOMAIN.workers.dev/ws`

## Custom Domain Setup (Optional)

### 1. Add Custom Route

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Go to Settings → Triggers
4. Add Custom Domain: `ws-logger.yourdomain.com`

### 2. Update Configuration

```typescript
// For custom domain
workerUrl: 'wss://ws-logger.yourdomain.com/ws'
```

## Security Configuration

### 1. Environment Variables

Set sensitive configuration via environment variables:

```bash
# Set environment variables
npx wrangler secret put API_KEY --env development
npx wrangler secret put ALLOWED_ORIGINS --env development
```

### 2. CORS Configuration

Update the worker to restrict origins in production:

```javascript
// In websocket-logger-worker.js
function getCORSHeaders() {
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['*'];
  return {
    'Access-Control-Allow-Origin': allowedOrigins[0] || '*',
    // ... other headers
  };
}
```

## Monitoring and Logging

### 1. Worker Analytics

Monitor your worker in Cloudflare Dashboard:
- Workers & Pages → Your Worker → Analytics
- View requests, errors, and performance metrics

### 2. Real-time Logs

```bash
# Tail worker logs
npx wrangler tail mycookup-websocket-logger-dev

# Filter for errors only
npx wrangler tail mycookup-websocket-logger-dev --format=pretty --status=error
```

### 3. Health Monitoring

Set up monitoring for your worker endpoints:
- Health: `https://your-worker.workers.dev/health`
- Status: `https://your-worker.workers.dev/status`

## Troubleshooting

### Common Issues

1. **Worker not found**
   ```bash
   # Check if worker is deployed
   npx wrangler list
   ```

2. **WebSocket connection fails**
   - Verify worker URL is correct
   - Check CORS configuration
   - Ensure WebSocket upgrade headers are present

3. **Authentication errors**
   ```bash
   # Re-authenticate
   npx wrangler auth login
   ```

### Debug Commands

```bash
# Check worker status
npx wrangler list

# View worker logs
npx wrangler tail your-worker-name

# Test worker locally
npx wrangler dev websocket-logger-worker.js --config wrangler-websocket.toml

# Check configuration
npx wrangler whoami
```

## Development Workflow

### Local Development

1. **Start local worker:**
   ```bash
   npx wrangler dev websocket-logger-worker.js --config wrangler-websocket.toml
   ```

2. **Start debug console:**
   ```bash
   npm run debug:console:local
   ```

3. **Start your PWA:**
   ```bash
   npm run dev
   ```

### Testing on iOS

1. **Deploy to development:**
   ```bash
   npx wrangler deploy websocket-logger-worker.js --config wrangler-websocket.toml --env development
   ```

2. **Update PWA configuration to use development worker**

3. **Access PWA on iOS device via ngrok or deployed URL**

4. **Enable WebSocket logging:**
   ```javascript
   // In iOS Safari console or PWA
   wsLogger.enable();
   location.reload();
   ```

5. **Monitor logs:**
   ```bash
   npm run debug:console:dev
   ```

## Production Deployment

### Pre-deployment Checklist

- [ ] Test worker in development environment
- [ ] Verify WebSocket connections work
- [ ] Test with actual iOS devices
- [ ] Update all configuration URLs
- [ ] Set up monitoring and alerts
- [ ] Configure CORS for production domains
- [ ] Set environment variables/secrets

### Deployment Steps

1. **Deploy production worker:**
   ```bash
   npx wrangler deploy websocket-logger-worker.js --config wrangler-websocket.toml --env production
   ```

2. **Update PWA configuration for production**

3. **Test production deployment**

4. **Monitor worker performance and logs**

### Post-deployment

- Monitor worker analytics in Cloudflare Dashboard
- Set up alerts for worker errors or high latency
- Regularly check worker logs for issues
- Update worker as needed for bug fixes or improvements

## Cost Considerations

Cloudflare Workers pricing (as of 2024):
- **Free tier:** 100,000 requests/day
- **Paid tier:** $5/month for 10M requests + $0.50/million additional

WebSocket connections count as requests, so monitor usage based on:
- Number of concurrent PWA users
- Frequency of log messages
- Duration of WebSocket connections

## Support and Maintenance

### Regular Maintenance

- Monitor worker performance and error rates
- Update worker code for security patches
- Review and optimize log message frequency
- Clean up old worker deployments

### Getting Help

- Cloudflare Workers Documentation: https://developers.cloudflare.com/workers/
- Cloudflare Community: https://community.cloudflare.com/
- WebSocket API Documentation: https://developers.cloudflare.com/workers/runtime-apis/websockets/
