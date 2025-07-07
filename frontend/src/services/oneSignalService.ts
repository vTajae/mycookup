import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { createOneSignalError, validatePushNotificationSupport, ERROR_CODES, OneSignalError, detectBrowserCapabilities } from '../utils/errorHandling';
import { debugLogger } from './debugLogger';

// Type declarations for OneSignal v16
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
  }
}

// OneSignal Configuration for v16 SDK
export const ONESIGNAL_CONFIG = {
  appId: '4c4b3ed8-be86-458c-9e40-f5265af7714e',
  // Allow localhostAsSecureOrigin for development
  allowLocalhostAsSecureOrigin: true,
  // Let OneSignal handle service worker registration automatically
  // serviceWorkerParam: { scope: '/' },
  // serviceWorkerPath: '/sw.js', // Let OneSignal use its default service worker
  // Enable debug logging in development
  debugLogLevel: import.meta.env.DEV ? 'trace' : 'error',
} as const;

export interface NotificationPermissionState {
  permission: 'default' | 'granted' | 'denied';
  isSupported: boolean;
  isNative: boolean;
}

export interface OneSignalUser {
  userId?: string;
  pushToken?: string;
  subscribed: boolean;
  // Additional v16 user properties
  externalId?: string;
  tags?: Record<string, string>;
}

export class OneSignalService {
  private static instance: OneSignalService;
  private initialized = false;
  private initializing = false; // Guard against multiple initialization attempts
  private initializationAttempted = false; // Track if initialization was ever attempted
  private isNative = false;
  private oneSignal: any = null; // Will hold the OneSignal instance from v16 SDK
  private networkMonitor: boolean = true; // Track network status
  private retryCount = 0; // Track retry attempts
  private maxRetries = 3; // Maximum retry attempts

  private constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.setupNetworkMonitoring();
  }

  /**
   * Enhanced detection for iOS PWA standalone mode
   * This mode requires pure Capacitor native push (no OneSignal web SDK)
   */
  private isIOSPWAStandaloneMode(): boolean {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isPWAStandalone = (window.navigator as any).standalone === true;
    const isCapacitorAvailable = Capacitor.isPluginAvailable('PushNotifications');

    // Additional checks for PWA context
    const isInWebView = window.navigator.userAgent.includes('WebView');
    const hasDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Check if we're in a true PWA standalone context (not just web view)
    const isPWAContext = isPWAStandalone || hasDisplayStandalone;

    console.log('OneSignal: Enhanced iOS PWA standalone detection', {
      isIOS,
      isPWAStandalone,
      hasDisplayStandalone,
      isPWAContext,
      isCapacitorAvailable,
      isInWebView,
      platform: Capacitor.getPlatform(),
      userAgent: navigator.userAgent
    });

    // Use pure native approach for iOS PWA standalone mode
    return isIOS && isPWAContext && isCapacitorAvailable && !isInWebView;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use isIOSPWAStandaloneMode() instead
   */
  private shouldUseCapacitorForIOSPWA(): boolean {
    return this.isIOSPWAStandaloneMode();
  }

  /**
   * Set up network monitoring for better error handling
   */
  private setupNetworkMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.networkMonitor = true;
      console.log('OneSignal: Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.networkMonitor = false;
      console.log('OneSignal: Network connection lost');
    });

    // Initial network status
    this.networkMonitor = navigator.onLine;
  }

  public static getInstance(): OneSignalService {
    if (!OneSignalService.instance) {
      OneSignalService.instance = new OneSignalService();
    }
    return OneSignalService.instance;
  }

  /**
   * Retry initialization after a failed attempt
   */
  public async retryInitialization(): Promise<boolean> {
    console.log('OneSignal: Retrying initialization...');

    // Reset state for retry
    this.initialized = false;
    this.initializing = false;
    this.retryCount++;

    if (this.retryCount > this.maxRetries) {
      throw new OneSignalError({
        ...ERROR_CODES.RATE_LIMITED,
        userMessage: 'Maximum initialization retry attempts exceeded.',
        recoveryActions: [
          'Refresh the page',
          'Clear browser cache',
          'Check internet connection',
          'Contact support if issue persists'
        ]
      });
    }

    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 2000 * this.retryCount));

    return this.initialize();
  }

  /**
   * Initialize OneSignal SDK v16 with enhanced PWA/standalone mode support
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      console.log('OneSignal already initialized');
      return true;
    }

    if (this.initializing) {
      console.log('OneSignal initialization already in progress');
      // Wait for current initialization to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.initializing) {
            clearInterval(checkInterval);
            resolve(this.initialized);
          }
        }, 100);
      });
    }

    this.initializing = true;
    this.initializationAttempted = true;

    try {
      // Enhanced environment detection
      const isTestEnvironment = navigator.userAgent.includes('HeadlessChrome') ||
                                navigator.userAgent.includes('Playwright');
      const isPWAStandalone = (window.navigator as any).standalone === true;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      console.log('OneSignal: Environment detection', {
        isTestEnvironment,
        isPWAStandalone,
        isIOS,
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      // Enhanced logging for iOS debugging
      debugLogger.info('onesignal', 'OneSignal initialization started', {
        isTestEnvironment,
        isPWAStandalone,
        isIOS,
        isNative: this.isNative,
        retryCount: this.retryCount,
        networkOnline: this.networkMonitor,
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      // Enhanced iOS PWA handling - use WEB SDK with PWA-specific configuration
      if (this.isIOSPWAStandaloneMode()) {
        console.log('OneSignal: iOS PWA standalone mode detected - using WEB SDK with PWA-specific configuration');
        await this.initializeIOSPWAWebSDK();
      } else if (isIOS && isPWAStandalone) {
        console.log('OneSignal: iOS PWA mode detected but not standalone - using enhanced web initialization');
        await this.initializeForIOSPWA();
      } else {
        // Standard initialization flow
        await this.performPreInitializationChecks(isTestEnvironment);

        if (this.isNative) {
          // Initialize native push notifications
          await this.initializeNativePush();
        } else {
          // Initialize web OneSignal v16
          await this.initializeWebOneSignal();
        }
      }

      this.initialized = true;
      console.log('OneSignal initialized successfully');
      return true;
    } catch (error) {
      const oneSignalError = createOneSignalError(error, 'SDK_INIT_FAILED');
      console.error('Failed to initialize OneSignal:', oneSignalError);

      // For iOS PWA, provide specific guidance
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isPWAStandalone = (window.navigator as any).standalone === true;

      if (isIOS && isPWAStandalone) {
        console.error('OneSignal: iOS PWA initialization failed. This may be due to network issues or script loading problems in standalone mode.');
      }

      throw oneSignalError;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Initialize OneSignal Web SDK for iOS PWA standalone mode
   * Uses Web Push API with PWA-specific configuration
   */
  private async initializeIOSPWAWebSDK(): Promise<void> {
    console.log('OneSignal: Starting iOS PWA Web SDK initialization...');

    try {
      // Step 1: Verify we're actually in PWA standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
        throw new Error('Not in PWA standalone mode - user must add app to home screen first');
      }

      // Step 2: Perform PWA-specific pre-checks
      await this.performIOSPWAPreChecks();

      // Step 3: Use simplified initialization for iOS PWA
      await this.initializeIOSPWASimplified();

      console.log('OneSignal: iOS PWA Web SDK initialization completed successfully');

    } catch (error) {
      console.error('OneSignal: iOS PWA Web SDK initialization failed:', error);

      // Enhanced error logging for iOS debugging
      debugLogger.error('onesignal', 'iOS PWA Web SDK initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        isIOSPWA: this.isIOSPWAStandaloneMode(),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        navigatorStandalone: (window.navigator as any).standalone,
        userAgent: navigator.userAgent,
        oneSignalAvailable: typeof window.OneSignalDeferred !== 'undefined',
        oneSignalLoaded: !!(window as any).OneSignal
      });

      throw createOneSignalError(error, 'SDK_INIT_FAILED');
    }
  }

  /**
   * Simplified OneSignal initialization for iOS PWA standalone mode
   * Avoids complex script loading and uses direct initialization
   */
  private async initializeIOSPWASimplified(): Promise<void> {
    console.log('OneSignal: Starting simplified iOS PWA initialization...');

    // Check if OneSignal is already available globally
    if ((window as any).OneSignal) {
      console.log('OneSignal: Using globally available OneSignal object');
      this.oneSignal = (window as any).OneSignal;
      await this.configureOneSignalForIOSPWA();
      return;
    }

    // Check if OneSignalDeferred is available
    if (!window.OneSignalDeferred) {
      console.log('OneSignal: OneSignalDeferred not available, waiting...');

      // Wait for script to load with shorter timeout
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts && !window.OneSignalDeferred) {
        console.log(`OneSignal: Waiting for script... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!window.OneSignalDeferred) {
        throw new Error('OneSignal script not available after waiting');
      }
    }

    // Use OneSignalDeferred for initialization
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('OneSignal initialization timeout'));
      }, 15000);

      window.OneSignalDeferred!.push(async (OneSignal: any) => {
        try {
          clearTimeout(timeout);
          console.log('OneSignal: SDK loaded via deferred queue');

          this.oneSignal = OneSignal;
          await this.configureOneSignalForIOSPWA();

          console.log('OneSignal: iOS PWA simplified initialization completed');
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          console.error('OneSignal: Deferred initialization failed:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Configure OneSignal specifically for iOS PWA standalone mode
   */
  private async configureOneSignalForIOSPWA(): Promise<void> {
    if (!this.oneSignal) {
      throw new Error('OneSignal not available for configuration');
    }

    console.log('OneSignal: Configuring for iOS PWA standalone mode...');

    // Check if already initialized
    if (this.oneSignal.context && this.oneSignal.context.appId) {
      console.log('OneSignal: Already initialized, skipping configuration');
      return;
    }

    // Set debug level
    if (ONESIGNAL_CONFIG.debugLogLevel) {
      this.oneSignal.Debug.setLogLevel(ONESIGNAL_CONFIG.debugLogLevel);
    }

    // Initialize with minimal configuration for iOS PWA
    await this.oneSignal.init({
      appId: ONESIGNAL_CONFIG.appId,
      allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
      // Minimal configuration to avoid conflicts
      safari_web_id: ONESIGNAL_CONFIG.appId,
      // Disable auto-prompting in PWA
      autoRegister: false,
      // Simple service worker configuration
      serviceWorkerParam: {
        scope: '/'
      }
    });

    // Set up basic event listeners
    this.oneSignal.Notifications.addEventListener('click', (event: any) => {
      console.log('OneSignal iOS PWA notification clicked:', event);
      debugLogger.info('onesignal', 'iOS PWA notification clicked', event);
    });

    this.oneSignal.Notifications.addEventListener('permissionChange', (event: any) => {
      console.log('OneSignal iOS PWA permission changed:', event);
      debugLogger.info('onesignal', 'iOS PWA permission changed', event);
    });

    console.log('OneSignal: iOS PWA configuration completed');
  }

  /**
   * Perform iOS PWA specific pre-checks
   */
  private async performIOSPWAPreChecks(): Promise<void> {
    console.log('OneSignal: Performing iOS PWA pre-checks...');

    // Check network connectivity
    if (!navigator.onLine) {
      throw new OneSignalError(ERROR_CODES.NETWORK_OFFLINE);
    }

    // Check required APIs
    if (!('Notification' in window)) {
      throw new OneSignalError(ERROR_CODES.BROWSER_NOT_SUPPORTED);
    }

    if (!('serviceWorker' in navigator)) {
      throw new OneSignalError(ERROR_CODES.SERVICE_WORKER_NOT_SUPPORTED);
    }

    // Check Push API support
    if (!('PushManager' in window)) {
      throw new OneSignalError({
        code: 'PUSH_API_NOT_SUPPORTED',
        message: 'Push API not supported in this iOS version',
        severity: 'high',
        userMessage: 'Push notifications require iOS 16.4 or later. Please update your iOS version.',
        recoveryActions: [
          'Update to iOS 16.4 or later',
          'Use the app in Safari browser instead',
          'Contact support for assistance'
        ]
      });
    }

    console.log('OneSignal: iOS PWA pre-checks passed');
  }

  /**
   * @deprecated Legacy hybrid approach - use initializeIOSPWANativeOnly() instead
   * Initialize Capacitor native push notifications for iOS PWA
   */
  private async initializeCapacitorIOSPWA(): Promise<void> {
    console.log('OneSignal: Starting legacy Capacitor iOS PWA initialization...');
    console.warn('OneSignal: This method is deprecated. Use pure native approach instead.');

    try {
      // Use Capacitor's native push notifications for iOS PWA
      await this.initializeNativePush();

      // Also initialize OneSignal web for additional features if possible
      try {
        await this.initializeForIOSPWA();
        console.log('OneSignal: Hybrid Capacitor + OneSignal initialization completed');
      } catch (webError) {
        console.warn('OneSignal: Web initialization failed, using Capacitor only:', webError);
        // Continue with Capacitor-only mode
      }
    } catch (error) {
      console.error('OneSignal: Capacitor iOS PWA initialization failed:', error);
      // Fallback to web-only initialization
      console.log('OneSignal: Falling back to web-only initialization...');
      await this.initializeForIOSPWA();
    }
  }

  /**
   * Get push token from Capacitor native push notifications
   */
  private async getCapacitorPushToken(): Promise<string | null> {
    try {
      console.log('OneSignal: Getting push token from Capacitor...');

      // Request permissions first
      const permissionResult = await PushNotifications.requestPermissions();

      if (permissionResult.receive !== 'granted') {
        throw new Error(`Push permission not granted: ${permissionResult.receive}`);
      }

      // Register for push notifications
      await PushNotifications.register();

      // Wait for registration to complete and get token
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for push token'));
        }, 10000);

        const handleRegistration = (token: Token) => {
          clearTimeout(timeout);
          console.log('OneSignal: Received push token from Capacitor:', token.value);
          resolve(token.value);
        };

        const handleError = (error: any) => {
          clearTimeout(timeout);
          console.error('OneSignal: Failed to get push token from Capacitor:', error);
          reject(error);
        };

        // Listen for registration success
        PushNotifications.addListener('registration', handleRegistration);
        PushNotifications.addListener('registrationError', handleError);
      });

    } catch (error) {
      console.error('OneSignal: Failed to get Capacitor push token:', error);
      return null;
    }
  }

  /**
   * Register push token directly with OneSignal REST API
   * Bypasses OneSignal web SDK completely
   */
  private async registerTokenWithOneSignalAPI(pushToken: string): Promise<void> {
    try {
      console.log('OneSignal: Registering token with OneSignal REST API...');

      const deviceData = {
        app_id: ONESIGNAL_CONFIG.appId,
        device_type: 0, // iOS
        identifier: pushToken,
        language: navigator.language || 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        game_version: '1.0.0', // App version
        device_model: this.getIOSDeviceModel(),
        device_os: this.getIOSVersionForAPI(),
        sdk: 'capacitor-native',
        tags: {
          pwa_standalone: true,
          capacitor_native: true,
          platform: 'ios'
        }
      };

      const response = await fetch('https://onesignal.com/api/v1/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceData)
      });

      if (!response.ok) {
        throw new Error(`OneSignal API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('OneSignal: Successfully registered with OneSignal API:', result);

      // Store the OneSignal player ID for future use
      if (result.id) {
        localStorage.setItem('oneSignalPlayerId', result.id);
        localStorage.setItem('oneSignalPushToken', pushToken);
      }

    } catch (error) {
      console.error('OneSignal: Failed to register with OneSignal API:', error);
      throw error;
    }
  }

  /**
   * Get iOS device model for OneSignal API
   */
  private getIOSDeviceModel(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('iPod')) return 'iPod';
    return 'iOS Device';
  }

  /**
   * Get iOS version for OneSignal API (non-nullable version)
   */
  private getIOSVersionForAPI(): string {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      return `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}`;
    }
    return 'Unknown';
  }

  /**
   * Enhanced initialization for iOS PWA standalone mode
   */
  private async initializeForIOSPWA(): Promise<void> {
    console.log('OneSignal: Starting iOS PWA initialization...');

    // Enhanced script loading for PWA mode
    await this.ensureOneSignalScriptLoaded();

    // Perform basic checks suitable for iOS PWA
    await this.performBasicChecks();

    // Initialize web OneSignal with iOS PWA specific handling
    await this.initializeWebOneSignalForIOS();
  }

  /**
   * Ensure OneSignal script is loaded in PWA mode
   */
  private async ensureOneSignalScriptLoaded(): Promise<void> {
    console.log('OneSignal: Ensuring script is loaded for PWA mode...');

    // Check if script is already loaded
    if (window.OneSignalDeferred) {
      console.log('OneSignal: Script already loaded');
      return;
    }

    // Wait for script to load with extended timeout for PWA
    let attempts = 0;
    const maxAttempts = 20; // Increased for PWA mode

    while (attempts < maxAttempts && !window.OneSignalDeferred) {
      console.log(`OneSignal: Waiting for script to load in PWA mode... attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Longer wait for PWA
      attempts++;
    }

    if (!window.OneSignalDeferred) {
      // Try to manually load the script as fallback
      console.log('OneSignal: Attempting to manually load script...');
      await this.loadOneSignalScriptManually();
    }

    if (!window.OneSignalDeferred) {
      throw new OneSignalError({
        ...ERROR_CODES.CDN_LOAD_FAILED,
        userMessage: 'OneSignal script failed to load in PWA mode. This may be due to network issues or caching problems.',
        recoveryActions: [
          'Check your internet connection',
          'Try refreshing the PWA',
          'Remove and re-add the PWA to home screen',
          'Clear Safari cache and try again'
        ]
      });
    }

    console.log('OneSignal: Script loaded successfully in PWA mode');
  }

  /**
   * Manually load OneSignal script as fallback
   */
  private async loadOneSignalScriptManually(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;

      script.onload = () => {
        console.log('OneSignal: Script loaded manually');
        // Initialize the deferred queue
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        resolve();
      };

      script.onerror = () => {
        console.error('OneSignal: Failed to load script manually');
        reject(new Error('Failed to load OneSignal script'));
      };

      document.head.appendChild(script);

      // Timeout for manual loading
      setTimeout(() => {
        reject(new Error('Script loading timeout'));
      }, 10000);
    });
  }

  /**
   * Perform basic checks suitable for iOS PWA
   */
  private async performBasicChecks(): Promise<void> {
    console.log('OneSignal: Performing basic checks for iOS PWA...');

    // Check network connectivity
    if (!navigator.onLine) {
      throw new OneSignalError(ERROR_CODES.NETWORK_OFFLINE);
    }

    // Check basic APIs
    if (!('Notification' in window)) {
      throw new OneSignalError(ERROR_CODES.BROWSER_NOT_SUPPORTED);
    }

    if (!('serviceWorker' in navigator)) {
      throw new OneSignalError(ERROR_CODES.SERVICE_WORKER_NOT_SUPPORTED);
    }

    // Check if we're actually in standalone mode
    if (!(window.navigator as any).standalone) {
      throw new OneSignalError({
        ...ERROR_CODES.IOS_NOT_OPENED_FROM_HOME_SCREEN,
        userMessage: 'App must be opened from home screen for iOS push notifications.',
        recoveryActions: [
          'Close this browser tab',
          'Find the app icon on your home screen',
          'Tap the app icon to open it',
          'Try again'
        ]
      });
    }

    console.log('OneSignal: Basic checks passed for iOS PWA');
  }

  /**
   * Initialize OneSignal Web SDK specifically for iOS PWA standalone mode
   */
  private async initializeWebOneSignalForIOSPWA(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new OneSignalError({
          ...ERROR_CODES.SDK_TIMEOUT,
          userMessage: 'OneSignal initialization timed out in iOS PWA standalone mode.',
          recoveryActions: [
            'Check your internet connection',
            'Try refreshing the PWA',
            'Remove and re-add PWA to home screen',
            'Ensure you\'re using iOS 16.4 or later',
            'Contact support if issue persists'
          ]
        }));
      }, 30000); // Extended timeout for iOS PWA

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          clearTimeout(timeout);
          console.log('OneSignal: SDK loaded for iOS PWA standalone mode, starting initialization...');

          this.oneSignal = OneSignal;

          // Check if already initialized
          if (OneSignal.context && OneSignal.context.appId) {
            console.log('OneSignal: Already initialized in iOS PWA standalone mode');
            resolve();
            return;
          }

          // Set debug level for iOS PWA debugging
          if (ONESIGNAL_CONFIG.debugLogLevel) {
            OneSignal.Debug.setLogLevel(ONESIGNAL_CONFIG.debugLogLevel);
          }

          console.log('OneSignal: Initializing for iOS PWA standalone mode with config:', {
            appId: ONESIGNAL_CONFIG.appId,
            allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
          });

          // Initialize with iOS PWA standalone specific configuration
          await OneSignal.init({
            appId: ONESIGNAL_CONFIG.appId,
            allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
            // iOS PWA specific settings
            safari_web_id: ONESIGNAL_CONFIG.appId, // Ensure Safari Web Push ID is set
            // Service worker configuration for PWA
            serviceWorkerParam: {
              scope: '/',
              // Use existing service worker if available
              registrationOptions: {
                updateViaCache: 'none'
              }
            },
            // Notification settings for iOS PWA
            notificationClickHandlerMatch: 'origin',
            notificationClickHandlerAction: 'focus',
            // PWA-specific prompt settings
            promptOptions: {
              slidedown: {
                prompts: [
                  {
                    type: 'push',
                    autoPrompt: false, // Don't auto-prompt in PWA
                    text: {
                      actionMessage: 'We\'d like to show you notifications for recipe updates and cooking tips.',
                      acceptButton: 'Allow',
                      cancelButton: 'No Thanks'
                    }
                  }
                ]
              }
            }
          });

          // Set up event listeners for iOS PWA
          OneSignal.Notifications.addEventListener('click', (event: any) => {
            console.log('OneSignal iOS PWA standalone notification clicked:', event);
            debugLogger.info('onesignal', 'iOS PWA notification clicked', event);
          });

          OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
            console.log('OneSignal iOS PWA standalone notification will display:', event);
            debugLogger.info('onesignal', 'iOS PWA notification will display', event);
          });

          OneSignal.Notifications.addEventListener('permissionChange', (event: any) => {
            console.log('OneSignal iOS PWA standalone permission changed:', event);
            debugLogger.info('onesignal', 'iOS PWA permission changed', event);
          });

          console.log('OneSignal iOS PWA standalone initialization completed successfully');
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          console.error('OneSignal iOS PWA standalone initialization failed:', error);
          reject(createOneSignalError(error, 'SDK_INIT_FAILED'));
        }
      });
    });
  }

  /**
   * Initialize OneSignal for iOS PWA with special handling (legacy method)
   */
  private async initializeWebOneSignalForIOS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new OneSignalError({
          ...ERROR_CODES.SDK_TIMEOUT,
          userMessage: 'OneSignal initialization timed out in iOS PWA mode.',
          recoveryActions: [
            'Check your internet connection',
            'Try refreshing the PWA',
            'Remove and re-add PWA to home screen',
            'Contact support if issue persists'
          ]
        }));
      }, 30000); // Extended timeout for iOS PWA

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          clearTimeout(timeout);
          console.log('OneSignal: SDK loaded for iOS PWA, starting initialization...');

          this.oneSignal = OneSignal;

          // Check if already initialized
          if (OneSignal.context && OneSignal.context.appId) {
            console.log('OneSignal: Already initialized in iOS PWA mode');
            resolve();
            return;
          }

          // Set debug level for iOS PWA debugging
          if (ONESIGNAL_CONFIG.debugLogLevel) {
            OneSignal.Debug.setLogLevel(ONESIGNAL_CONFIG.debugLogLevel);
          }

          console.log('OneSignal: Initializing for iOS PWA with config:', {
            appId: ONESIGNAL_CONFIG.appId,
            allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
          });

          // Initialize with iOS PWA specific configuration
          await OneSignal.init({
            appId: ONESIGNAL_CONFIG.appId,
            allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
            // Additional iOS PWA specific settings
            safari_web_id: ONESIGNAL_CONFIG.appId, // Ensure Safari Web Push ID is set
          });

          // Set up event listeners
          OneSignal.Notifications.addEventListener('click', (event: any) => {
            console.log('OneSignal iOS PWA notification clicked:', event);
          });

          OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
            console.log('OneSignal iOS PWA notification will display:', event);
          });

          console.log('OneSignal iOS PWA initialization completed successfully');
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          console.error('OneSignal iOS PWA initialization failed:', error);
          reject(createOneSignalError(error, 'SDK_INIT_FAILED'));
        }
      });
    });
  }

  /**
   * Perform comprehensive pre-initialization checks
   */
  private async performPreInitializationChecks(isTestEnvironment: boolean = false): Promise<void> {
    console.log('OneSignal: Starting pre-initialization checks...');

    // Check network connectivity
    if (!this.networkMonitor || !navigator.onLine) {
      console.error('OneSignal: Network is offline');
      throw new OneSignalError(ERROR_CODES.NETWORK_OFFLINE);
    }

    // Check browser capabilities
    const browserCapabilities = detectBrowserCapabilities();
    console.log('OneSignal: Browser capabilities:', browserCapabilities);

    if (!browserCapabilities.isSupported && !isTestEnvironment) {
      // Determine specific issue
      if (!browserCapabilities.capabilities.hasNotificationAPI) {
        console.error('OneSignal: Notification API not supported');
        throw new OneSignalError(ERROR_CODES.BROWSER_NOT_SUPPORTED);
      }
      if (!browserCapabilities.capabilities.hasServiceWorker) {
        console.error('OneSignal: Service Worker not supported');
        throw new OneSignalError(ERROR_CODES.SERVICE_WORKER_NOT_SUPPORTED);
      }
      if (!browserCapabilities.capabilities.hasSecureContext) {
        console.error('OneSignal: Insecure context detected');
        throw new OneSignalError(ERROR_CODES.INSECURE_CONTEXT);
      }
    }

    // Check for storage quota (simplified check)
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usageRatio = (estimate.usage || 0) / (estimate.quota || 1);
        if (usageRatio > 0.9) { // More than 90% storage used
          throw new OneSignalError(ERROR_CODES.QUOTA_EXCEEDED);
        }
      }
    } catch (error) {
      // Storage API not available or failed, continue anyway
      console.warn('Storage quota check failed:', error);
    }

    // Check if we've exceeded retry attempts
    if (this.retryCount > this.maxRetries) {
      throw new OneSignalError(ERROR_CODES.RATE_LIMITED);
    }

    // Validate push notification support for non-native platforms
    if (!this.isNative && !isTestEnvironment) {
      const supportError = validatePushNotificationSupport();
      if (supportError) {
        throw supportError;
      }
    }

    // Check if OneSignal script is available (for web)
    if (!this.isNative && typeof window !== 'undefined') {
      console.log('OneSignal: Checking for OneSignal script availability...');

      // Wait a bit for script to load if it's still loading
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts && !window.OneSignalDeferred) {
        console.log(`OneSignal: Waiting for script to load... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!window.OneSignalDeferred && !isTestEnvironment) {
        console.error('OneSignal: Script failed to load after maximum attempts');
        throw new OneSignalError(ERROR_CODES.CDN_LOAD_FAILED);
      }

      console.log('OneSignal: Script loaded successfully');
    }
  }

  /**
   * Initialize OneSignal for web platforms using v16 SDK
   */
  private async initializeWebOneSignal(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set up timeout for initialization
      const timeout = setTimeout(() => {
        reject(new OneSignalError(ERROR_CODES.SDK_TIMEOUT));
      }, 15000); // 15 second timeout

      // Use OneSignalDeferred for v16 SDK
      if (typeof window !== 'undefined') {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            clearTimeout(timeout);
            console.log('OneSignal: SDK loaded, starting initialization...');

            // Store OneSignal instance
            this.oneSignal = OneSignal;

            // Check if OneSignal is already initialized
            if (OneSignal.context && OneSignal.context.appId) {
              console.log('OneSignal: Already initialized, skipping init');
              resolve();
              return;
            }

            // Set debug log level for development
            if (ONESIGNAL_CONFIG.debugLogLevel) {
              console.log(`OneSignal: Setting debug level to ${ONESIGNAL_CONFIG.debugLogLevel}`);
              OneSignal.Debug.setLogLevel(ONESIGNAL_CONFIG.debugLogLevel);
            }

            console.log('OneSignal: Initializing with config:', {
              appId: ONESIGNAL_CONFIG.appId,
              allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
            });

            // Initialize with v16 configuration using OneSignal's default service worker
            await OneSignal.init({
              appId: ONESIGNAL_CONFIG.appId,
              allowLocalhostAsSecureOrigin: ONESIGNAL_CONFIG.allowLocalhostAsSecureOrigin,
            });

            // Set up event listeners for v16
            OneSignal.Notifications.addEventListener('click', (event: any) => {
              console.log('OneSignal notification clicked:', event);
            });

            OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
              console.log('OneSignal notification will display in foreground:', event);
            });

            console.log('OneSignal v16 web initialization completed');
            resolve();
          } catch (error) {
            clearTimeout(timeout);
            console.error('OneSignal v16 web initialization failed:', error);
            reject(createOneSignalError(error, 'SDK_INIT_FAILED'));
          }
        });

        // Check if OneSignal script failed to load
        setTimeout(() => {
          if (!window.OneSignalDeferred || window.OneSignalDeferred.length === 0) {
            clearTimeout(timeout);
            reject(new OneSignalError(ERROR_CODES.SDK_LOAD_FAILED));
          }
        }, 5000); // Check after 5 seconds
      } else {
        clearTimeout(timeout);
        reject(new OneSignalError(ERROR_CODES.BROWSER_NOT_SUPPORTED));
      }
    });
  }

  /**
   * Initialize native push notifications using Capacitor
   */
  private async initializeNativePush(): Promise<void> {
    console.log('OneSignal: Initializing Capacitor native push notifications...');

    // Set up listeners first
    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('OneSignal: Capacitor push registration success, token: ' + token.value);
      this.handleNativeTokenReceived(token.value);
    });

    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('OneSignal: Capacitor registration error: ' + JSON.stringify(error));
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('OneSignal: Capacitor push notification received: ', notification);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('OneSignal: Capacitor push notification action performed', notification);
    });

    // Check current permission status
    const permissionStatus = await PushNotifications.checkPermissions();
    console.log('OneSignal: Capacitor permission status:', permissionStatus);

    if (permissionStatus.receive === 'granted') {
      // Register for push notifications
      console.log('OneSignal: Permission already granted, registering for push notifications...');
      await PushNotifications.register();
    } else {
      console.log('OneSignal: Permission not granted, will register after permission request');
    }
  }

  /**
   * Handle native token received and register with OneSignal
   */
  private async handleNativeTokenReceived(token: string): Promise<void> {
    try {
      console.log('OneSignal: Capacitor push token received:', token);

      // Store token for later use
      localStorage.setItem('pushToken', token);

      // Try to register with OneSignal if web SDK is available
      if (this.oneSignal) {
        try {
          console.log('OneSignal: Attempting to register Capacitor token with OneSignal web SDK...');

          // Set external user ID if we have one
          const externalId = localStorage.getItem('oneSignalExternalId');
          if (externalId) {
            await this.oneSignal.login(externalId);
          }

          // Opt in to push subscription
          await this.oneSignal.User.PushSubscription.optIn();

          console.log('OneSignal: Capacitor token successfully registered with OneSignal web SDK');
        } catch (webError) {
          console.warn('OneSignal: Failed to register Capacitor token with web SDK, using Capacitor only:', webError);
        }
      } else {
        console.log('OneSignal: Web SDK not available, using Capacitor-only mode');
      }

      // Generate a user ID for Capacitor-only mode
      const capacitorUserId = `capacitor_${token.substring(0, 8)}_${Date.now()}`;
      localStorage.setItem('capacitorUserId', capacitorUserId);

      console.log('OneSignal: Capacitor token handling completed');
    } catch (error) {
      console.error('OneSignal: Failed to handle Capacitor token:', error);
    }
  }

  /**
   * Request notification permissions with Capacitor iOS PWA support
   */
  public async requestPermission(): Promise<NotificationPermissionState> {
    try {
      // Use Web SDK for iOS PWA standalone mode (Safari supports Web Push API)
      if (this.isIOSPWAStandaloneMode()) {
        console.log('OneSignal: Using Web SDK for iOS PWA standalone permission request');
        return await this.requestIOSPWAWebPermission();
      }

      if (this.isNative) {
        const result = await PushNotifications.requestPermissions();
        return {
          permission: result.receive === 'granted' ? 'granted' : 'denied',
          isSupported: true,
          isNative: true,
        };
      } else {
        // Web platform v16 with enhanced iOS Safari Web Push handling
        if (!this.oneSignal) {
          throw new OneSignalError(ERROR_CODES.SDK_INIT_FAILED);
        }

        // Enhanced iOS Safari Web Push handling
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          return await this.requestIOSSafariWebPushPermission();
        }

        // Standard web push permission flow
        return await this.requestStandardWebPushPermission();
      }
    } catch (error) {
      const oneSignalError = createOneSignalError(error, 'PERMISSION_DENIED');
      console.error('Failed to request notification permission:', oneSignalError);
      throw oneSignalError;
    }
  }

  /**
   * Request permission using Web SDK for iOS PWA standalone mode
   */
  private async requestIOSPWAWebPermission(): Promise<NotificationPermissionState> {
    console.log('OneSignal: Starting iOS PWA Web SDK permission request...');

    try {
      // Verify we're in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
        throw new OneSignalError({
          code: 'NOT_IN_STANDALONE_MODE',
          message: 'App must be in standalone mode for iOS push notifications',
          severity: 'high',
          userMessage: 'Please add this app to your home screen and open it from there to enable push notifications.',
          recoveryActions: [
            'Tap the Share button in Safari',
            'Select "Add to Home Screen"',
            'Open the app from your home screen',
            'Try requesting permissions again'
          ]
        });
      }

      if (!this.oneSignal) {
        throw new Error('OneSignal not initialized');
      }

      // Check current permission status
      const currentPermission = await this.oneSignal.Notifications.permission;
      console.log('OneSignal: Current iOS PWA permission status:', currentPermission);

      if (currentPermission === 'granted') {
        return {
          permission: 'granted',
          isSupported: true,
          isNative: false
        };
      }

      // Request permission using OneSignal Web SDK
      console.log('OneSignal: Requesting permission via Web SDK for iOS PWA...');
      const permissionResult = await this.oneSignal.Notifications.requestPermission();

      console.log('OneSignal: iOS PWA Web SDK permission result:', permissionResult);

      return {
        permission: permissionResult ? 'granted' : 'denied',
        isSupported: true,
        isNative: false
      };

    } catch (error) {
      console.error('OneSignal: iOS PWA Web SDK permission request failed:', error);

      debugLogger.error('onesignal', 'iOS PWA Web permission request failed', {
        error: error instanceof Error ? error.message : String(error),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        navigatorStandalone: (window.navigator as any).standalone,
        oneSignalInitialized: !!this.oneSignal
      });

      throw createOneSignalError(error, 'PERMISSION_DENIED');
    }
  }

  /**
   * @deprecated Request permission using Capacitor for iOS PWA
   */
  private async requestCapacitorIOSPWAPermission(): Promise<NotificationPermissionState> {
    console.log('OneSignal: Starting Capacitor iOS PWA permission request...');

    try {
      // Use Capacitor's native permission request
      const result = await PushNotifications.requestPermissions();
      console.log('OneSignal: Capacitor permission result:', result);

      // Capacitor provides immediate, accurate permission state
      const permission = result.receive === 'granted' ? 'granted' :
                        result.receive === 'denied' ? 'denied' : 'default';

      console.log('OneSignal: Capacitor permission state:', permission);

      // If permission granted, register for push notifications
      if (permission === 'granted') {
        console.log('OneSignal: Permission granted, registering for push notifications...');
        await PushNotifications.register();
      }

      return {
        permission,
        isSupported: true,
        isNative: true, // Mark as native since we're using Capacitor
      };
    } catch (error) {
      console.error('OneSignal: Capacitor permission request failed:', error);
      // Fallback to web permission request
      console.log('OneSignal: Falling back to web permission request...');
      return await this.requestIOSSafariWebPushPermission();
    }
  }

  /**
   * Enhanced iOS Safari Web Push permission request with proper timing
   */
  private async requestIOSSafariWebPushPermission(): Promise<NotificationPermissionState> {
    console.log('OneSignal: Starting iOS Safari Web Push permission request...');

    // Check if PWA is installed (required for iOS)
    const isPWAInstalled = (window.navigator as any).standalone === true;
    if (!isPWAInstalled) {
      throw new OneSignalError({
        ...ERROR_CODES.IOS_PWA_NOT_INSTALLED,
        userMessage: 'iOS requires the PWA to be installed to home screen before requesting notifications.',
        recoveryActions: [
          'Tap the Share button in Safari',
          'Scroll down and tap "Add to Home Screen"',
          'Open the app from your home screen',
          'Then try subscribing to notifications'
        ]
      });
    }

    // Check if permission was already denied (requires PWA reinstall on iOS)
    const initialPermission = Notification.permission;
    console.log('OneSignal: Initial iOS permission state:', initialPermission);

    if (initialPermission === 'denied') {
      throw new OneSignalError({
        ...ERROR_CODES.IOS_PERMISSION_DENIED_REINSTALL_REQUIRED,
        userMessage: 'iOS permission was denied. The PWA must be removed and re-added to home screen.',
        recoveryActions: [
          'Remove this app from your home screen',
          'Clear Safari cache in Settings',
          'Visit the website again in Safari',
          'Add to home screen again',
          'Try subscribing again'
        ]
      });
    }

    // Request permission with iOS-specific handling
    console.log('OneSignal: Requesting iOS Safari Web Push permission...');
    const permissionGranted = await this.oneSignal.Notifications.requestPermission();
    console.log('OneSignal: Permission request result:', permissionGranted);

    // iOS Safari Web Push has timing issues - wait for permission state to stabilize
    console.log('OneSignal: Waiting for iOS permission state to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    // Check permission state multiple times with delays (iOS timing issue fix)
    let finalPermission = Notification.permission;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts && finalPermission !== 'granted' && permissionGranted) {
      console.log(`OneSignal: iOS permission check attempt ${attempts + 1}/${maxAttempts}, current state: ${finalPermission}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between checks
      finalPermission = Notification.permission;
      attempts++;
    }

    console.log('OneSignal: Final iOS permission state:', finalPermission);

    // Handle the case where user dismissed the prompt
    if (!permissionGranted && finalPermission === 'default') {
      throw new OneSignalError(ERROR_CODES.PERMISSION_DISMISSED);
    }

    return {
      permission: finalPermission as 'default' | 'granted' | 'denied',
      isSupported: 'Notification' in window,
      isNative: false,
    };
  }

  /**
   * Standard web push permission request
   */
  private async requestStandardWebPushPermission(): Promise<NotificationPermissionState> {
    // Check if permission was already denied
    const currentPermission = Notification.permission;
    if (currentPermission === 'denied') {
      throw new OneSignalError(ERROR_CODES.PERMISSION_DENIED);
    }

    const permission = await this.oneSignal.Notifications.requestPermission();

    // Handle the case where user dismissed the prompt
    if (!permission && Notification.permission === 'default') {
      throw new OneSignalError(ERROR_CODES.PERMISSION_DISMISSED);
    }

    return {
      permission: permission ? 'granted' : 'denied',
      isSupported: 'Notification' in window,
      isNative: false,
    };
  }

  /**
   * Get current permission state
   */
  public async getPermissionState(): Promise<NotificationPermissionState> {
    try {
      if (this.isNative) {
        const result = await PushNotifications.checkPermissions();
        return {
          permission: result.receive === 'granted' ? 'granted' :
                     result.receive === 'denied' ? 'denied' : 'default',
          isSupported: true,
          isNative: true,
        };
      } else {
        // Web platform v16
        if (!this.oneSignal) {
          return {
            permission: 'default',
            isSupported: 'Notification' in window,
            isNative: false,
          };
        }

        // Get permission from browser Notification API
        const permission = Notification.permission as 'default' | 'granted' | 'denied';
        return {
          permission,
          isSupported: 'Notification' in window,
          isNative: false,
        };
      }
    } catch (error) {
      console.error('Failed to get permission state:', error);
      return {
        permission: 'default',
        isSupported: false,
        isNative: this.isNative,
      };
    }
  }

  /**
   * Subscribe user to notifications with Capacitor iOS PWA support
   */
  public async subscribeUser(): Promise<OneSignalUser> {
    try {
      if (!this.initialized) {
        throw new OneSignalError(ERROR_CODES.SDK_INIT_FAILED);
      }

      // Check network connectivity
      if (!this.networkMonitor || !navigator.onLine) {
        throw new OneSignalError(ERROR_CODES.NETWORK_OFFLINE);
      }

      // Use Web SDK for iOS PWA standalone mode (Safari supports Web Push API)
      if (this.isIOSPWAStandaloneMode()) {
        console.log('OneSignal: Using Web SDK for iOS PWA standalone subscription');
        return await this.subscribeIOSPWAWeb();
      }

      if (this.isNative) {
        // For native, registration happens during initialization
        const token = localStorage.getItem('pushToken');
        return {
          pushToken: token || undefined,
          subscribed: !!token,
        };
      } else {
        // Web platform v16 with enhanced iOS handling
        return await this.subscribeWebUser();
      }
    } catch (error) {
      const oneSignalError = createOneSignalError(error, 'SUBSCRIPTION_FAILED');
      console.error('Failed to subscribe user:', oneSignalError);
      throw oneSignalError;
    }
  }

  /**
   * Subscribe user using Web SDK for iOS PWA standalone mode
   */
  private async subscribeIOSPWAWeb(): Promise<OneSignalUser> {
    console.log('OneSignal: Starting iOS PWA Web SDK subscription...');

    try {
      // Verify we're in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
        throw new OneSignalError({
          code: 'NOT_IN_STANDALONE_MODE',
          message: 'App must be in standalone mode for iOS push notifications',
          severity: 'high',
          userMessage: 'Please add this app to your home screen and open it from there to enable push notifications.',
          recoveryActions: [
            'Tap the Share button in Safari',
            'Select "Add to Home Screen"',
            'Open the app from your home screen',
            'Try subscribing again'
          ]
        });
      }

      if (!this.oneSignal) {
        throw new Error('OneSignal not initialized');
      }

      // Check permission first
      const permission = await this.oneSignal.Notifications.permission;
      if (permission !== 'granted') {
        throw new OneSignalError({
          code: 'PERMISSION_NOT_GRANTED',
          message: 'Push notification permission not granted',
          severity: 'high',
          userMessage: 'Please allow push notifications first.',
          recoveryActions: [
            'Request permission first',
            'Check iOS Settings > Notifications if permission was denied',
            'Try again after granting permission'
          ]
        });
      }

      // Subscribe using OneSignal Web SDK
      console.log('OneSignal: Subscribing via Web SDK for iOS PWA...');
      await this.oneSignal.User.PushSubscription.optIn();

      // Get user information
      const userId = this.oneSignal.User.onesignalId;
      const pushToken = this.oneSignal.User.PushSubscription.token;

      console.log('OneSignal: iOS PWA Web SDK subscription successful', {
        userId,
        pushToken: pushToken ? `${pushToken.substring(0, 20)}...` : 'none'
      });

      debugLogger.info('onesignal', 'iOS PWA Web subscription successful', {
        userId,
        hasToken: !!pushToken,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches
      });

      return {
        userId: userId || '',
        pushToken: pushToken || '',
        subscribed: true
      };

    } catch (error) {
      console.error('OneSignal: iOS PWA Web SDK subscription failed:', error);

      debugLogger.error('onesignal', 'iOS PWA Web subscription failed', {
        error: error instanceof Error ? error.message : String(error),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        navigatorStandalone: (window.navigator as any).standalone,
        oneSignalInitialized: !!this.oneSignal
      });

      throw createOneSignalError(error, 'SUBSCRIPTION_FAILED');
    }
  }

  /**
   * @deprecated Subscribe user using Capacitor for iOS PWA
   */
  private async subscribeCapacitorIOSPWA(): Promise<OneSignalUser> {
    console.log('OneSignal: Starting Capacitor iOS PWA subscription...');

    try {
      // Check permission first
      const permissionStatus = await PushNotifications.checkPermissions();
      console.log('OneSignal: Capacitor permission status:', permissionStatus);

      if (permissionStatus.receive !== 'granted') {
        throw new OneSignalError(ERROR_CODES.PERMISSION_DENIED);
      }

      // Register for push notifications
      await PushNotifications.register();
      console.log('OneSignal: Capacitor registration initiated');

      // Wait for token with timeout
      const token = await this.waitForCapacitorToken();
      console.log('OneSignal: Capacitor token received:', token ? 'Yes' : 'No');

      if (!token) {
        throw new OneSignalError({
          ...ERROR_CODES.SUBSCRIPTION_FAILED,
          userMessage: 'Failed to receive push token from iOS',
          recoveryActions: [
            'Check your internet connection',
            'Ensure notifications are enabled in iOS Settings',
            'Try removing and re-adding the PWA',
            'Restart the app and try again'
          ]
        });
      }

      // Try to register with OneSignal if available
      let userId: string | undefined;
      if (this.oneSignal) {
        try {
          // Set the device token in OneSignal
          await this.oneSignal.User.PushSubscription.optIn();
          userId = this.oneSignal.User.onesignalId;
          console.log('OneSignal: Hybrid registration successful, User ID:', userId);
        } catch (webError) {
          console.warn('OneSignal: Web registration failed, using Capacitor only:', webError);
        }
      }

      return {
        userId: userId || `capacitor_${token.substring(0, 8)}`, // Fallback ID
        pushToken: token,
        subscribed: true,
      };
    } catch (error) {
      console.error('OneSignal: Capacitor subscription failed:', error);
      // Fallback to web subscription
      console.log('OneSignal: Falling back to web subscription...');
      return await this.subscribeWebUser();
    }
  }

  /**
   * Wait for Capacitor push token with timeout
   */
  private async waitForCapacitorToken(): Promise<string | null> {
    return new Promise(async (resolve) => {
      let tokenReceived = false;

      // Set up token listener
      const tokenListener = await PushNotifications.addListener('registration', (token: Token) => {
        console.log('OneSignal: Capacitor token received:', token.value);
        if (!tokenReceived) {
          tokenReceived = true;
          resolve(token.value);
        }
      });

      // Set up error listener
      const errorListener = await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('OneSignal: Capacitor registration error:', error);
        if (!tokenReceived) {
          tokenReceived = true;
          resolve(null);
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!tokenReceived) {
          console.warn('OneSignal: Capacitor token timeout');
          tokenReceived = true;
          resolve(null);
        }
        // Clean up listeners
        tokenListener.remove();
        errorListener.remove();
      }, 10000);
    });
  }

  /**
   * Subscribe user using web OneSignal
   */
  private async subscribeWebUser(): Promise<OneSignalUser> {
    if (!this.oneSignal) {
      throw new OneSignalError(ERROR_CODES.SDK_INIT_FAILED);
    }

    // Check permission first
    const currentPermission = Notification.permission;
    if (currentPermission !== 'granted') {
      throw new OneSignalError(ERROR_CODES.PERMISSION_DENIED);
    }

    console.log('OneSignal: Starting web subscription...');
    await this.oneSignal.User.PushSubscription.optIn();

    // Wait for subscription to complete with retries
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const pushSubscription = this.oneSignal.User.PushSubscription.id;
      const userId = this.oneSignal.User.onesignalId;
      const isOptedIn = this.oneSignal.User.PushSubscription.optedIn;

      console.log(`OneSignal: Subscription attempt ${attempts + 1}/${maxAttempts}`, {
        pushSubscription: !!pushSubscription,
        userId: !!userId,
        isOptedIn
      });

      if (isOptedIn && (pushSubscription || userId)) {
        console.log('OneSignal: Web subscription successful');
        return {
          userId: userId || undefined,
          pushToken: pushSubscription || undefined,
          subscribed: isOptedIn,
        };
      }

      attempts++;
    }

    // If we get here, subscription failed
    throw new OneSignalError({
      ...ERROR_CODES.SUBSCRIPTION_FAILED,
      userMessage: 'OneSignal subscription completed but no User ID or Push Token was generated',
      recoveryActions: [
        'Try refreshing the page',
        'Check your internet connection',
        'Remove and re-add PWA to home screen',
        'Contact support if issue persists'
      ]
    });
  }

  /**
   * Unsubscribe user from notifications
   */
  public async unsubscribeUser(): Promise<boolean> {
    try {
      if (!this.initialized) {
        throw new Error('OneSignal not initialized');
      }

      if (this.isNative) {
        // For native platforms, we can't easily unsubscribe
        // This would typically require server-side API calls
        console.log('Native unsubscribe not implemented');
        return false;
      } else {
        // Web platform v16
        if (!this.oneSignal) {
          throw new Error('OneSignal not properly initialized');
        }

        await this.oneSignal.User.PushSubscription.optOut();
        return !this.oneSignal.User.PushSubscription.optedIn;
      }
    } catch (error) {
      console.error('Failed to unsubscribe user:', error);
      return false;
    }
  }

  /**
   * Get current user subscription status with Capacitor iOS PWA support
   */
  public async getUserStatus(): Promise<OneSignalUser> {
    try {
      if (!this.initialized) {
        return { subscribed: false };
      }

      // Use Web SDK for iOS PWA standalone mode (Safari supports Web Push API)
      if (this.isIOSPWAStandaloneMode()) {
        console.log('OneSignal: Getting iOS PWA Web SDK user status');
        return await this.getIOSPWAWebStatus();
      }

      if (this.isNative) {
        const token = localStorage.getItem('pushToken');
        return {
          pushToken: token || undefined,
          subscribed: !!token,
        };
      } else {
        // Web platform v16
        if (!this.oneSignal) {
          return { subscribed: false };
        }

        // Get additional user information for v16
        const userTags = this.oneSignal.User.getTags ? await this.oneSignal.User.getTags() : {};

        return {
          userId: this.oneSignal.User.onesignalId || undefined,
          pushToken: this.oneSignal.User.PushSubscription.id || undefined,
          subscribed: this.oneSignal.User.PushSubscription.optedIn,
          externalId: this.oneSignal.User.getExternalId ? this.oneSignal.User.getExternalId() : undefined,
          tags: userTags || {},
        };
      }
    } catch (error) {
      console.error('Failed to get user status:', error);
      return { subscribed: false };
    }
  }

  /**
   * Get user status for iOS PWA Web SDK
   */
  private async getIOSPWAWebStatus(): Promise<OneSignalUser> {
    console.log('OneSignal: Getting iOS PWA Web SDK user status...');

    try {
      // Verify we're in standalone mode
      if (!window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
        console.warn('OneSignal: Not in PWA standalone mode');
        return {
          userId: '',
          pushToken: '',
          subscribed: false
        };
      }

      if (!this.oneSignal) {
        console.warn('OneSignal: Not initialized');
        return {
          userId: '',
          pushToken: '',
          subscribed: false
        };
      }

      // Get permission status
      const permission = await this.oneSignal.Notifications.permission;
      console.log('OneSignal: iOS PWA permission status:', permission);

      if (permission !== 'granted') {
        return {
          userId: '',
          pushToken: '',
          subscribed: false
        };
      }

      // Get user information
      const userId = this.oneSignal.User.onesignalId;
      const pushToken = this.oneSignal.User.PushSubscription.token;
      const isSubscribed = this.oneSignal.User.PushSubscription.optedIn;

      console.log('OneSignal: iOS PWA Web SDK user status:', {
        userId,
        hasToken: !!pushToken,
        isSubscribed
      });

      return {
        userId: userId || '',
        pushToken: pushToken || '',
        subscribed: isSubscribed || false
      };

    } catch (error) {
      console.error('OneSignal: Failed to get iOS PWA Web SDK user status:', error);

      debugLogger.error('onesignal', 'iOS PWA Web status check failed', {
        error: error instanceof Error ? error.message : String(error),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        oneSignalInitialized: !!this.oneSignal
      });

      return {
        userId: '',
        pushToken: '',
        subscribed: false
      };
    }
  }

  /**
   * @deprecated Get user status for Capacitor iOS PWA
   */
  private async getCapacitorIOSPWAStatus(): Promise<OneSignalUser> {
    try {
      // Check Capacitor permission status
      const permissionStatus = await PushNotifications.checkPermissions();
      const isSubscribed = permissionStatus.receive === 'granted';

      // Get stored token
      const token = localStorage.getItem('pushToken');

      // Try to get OneSignal user info if available
      let userId: string | undefined;
      let userTags: Record<string, string> = {};
      let externalId: string | undefined;

      if (this.oneSignal && isSubscribed) {
        try {
          userId = this.oneSignal.User.onesignalId;
          userTags = this.oneSignal.User.getTags ? await this.oneSignal.User.getTags() : {};
          externalId = this.oneSignal.User.getExternalId ? this.oneSignal.User.getExternalId() : undefined;
        } catch (webError) {
          console.warn('OneSignal: Failed to get web user info in Capacitor mode:', webError);
        }
      }

      return {
        userId: userId || (token ? `capacitor_${token.substring(0, 8)}` : undefined),
        pushToken: token || undefined,
        subscribed: isSubscribed && !!token,
        externalId,
        tags: userTags,
      };
    } catch (error) {
      console.error('OneSignal: Failed to get Capacitor iOS PWA status:', error);
      return { subscribed: false };
    }
  }

  /**
   * Check if notifications are supported
   */
  public isNotificationSupported(): boolean {
    if (this.isNative) {
      return true; // Native platforms support push notifications
    }
    
    // Check web support
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Set user external ID (useful for linking with your user system)
   */
  public async setExternalUserId(externalId: string): Promise<void> {
    try {
      if (!this.initialized || !this.oneSignal) {
        throw new OneSignalError(ERROR_CODES.SDK_INIT_FAILED);
      }

      if (this.isNative) {
        // For native platforms, store locally for now
        localStorage.setItem('oneSignalExternalId', externalId);
      } else {
        // Web platform v16 - use login method
        await this.oneSignal.login(externalId);
      }
    } catch (error) {
      console.error('Failed to set external user ID:', error);
      throw createOneSignalError(error, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Set user tags (useful for segmentation)
   */
  public async setUserTags(tags: Record<string, string>): Promise<void> {
    try {
      if (!this.initialized || !this.oneSignal) {
        throw new OneSignalError(ERROR_CODES.SDK_INIT_FAILED);
      }

      if (this.isNative) {
        // For native platforms, store locally for now
        localStorage.setItem('oneSignalUserTags', JSON.stringify(tags));
      } else {
        // Web platform v16 - use User.addTags
        if (this.oneSignal.User.addTags) {
          await this.oneSignal.User.addTags(tags);
        }
      }
    } catch (error) {
      console.error('Failed to set user tags:', error);
      throw createOneSignalError(error, 'UNKNOWN_ERROR');
    }
  }

  /**
   * Reset initialization state for retry attempts
   */
  public resetInitializationState(): void {
    this.initialized = false;
    this.initializing = false;
    this.initializationAttempted = false;
    this.oneSignal = null;
    this.retryCount = 0; // Reset retry count
    console.log('OneSignal initialization state reset');
  }

  /**
   * Check iOS Safari Web Push requirements
   * Based on: https://documentation.onesignal.com/docs/safari-web-push-for-ios#mobile-web-push-requirements
   */
  public checkiOSWebPushRequirements() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) {
      return { isIOS: false, supported: false, requirements: [] };
    }

    const requirements = [];
    let supported = true;
    let criticalIssues = [];

    // 1. iOS 16.4 or later
    const iOSVersion = this.getIOSVersion();
    const hasRequiredVersion = iOSVersion ? this.compareVersions(iOSVersion, '16.4') >= 0 : false;
    requirements.push({
      requirement: 'iOS 16.4 or later',
      met: hasRequiredVersion,
      current: iOSVersion || 'Unknown',
      details: hasRequiredVersion ? 'iOS version supports Web Push' : 'iOS 16.4+ required for Web Push'
    });
    if (!hasRequiredVersion) supported = false;

    // 2. Safari browser (not in-app browser)
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
    requirements.push({
      requirement: 'Safari browser (not in-app)',
      met: isSafari,
      current: isSafari ? 'Safari' : 'In-app browser or other',
      details: isSafari ? 'Using Safari browser' : 'Must use Safari, not in-app browser'
    });
    if (!isSafari) supported = false;

    // 3. HTTPS (secure context)
    const isSecure = window.isSecureContext;
    requirements.push({
      requirement: 'HTTPS (secure context)',
      met: isSecure,
      current: isSecure ? 'Secure' : 'Insecure',
      details: isSecure ? 'Site is served over HTTPS' : 'HTTPS required for Web Push'
    });
    if (!isSecure) supported = false;

    // 4. PWA installed to home screen (CRITICAL for iOS)
    const isPWAInstalled = (window.navigator as any).standalone === true;
    requirements.push({
      requirement: 'PWA installed to home screen',
      met: isPWAInstalled,
      current: isPWAInstalled ? 'Installed' : 'Not installed',
      details: isPWAInstalled ? 'PWA is installed to home screen' : 'CRITICAL: Must add PWA to home screen for iOS push notifications to work'
    });
    if (!isPWAInstalled) {
      supported = false;
      criticalIssues.push('PWA not installed to home screen');
    }

    // 5. Web App Manifest
    const hasManifest = !!document.querySelector('link[rel="manifest"]');
    requirements.push({
      requirement: 'Web App Manifest',
      met: hasManifest,
      current: hasManifest ? 'Present' : 'Missing',
      details: hasManifest ? 'Manifest link found' : 'Web app manifest required'
    });
    if (!hasManifest) supported = false;

    // 6. Apple touch icon
    const hasAppleIcon = !!document.querySelector('link[rel="apple-touch-icon"]') ||
                        !!document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    requirements.push({
      requirement: 'Apple PWA meta tags',
      met: hasAppleIcon,
      current: hasAppleIcon ? 'Present' : 'Missing',
      details: hasAppleIcon ? 'Apple PWA meta tags found' : 'Apple PWA meta tags recommended'
    });

    // 7. Notification API support
    const hasNotificationAPI = 'Notification' in window;
    requirements.push({
      requirement: 'Notification API',
      met: hasNotificationAPI,
      current: hasNotificationAPI ? 'Available' : 'Not available',
      details: hasNotificationAPI ? 'Notification API is available' : 'Notification API not supported'
    });
    if (!hasNotificationAPI) supported = false;

    // 8. Service Worker support
    const hasServiceWorker = 'serviceWorker' in navigator;
    requirements.push({
      requirement: 'Service Worker support',
      met: hasServiceWorker,
      current: hasServiceWorker ? 'Available' : 'Not available',
      details: hasServiceWorker ? 'Service Worker API is available' : 'Service Worker not supported'
    });
    if (!hasServiceWorker) supported = false;

    // 9. Push Manager support
    const hasPushManager = 'PushManager' in window;
    requirements.push({
      requirement: 'Push Manager API',
      met: hasPushManager,
      current: hasPushManager ? 'Available' : 'Not available',
      details: hasPushManager ? 'Push Manager API is available' : 'Push Manager not supported'
    });
    if (!hasPushManager) supported = false;

    // Special iOS permission state check
    const iOSPermissionIssue = this.checkiOSPermissionIssue();

    return {
      isIOS: true,
      supported,
      requirements,
      criticalIssues,
      iOSPermissionIssue,
      summary: {
        total: requirements.length,
        met: requirements.filter(r => r.met).length,
        critical: requirements.filter(r => !r.met && r.requirement !== 'Apple PWA meta tags').length
      }
    };
  }

  /**
   * Check for iOS-specific permission issues
   * iOS Safari Web Push has unique behaviors that need special handling
   */
  private checkiOSPermissionIssue() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return null;

    const isPWAInstalled = (window.navigator as any).standalone === true;
    const notificationPermission = 'Notification' in window ? Notification.permission : 'not-available';

    // Critical iOS issue: Permission denied requires PWA reinstallation
    if (notificationPermission === 'denied' && isPWAInstalled) {
      return {
        type: 'permission-denied-pwa-reinstall-required',
        severity: 'critical',
        title: 'iOS Permission Denied - PWA Reinstall Required',
        message: 'iOS Safari Web Push permission was denied. The PWA must be removed and re-added to home screen.',
        solution: [
          '1. Remove this app from your home screen (long press → Remove App)',
          '2. Clear Safari cache (Settings → Safari → Clear History and Website Data)',
          '3. Visit the website again in Safari',
          '4. Add to home screen again',
          '5. Open from home screen and try subscribing again'
        ],
        documentation: 'https://documentation.onesignal.com/docs/safari-web-push-for-ios#mobile-web-push-requirements'
      };
    }

    // PWA not installed but trying to use push notifications
    if (!isPWAInstalled && notificationPermission !== 'denied') {
      return {
        type: 'pwa-not-installed',
        severity: 'critical',
        title: 'PWA Not Installed to Home Screen',
        message: 'iOS Safari Web Push requires the PWA to be installed to home screen first.',
        solution: [
          '1. Tap the Share button in Safari',
          '2. Scroll down and tap "Add to Home Screen"',
          '3. Tap "Add" to confirm',
          '4. Open the app from your home screen (not Safari)',
          '5. Then try subscribing to notifications'
        ],
        documentation: 'https://documentation.onesignal.com/docs/safari-web-push-for-ios#4-encourage-users-to-click-add-to-home-screen'
      };
    }

    // Permission granted but might have other issues
    if (notificationPermission === 'granted' && isPWAInstalled) {
      return {
        type: 'permission-granted-check-subscription',
        severity: 'info',
        title: 'Permission Granted - Check Subscription',
        message: 'Permission is granted. If notifications still don\'t work, there might be a subscription issue.',
        solution: [
          '1. Check if OneSignal subscription is active',
          '2. Verify User ID and Push Token are generated',
          '3. Test sending a notification from OneSignal dashboard',
          '4. If still not working, try removing and re-adding PWA'
        ]
      };
    }

    return null;
  }

  /**
   * Get iOS version from user agent
   */
  private getIOSVersion(): string | null {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      return `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}`;
    }
    return null;
  }

  /**
   * Compare version strings (e.g., "16.4" vs "16.3")
   */
  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }

    return 0;
  }

  /**
   * Get comprehensive diagnostic information
   */
  public getDiagnosticInfo() {
    const browserCapabilities = detectBrowserCapabilities();
    const iOSRequirements = this.checkiOSWebPushRequirements();

    return {
      initialized: this.initialized,
      initializing: this.initializing,
      initializationAttempted: this.initializationAttempted,
      isNative: this.isNative,
      networkOnline: this.networkMonitor,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      platform: Capacitor.getPlatform(),
      browserCapabilities,
      iOSWebPushRequirements: iOSRequirements,
      oneSignalAvailable: !this.isNative && typeof window !== 'undefined' && !!window.OneSignalDeferred,
      currentUrl: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Get platform information
   */
  public getPlatformInfo() {
    return {
      isNative: this.isNative,
      platform: Capacitor.getPlatform(),
      isSupported: this.isNotificationSupported(),
    };
  }
}

// Export singleton instance
export const oneSignalService = OneSignalService.getInstance();

