# OneSignal Push Notifications - Quick Start

## 🚀 Quick Test (5 minutes)

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Open notifications page**:
   - Go to `http://localhost:5173`
   - Click "🔔 Test Notifications"

3. **Subscribe to notifications**:
   - Click "Subscribe to Notifications"
   - Allow permission when prompted
   - Verify "Subscribed to Notifications" status

4. **Send test notification**:
   - Go to [OneSignal Dashboard](https://onesignal.com)
   - App ID: `4c4b3ed8-be86-458c-9e40-f5265af7714e`
   - Send a test message to "Subscribed Users"

## 📱 Platform Testing

### Web (Easiest)
```bash
npm run dev
# Navigate to http://localhost:5173/notifications
```

### Android
```bash
npm run cap:android
# Build and install on Android device
```

### iOS
```bash
npm run cap:ios
# Build and install on iOS device (physical device required)
```

## 🔧 Key Components

- **Service**: `src/services/oneSignalService.ts`
- **Hook**: `src/hooks/useOneSignal.ts`
- **Component**: `src/components/NotificationTester.tsx`
- **Route**: `src/routes/Notifications.tsx`

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not supported" | Use HTTPS or localhost |
| "Permission denied" | Clear browser data, try again |
| iOS not working | Use physical device, not simulator |
| Android no token | Check Google Play Services |

## 📊 Debug Info

The notification tester shows:
- Platform detection
- Permission status
- Subscription state
- User ID and push token
- Error messages

## 🔑 OneSignal Credentials

- **App ID**: `4c4b3ed8-be86-458c-9e40-f5265af7714e`
- **API Key**: `os_v2_app_jrft5wf6qzcyzhsa6utfv53rjzomckx4yxlenpfi6pg6ddd2wg4z6cdobnptacv7sstu74wzcxv74s7gqdnvg2s27euuk56wounajsi`

For detailed instructions, see `PUSH_NOTIFICATIONS_TESTING.md`.
