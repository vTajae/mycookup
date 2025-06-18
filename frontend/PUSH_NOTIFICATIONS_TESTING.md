# Push Notifications Testing Guide

This guide provides comprehensive instructions for testing the OneSignal push notification integration in your MyCookup Preact mobile PWA.

## Overview

The OneSignal integration supports push notifications across three platforms:
- **Web Browsers** (Chrome, Firefox, Safari, Edge)
- **Android** (Native app via Capacitor)
- **iOS** (Native app via Capacitor)

## OneSignal Configuration

- **App ID**: `4c4b3ed8-be86-458c-9e40-f5265af7714e`
- **API Key**: `os_v2_app_jrft5wf6qzcyzhsa6utfv53rjzomckx4yxlenpfi6pg6ddd2wg4z6cdobnptacv7sstu74wzcxv74s7gqdnvg2s27euuk56wounajsi`

## Testing Interface

The app includes a dedicated testing interface accessible at `/notifications` route:

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the notifications page**:
   - Open your browser to `http://localhost:5173`
   - Click "🔔 Test Notifications" button on the home page
   - Or directly navigate to `http://localhost:5173/notifications`

## Platform-Specific Testing

### 1. Web Browser Testing

#### Prerequisites
- Modern browser (Chrome 50+, Firefox 44+, Safari 16+, Edge 17+)
- HTTPS connection (required for push notifications)
- Service worker support

#### Testing Steps

1. **Development Testing**:
   ```bash
   npm run dev
   ```
   - Navigate to `http://localhost:5173/notifications`
   - The app allows localhost for development testing

2. **Production Testing**:
   ```bash
   npm run build
   npm run serve:local
   ```
   - Navigate to `http://localhost:3000/notifications`
   - Or deploy to a HTTPS domain

3. **Test Notification Registration**:
   - Click "Subscribe to Notifications" button
   - Browser will prompt for notification permission
   - Grant permission when prompted
   - Verify subscription status shows "Subscribed to Notifications"
   - Check debug information for User ID and Push Token

4. **Test Permission States**:
   - **First Visit**: Permission should be "default"
   - **After Granting**: Permission should be "granted"
   - **If Blocked**: Permission shows "denied" with help instructions

#### Browser-Specific Notes

- **Chrome**: Full support, best testing experience
- **Firefox**: Full support, may show different permission UI
- **Safari**: Requires Safari 16+ and may need additional setup
- **Edge**: Full support on Windows 10+

### 2. Android Testing

#### Prerequisites
- Android Studio installed
- Android device or emulator (API level 21+)
- Google Play Services (for FCM)

#### Setup Steps

1. **Build and sync the Android app**:
   ```bash
   npm run cap:build
   npx cap open android
   ```

2. **Configure Firebase (if needed)**:
   - OneSignal handles FCM configuration automatically
   - No additional Firebase setup required

3. **Install on device**:
   - Build and install the APK on your Android device
   - Or run in Android emulator

#### Testing Steps

1. **Launch the app** on Android device
2. **Navigate to notifications**:
   - Tap "🔔 Test Notifications" on home screen
   - Or use the navigation menu

3. **Test notification registration**:
   - Tap "Subscribe to Notifications"
   - Android will show system permission dialog
   - Grant notification permission
   - Verify subscription status

4. **Test platform detection**:
   - Debug info should show "Platform: android"
   - "Native: Yes"
   - "Supported: Yes"

5. **Test background notifications**:
   - Subscribe to notifications
   - Put app in background
   - Send test notification from OneSignal dashboard
   - Verify notification appears in system tray

#### Android Troubleshooting

- **Permission Issues**: Check Android Settings > Apps > MyCookup > Notifications
- **FCM Issues**: Verify Google Play Services are updated
- **Debug Mode**: Use `adb logcat` to view detailed logs

### 3. iOS Testing

#### Prerequisites
- Xcode installed (macOS required)
- iOS device (iOS 10+) - **Push notifications don't work in iOS Simulator**
- Apple Developer Account (for push notification certificates)

#### Setup Steps

1. **Open iOS project**:
   ```bash
   npm run cap:build
   npx cap open ios
   ```

2. **Configure signing**:
   - Open project in Xcode
   - Select your development team
   - Configure bundle identifier

3. **Enable Push Notifications capability**:
   - In Xcode, select your app target
   - Go to "Signing & Capabilities"
   - Add "Push Notifications" capability

4. **Install on device**:
   - Connect iOS device via USB
   - Build and run from Xcode
   - **Note**: Must use physical device, not simulator

#### Testing Steps

1. **Launch the app** on iOS device
2. **Navigate to notifications**:
   - Tap "🔔 Test Notifications" on home screen

3. **Test notification registration**:
   - Tap "Subscribe to Notifications"
   - iOS will show system permission alert
   - Tap "Allow" to grant permission
   - Verify subscription status

4. **Test platform detection**:
   - Debug info should show "Platform: ios"
   - "Native: Yes"
   - "Supported: Yes"

5. **Test background notifications**:
   - Subscribe to notifications
   - Put app in background or lock device
   - Send test notification from OneSignal dashboard
   - Verify notification appears on lock screen

#### iOS Troubleshooting

- **Certificate Issues**: Ensure push notification certificates are configured in Apple Developer Console
- **Permission Issues**: Check iOS Settings > MyCookup > Notifications
- **Simulator Limitation**: Push notifications only work on physical devices

## Sending Test Notifications

### Using OneSignal Dashboard

1. **Login to OneSignal**:
   - Go to [onesignal.com](https://onesignal.com)
   - Login with your account

2. **Navigate to your app**:
   - Select app with ID: `4c4b3ed8-be86-458c-9e40-f5265af7714e`

3. **Send test notification**:
   - Go to "Messages" > "Push"
   - Click "New Push"
   - Enter title and message
   - Select "Send to Subscribed Users"
   - Click "Review & Send"

### Using OneSignal REST API

```bash
curl --include \
     --request POST \
     --header "Content-Type: application/json; charset=utf-8" \
     --header "Authorization: Basic os_v2_app_jrft5wf6qzcyzhsa6utfv53rjzomckx4yxlenpfi6pg6ddd2wg4z6cdobnptacv7sstu74wzcxv74s7gqdnvg2s27euuk56wounajsi" \
     --data-binary "{
       \"app_id\": \"4c4b3ed8-be86-458c-9e40-f5265af7714e\",
       \"included_segments\": [\"Subscribed Users\"],
       \"headings\": {\"en\": \"Test Notification\"},
       \"contents\": {\"en\": \"This is a test notification from MyCookup!\"}
     }" \
     https://onesignal.com/api/v1/notifications
```

## Testing Checklist

### Basic Functionality
- [ ] App loads without errors
- [ ] OneSignal service initializes successfully
- [ ] Platform detection works correctly
- [ ] Permission request dialog appears
- [ ] Permission status updates correctly
- [ ] Subscription/unsubscription works
- [ ] Debug information displays correctly

### Web Browser
- [ ] Works on Chrome
- [ ] Works on Firefox
- [ ] Works on Safari (if supported)
- [ ] Works on Edge
- [ ] HTTPS requirement enforced
- [ ] Service worker registers correctly

### Android
- [ ] App builds and installs successfully
- [ ] Native platform detected
- [ ] Android permission dialog appears
- [ ] FCM token generated
- [ ] Background notifications work
- [ ] Notification click opens app

### iOS
- [ ] App builds and installs on device
- [ ] Native platform detected
- [ ] iOS permission alert appears
- [ ] APNS token generated
- [ ] Background notifications work
- [ ] Notification click opens app

## Common Issues and Solutions

### Web Issues

**Issue**: "Notifications not supported"
- **Solution**: Ensure HTTPS connection and modern browser

**Issue**: "Permission denied"
- **Solution**: Clear browser data and try again, or check browser notification settings

**Issue**: "Service worker not registering"
- **Solution**: Check browser console for errors, ensure sw.js is accessible

### Android Issues

**Issue**: "No FCM token"
- **Solution**: Verify Google Play Services, check internet connection

**Issue**: "Permission dialog not appearing"
- **Solution**: Check Android version (API 21+), verify app permissions

**Issue**: "Notifications not received"
- **Solution**: Check battery optimization settings, verify app is not restricted

### iOS Issues

**Issue**: "Push notifications not working in simulator"
- **Solution**: Use physical device - simulator doesn't support push notifications

**Issue**: "No APNS token"
- **Solution**: Verify push notification capability is enabled in Xcode

**Issue**: "Certificate errors"
- **Solution**: Check Apple Developer Console push notification certificates

## Debug Information

The notification tester component provides detailed debug information:

- **Platform**: Current platform (web/android/ios)
- **Native**: Whether running in native app
- **Supported**: Whether push notifications are supported
- **Permission**: Current permission state
- **Subscribed**: Whether user is subscribed
- **User ID**: OneSignal user identifier
- **Push Token**: Platform-specific push token

## Support and Troubleshooting

If you encounter issues:

1. **Check browser console** for JavaScript errors
2. **Review debug information** in the notification tester
3. **Verify OneSignal dashboard** for subscription data
4. **Check platform-specific logs** (Android logcat, iOS console)
5. **Test on different devices/browsers** to isolate issues

For additional support, refer to:
- [OneSignal Documentation](https://documentation.onesignal.com/)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Preact Documentation](https://preactjs.com/)
