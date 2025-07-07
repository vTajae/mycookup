# iOS PWA WebSocket Logging - Testing Guide

Complete guide for testing the WebSocket logging system on iOS devices in PWA standalone mode.

## 🎯 Testing Objectives

Verify that the WebSocket logging system works correctly with:
- ✅ iOS Safari browser
- ✅ iOS PWA standalone mode (home screen app)
- ✅ Capacitor native app wrapper
- ✅ Real-time log streaming from iOS to development machine
- ✅ Service worker registration and push notification debugging
- ✅ Camera API and other Capacitor plugin debugging

## 📋 Pre-Testing Checklist

### 1. Run Compatibility Tests
```bash
# Run automated compatibility tests
npm run test:ios-compatibility

# Validate configuration
npm run validate:websocket

# Check all systems
node -e "console.log('Test log for validation')"
```

### 2. Deploy and Configure
```bash
# Deploy WebSocket worker
npm run deploy:websocket:dev

# Update configuration URLs
npm run update:websocket-urls

# Start debug console
npm run debug:console:dev
```

### 3. Verify Local Setup
```bash
# Test worker health
curl https://your-worker-dev.your-subdomain.workers.dev/health

# Test WebSocket connection
# (Debug console should show "Connected" status)
```

## 📱 iOS Device Testing Procedures

### Test 1: iOS Safari Browser Testing

**Objective**: Verify WebSocket logging works in iOS Safari

**Steps**:
1. **Access PWA in Safari**:
   - Open Safari on iOS device
   - Navigate to your PWA URL
   - Ensure you're on the same network as development machine

2. **Enable WebSocket Logging**:
   ```javascript
   // In Safari console (if accessible) or add to your app temporarily
   wsLogger.enable()
   location.reload()
   ```

3. **Alternative Activation Methods**:
   - URL parameter: `https://your-pwa.com/?debug`
   - Add temporary button in your app:
     ```javascript
     // Temporary debug button
     const enableBtn = document.createElement('button');
     enableBtn.textContent = 'Enable Debug Logging';
     enableBtn.onclick = () => {
       wsLogger.enable();
       location.reload();
     };
     document.body.appendChild(enableBtn);
     ```

4. **Generate Test Logs**:
   ```javascript
   // Add these to your app temporarily for testing
   console.log('iOS Safari test log');
   console.warn('iOS Safari test warning');
   console.error('iOS Safari test error');
   ```

5. **Verify in Debug Console**:
   - Check development machine debug console
   - Should see logs with iOS device indicators (📱)
   - Verify device info shows `isIOS: true`

**Expected Results**:
- ✅ WebSocket connection established
- ✅ Logs appear in debug console with iOS indicators
- ✅ Device info correctly identifies iOS Safari

### Test 2: iOS PWA Standalone Mode Testing

**Objective**: Verify WebSocket logging works in PWA standalone mode

**Steps**:
1. **Install PWA**:
   - Open your PWA in Safari
   - Tap Share button → "Add to Home Screen"
   - Name the app and tap "Add"

2. **Launch PWA in Standalone Mode**:
   - Tap the PWA icon on home screen
   - Verify it opens without Safari UI (standalone mode)

3. **Enable WebSocket Logging**:
   - Since console access is limited, use one of these methods:
   
   **Method A: URL Parameter**
   ```
   https://your-pwa.com/?debug
   ```
   
   **Method B: localStorage (add to your app)**
   ```javascript
   // Add this button to your PWA for testing
   <button onclick="enableDebugLogging()">Enable Debug</button>
   
   function enableDebugLogging() {
     localStorage.setItem('enableWebSocketLogging', 'true');
     location.reload();
   }
   ```
   
   **Method C: Automatic Detection**
   ```javascript
   // Add to your app initialization
   if (window.location.search.includes('debug') || 
       localStorage.getItem('enableWebSocketLogging')) {
     wsLogger.enable();
   }
   ```

4. **Test PWA Features**:
   ```javascript
   // Test service worker registration
   navigator.serviceWorker.register('/sw.js')
     .then(reg => console.log('SW registered in standalone mode'))
     .catch(err => console.error('SW registration failed', err));
   
   // Test push notification permission
   Notification.requestPermission()
     .then(permission => console.log('Notification permission:', permission));
   
   // Test camera access (if using Capacitor Camera)
   navigator.mediaDevices.getUserMedia({ video: true })
     .then(stream => console.log('Camera access granted'))
     .catch(err => console.error('Camera access denied', err));
   ```

5. **Verify Standalone Mode Detection**:
   - Check debug console for device info
   - Should show `isPWA: true` and `isStandalone: true`

**Expected Results**:
- ✅ WebSocket connection works in standalone mode
- ✅ Device info shows `isPWA: true, isStandalone: true`
- ✅ Service worker and API logs appear in debug console

### Test 3: Capacitor Native App Testing

**Objective**: Verify WebSocket logging works in Capacitor native app

**Steps**:
1. **Build Capacitor App**:
   ```bash
   npm run cap:build
   npm run cap:ios
   ```

2. **Run in iOS Simulator or Device**:
   - Open Xcode project
   - Run on iOS Simulator or connected device

3. **Enable WebSocket Logging**:
   - Use same methods as PWA standalone mode
   - WebSocket logging should work in native wrapper

4. **Test Capacitor Plugins**:
   ```javascript
   // Test Capacitor Camera plugin
   import { Camera, CameraResultType } from '@capacitor/camera';
   
   Camera.getPhoto({
     quality: 90,
     allowEditing: false,
     resultType: CameraResultType.Uri
   }).then(image => {
     console.log('Capacitor camera photo taken', image);
   }).catch(err => {
     console.error('Capacitor camera error', err);
   });
   
   // Test Capacitor Push Notifications
   import { PushNotifications } from '@capacitor/push-notifications';
   
   PushNotifications.requestPermissions()
     .then(result => console.log('Push permission result:', result));
   ```

**Expected Results**:
- ✅ WebSocket logging works in native app
- ✅ Capacitor plugin logs appear in debug console
- ✅ Device info shows native app context

### Test 4: Real-World Scenario Testing

**Objective**: Test WebSocket logging with realistic iOS PWA usage

**Test Scenarios**:

1. **Service Worker Registration Issues**:
   ```javascript
   // Intentionally cause service worker issues for testing
   navigator.serviceWorker.register('/nonexistent-sw.js')
     .catch(err => console.error('Expected SW error for testing:', err));
   ```

2. **Network Connectivity Issues**:
   ```javascript
   // Test network error handling
   fetch('/api/nonexistent-endpoint')
     .catch(err => console.error('Network error test:', err));
   ```

3. **Push Notification Flow**:
   ```javascript
   // Test complete push notification setup
   async function testPushNotifications() {
     try {
       const permission = await Notification.requestPermission();
       console.log('Push permission:', permission);
       
       if (permission === 'granted') {
         const registration = await navigator.serviceWorker.ready;
         const subscription = await registration.pushManager.subscribe({
           userVisibleOnly: true,
           applicationServerKey: 'your-vapid-key'
         });
         console.log('Push subscription created:', subscription);
       }
     } catch (error) {
       console.error('Push notification setup failed:', error);
     }
   }
   ```

4. **App Lifecycle Events**:
   ```javascript
   // Test PWA lifecycle events
   document.addEventListener('visibilitychange', () => {
     console.log('PWA visibility changed:', document.visibilityState);
   });
   
   window.addEventListener('beforeinstallprompt', (e) => {
     console.log('PWA install prompt triggered');
   });
   
   window.addEventListener('appinstalled', () => {
     console.log('PWA installed successfully');
   });
   ```

## 🔍 Debugging iOS-Specific Issues

### Common iOS PWA Issues to Test

1. **Service Worker Registration Failures**
   - Test in both Safari and standalone mode
   - Verify MIME types and HTTPS requirements

2. **Push Notification Limitations**
   - iOS PWA push notifications have specific requirements
   - Test permission flow and subscription creation

3. **Camera/Media Access**
   - Test getUserMedia API in different contexts
   - Verify Capacitor Camera plugin integration

4. **Network Connectivity**
   - Test WebSocket connections on cellular vs WiFi
   - Verify reconnection logic works on iOS

### iOS-Specific WebSocket Considerations

1. **Background App Behavior**:
   ```javascript
   // Test WebSocket behavior when app goes to background
   document.addEventListener('visibilitychange', () => {
     if (document.visibilityState === 'hidden') {
       console.log('App went to background - WebSocket status:', wsLogger.status());
     } else {
       console.log('App returned to foreground - WebSocket status:', wsLogger.status());
     }
   });
   ```

2. **Network Changes**:
   ```javascript
   // Test WebSocket reconnection on network changes
   window.addEventListener('online', () => {
     console.log('Network online - WebSocket reconnecting');
   });
   
   window.addEventListener('offline', () => {
     console.log('Network offline - WebSocket disconnected');
   });
   ```

## 📊 Test Results Validation

### Success Criteria

For each test, verify:

1. **WebSocket Connection**:
   - ✅ Connection established successfully
   - ✅ Reconnection works after network issues
   - ✅ Connection survives app backgrounding/foregrounding

2. **Log Transmission**:
   - ✅ Console logs appear in debug console
   - ✅ Device info correctly identifies iOS/PWA/standalone
   - ✅ Timestamps and metadata are accurate

3. **iOS PWA Features**:
   - ✅ Service worker registration logs captured
   - ✅ Push notification permission logs captured
   - ✅ Camera/media access logs captured
   - ✅ Network error logs captured

4. **Performance**:
   - ✅ WebSocket logging doesn't impact app performance
   - ✅ Log transmission is near real-time
   - ✅ No memory leaks or connection issues

### Troubleshooting Failed Tests

**WebSocket Connection Issues**:
1. Check network connectivity between iOS device and development machine
2. Verify WebSocket worker is deployed and accessible
3. Test with different networks (WiFi vs cellular)

**No Logs Appearing**:
1. Verify WebSocket logging is enabled: `wsLogger.status()`
2. Check if logs are being generated: add test console.log statements
3. Verify debug console is connected and showing connection status

**iOS-Specific Issues**:
1. Test in both Safari and standalone mode
2. Check iOS version compatibility
3. Verify HTTPS requirements are met
4. Test with different iOS devices if available

## 📝 Test Report Template

Document your test results:

```markdown
# iOS PWA WebSocket Logging Test Report

**Date**: [Date]
**iOS Version**: [Version]
**Device**: [iPhone/iPad model]
**Network**: [WiFi/Cellular]

## Test Results

### Safari Browser Testing
- [ ] WebSocket connection: Pass/Fail
- [ ] Log transmission: Pass/Fail
- [ ] Device detection: Pass/Fail

### PWA Standalone Mode Testing
- [ ] WebSocket connection: Pass/Fail
- [ ] Standalone mode detection: Pass/Fail
- [ ] Service worker logs: Pass/Fail

### Capacitor Native App Testing
- [ ] WebSocket connection: Pass/Fail
- [ ] Capacitor plugin logs: Pass/Fail
- [ ] Native app detection: Pass/Fail

## Issues Found
[List any issues discovered]

## Recommendations
[Any recommendations for improvements]
```

## 🚀 Next Steps After Testing

1. **Document Results**: Record test outcomes and any issues found
2. **Fix Issues**: Address any compatibility problems discovered
3. **Optimize Performance**: Fine-tune based on real-world testing
4. **Deploy to Production**: Once testing is successful, deploy to production environment
5. **Monitor Usage**: Set up monitoring for production WebSocket logging usage
