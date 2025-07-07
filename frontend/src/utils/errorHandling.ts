/**
 * Error handling utilities for OneSignal push notifications
 */

export interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  recoveryActions: readonly string[];
  severity: 'low' | 'medium' | 'high';
}

export class OneSignalError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly recoveryActions: readonly string[];
  public readonly severity: 'low' | 'medium' | 'high';

  constructor(info: ErrorInfo) {
    super(info.message);
    this.name = 'OneSignalError';
    this.code = info.code;
    this.userMessage = info.userMessage;
    this.recoveryActions = [...info.recoveryActions]; // Create a copy to avoid readonly issues
    this.severity = info.severity;
  }
}

/**
 * Error codes and their corresponding information
 */
export const ERROR_CODES = {
  // Browser/Platform Errors
  BROWSER_NOT_SUPPORTED: {
    code: 'BROWSER_NOT_SUPPORTED',
    message: 'Browser does not support push notifications',
    userMessage: 'Your browser doesn\'t support push notifications.',
    recoveryActions: [
      'Update to a modern browser (Chrome, Firefox, Safari, Edge)',
      'Enable JavaScript if disabled',
      'Try using the app on a different device'
    ],
    severity: 'high' as const
  },

  SERVICE_WORKER_NOT_SUPPORTED: {
    code: 'SERVICE_WORKER_NOT_SUPPORTED',
    message: 'Service Worker not supported',
    userMessage: 'Your browser doesn\'t support the required features for notifications.',
    recoveryActions: [
      'Update your browser to the latest version',
      'Enable Service Workers in browser settings',
      'Try using a different browser'
    ],
    severity: 'high' as const
  },

  INSECURE_CONTEXT: {
    code: 'INSECURE_CONTEXT',
    message: 'Push notifications require HTTPS',
    userMessage: 'OneSignal v16 requires HTTPS. HTTP sites are no longer supported.',
    recoveryActions: [
      'Access the site using HTTPS (https://)',
      'For development: Enable HTTPS in your dev server',
      'Contact the site administrator if this is production',
      'Check OneSignal dashboard Web Configuration settings'
    ],
    severity: 'high' as const
  },

  // Permission Errors
  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    message: 'Notification permission denied',
    userMessage: 'Notifications are blocked for this site.',
    recoveryActions: [
      'Click the lock icon in your browser\'s address bar',
      'Change notifications from "Block" to "Allow"',
      'Refresh the page and try again',
      'Clear site data and try again'
    ],
    severity: 'medium' as const
  },

  PERMISSION_DISMISSED: {
    code: 'PERMISSION_DISMISSED',
    message: 'Permission request was dismissed',
    userMessage: 'Permission request was cancelled.',
    recoveryActions: [
      'Try requesting permission again',
      'Check browser settings for notification permissions',
      'Refresh the page if needed'
    ],
    severity: 'low' as const
  },

  // OneSignal SDK Errors
  SDK_LOAD_FAILED: {
    code: 'SDK_LOAD_FAILED',
    message: 'OneSignal SDK failed to load',
    userMessage: 'Failed to load notification service.',
    recoveryActions: [
      'Check your internet connection',
      'Refresh the page',
      'Try again in a few moments',
      'Disable ad blockers temporarily'
    ],
    severity: 'high' as const
  },

  SDK_INIT_FAILED: {
    code: 'SDK_INIT_FAILED',
    message: 'OneSignal SDK initialization failed',
    userMessage: 'Notification service failed to start.',
    recoveryActions: [
      'Refresh the page',
      'Clear browser cache and cookies',
      'Try using an incognito/private window',
      'Check if ad blockers are interfering'
    ],
    severity: 'high' as const
  },

  SDK_TIMEOUT: {
    code: 'SDK_TIMEOUT',
    message: 'OneSignal SDK initialization timeout',
    userMessage: 'Notification service is taking too long to load.',
    recoveryActions: [
      'Check your internet connection',
      'Refresh the page',
      'Try again with a better connection',
      'Contact support if the problem persists'
    ],
    severity: 'medium' as const
  },

  ONESIGNAL_V16_HTTPS_REQUIRED: {
    code: 'ONESIGNAL_V16_HTTPS_REQUIRED',
    message: 'OneSignal v16 requires HTTPS',
    userMessage: 'OneSignal v16 no longer supports HTTP sites. HTTPS is required.',
    recoveryActions: [
      'Access the site using HTTPS (https://)',
      'For development: Use "npm run dev" with HTTPS enabled',
      'Configure your development server to use HTTPS',
      'In production: Ensure your domain uses HTTPS'
    ],
    severity: 'high' as const
  },

  NETWORK_OFFLINE: {
    code: 'NETWORK_OFFLINE',
    message: 'Device is offline',
    userMessage: 'You appear to be offline. Push notifications require an internet connection.',
    recoveryActions: [
      'Check your internet connection',
      'Try connecting to Wi-Fi or mobile data',
      'Refresh the page when connection is restored',
      'Try again in a few moments'
    ],
    severity: 'medium' as const
  },

  CDN_LOAD_FAILED: {
    code: 'CDN_LOAD_FAILED',
    message: 'Failed to load OneSignal SDK from CDN',
    userMessage: 'Unable to load the notification service. This may be due to network issues or ad blockers.',
    recoveryActions: [
      'Check your internet connection',
      'Disable ad blockers or privacy extensions temporarily',
      'Try refreshing the page',
      'Check if your firewall is blocking the OneSignal CDN'
    ],
    severity: 'high' as const
  },

  SERVICE_WORKER_REGISTRATION_FAILED: {
    code: 'SERVICE_WORKER_REGISTRATION_FAILED',
    message: 'Service worker registration failed',
    userMessage: 'Failed to register the service worker required for notifications.',
    recoveryActions: [
      'Refresh the page and try again',
      'Clear your browser cache and cookies',
      'Check if service workers are enabled in your browser',
      'Try in a different browser or incognito mode'
    ],
    severity: 'high' as const
  },

  QUOTA_EXCEEDED: {
    code: 'QUOTA_EXCEEDED',
    message: 'Storage quota exceeded',
    userMessage: 'Your browser storage is full. Please free up some space.',
    recoveryActions: [
      'Clear browser data and cache',
      'Close unnecessary tabs',
      'Free up disk space on your device',
      'Try in incognito/private mode'
    ],
    severity: 'medium' as const
  },

  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    userMessage: 'Too many notification requests. Please wait before trying again.',
    recoveryActions: [
      'Wait a few minutes before trying again',
      'Avoid clicking buttons multiple times',
      'Refresh the page if the issue persists',
      'Contact support if this continues'
    ],
    severity: 'low' as const
  },

  INVALID_CONFIGURATION: {
    code: 'INVALID_CONFIGURATION',
    message: 'Invalid OneSignal configuration',
    userMessage: 'The notification service is not configured correctly.',
    recoveryActions: [
      'Contact the site administrator',
      'Try refreshing the page',
      'Check if you\'re on the correct domain',
      'Report this issue to support'
    ],
    severity: 'high' as const
  },

  // Subscription Errors
  SUBSCRIPTION_FAILED: {
    code: 'SUBSCRIPTION_FAILED',
    message: 'Failed to subscribe to notifications',
    userMessage: 'Could not enable notifications.',
    recoveryActions: [
      'Check notification permissions',
      'Try refreshing the page',
      'Clear browser data and try again',
      'Contact support if the issue persists'
    ],
    severity: 'medium' as const
  },

  UNSUBSCRIPTION_FAILED: {
    code: 'UNSUBSCRIPTION_FAILED',
    message: 'Failed to unsubscribe from notifications',
    userMessage: 'Could not disable notifications.',
    recoveryActions: [
      'Try again in a moment',
      'Refresh the page',
      'Manually disable in browser settings',
      'Contact support if needed'
    ],
    severity: 'low' as const
  },

  // Network Errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network connection error',
    userMessage: 'Connection problem detected.',
    recoveryActions: [
      'Check your internet connection',
      'Try again when connection is stable',
      'Refresh the page',
      'Contact support if offline functionality is needed'
    ],
    severity: 'medium' as const
  },

  // iOS Safari Web Push Specific Errors
  IOS_PWA_NOT_INSTALLED: {
    code: 'IOS_PWA_NOT_INSTALLED',
    message: 'iOS requires PWA to be installed to home screen',
    userMessage: 'iOS Safari Web Push requires the PWA to be installed to your home screen first.',
    recoveryActions: [
      'Tap the Share button in Safari',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to confirm',
      'Open the app from your home screen (not Safari)',
      'Then try subscribing to notifications'
    ],
    severity: 'high' as const
  },

  IOS_PERMISSION_DENIED_REINSTALL_REQUIRED: {
    code: 'IOS_PERMISSION_DENIED_REINSTALL_REQUIRED',
    message: 'iOS permission denied - PWA reinstall required',
    userMessage: 'iOS Safari Web Push permission was denied. The PWA must be removed and re-added to home screen.',
    recoveryActions: [
      'Remove this app from your home screen (long press → Remove App)',
      'Clear Safari cache (Settings → Safari → Clear History and Website Data)',
      'Visit the website again in Safari',
      'Add to home screen again',
      'Open from home screen and try subscribing again'
    ],
    severity: 'high' as const
  },

  IOS_NOT_OPENED_FROM_HOME_SCREEN: {
    code: 'IOS_NOT_OPENED_FROM_HOME_SCREEN',
    message: 'iOS app must be opened from home screen',
    userMessage: 'For iOS push notifications to work, you must open the app from your home screen, not from Safari.',
    recoveryActions: [
      'Close Safari',
      'Find the app icon on your home screen',
      'Tap the app icon to open it',
      'Try subscribing to notifications again'
    ],
    severity: 'high' as const
  },

  // Generic Errors
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    userMessage: 'Something went wrong.',
    recoveryActions: [
      'Try refreshing the page',
      'Clear browser cache and cookies',
      'Try using a different browser',
      'Contact support with details about what you were doing'
    ],
    severity: 'medium' as const
  }
} as const;

/**
 * Detect browser capabilities and potential issues
 */
export function detectBrowserCapabilities() {
  const capabilities = {
    hasNotificationAPI: 'Notification' in window,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasSecureContext: window.isSecureContext,
    hasPushManager: 'PushManager' in window,
    userAgent: navigator.userAgent,
    isOnline: navigator.onLine
  };

  const issues: string[] = [];

  if (!capabilities.hasNotificationAPI) {
    issues.push('Notification API not available');
  }

  if (!capabilities.hasServiceWorker) {
    issues.push('Service Worker not supported');
  }

  if (!capabilities.hasSecureContext) {
    issues.push('Insecure context (HTTPS required)');
  }

  if (!capabilities.hasPushManager) {
    issues.push('Push Manager not available');
  }

  if (!capabilities.isOnline) {
    issues.push('Device appears to be offline');
  }

  return {
    capabilities,
    issues,
    isSupported: issues.length === 0
  };
}

/**
 * Create a OneSignalError from a generic error
 */
export function createOneSignalError(error: unknown, fallbackCode: keyof typeof ERROR_CODES = 'UNKNOWN_ERROR'): OneSignalError {
  if (error instanceof OneSignalError) {
    return error;
  }

  if (error instanceof Error) {
    // Try to map common error messages to specific error codes
    const message = error.message.toLowerCase();

    // Check for OneSignal v16 specific HTTPS requirement
    if (message.includes('http sites are no longer supported') ||
        message.includes('starting with version 16')) {
      return new OneSignalError(ERROR_CODES.ONESIGNAL_V16_HTTPS_REQUIRED);
    }

    // Check for browser compatibility issues
    if (message.includes('not supported') && (message.includes('browser') || message.includes('version'))) {
      return new OneSignalError(ERROR_CODES.BROWSER_NOT_SUPPORTED);
    }

    // Check for network/connectivity issues
    if (message.includes('offline') || message.includes('no internet')) {
      return new OneSignalError(ERROR_CODES.NETWORK_OFFLINE);
    }

    if (message.includes('cdn') || message.includes('script') || message.includes('load')) {
      return new OneSignalError(ERROR_CODES.CDN_LOAD_FAILED);
    }

    // Check for storage/quota issues
    if (message.includes('quota') || message.includes('storage') || message.includes('exceeded')) {
      return new OneSignalError(ERROR_CODES.QUOTA_EXCEEDED);
    }

    // Check for rate limiting
    if (message.includes('rate') || message.includes('too many') || message.includes('limit')) {
      return new OneSignalError(ERROR_CODES.RATE_LIMITED);
    }

    // Check for configuration issues
    if (message.includes('invalid') && (message.includes('config') || message.includes('app') || message.includes('key'))) {
      return new OneSignalError(ERROR_CODES.INVALID_CONFIGURATION);
    }

    // Check for service worker issues
    if (message.includes('service worker') && message.includes('registration')) {
      return new OneSignalError(ERROR_CODES.SERVICE_WORKER_REGISTRATION_FAILED);
    }

    if (message.includes('permission') && message.includes('denied')) {
      return new OneSignalError(ERROR_CODES.PERMISSION_DENIED);
    }

    if (message.includes('network') || message.includes('fetch')) {
      return new OneSignalError(ERROR_CODES.NETWORK_ERROR);
    }

    if (message.includes('timeout')) {
      return new OneSignalError(ERROR_CODES.SDK_TIMEOUT);
    }

    if (message.includes('service worker')) {
      return new OneSignalError(ERROR_CODES.SERVICE_WORKER_NOT_SUPPORTED);
    }

    if (message.includes('https') || message.includes('secure')) {
      return new OneSignalError(ERROR_CODES.INSECURE_CONTEXT);
    }
  }

  // Fallback to the provided error code or unknown error
  return new OneSignalError(ERROR_CODES[fallbackCode]);
}

/**
 * Check if the current environment supports push notifications
 */
export function validatePushNotificationSupport(): OneSignalError | null {
  const { capabilities } = detectBrowserCapabilities();

  if (!capabilities.hasNotificationAPI) {
    return new OneSignalError(ERROR_CODES.BROWSER_NOT_SUPPORTED);
  }

  if (!capabilities.hasServiceWorker) {
    return new OneSignalError(ERROR_CODES.SERVICE_WORKER_NOT_SUPPORTED);
  }

  // Be more lenient with secure context for development
  // Allow localhost and development environments
  const isLocalhost = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('172.20.20.20') ||
                     window.location.hostname.includes('192.168.') ||
                     window.location.hostname.includes('10.0.') ||
                     window.location.protocol === 'https:';

  if (!capabilities.hasSecureContext && !isLocalhost) {
    return new OneSignalError(ERROR_CODES.INSECURE_CONTEXT);
  }

  return null;
}
