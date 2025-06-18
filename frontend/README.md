# MyCookup - Preact Mobile PWA

A modern cooking app built with Preact, Capacitor, and OneSignal push notifications.

## Features

- 🚀 Preact with TypeScript
- 📱 Capacitor for native mobile app functionality
- 📸 Camera integration for food photography
- 🔔 OneSignal push notifications (Web, Android, iOS)
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🎉 TailwindCSS for styling
- 🌐 PWA support with service worker
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Push Notifications

This app includes **OneSignal v16** push notification integration with comprehensive error handling:

- **Test Interface**: Navigate to `/notifications` to test push notification registration
- **Supported Platforms**: Web browsers (HTTPS required), Android, and iOS native apps
- **Documentation**:
  - 📖 **[Complete Testing Guide](ONESIGNAL_TESTING_GUIDE.md)** - Comprehensive testing instructions
  - ⚡ **[Quick Reference](ONESIGNAL_QUICK_REFERENCE.md)** - Quick commands and fixes
  - 🔧 **[Troubleshooting](ONESIGNAL_TROUBLESHOOTING.md)** - Diagnostic flowchart and solutions

### 🚨 Important: HTTPS Required
OneSignal v16 requires HTTPS. For development:
```bash
# Option 1: Local HTTPS with mkcert
npm install -g mkcert
mkcert localhost
npm run dev -- --https --cert localhost.pem --key localhost-key.pem

# Option 2: Deploy to staging environment
npm run build && npm run deploy
```

### Quick Test
```bash
# For HTTPS development
npm run dev:https  # (if configured)
# Navigate to https://localhost:5173/notifications
# Click "Request Permission" → "Subscribe" and test functionality
```

## Mobile App Development

### Android
```bash
npm run cap:android  # Opens Android Studio
```

### iOS
```bash
npm run cap:ios      # Opens Xcode
```

### Build and Sync
```bash
npm run cap:build    # Build web assets and sync to native platforms
```

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
