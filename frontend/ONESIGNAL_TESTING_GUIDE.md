# OneSignal Push Notifications Testing Guide

## 🎯 Overview

This guide provides comprehensive instructions for testing the OneSignal v16 push notification implementation in your Preact mobile PWA project.

## 🚨 Critical Requirements

### HTTPS Requirement
**OneSignal v16 requires HTTPS** and no longer supports HTTP sites. This is the most important requirement for testing.

- ✅ **Production**: Deploy to HTTPS environment (Cloudflare, Netlify, Vercel, etc.)
- ✅ **Development**: Use `https://localhost` or deploy to staging environment
- ❌ **HTTP**: Will fail with "HTTP sites are no longer supported" error

### Browser Support
- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Safari 16+ (macOS/iOS)
- ✅ Edge 17+
- ❌ Internet Explorer (not supported)

## 🛠️ Setup Instructions

### 1. Environment Setup

#### Option A: HTTPS Development Server
```bash
# Install mkcert for local HTTPS
npm install -g mkcert
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Update your dev server to use HTTPS
# Add to package.json scripts:
"dev:https": "vite --https --cert localhost.pem --key localhost-key.pem"
```

#### Option B: Deploy to Staging
```bash
# Deploy to Cloudflare Pages, Netlify, or Vercel
npm run build
# Follow your preferred deployment method
```

### 2. OneSignal Configuration

Verify your OneSignal configuration in `src/services/oneSignalService.ts`:

```typescript
export const ONESIGNAL_CONFIG = {
  appId: '4c4b3ed8-be86-458c-9e40-f5265af7714e', // Your App ID
  allowLocalhostAsSecureOrigin: true, // For HTTPS localhost
  serviceWorkerParam: { scope: '/' },
  serviceWorkerPath: '/sw.js', // Uses integrated service worker
};
```

## 🧪 Testing Procedures

### 1. Basic Functionality Test

#### Step 1: Navigate to Notifications Page
```
https://your-domain.com/notifications
```

#### Step 2: Check Initial State
- ✅ Page loads without errors
- ✅ Shows "OneSignal Not Initialized" if not ready
- ✅ Shows platform info (🌐 Web Push • Supported/Not Supported)

#### Step 3: Verify Initialization
- ✅ Wait for initialization to complete
- ✅ Error messages should be user-friendly
- ✅ Retry button should be available on failures

### 2. Permission Testing

#### Step 1: Request Permission
1. Click "Request Permission" button
2. Browser should show native permission prompt
3. Choose "Allow" or "Block"

#### Step 2: Verify Permission States
- **Granted**: Shows green checkmark, enables subscription
- **Denied**: Shows red X, provides recovery instructions
- **Default**: Shows yellow warning, allows retry

#### Step 3: Test Permission Recovery
1. If blocked, follow browser-specific instructions:
   - **Chrome**: Click lock icon → Notifications → Allow
   - **Firefox**: Click shield icon → Permissions → Notifications
   - **Safari**: Safari → Preferences → Websites → Notifications

### 3. Subscription Testing

#### Step 1: Subscribe to Notifications
1. Ensure permission is granted
2. Click "Subscribe" button
3. Verify subscription status updates

#### Step 2: Verify Subscription Data
- ✅ User ID is generated
- ✅ Push token is created
- ✅ Subscription status shows "Yes"

#### Step 3: Test Unsubscription
1. Click "Unsubscribe" button
2. Verify status updates to "No"
3. Test re-subscription works

### 4. Error Handling Testing

#### Test Scenarios:
1. **Network Offline**: Disconnect internet, test behavior
2. **Permission Denied**: Block notifications, verify error messages
3. **Multiple Initialization**: Refresh page multiple times
4. **Service Worker Conflicts**: Check for console errors

## 🔍 Debugging Guide

### Console Logging

Enable detailed logging by checking browser console:

```javascript
// Look for these log patterns:
[LOG] Initializing OneSignal service...
[LOG] OneSignal v16 web initialization completed
[ERROR] OneSignal v16 web initialization failed: [reason]
```

### Common Error Messages

#### 1. HTTPS Required
```
Error: HTTP sites are no longer supported starting with version 16
```
**Solution**: Deploy to HTTPS environment

#### 2. Service Worker Issues
```
Error: Failed to register a ServiceWorker
```
**Solution**: Check service worker integration in `/sw.js`

#### 3. Permission Denied
```
Error: Notification permission denied
```
**Solution**: Reset browser permissions or use incognito mode

#### 4. Multiple Initialization
```
Error: The OneSignal web SDK can only be initialized once
```
**Solution**: Refresh page or clear browser cache

### Debug Information Panel

When OneSignal is successfully initialized, you can view debug information:

1. Navigate to `/notifications`
2. Scroll to bottom of page
3. Look for "Debug Information (OneSignal v16)" section
4. Verify:
   - SDK Version: v16
   - Platform: web
   - Initialized: Yes
   - Permission: granted/denied/default
   - Subscribed: Yes/No

## 🛠️ Troubleshooting

### Issue: "OneSignal Not Initialized"

**Possible Causes:**
1. HTTP instead of HTTPS
2. Network connectivity issues
3. Ad blockers blocking OneSignal
4. Service worker conflicts

**Solutions:**
1. Switch to HTTPS environment
2. Check internet connection
3. Disable ad blockers temporarily
4. Clear browser cache and cookies
5. Try incognito/private browsing mode

### Issue: Permission Prompt Not Showing

**Possible Causes:**
1. Permission already denied
2. Browser settings blocking prompts
3. Insecure context (HTTP)

**Solutions:**
1. Reset site permissions in browser settings
2. Use incognito mode
3. Switch to HTTPS
4. Try different browser

### Issue: Subscription Fails

**Possible Causes:**
1. Network issues
2. OneSignal service problems
3. Invalid configuration

**Solutions:**
1. Check network connectivity
2. Verify OneSignal App ID
3. Check OneSignal dashboard for issues
4. Try again after a few minutes

## 📱 Mobile Testing

### iOS Safari
1. Add to Home Screen for PWA testing
2. Test both in-browser and PWA modes
3. Verify notifications work when app is closed

### Android Chrome
1. Install PWA via "Add to Home Screen"
2. Test background notifications
3. Verify notification icons and badges

## 🔧 Development Tools

### Browser DevTools
- **Console**: Check for errors and logs
- **Application**: Inspect service workers and storage
- **Network**: Monitor OneSignal API calls

### OneSignal Dashboard
- Monitor user registrations
- Send test notifications
- View delivery statistics

## ✅ Testing Checklist

### Pre-Testing
- [ ] HTTPS environment configured
- [ ] OneSignal App ID configured
- [ ] Service worker integrated
- [ ] Browser supports notifications

### Basic Functionality
- [ ] Page loads without errors
- [ ] OneSignal initializes successfully
- [ ] Error handling works correctly
- [ ] Retry functionality works

### Permission Flow
- [ ] Permission request shows native prompt
- [ ] All permission states handled correctly
- [ ] Recovery instructions provided
- [ ] Permission persistence works

### Subscription Flow
- [ ] Subscription creates user ID and token
- [ ] Unsubscription works correctly
- [ ] Status updates in real-time
- [ ] Debug information displays correctly

### Error Scenarios
- [ ] Network offline handling
- [ ] Permission denied handling
- [ ] Service worker conflicts resolved
- [ ] Multiple initialization prevented

### Cross-Browser
- [ ] Chrome desktop/mobile
- [ ] Firefox desktop/mobile
- [ ] Safari desktop/mobile
- [ ] Edge desktop

## 📞 Support

If you encounter issues not covered in this guide:

1. Check browser console for detailed error messages
2. Verify HTTPS requirement is met
3. Test in incognito mode to rule out extensions
4. Check OneSignal dashboard for service status
5. Review OneSignal v16 documentation for updates

## 🔗 Useful Links

- [OneSignal v16 Documentation](https://documentation.onesignal.com/docs/web-push-sdk)
- [Browser Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Testing Guide](https://web.dev/pwa-checklist/)
