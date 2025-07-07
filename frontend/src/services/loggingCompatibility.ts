/**
 * Logging Compatibility Layer
 * 
 * Provides backward compatibility for existing logging code while
 * gradually migrating to the unified logging system.
 * 
 * This module ensures that existing services continue to work
 * without modification while new code can use the unified interface.
 */

import { unifiedLoggingService } from './unifiedLoggingService';
import { iosLoggingService } from './iosLoggingService';
import { debugLogger } from './debugLogger';
import { webSocketLoggingIntegration } from './webSocketLoggingIntegration';

/**
 * Enhanced debug logger with unified logging integration
 */
export const enhancedDebugLogger = {
  ...debugLogger,
  
  // Override methods to also use unified logging for important messages
  error: (category: string, message: string, data?: any) => {
    debugLogger.error(category, message, data);
    unifiedLoggingService.error(category, message, data);
  },
  
  warn: (category: string, message: string, data?: any) => {
    debugLogger.warn(category, message, data);
    // Only send warnings for critical categories to unified logging
    if (category === 'service-worker' || category === 'push-notification' || category === 'camera') {
      unifiedLoggingService.warn(category, message, data);
    }
  },
  
  info: (category: string, message: string, data?: any) => {
    debugLogger.info(category, message, data);
    // Only send info for system categories to unified logging
    if (category === 'app' || category === 'system' || category === 'integration') {
      unifiedLoggingService.info(category, message, data);
    }
  }
};

/**
 * Enhanced iOS logging service with unified logging integration
 */
export const enhancedIOSLoggingService = {
  ...iosLoggingService,
  
  // Override critical methods to ensure they reach all logging systems
  critical: (category: string, message: string, data?: any, source = 'app' as any) => {
    iosLoggingService.critical(category, message, data, source);
    unifiedLoggingService.critical(category, message, data, source);
  },
  
  error: (category: string, message: string, data?: any, source = 'app' as any) => {
    iosLoggingService.error(category, message, data, source);
    unifiedLoggingService.error(category, message, data, source);
  }
};

/**
 * Logging helper functions for common use cases
 */
export const loggingHelpers = {
  /**
   * Log service worker events with proper routing
   */
  serviceWorker: {
    info: (message: string, data?: any) => {
      unifiedLoggingService.logServiceWorker('info', message, data);
    },
    warn: (message: string, data?: any) => {
      unifiedLoggingService.logServiceWorker('warn', message, data);
    },
    error: (message: string, data?: any) => {
      unifiedLoggingService.logServiceWorker('error', message, data);
    }
  },

  /**
   * Log push notification events with proper routing
   */
  pushNotification: {
    info: (message: string, data?: any) => {
      unifiedLoggingService.logPushNotification('info', message, data);
    },
    warn: (message: string, data?: any) => {
      unifiedLoggingService.logPushNotification('warn', message, data);
    },
    error: (message: string, data?: any) => {
      unifiedLoggingService.logPushNotification('error', message, data);
    }
  },

  /**
   * Log camera/media events with proper routing
   */
  camera: {
    info: (message: string, data?: any) => {
      unifiedLoggingService.logCamera('info', message, data);
    },
    warn: (message: string, data?: any) => {
      unifiedLoggingService.logCamera('warn', message, data);
    },
    error: (message: string, data?: any) => {
      unifiedLoggingService.logCamera('error', message, data);
    }
  },

  /**
   * Log network events with proper routing
   */
  network: {
    info: (message: string, data?: any) => {
      unifiedLoggingService.logNetwork('info', message, data);
    },
    warn: (message: string, data?: any) => {
      unifiedLoggingService.logNetwork('warn', message, data);
    },
    error: (message: string, data?: any) => {
      unifiedLoggingService.logNetwork('error', message, data);
    }
  },

  /**
   * Log PWA events with proper routing
   */
  pwa: {
    info: (message: string, data?: any) => {
      unifiedLoggingService.logPWA('info', message, data);
    },
    warn: (message: string, data?: any) => {
      unifiedLoggingService.logPWA('warn', message, data);
    },
    error: (message: string, data?: any) => {
      unifiedLoggingService.logPWA('error', message, data);
    }
  }
};

/**
 * Migration helper to gradually move from old logging to unified logging
 */
export const migrationHelper = {
  /**
   * Check if unified logging is available and working
   */
  isUnifiedLoggingAvailable(): boolean {
    return unifiedLoggingService.isInitialized();
  },

  /**
   * Get status of all logging systems
   */
  getLoggingStatus() {
    return {
      unified: unifiedLoggingService.isInitialized(),
      ios: iosLoggingService.getSessionInfo(),
      webSocket: webSocketLoggingIntegration.getStatus(),
      debug: debugLogger.getLogs().length
    };
  },

  /**
   * Test all logging systems
   */
  testAllSystems() {
    if (unifiedLoggingService.isInitialized()) {
      unifiedLoggingService.testAllSystems();
    } else {
      console.warn('Unified logging not available, testing individual systems');
      debugLogger.info('test', 'Testing debug logger');
      iosLoggingService.info('test', 'Testing iOS logging service');
    }
  },

  /**
   * Migrate a log call from old system to unified system
   */
  migrateLogCall(
    oldSystem: 'debug' | 'ios',
    level: 'debug' | 'info' | 'warn' | 'error' | 'critical',
    category: string,
    message: string,
    data?: any
  ) {
    if (unifiedLoggingService.isInitialized()) {
      unifiedLoggingService[level](category, message, data);
    } else {
      // Fallback to old system
      if (oldSystem === 'debug') {
        debugLogger[level](category, message, data);
      } else {
        iosLoggingService[level](category, message, data);
      }
    }
  }
};

/**
 * Global debugging interface for development
 */
if (typeof window !== 'undefined') {
  (window as any).loggingDebug = {
    // Status and testing
    status: () => migrationHelper.getLoggingStatus(),
    test: () => migrationHelper.testAllSystems(),
    
    // Quick access to helpers
    sw: loggingHelpers.serviceWorker,
    push: loggingHelpers.pushNotification,
    camera: loggingHelpers.camera,
    network: loggingHelpers.network,
    pwa: loggingHelpers.pwa,
    
    // Direct access to services
    unified: unifiedLoggingService,
    ios: iosLoggingService,
    debug: debugLogger,
    ws: webSocketLoggingIntegration,
    
    // Emergency logging
    emergency: (message: string, data?: any) => {
      unifiedLoggingService.emergency(message, data);
    },
    
    // Migration helper
    migrate: migrationHelper
  };
}

/**
 * Automatic error boundary integration
 */
export function setupErrorBoundaryLogging() {
  // Catch React/Preact errors that might not be caught elsewhere
  window.addEventListener('error', (event) => {
    if (unifiedLoggingService.isInitialized()) {
      unifiedLoggingService.critical('error-boundary', 'Uncaught error in application', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (unifiedLoggingService.isInitialized()) {
      unifiedLoggingService.critical('error-boundary', 'Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Performance monitoring integration
 */
export function setupPerformanceLogging() {
  // Log performance metrics periodically
  if ('performance' in window && 'getEntriesByType' in performance) {
    setInterval(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation && unifiedLoggingService.isInitialized()) {
        unifiedLoggingService.debug('performance', 'Navigation timing metrics', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
        });
      }
    }, 30000); // Log every 30 seconds
  }
}

/**
 * Initialize all compatibility features
 */
export function initializeLoggingCompatibility() {
  setupErrorBoundaryLogging();
  setupPerformanceLogging();
  
  if (unifiedLoggingService.isInitialized()) {
    unifiedLoggingService.info('compatibility', 'Logging compatibility layer initialized');
  }
}
