# iOS PWA WebSocket Logging - Complete Setup Guide

This guide walks you through setting up the complete WebSocket logging system for iOS PWA debugging.

## 🚀 Quick Setup (5 minutes)

### 1. Deploy WebSocket Worker

```bash
# Login to Cloudflare (first time only)
npx wrangler auth login

# Deploy to development environment
npm run deploy:websocket:dev

# Deploy to production environment (optional)
npm run deploy:websocket:prod
```

### 2. Update Configuration URLs

After deployment, you'll see output like:
```
Worker URL: https://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev
```

Update your configuration with your actual subdomain:

```bash
# Interactive configuration update
npm run update:websocket-urls

# Or specify subdomain directly
npm run update:websocket-urls your-actual-subdomain
```

### 3. Test the Setup

```bash
# Start debug console
npm run debug:console:dev

# In another terminal, start your PWA
npm run dev

# In your PWA browser console, enable WebSocket logging
wsLogger.enable()
location.reload()
```

You should see logs appearing in the debug console! 🎉

## 📋 Detailed Setup Instructions

### Prerequisites

- **Cloudflare Account**: Free account with Workers enabled
- **Node.js**: Version 18 or higher
- **Wrangler CLI**: Installed via npm (included in project dependencies)

### Step 1: Cloudflare Authentication

```bash
# Login to Cloudflare
npx wrangler auth login

# Verify authentication
npx wrangler whoami

# Check your subdomain
npx wrangler subdomain list
```

### Step 2: Deploy WebSocket Workers

**Development Environment:**
```bash
npm run deploy:websocket:dev
```

**Production Environment:**
```bash
npm run deploy:websocket:prod
```

**Local Development:**
```bash
npm run deploy:websocket:local
```

### Step 3: Configure URLs

After deployment, update all configuration files:

```bash
# Interactive update (recommended)
npm run update:websocket-urls

# Direct update with subdomain
node scripts/update-websocket-urls.js your-subdomain
```

This updates:
- `src/services/webSocketLoggerConfig.ts`
- `debug-console.html`
- `debug-console.js`
- `package.json` scripts

### Step 4: Test Deployment

**Test Worker Health:**
```bash
curl https://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev/health
```

**Test WebSocket Connection:**
```bash
npm run debug:console:dev
```

**Test PWA Integration:**
1. Start your PWA: `npm run dev`
2. Open browser console
3. Enable logging: `wsLogger.enable()`
4. Reload page: `location.reload()`
5. Check debug console for logs

## 🔧 Configuration Options

### Environment-Specific Settings

The system automatically configures different settings for each environment:

**Development:**
- Auto-connect enabled
- All log levels captured
- Stack traces enabled
- 3-second reconnect interval

**Production:**
- Auto-connect disabled by default
- Only warnings and errors captured
- Stack traces disabled for performance
- 10-second reconnect interval

**Local:**
- Auto-connect enabled
- All log levels captured
- 2-second reconnect interval
- Connects to `ws://localhost:8787/ws`

### Manual Configuration

Edit `src/services/webSocketLoggerConfig.ts` to customize:

```typescript
export const DEFAULT_WEBSOCKET_LOGGER_CONFIG = {
  development: {
    workerUrl: 'wss://your-worker-dev.your-subdomain.workers.dev/ws',
    autoConnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    enableStackTrace: true,
    logLevels: ['log', 'warn', 'error', 'info', 'debug']
  },
  // ... other environments
};
```

## 📱 iOS PWA Testing

### Enable WebSocket Logging

**Method 1: Browser Console**
```javascript
wsLogger.enable()
location.reload()
```

**Method 2: URL Parameter**
```
https://your-pwa-url.com/?debug
```

**Method 3: localStorage**
```javascript
localStorage.setItem('enableWebSocketLogging', 'true')
location.reload()
```

### Test on iOS Device

1. **Deploy your PWA** with updated WebSocket configuration
2. **Access PWA on iOS** (via Safari or installed PWA)
3. **Enable WebSocket logging** using one of the methods above
4. **Start debug console** on your development machine:
   ```bash
   npm run debug:console:dev
   ```
5. **Use your PWA** - logs will appear in real-time in the debug console

### Common iOS Testing Scenarios

**Service Worker Registration:**
```javascript
// This will appear in debug console
navigator.serviceWorker.register('/sw.js')
  .then(reg => console.log('SW registered:', reg))
  .catch(err => console.error('SW failed:', err))
```

**Push Notification Testing:**
```javascript
// Enable push notifications
Notification.requestPermission()
  .then(permission => console.log('Permission:', permission))
```

**Camera Access Testing:**
```javascript
// Test camera access
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('Camera access granted'))
  .catch(err => console.error('Camera access denied:', err))
```

## 🛠️ Development Workflow

### Local Development

```bash
# Terminal 1: Start local WebSocket worker
npm run deploy:websocket:local

# Terminal 2: Start debug console
npm run debug:console:local

# Terminal 3: Start your PWA
npm run dev
```

### Remote Development

```bash
# Deploy to development environment
npm run deploy:websocket:dev

# Start debug console
npm run debug:console:dev

# Deploy your PWA or use ngrok for mobile testing
```

### Production Deployment

```bash
# Deploy WebSocket worker to production
npm run deploy:websocket:prod

# Update configuration for production
npm run update:websocket-urls

# Deploy your PWA with production configuration
npm run deploy:pages
```

## 🔍 Debugging and Troubleshooting

### Check System Status

**In Browser Console:**
```javascript
// Check WebSocket logger status
wsLogger.status()

// Check all logging systems
loggingDebug.status()

// Test all systems
unifiedLogger.test()
```

**Debug Console Commands:**
```bash
# Check worker logs
npx wrangler tail mycookup-websocket-logger-dev

# Test worker health
curl https://your-worker.workers.dev/health

# Check worker status
curl https://your-worker.workers.dev/status
```

### Common Issues

**1. WebSocket Connection Failed**
- Verify worker is deployed: `npx wrangler list`
- Check worker URL is correct
- Test health endpoint
- Check CORS configuration

**2. No Logs Appearing**
- Verify WebSocket logging is enabled: `wsLogger.status()`
- Check if logs are being generated: `console.log('test')`
- Verify debug console is connected
- Check browser network tab for WebSocket connection

**3. iOS PWA Not Connecting**
- Ensure PWA is in standalone mode
- Check network connectivity
- Verify WebSocket URL is accessible from mobile network
- Test with `wsLogger.test()` in mobile browser console

### Debug Commands

```bash
# Worker management
npx wrangler list                    # List all workers
npx wrangler tail worker-name        # View worker logs
npx wrangler delete worker-name      # Delete worker

# Configuration
npm run update:websocket-urls        # Update URLs
node scripts/update-websocket-urls.js --help  # Help

# Testing
npm run debug:console:dev            # Debug console
curl https://worker-url/health       # Health check
```

## 📊 Monitoring and Maintenance

### Worker Analytics

Monitor your worker in Cloudflare Dashboard:
- **Workers & Pages** → **Your Worker** → **Analytics**
- View requests, errors, CPU time, and memory usage

### Log Management

**View Real-time Logs:**
```bash
npx wrangler tail mycookup-websocket-logger-dev
```

**Filter Logs:**
```bash
# Errors only
npx wrangler tail worker-name --status=error

# Specific time range
npx wrangler tail worker-name --since=1h
```

### Performance Monitoring

**Check Worker Performance:**
- Monitor request latency in Cloudflare Dashboard
- Watch for error rates above 1%
- Monitor memory usage and CPU time

**Optimize Log Frequency:**
- Reduce log levels in production
- Filter out noisy log messages
- Use batching for high-frequency logs

## 🔒 Security Considerations

### Production Configuration

1. **Disable Auto-connect** in production
2. **Limit Log Levels** to warnings and errors only
3. **Set CORS Origins** to your specific domains
4. **Use Environment Variables** for sensitive configuration

### Environment Variables

```bash
# Set production CORS origins
npx wrangler secret put ALLOWED_ORIGINS --env production
# Value: https://your-domain.com,https://your-pwa.com

# Set API keys if needed
npx wrangler secret put API_KEY --env production
```

## 💰 Cost Management

**Cloudflare Workers Pricing:**
- **Free Tier**: 100,000 requests/day
- **Paid Tier**: $5/month for 10M requests

**Usage Optimization:**
- Monitor request count in dashboard
- Reduce log frequency in production
- Use appropriate log levels
- Consider log sampling for high-traffic apps

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [WebSocket API Reference](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [iOS PWA Development Guide](https://developer.apple.com/documentation/webkit/safari_web_extensions)

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs**: `npx wrangler tail your-worker`
2. **Test health endpoint**: `curl https://your-worker.workers.dev/health`
3. **Verify configuration**: `npm run update:websocket-urls`
4. **Test locally**: `npm run deploy:websocket:local`
5. **Check Cloudflare status**: https://www.cloudflarestatus.com/

For additional support, refer to the Cloudflare Community forums or documentation.
