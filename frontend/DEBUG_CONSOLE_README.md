# iOS PWA WebSocket Debug Console

Real-time console logging system for debugging iOS PWA applications using WebSocket-based log streaming.

## Overview

This system consists of three main components:

1. **Cloudflare Worker** - WebSocket server that receives and broadcasts logs
2. **PWA Console Interceptor** - Client-side service that captures console output
3. **Development Console Viewers** - Tools to view real-time logs from iOS devices

## Quick Start

### 1. Deploy the WebSocket Worker

```bash
# Deploy the WebSocket logger worker
npx wrangler deploy websocket-logger-worker.js --config wrangler-websocket.toml

# For development environment
npx wrangler deploy websocket-logger-worker.js --config wrangler-websocket.toml --env development
```

### 2. Enable WebSocket Logging in PWA

The WebSocket logging is automatically initialized in the PWA. To enable it:

**Option A: Automatic (Development environments)**
- Logging is automatically enabled on `localhost` and `development.*` domains

**Option B: Manual (Any environment)**
```javascript
// In browser console or PWA
wsLogger.enable();
// Then refresh the page
```

**Option C: URL Parameter**
```
https://your-pwa-url.com/?debug
```

### 3. View Real-time Logs

**HTML Debug Console (Recommended)**
```bash
# Open debug-console.html in your browser
open debug-console.html
```

**Node.js Command Line Console**
```bash
# Default development environment
npm run debug:console

# Specific environments
npm run debug:console:dev    # Development worker
npm run debug:console:local  # Local wrangler dev

# Custom WebSocket URL
node debug-console.js wss://your-worker-url.workers.dev/ws
```

## Debug Console Features

### HTML Console (`debug-console.html`)
- 🎨 **Visual Interface** - Clean, VS Code-like dark theme
- 🔍 **Real-time Filtering** - Filter by log level (log, info, warn, error, debug)
- 📱 **Device Detection** - Shows iOS, PWA, and standalone mode indicators
- 🔗 **Connection Management** - Auto-reconnect with connection status
- 📊 **Statistics** - Live connection and log counts
- 💾 **Persistent Settings** - Remembers WebSocket URL

### Node.js Console (`debug-console.js`)
- 🖥️ **Terminal Interface** - Full-featured command-line tool
- 🎨 **Colored Output** - ANSI colors for different log levels
- 📝 **Interactive Commands** - Type `help` for available commands
- 💾 **Log Export** - Save logs to JSON or text files
- 📊 **Session Statistics** - Detailed stats and filtering
- 🔄 **Auto-reconnect** - Handles connection drops gracefully

### Available Commands (Node.js Console)
```
help, h        - Show help message
status, s      - Show connection status
clear, c       - Clear console logs
connections    - Show active connections
stats          - Show session statistics
save [file]    - Save logs to file
log [file]     - Enable logging to file
filter [level] - Filter logs by level
reconnect, r   - Reconnect to WebSocket
quit, exit, q  - Exit the console
```

## Configuration

### Environment-Specific URLs

The system automatically detects the environment and uses appropriate WebSocket URLs:

- **Local Development**: `ws://localhost:8787/ws`
- **Development**: `wss://mycookup-websocket-logger-dev.your-subdomain.workers.dev/ws`
- **Production**: `wss://mycookup-websocket-logger.your-subdomain.workers.dev/ws`

### Manual Configuration

Update WebSocket URLs in:
- `src/services/webSocketLoggerConfig.ts` - Client-side configuration
- `debug-console.html` - HTML console default URL
- `debug-console.js` - Node.js console default URL

## Usage Examples

### Basic iOS PWA Debugging

1. Deploy the WebSocket worker
2. Open your PWA on iOS device
3. Enable WebSocket logging: `wsLogger.enable()` in browser console
4. Refresh the PWA
5. Open debug console: `npm run debug:console`
6. View real-time logs from your iOS device

### Testing the Connection

```javascript
// In your PWA browser console
wsLogger.test();  // Sends test messages
wsLogger.status(); // Check connection status
wsLogger.debug();  // Log comprehensive debug info
```

### Debugging Service Worker Issues

```javascript
// In your PWA
console.log('Service worker registration starting...');
navigator.serviceWorker.register('/sw.js')
  .then(reg => console.log('SW registered:', reg))
  .catch(err => console.error('SW registration failed:', err));
```

The logs will appear in real-time in your debug console.

## Troubleshooting

### WebSocket Connection Issues

1. **Check Worker Deployment**
   ```bash
   # Test worker health
   curl https://your-worker-url.workers.dev/health
   ```

2. **Verify WebSocket URL**
   - Ensure the URL in debug console matches deployed worker
   - Check for typos in subdomain names

3. **Network/Firewall Issues**
   - WebSocket connections may be blocked by corporate firewalls
   - Try different networks or use mobile hotspot

### PWA Not Sending Logs

1. **Check if Logging is Enabled**
   ```javascript
   wsLogger.status(); // Should show enabled: true, connected: true
   ```

2. **Manual Initialization**
   ```javascript
   // Force enable and reconnect
   wsLogger.enable();
   location.reload();
   ```

3. **Check Console for Errors**
   - Look for WebSocket connection errors
   - Verify worker URL is accessible

### iOS PWA Specific Issues

1. **Standalone Mode Detection**
   - Ensure PWA is added to home screen
   - Check device info in logs shows `isPWA: true`

2. **Network Connectivity**
   - iOS PWAs may have different network behavior
   - Test on both WiFi and cellular

## Development Workflow

1. **Start Local Development**
   ```bash
   # Terminal 1: Start local worker (optional)
   npx wrangler dev websocket-logger-worker.js --config wrangler-websocket.toml

   # Terminal 2: Start debug console
   npm run debug:console:local

   # Terminal 3: Start your PWA
   npm run dev
   ```

2. **Test on iOS Device**
   - Connect iOS device to same network
   - Access PWA via ngrok or local IP
   - Enable WebSocket logging
   - View logs in debug console

3. **Deploy and Test Production**
   ```bash
   # Deploy worker
   npx wrangler deploy websocket-logger-worker.js --config wrangler-websocket.toml

   # Test with production URLs
   npm run debug:console:dev
   ```

## Security Notes

- WebSocket logging should be disabled in production
- The system automatically disables in production unless explicitly enabled
- No sensitive data should be logged to console in production
- Consider using environment variables for worker URLs

## Browser Compatibility

- **WebSocket Support**: All modern browsers
- **PWA Features**: iOS 11.3+, Android Chrome 40+
- **Debug Console**: Chrome, Firefox, Safari, Edge
