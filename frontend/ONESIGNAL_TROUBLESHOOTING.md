# OneSignal v16 Troubleshooting Flowchart

## 🔍 Diagnostic Flow

### Step 1: Environment Check
```
Is your site running on HTTPS?
├── YES → Continue to Step 2
└── NO → ❌ STOP: OneSignal v16 requires HTTPS
    └── Solutions:
        ├── Deploy to HTTPS hosting (Cloudflare, Netlify, Vercel)
        ├── Use mkcert for local HTTPS development
        └── Test on staging environment
```

### Step 2: Browser Compatibility
```
Is your browser supported?
├── Chrome 50+ → ✅ Supported
├── Firefox 44+ → ✅ Supported  
├── Safari 16+ → ✅ Supported
├── Edge 17+ → ✅ Supported
└── Internet Explorer → ❌ Not supported
    └── Solution: Use a modern browser
```

### Step 3: Console Error Analysis
```
Check browser console for errors:

"HTTP sites are no longer supported"
└── Solution: Switch to HTTPS environment

"Failed to register a ServiceWorker"
├── Check service worker file exists at /sw.js
├── Verify service worker contains OneSignal import
└── Clear browser cache and reload

"The OneSignal web SDK can only be initialized once"
├── Refresh the page
├── Clear browser cache
└── Avoid multiple initialization calls

"Notification permission denied"
├── Reset browser permissions
├── Try incognito mode
└── Check browser notification settings
```

### Step 4: Initialization Status
```
Navigate to /notifications page:

Shows "OneSignal Not Initialized"?
├── YES → Check initialization errors
│   ├── Network connectivity issues?
│   ├── Ad blockers interfering?
│   ├── Service worker conflicts?
│   └── OneSignal script loading failures?
└── NO → Continue to Step 5
```

### Step 5: Permission Flow
```
Click "Request Permission":

Browser shows native prompt?
├── YES → User grants permission?
│   ├── YES → Continue to Step 6
│   └── NO → Shows recovery instructions?
│       ├── YES → Follow browser-specific steps
│       └── NO → Check error handling implementation
└── NO → Permission already decided?
    ├── Check browser address bar for notification icon
    ├── Reset site permissions
    └── Try incognito mode
```

### Step 6: Subscription Flow
```
Click "Subscribe":

Subscription successful?
├── YES → User ID and push token generated?
│   ├── YES → ✅ Success! Test notifications
│   └── NO → Check OneSignal configuration
└── NO → Check error message
    ├── Network issues → Check connectivity
    ├── Permission issues → Verify permission granted
    └── Configuration issues → Verify App ID
```

## 🛠️ Specific Error Solutions

### Error: "OneSignal Not Initialized"

#### Diagnostic Steps:
1. **Check HTTPS**: Ensure URL starts with `https://`
2. **Check Console**: Look for initialization errors
3. **Check Network**: Verify OneSignal CDN is accessible
4. **Check Ad Blockers**: Disable temporarily
5. **Check Service Worker**: Verify `/sw.js` loads correctly

#### Solutions:
```bash
# Clear browser data
1. Open DevTools → Application → Storage
2. Click "Clear site data"
3. Refresh page

# Reset service worker
1. DevTools → Application → Service Workers
2. Click "Unregister" for your domain
3. Refresh page

# Test in incognito mode
1. Open incognito/private window
2. Navigate to your site
3. Test functionality
```

### Error: "Permission Denied"

#### Browser-Specific Reset Instructions:

**Chrome:**
```
1. Click lock icon in address bar
2. Click "Notifications"
3. Select "Allow"
4. Refresh page
```

**Firefox:**
```
1. Click shield icon in address bar
2. Click "Permissions"
3. Find "Notifications"
4. Select "Allow"
5. Refresh page
```

**Safari:**
```
1. Safari → Preferences
2. Click "Websites" tab
3. Select "Notifications"
4. Find your site
5. Select "Allow"
6. Refresh page
```

**Edge:**
```
1. Click lock icon in address bar
2. Click "Permissions for this site"
3. Find "Notifications"
4. Select "Allow"
5. Refresh page
```

### Error: Service Worker Issues

#### Diagnostic Commands:
```javascript
// Check service worker registration
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered service workers:', registrations);
});

// Check service worker state
navigator.serviceWorker.ready.then(registration => {
  console.log('Service worker ready:', registration);
});
```

#### Solutions:
```bash
# Unregister all service workers
1. DevTools → Application → Service Workers
2. Click "Unregister" for each worker
3. Refresh page

# Clear cache
1. DevTools → Application → Storage
2. Select "Cache storage"
3. Delete all caches
4. Refresh page
```

## 🔧 Advanced Debugging

### Network Analysis
```bash
# Check OneSignal API calls
1. DevTools → Network tab
2. Filter by "onesignal"
3. Look for failed requests
4. Check response codes and errors
```

### Service Worker Debugging
```bash
# Inspect service worker
1. DevTools → Application → Service Workers
2. Click "Inspect" next to your service worker
3. Check console for errors
4. Verify OneSignal import is working
```

### Local Storage Inspection
```bash
# Check OneSignal data
1. DevTools → Application → Local Storage
2. Look for OneSignal-related keys
3. Check for corruption or missing data
4. Clear if necessary
```

## 🚨 Emergency Recovery

### Complete Reset Procedure
```bash
1. Close all browser tabs for your site
2. Clear all site data:
   - Cookies
   - Local storage
   - Session storage
   - Cache storage
   - Service workers
3. Disable browser extensions
4. Test in incognito mode
5. If still failing, try different browser
```

### Fallback Testing
```bash
# Test with minimal setup
1. Create simple HTML page with OneSignal
2. Host on HTTPS
3. Test basic initialization
4. Compare with your implementation
```

## 📊 Health Check Commands

### Quick Verification Script
```javascript
// Run in browser console
console.log('HTTPS:', location.protocol === 'https:');
console.log('Notifications API:', 'Notification' in window);
console.log('Service Worker:', 'serviceWorker' in navigator);
console.log('Push Manager:', 'PushManager' in window);
console.log('Permission:', Notification.permission);
```

### OneSignal Status Check
```javascript
// Check OneSignal initialization
if (window.OneSignal) {
  console.log('OneSignal loaded:', !!window.OneSignal);
  // Add more checks as needed
} else {
  console.log('OneSignal not loaded');
}
```

## 📞 When to Escalate

Contact support when:
- ✅ HTTPS is confirmed working
- ✅ Browser is supported and up-to-date
- ✅ All troubleshooting steps completed
- ✅ Issue persists across multiple browsers
- ✅ Console errors are documented
- ✅ Network logs are captured

Include in support request:
- Browser version and OS
- Complete console error logs
- Network request/response logs
- Steps to reproduce
- OneSignal App ID
- Site URL (if publicly accessible)
