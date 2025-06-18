import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { createOneSignalError, validatePushNotificationSupport, ERROR_CODES, OneSignalError, detectBrowserCapabilities } from '../utils/errorHandling';

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
   * Initialize OneSignal SDK v16
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

    // Prevent multiple initialization attempts for v16
    if (this.initializationAttempted && !this.initialized) {
      console.warn('OneSignal initialization already attempted and failed. Use retryInitialization() instead.');
      return false;
    }

    this.initializing = true;
    this.initializationAttempted = true;

    try {
      // Skip validation in test environments (like Playwright)
      const isTestEnvironment = navigator.userAgent.includes('HeadlessChrome') ||
                                navigator.userAgent.includes('Playwright');

      // Comprehensive pre-initialization checks
      await this.performPreInitializationChecks(isTestEnvironment);

      if (this.isNative) {
        // Initialize native push notifications
        await this.initializeNativePush();
      } else {
        // Initialize web OneSignal v16
        await this.initializeWebOneSignal();
      }

      this.initialized = true;
      console.log('OneSignal initialized successfully');
      return true;
    } catch (error) {
      const oneSignalError = createOneSignalError(error, 'SDK_INIT_FAILED');
      console.error('Failed to initialize OneSignal:', oneSignalError);
      throw oneSignalError;
    } finally {
      this.initializing = false;
    }
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
    // Request permissions
    const permissionStatus = await PushNotifications.requestPermissions();
    
    if (permissionStatus.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();

      // Set up listeners
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        this.handleNativeTokenReceived(token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received: ', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('Push notification action performed', notification);
      });
    }
  }

  /**
   * Handle native token received and register with OneSignal
   */
  private async handleNativeTokenReceived(token: string): Promise<void> {
    try {
      // For native apps, we need to use OneSignal REST API to register the device
      // This is a simplified approach - in production, you might want to use OneSignal's native SDKs
      console.log('Native push token received:', token);
      
      // Store token for later use
      localStorage.setItem('pushToken', token);
    } catch (error) {
      console.error('Failed to handle native token:', error);
    }
  }

  /**
   * Request notification permissions
   */
  public async requestPermission(): Promise<NotificationPermissionState> {
    try {
      if (this.isNative) {
        const result = await PushNotifications.requestPermissions();
        return {
          permission: result.receive === 'granted' ? 'granted' : 'denied',
          isSupported: true,
          isNative: true,
        };
      } else {
        // Web platform v16
        if (!this.oneSignal) {
          throw new OneSignalError(ERROR_CODES.SDK_INIT_FAILED);
        }

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
    } catch (error) {
      const oneSignalError = createOneSignalError(error, 'PERMISSION_DENIED');
      console.error('Failed to request notification permission:', oneSignalError);
      throw oneSignalError;
    }
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
   * Subscribe user to notifications
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

      if (this.isNative) {
        // For native, registration happens during initialization
        const token = localStorage.getItem('pushToken');
        return {
          pushToken: token || undefined,
          subscribed: !!token,
        };
      } else {
        // Web platform v16
        if (!this.oneSignal) {
          throw new OneSignalError(ERROR_CODES.SDK_INIT_FAILED);
        }

        // Check permission first
        const currentPermission = Notification.permission;
        if (currentPermission !== 'granted') {
          throw new OneSignalError(ERROR_CODES.PERMISSION_DENIED);
        }

        await this.oneSignal.User.PushSubscription.optIn();
        const pushSubscription = this.oneSignal.User.PushSubscription.id;
        const userId = this.oneSignal.User.onesignalId;

        // Verify subscription was successful
        if (!this.oneSignal.User.PushSubscription.optedIn) {
          throw new OneSignalError(ERROR_CODES.SUBSCRIPTION_FAILED);
        }

        return {
          userId: userId || undefined,
          pushToken: pushSubscription || undefined,
          subscribed: this.oneSignal.User.PushSubscription.optedIn,
        };
      }
    } catch (error) {
      const oneSignalError = createOneSignalError(error, 'SUBSCRIPTION_FAILED');
      console.error('Failed to subscribe user:', oneSignalError);
      throw oneSignalError;
    }
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
   * Get current user subscription status
   */
  public async getUserStatus(): Promise<OneSignalUser> {
    try {
      if (!this.initialized) {
        return { subscribed: false };
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
   * Get comprehensive diagnostic information
   */
  public getDiagnosticInfo() {
    const browserCapabilities = detectBrowserCapabilities();

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
