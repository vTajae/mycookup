# OneSignal v16 HTTPS Setup Guide

## 🚨 Important: HTTPS Requirement

OneSignal v16 **requires HTTPS** and no longer supports HTTP sites. This is a breaking change from previous versions.

## 🔧 Development Setup

### Automatic HTTPS (Recommended)

The project is now configured to automatically use HTTPS in development:

```bash
npm run dev
```

This will start the development server with HTTPS enabled using self-signed certificates.

### Expected URLs

- **HTTPS (Required)**: `https://172.20.20.20:5173/`
- **HTTPS Local**: `https://localhost:5173/`
- ❌ **HTTP (Not Supported)**: `http://172.20.20.20:5173/`

## 🛠️ Manual HTTPS Setup (Alternative)

If you need to set up HTTPS manually:

### Option 1: Using mkcert (Recommended for local development)

```bash
# Install mkcert
npm install -g mkcert

# Create local CA
mkcert -install

# Generate certificates
mkcert localhost 127.0.0.1 172.20.20.20

# Update vite.config.ts
server: {
  https: {
    key: './localhost+2-key.pem',
    cert: './localhost+2.pem'
  }
}
```

### Option 2: Using OpenSSL

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## 🧪 Testing OneSignal

1. **Start HTTPS Development Server**:
   ```bash
   npm run dev
   ```

2. **Access via HTTPS**:
   - Open `https://172.20.20.20:5173/notifications`
   - Accept the self-signed certificate warning

3. **Test Notification Registration**:
   - Click "Request Permission" button
   - Allow notifications when prompted
   - Click "Subscribe" to register for notifications

## 🔍 Troubleshooting

### "HTTP sites are no longer supported" Error

This error indicates you're accessing the site via HTTP. Solutions:

1. **Use HTTPS URL**: Change `http://` to `https://`
2. **Check Dev Server**: Ensure `npm run dev` is using HTTPS
3. **Browser Security**: Accept self-signed certificate warnings

### Certificate Warnings

Self-signed certificates will show security warnings. This is normal for development:

1. Click "Advanced" in the browser warning
2. Click "Proceed to [site] (unsafe)"
3. Or add the certificate to your system's trusted certificates

### OneSignal Initialization Errors

If you see "OneSignal web SDK can only be initialized once":

1. Refresh the page completely
2. Clear browser cache
3. Use the "Retry" button in the notification tester

## 📱 Production Deployment

For production deployment:

1. **Ensure HTTPS**: Your domain must use HTTPS
2. **Valid SSL Certificate**: Use a proper SSL certificate (not self-signed)
3. **OneSignal Dashboard**: Configure your domain in OneSignal dashboard
4. **Service Worker**: Ensure service worker is accessible via HTTPS

## 🔗 Useful Links

- [OneSignal v16 Documentation](https://documentation.onesignal.com/docs/web-push-sdk)
- [OneSignal Dashboard](https://app.onesignal.com/)
- [Vite HTTPS Configuration](https://vitejs.dev/config/server-options.html#server-https)
