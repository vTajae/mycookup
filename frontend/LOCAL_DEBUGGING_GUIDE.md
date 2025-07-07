# 🏠 Local iOS PWA Debugging Guide

Complete guide for debugging iOS PWA applications locally with real-time WebSocket logging.

## 🚀 Quick Start

### **Option 1: One-Command Setup**
```bash
npm run debug:local
```

This starts:
- ✅ Vite development server (`http://localhost:5173`)
- ✅ Local WebSocket worker (`ws://localhost:8787/ws`)
- ✅ Ngrok tunnel (public HTTPS URL)
- ✅ Debug console ready

### **Option 2: Manual Setup**
```bash
# Terminal 1: Start development server
npm run dev

# Terminal 2: Start local WebSocket worker
npm run deploy:websocket:local

# Terminal 3: Start debug console
npm run debug:console:local

# Terminal 4: Start ngrok tunnel (optional)
npm run ngrok
```

## 📱 iPhone Connection Options

### **Option A: Local Network (Same WiFi)**
1. **Find your local IP**:
   ```bash
   ip addr show | grep 'inet 192'
   # Example output: inet 192.168.1.100/24
   ```

2. **Access from iPhone**:
   - Open Safari
   - Navigate to: `http://192.168.1.100:5173`
   - WebSocket will auto-connect to local worker

### **Option B: Ngrok Tunnel (Recommended)**
1. **Start ngrok**:
   ```bash
   npm run ngrok
   # Output: https://abc123.ngrok.io -> localhost:5173
   ```

2. **Access from iPhone**:
   - Open Safari
   - Navigate to the ngrok URL
   - Add to home screen for PWA mode
   - WebSocket logging works automatically

### **Option C: Remote Monitoring**
Monitor the deployed PWA in real-time:
```bash
# Monitor WebSocket worker logs
npx wrangler tail mycookup-websocket-logger-dev

# Monitor Cloudflare Pages deployment
npx wrangler pages deployment tail --project-name=development-mycookup
```

## 🔧 Available Commands

### **Local Debugging**
```bash
npm run debug:local          # Start all services
npm run debug:local:stop     # Stop all services
npm run debug:local:status   # Check service status
npm run debug:local:logs     # View recent logs
```

### **Debug Consoles**
```bash
npm run debug:console:local  # Local WebSocket console
npm run debug:console:dev    # Remote WebSocket console
```

### **Development Servers**
```bash
npm run dev                  # HTTP development server
npm run dev:https            # HTTPS development server
```

### **WebSocket Workers**
```bash
npm run deploy:websocket:local  # Local worker (ws://localhost:8787)
npm run deploy:websocket:dev    # Deploy to Cloudflare
```

## 📊 Monitoring & Logs

### **Real-time Monitoring**
```bash
# Local logs
tail -f vite.log              # Vite server logs
tail -f websocket.log         # WebSocket worker logs
tail -f debug-console.log     # Debug console logs

# Remote monitoring
npx wrangler tail mycookup-websocket-logger-dev  # Worker logs
npx wrangler pages deployment tail               # Pages logs
```

### **Debug Console Features**
Interactive commands in the debug console:
```
help, h        - Show help message
status, s      - Show connection status
clear, c       - Clear console logs
connections    - Show active connections
stats          - Show session statistics
save [file]    - Save logs to file
filter [level] - Filter logs by level
reconnect, r   - Reconnect to WebSocket
quit, exit, q  - Exit console
```

## 🧪 Testing Scenarios

### **Enable WebSocket Logging on iPhone**
```javascript
// Method 1: URL parameter
https://your-url/?debug

// Method 2: Browser console (if accessible)
wsLogger.enable()
location.reload()

// Method 3: Automatic (development domains)
// Auto-enabled on localhost and development domains
```

### **Test PWA Features**
```javascript
// Service Worker
navigator.serviceWorker.register('/sw.js')

// Push Notifications
Notification.requestPermission()

// Camera Access
navigator.mediaDevices.getUserMedia({ video: true })

// Network Requests
fetch('/api/test').catch(err => console.error('Network error:', err))
```

## 🔍 What You'll See

### **On iPhone**
- Normal PWA functionality
- Seamless user experience
- All features working as expected

### **On Development Machine**
Real-time logs showing:
- 📱 Device detection (iOS, PWA, Standalone)
- 🔗 WebSocket connections
- ⚙️ Service worker registration
- 📱 Push notification permissions
- 📷 Camera access requests
- 🌐 Network requests and responses
- ❌ Console errors and warnings
- 📊 Performance metrics

### **Debug Console Output Example**
```
5:00:26 PM CONNECTION ✅ Connected to WebSocket server
5:00:27 PM CONNECTION 🔗 New connection: conn_1750453199092_q1x28lyfc
5:00:28 PM LOG 📱 iOS Device detected: iPhone Safari
5:00:29 PM INFO 🔗 PWA mode: Standalone
5:00:30 PM DEBUG ⚙️ Service worker registering...
5:00:31 PM SUCCESS ✅ Service worker registered
5:00:32 PM INFO 📱 Push permission requested
5:00:33 PM SUCCESS ✅ Push permission granted
```

## 🚨 Troubleshooting

### **Connection Issues**
```bash
# Check if services are running
npm run debug:local:status

# View recent logs
npm run debug:local:logs

# Restart all services
npm run debug:local:stop
npm run debug:local
```

### **Port Conflicts**
```bash
# Check what's using ports
lsof -i :5173  # Vite server
lsof -i :8787  # WebSocket worker
lsof -i :4040  # Ngrok web interface

# Kill processes if needed
kill -9 $(lsof -t -i:5173)
```

### **Network Issues**
```bash
# Test local WebSocket connection
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:8787/ws

# Test remote WebSocket connection
curl -s https://mycookup-websocket-logger-dev.4ufood4u.workers.dev/health
```

### **iPhone Safari Issues**
1. **Clear Safari cache**: Settings > Safari > Clear History and Website Data
2. **Enable Web Inspector**: Settings > Safari > Advanced > Web Inspector
3. **Check network**: Ensure iPhone is on same WiFi or has internet access
4. **Try different URLs**: Local IP, ngrok tunnel, or deployed PWA

## 📚 Additional Resources

### **Documentation**
- `README_WEBSOCKET_LOGGING.md` - Complete system overview
- `WEBSOCKET_SETUP_GUIDE.md` - Setup instructions
- `IOS_PWA_TESTING_GUIDE.md` - iOS testing procedures
- `WEBSOCKET_QUICK_REFERENCE.md` - Quick reference

### **Testing Tools**
- `test-browser-integration.html` - Browser testing interface
- `test-websocket-logging-demo.cjs` - Command-line demo
- `validate-websocket-system.cjs` - System validation

### **Configuration Files**
- `src/services/webSocketLoggerConfig.ts` - WebSocket configuration
- `debug-console.html` - HTML debug console
- `debug-console.cjs` - Node.js debug console
- `websocket-logger-worker.js` - Cloudflare Worker

## 🎯 Best Practices

### **Development Workflow**
1. **Start local debugging**: `npm run debug:local`
2. **Test on iPhone**: Use ngrok URL or local IP
3. **Monitor logs**: Watch debug console for real-time feedback
4. **Iterate quickly**: Make changes and test immediately
5. **Deploy when ready**: `npm run deploy:pages`

### **Production Deployment**
1. **Test locally first**: Ensure everything works locally
2. **Deploy WebSocket worker**: `npm run deploy:websocket:dev`
3. **Update configuration**: `npm run update:websocket-urls`
4. **Deploy PWA**: `npm run deploy:pages`
5. **Test remotely**: Use deployed URLs for final testing

---

**🎉 Happy debugging! Your iOS PWA WebSocket logging system is ready for local development.**
