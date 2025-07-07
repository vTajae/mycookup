/**
 * Logging Integration Service
 *
 * Integrates the iOS logging service with existing PWA services
 * and the new WebSocket logging system to provide comprehensive
 * logging coverage for iOS-specific issues.
 */

import { iosLoggingService } from './iosLoggingService';
import { webSocketLoggingIntegration } from './webSocketLoggingIntegration';

/**
 * Service Worker Logging Integration
 */
export function integrateServiceWorkerLogging(): void {
  // Monitor service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/OneSignalSDK.sw.js')
      .then((registration) => {
        iosLoggingService.info('service-worker', 'Service worker registered successfully', {
          scope: registration.scope,
          scriptURL: registration.active?.scriptURL || 'pending'
        }, 'service-worker');

        // Monitor service worker updates
        registration.addEventListener('updatefound', () => {
          iosLoggingService.info('service-worker', 'Service worker update found', {
            scope: registration.scope
          }, 'service-worker');
        });

      })
      .catch((error) => {
        iosLoggingService.error('service-worker', 'Service worker registration failed', {
          error: error.message,
          stack: error.stack
        }, 'service-worker');
      });

    // Monitor service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      iosLoggingService.debug('service-worker', 'Service worker message received', {
        data: event.data,
        origin: event.origin
      }, 'service-worker');
    });

    // Monitor service worker controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      iosLoggingService.info('service-worker', 'Service worker controller changed', undefined, 'service-worker');
    });
  }
}

/**
 * Push Notification Logging Integration
 */
export function integratePushNotificationLogging(): void {
  // Monitor notification permission changes
  if ('Notification' in window) {
    const originalRequestPermission = Notification.requestPermission;
    Notification.requestPermission = async (...args: any[]) => {
      iosLoggingService.info('push-notification', 'Notification permission requested', undefined, 'push-notification');
      
      try {
        const result = await originalRequestPermission.apply(Notification, args);
        iosLoggingService.info('push-notification', `Notification permission result: ${result}`, {
          permission: result
        }, 'push-notification');
        return result;
      } catch (error) {
        iosLoggingService.error('push-notification', 'Notification permission request failed', {
          error: error instanceof Error ? error.message : String(error)
        }, 'push-notification');
        throw error;
      }
    };
  }

  // Monitor push subscription changes
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      // Monitor push subscription
      registration.pushManager.getSubscription()
        .then((subscription) => {
          if (subscription) {
            iosLoggingService.info('push-notification', 'Push subscription found', {
              endpoint: subscription.endpoint,
              keys: subscription.toJSON()
            }, 'push-notification');
          } else {
            iosLoggingService.info('push-notification', 'No push subscription found', undefined, 'push-notification');
          }
        })
        .catch((error) => {
          iosLoggingService.error('push-notification', 'Failed to get push subscription', {
            error: error.message
          }, 'push-notification');
        });
    });
  }
}

/**
 * Camera API Logging Integration
 */
export function integrateCameraLogging(): void {
  // Monitor camera access
  if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
      iosLoggingService.info('camera', 'Camera access requested', {
        constraints
      }, 'camera');

      try {
        const stream = await originalGetUserMedia.call(navigator.mediaDevices, constraints);
        iosLoggingService.info('camera', 'Camera access granted', {
          tracks: stream.getTracks().map(track => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState
          }))
        }, 'camera');
        return stream;
      } catch (error) {
        iosLoggingService.error('camera', 'Camera access denied or failed', {
          error: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : 'Unknown'
        }, 'camera');
        throw error;
      }
    };
  }
}

/**
 * PWA Installation Logging Integration
 */
export function integratePWAInstallationLogging(): void {
  // Monitor PWA installation prompt
  window.addEventListener('beforeinstallprompt', (event) => {
    iosLoggingService.info('pwa', 'PWA installation prompt available', {
      platforms: (event as any).platforms
    }, 'app');
  });

  // Monitor PWA installation
  window.addEventListener('appinstalled', () => {
    iosLoggingService.info('pwa', 'PWA installed successfully', undefined, 'app');
  });

  // Monitor display mode changes
  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  mediaQuery.addEventListener('change', (event) => {
    iosLoggingService.info('pwa', `Display mode changed to: ${event.matches ? 'standalone' : 'browser'}`, {
      standalone: event.matches
    }, 'app');
  });
}

/**
 * OneSignal Integration Logging
 */
export function integrateOneSignalLogging(): void {
  // Monitor OneSignal initialization
  if (typeof window !== 'undefined' && (window as any).OneSignal) {
    const OneSignal = (window as any).OneSignal;

    // Monitor OneSignal ready state
    OneSignal.push(() => {
      iosLoggingService.info('push-notification', 'OneSignal initialized', undefined, 'push-notification');

      // Monitor subscription changes
      OneSignal.on('subscriptionChange', (isSubscribed: boolean) => {
        iosLoggingService.info('push-notification', `OneSignal subscription changed: ${isSubscribed}`, {
          subscribed: isSubscribed
        }, 'push-notification');
      });

      // Monitor notification display
      OneSignal.on('notificationDisplay', (event: any) => {
        iosLoggingService.info('push-notification', 'OneSignal notification displayed', {
          notification: event
        }, 'push-notification');
      });

      // Monitor notification clicks
      OneSignal.on('notificationClick', (event: any) => {
        iosLoggingService.info('push-notification', 'OneSignal notification clicked', {
          notification: event
        }, 'push-notification');
      });

      // Monitor permission changes
      OneSignal.on('permissionChange', (update: any) => {
        iosLoggingService.info('push-notification', 'OneSignal permission changed', {
          permission: update
        }, 'push-notification');
      });
    });
  }
}

/**
 * Capacitor Integration Logging
 */
export function integrateCapacitorLogging(): void {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const Capacitor = (window as any).Capacitor;

    iosLoggingService.info('system', 'Capacitor detected', {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform()
    }, 'system');

    // Monitor Capacitor plugin calls
    if (Capacitor.Plugins) {
      Object.keys(Capacitor.Plugins).forEach(pluginName => {
        const plugin = Capacitor.Plugins[pluginName];
        if (plugin && typeof plugin === 'object') {
          iosLoggingService.debug('system', `Capacitor plugin available: ${pluginName}`, undefined, 'system');
        }
      });
    }
  }
}

/**
 * WebSocket Logging Integration
 */
export function integrateWebSocketLogging(): void {
  // Initialize WebSocket logging integration
  webSocketLoggingIntegration.initialize()
    .then((initialized) => {
      if (initialized) {
        iosLoggingService.info('integration', 'WebSocket logging integration initialized successfully', {
          status: webSocketLoggingIntegration.getStatus()
        }, 'system');

        // Log a test message to verify the integration
        console.log('🔗 WebSocket logging integration active - iOS PWA debugging enabled');
      } else {
        iosLoggingService.debug('integration', 'WebSocket logging integration skipped (disabled for this environment)', undefined, 'system');
      }
    })
    .catch((error) => {
      iosLoggingService.error('integration', 'WebSocket logging integration failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, 'system');
    });

  // Monitor WebSocket connection status changes
  const checkConnectionStatus = () => {
    const status = webSocketLoggingIntegration.getStatus();
    if (status.enabled && !status.connected) {
      iosLoggingService.warn('integration', 'WebSocket logging connection lost', {
        status,
        reconnectAttempts: status.reconnectAttempts
      }, 'system');
    }
  };

  // Check connection status periodically
  setInterval(checkConnectionStatus, 30000); // Check every 30 seconds
}

/**
 * Enhanced iOS Logging Service Integration
 * Bridges iOS logging service with WebSocket logging for comprehensive coverage
 */
export function integrateIOSLoggingWithWebSocket(): void {
  // Get the original log method from iOS logging service
  const originalLog = iosLoggingService.log.bind(iosLoggingService);

  // Override the log method to also send critical logs via WebSocket
  iosLoggingService.log = (level, category, message, data, source = 'app') => {
    // Call original logging method
    originalLog(level, category, message, data, source);

    // For critical errors or important system events, also log to console
    // so they get picked up by WebSocket logging
    if (level === 'critical' || level === 'error' ||
        (level === 'warn' && (category === 'service-worker' || category === 'push-notification'))) {

      const logMessage = `[${source.toUpperCase()}] ${category}: ${message}`;
      const logData = data ? { ...data, iosLoggingCategory: category, iosLoggingSource: source } : undefined;

      switch (level) {
        case 'critical':
        case 'error':
          console.error(logMessage, logData);
          break;
        case 'warn':
          console.warn(logMessage, logData);
          break;
        default:
          console.log(logMessage, logData);
      }
    }
  };

  iosLoggingService.info('integration', 'iOS logging service integrated with WebSocket logging', undefined, 'system');
}

/**
 * Initialize all logging integrations
 */
export function initializeAllLoggingIntegrations(): void {
  try {
    integrateServiceWorkerLogging();
    iosLoggingService.debug('integration', 'Service worker logging integration initialized', undefined, 'system');
  } catch (error) {
    iosLoggingService.error('integration', 'Failed to initialize service worker logging', { error }, 'system');
  }

  try {
    integratePushNotificationLogging();
    iosLoggingService.debug('integration', 'Push notification logging integration initialized', undefined, 'system');
  } catch (error) {
    iosLoggingService.error('integration', 'Failed to initialize push notification logging', { error }, 'system');
  }

  try {
    integrateCameraLogging();
    iosLoggingService.debug('integration', 'Camera logging integration initialized', undefined, 'system');
  } catch (error) {
    iosLoggingService.error('integration', 'Failed to initialize camera logging', { error }, 'system');
  }

  try {
    integratePWAInstallationLogging();
    iosLoggingService.debug('integration', 'PWA installation logging integration initialized', undefined, 'system');
  } catch (error) {
    iosLoggingService.error('integration', 'Failed to initialize PWA installation logging', { error }, 'system');
  }

  try {
    integrateOneSignalLogging();
    iosLoggingService.debug('integration', 'OneSignal logging integration initialized', undefined, 'system');
  } catch (error) {
    iosLoggingService.error('integration', 'Failed to initialize OneSignal logging', { error }, 'system');
  }

  try {
    integrateCapacitorLogging();
    iosLoggingService.debug('integration', 'Capacitor logging integration initialized', undefined, 'system');
  } catch (error) {
    iosLoggingService.error('integration', 'Failed to initialize Capacitor logging', { error }, 'system');
  }

  try {
    integrateWebSocketLogging();
    iosLoggingService.debug('integration', 'WebSocket logging integration initialized', undefined, 'system');
  } catch (error) {
    iosLoggingService.error('integration', 'Failed to initialize WebSocket logging', { error }, 'system');
  }

  try {
    integrateIOSLoggingWithWebSocket();
    iosLoggingService.debug('integration', 'iOS logging service integrated with WebSocket', undefined, 'system');
  } catch (error) {
    iosLoggingService.error('integration', 'Failed to integrate iOS logging with WebSocket', { error }, 'system');
  }

  iosLoggingService.info('integration', 'All logging integrations initialized', undefined, 'system');
}
