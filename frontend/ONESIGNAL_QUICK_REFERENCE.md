# OneSignal v16 Quick Reference

## 🚀 Quick Start

### 1. HTTPS Required
```bash
# OneSignal v16 REQUIRES HTTPS
❌ http://localhost:5173
✅ https://localhost:5173
✅ https://your-app.com
```

### 2. Test URL
```
https://your-domain.com/notifications
```

### 3. Expected Flow
1. **Initialize** → OneSignal SDK loads
2. **Request Permission** → Browser shows prompt
3. **Subscribe** → User gets ID and push token
4. **Test** → Send notification from OneSignal dashboard

## 🔧 Configuration

### OneSignal App ID
```typescript
// src/services/oneSignalService.ts
appId: '4c4b3ed8-be86-458c-9e40-f5265af7714e'
```

### Service Worker
```javascript
// public/sw.js (integrated)
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
```

## 🐛 Common Issues & Fixes

### Issue: "HTTP sites not supported"
```bash
# Solution: Use HTTPS
npm install -g mkcert
mkcert localhost
# Use https://localhost:5173
```

### Issue: "OneSignal Not Initialized"
```bash
# Check:
1. HTTPS environment ✓
2. Network connection ✓
3. Ad blockers disabled ✓
4. Browser console for errors ✓
```

### Issue: Permission Denied
```bash
# Reset browser permissions:
Chrome: Lock icon → Notifications → Allow
Firefox: Shield icon → Permissions → Notifications
Safari: Preferences → Websites → Notifications
```

### Issue: Service Worker Conflicts
```bash
# Clear browser data:
1. Open DevTools
2. Application → Storage → Clear site data
3. Refresh page
```

## 🧪 Testing Commands

### Local HTTPS Development
```bash
# Option 1: mkcert
mkcert localhost
npm run dev -- --https --cert localhost.pem --key localhost-key.pem

# Option 2: Deploy to staging
npm run build
# Deploy to Cloudflare/Netlify/Vercel
```

### Browser Testing
```bash
# Test in multiple browsers:
- Chrome (desktop/mobile)
- Firefox (desktop/mobile)  
- Safari (desktop/mobile)
- Edge (desktop)

# Test in incognito mode to avoid cache issues
```

## 📊 Debug Checklist

### Console Logs to Look For
```javascript
✅ [LOG] Initializing OneSignal service...
✅ [LOG] OneSignal v16 web initialization completed
❌ [ERROR] HTTP sites are no longer supported
❌ [ERROR] Failed to register a ServiceWorker
```

### Debug Panel Info
```
Navigate to /notifications → Scroll down
✅ SDK Version: v16
✅ Platform: web
✅ Initialized: Yes
✅ Permission: granted
✅ Subscribed: Yes
```

## 🎯 Test Scenarios

### Happy Path
1. Load `/notifications` on HTTPS
2. Click "Request Permission" → Allow
3. Click "Subscribe" → Success
4. Send test notification from OneSignal dashboard

### Error Scenarios
1. **HTTP Test**: Load on HTTP → Should show HTTPS error
2. **Permission Denied**: Block permission → Should show recovery steps
3. **Network Offline**: Disconnect → Should handle gracefully
4. **Multiple Init**: Refresh multiple times → Should prevent conflicts

## 📱 Mobile PWA Testing

### iOS
```bash
1. Open in Safari
2. Share → Add to Home Screen
3. Test notifications in PWA mode
```

### Android
```bash
1. Open in Chrome
2. Menu → Add to Home Screen
3. Test background notifications
```

## 🔗 Quick Links

- **OneSignal Dashboard**: [onesignal.com](https://onesignal.com)
- **Test Notifications**: `/notifications`
- **Debug Console**: Browser DevTools → Console
- **Service Worker**: DevTools → Application → Service Workers

## 🆘 Emergency Fixes

### Complete Reset
```bash
1. Clear browser cache and cookies
2. Disable all browser extensions
3. Test in incognito mode
4. Try different browser
5. Verify HTTPS is working
```

### Quick Verification
```bash
# Check these in order:
1. URL starts with https:// ✓
2. No console errors ✓
3. Service worker registered ✓
4. OneSignal script loaded ✓
5. Permission granted ✓
```

## 📞 Support Escalation

If all else fails:
1. Check OneSignal service status
2. Review browser compatibility
3. Test with minimal example
4. Contact OneSignal support with:
   - Browser version
   - Console errors
   - Network logs
   - OneSignal App ID
