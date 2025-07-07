# WebSocket Logging - Quick Reference

## 🚀 Quick Commands

### Deployment
```bash
npm run deploy:websocket:dev      # Deploy development worker
npm run deploy:websocket:prod     # Deploy production worker
npm run deploy:websocket:local    # Start local worker
```

### Configuration
```bash
npm run update:websocket-urls     # Update URLs interactively
npm run validate:websocket        # Validate configuration
```

### Debug Console
```bash
npm run debug:console:dev         # Development environment
npm run debug:console:local       # Local environment
npm run debug:console             # Default (development)
```

## 🔧 Browser Console Commands

### WebSocket Logger
```javascript
wsLogger.status()                 // Check connection status
wsLogger.connect()                // Manual connect
wsLogger.disconnect()             // Disconnect
wsLogger.test()                   // Send test messages
wsLogger.enable()                 // Enable for session
wsLogger.disable()                // Disable logging
```

### Unified Logger
```javascript
unifiedLogger.test()              // Test all systems
unifiedLogger.status()            // System status
unifiedLogger.debug()             // Debug info
```

### Logging Debug
```javascript
loggingDebug.status()             // All systems status
loggingDebug.test()               // Test all systems
loggingDebug.emergency('msg')     // Emergency log
loggingDebug.sw.error('msg')      // Service worker error
loggingDebug.push.info('msg')     // Push notification info
```

## 📱 iOS PWA Testing

### Enable Logging
```javascript
// Method 1: Browser console
wsLogger.enable()
location.reload()

// Method 2: URL parameter
https://your-app.com/?debug

// Method 3: localStorage
localStorage.setItem('enableWebSocketLogging', 'true')
location.reload()
```

### Test Scenarios
```javascript
// Service Worker
navigator.serviceWorker.register('/sw.js')

// Push Notifications
Notification.requestPermission()

// Camera Access
navigator.mediaDevices.getUserMedia({ video: true })

// Network Request
fetch('/api/test')
```

## 🛠️ Worker Management

### Wrangler Commands
```bash
npx wrangler list                 # List workers
npx wrangler tail worker-name     # View logs
npx wrangler whoami               # Check auth
npx wrangler auth login           # Login
```

### Health Checks
```bash
# Test worker health
curl https://worker-url/health

# Test worker status
curl https://worker-url/status

# Test WebSocket (requires wscat)
wscat -c wss://worker-url/ws
```

## 🔍 Troubleshooting

### Common Issues
| Issue | Solution |
|-------|----------|
| Connection failed | Check worker URL, verify deployment |
| No logs appearing | Enable logging: `wsLogger.enable()` |
| Worker not found | Deploy: `npm run deploy:websocket:dev` |
| Config errors | Update: `npm run update:websocket-urls` |

### Debug Steps
1. Check worker deployment: `npx wrangler list`
2. Test health endpoint: `curl https://worker-url/health`
3. Validate config: `npm run validate:websocket`
4. Check connection: `wsLogger.status()`
5. Test logging: `wsLogger.test()`

## 📊 URLs and Endpoints

### Development
- Worker: `https://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev`
- WebSocket: `wss://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev/ws`
- Health: `https://mycookup-websocket-logger-dev.YOUR-SUBDOMAIN.workers.dev/health`

### Production
- Worker: `https://mycookup-websocket-logger.YOUR-SUBDOMAIN.workers.dev`
- WebSocket: `wss://mycookup-websocket-logger.YOUR-SUBDOMAIN.workers.dev/ws`
- Health: `https://mycookup-websocket-logger.YOUR-SUBDOMAIN.workers.dev/health`

### Local
- Worker: `http://localhost:8787`
- WebSocket: `ws://localhost:8787/ws`
- Health: `http://localhost:8787/health`

## 🎯 Log Levels

| Level | When to Use | WebSocket | Console |
|-------|-------------|-----------|---------|
| `debug` | Development info | Dev only | Always |
| `info` | General info | Important only | Always |
| `warn` | Warnings | Always | Always |
| `error` | Errors | Always | Always |
| `critical` | Critical errors | Always | Always |

## 📁 Configuration Files

| File | Purpose |
|------|---------|
| `src/services/webSocketLoggerConfig.ts` | Client configuration |
| `debug-console.html` | HTML console default URL |
| `debug-console.js` | Node.js console default URL |
| `package.json` | NPM script URLs |
| `wrangler-websocket.toml` | Worker deployment config |

## 🔄 Development Workflow

### Local Development
```bash
# Terminal 1: Local worker
npm run deploy:websocket:local

# Terminal 2: Debug console  
npm run debug:console:local

# Terminal 3: Your app
npm run dev
```

### Remote Testing
```bash
# Deploy worker
npm run deploy:websocket:dev

# Update config
npm run update:websocket-urls

# Start debug console
npm run debug:console:dev

# Test on device
# Enable: wsLogger.enable()
```

## 🚨 Emergency Commands

### Quick Reset
```bash
# Redeploy everything
npm run deploy:websocket:dev
npm run update:websocket-urls
npm run debug:console:dev
```

### Force Enable Logging
```javascript
// In PWA console
localStorage.setItem('enableWebSocketLogging', 'true')
wsLogger.enable()
location.reload()
```

### Emergency Logging
```javascript
// Critical error logging
unifiedLogger.emergency('Critical issue', { error: 'details' })
loggingDebug.emergency('Emergency message')
```

## 📞 Support

### Check Status
```bash
npm run validate:websocket        # Validate config
npx wrangler tail worker-name     # View worker logs
curl https://worker-url/health    # Test health
```

### Get Help
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- WebSocket API: https://developers.cloudflare.com/workers/runtime-apis/websockets/
- Community: https://community.cloudflare.com/

---

**💡 Tip**: Bookmark this page for quick reference during development!
