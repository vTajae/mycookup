/**
 * Unified Logging Service
 * 
 * Provides a single interface for all logging systems in the application:
 * - iOS Logging Service (server-side logging)
 * - WebSocket Logging (real-time debugging)
 * - Debug Logger (local debugging)
 * - Console Logging (standard browser console)
 * 
 * This service intelligently routes logs to appropriate systems based on
 * environment, log level, and configuration.
 */

import { iosLoggingService, type LogLevel, type LogSource } from './iosLoggingService';
import { webSocketLoggingIntegration } from './webSocketLoggingIntegration';
import { debugLogger } from './debugLogger';

export interface UnifiedLogEntry {
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  source?: LogSource;
  timestamp?: string;
  forceWebSocket?: boolean; // Force send via WebSocket even if not critical
  skipConsole?: boolean; // Skip console output to avoid duplication
}

export interface LoggingSystemStatus {
  iosLogging: {
    enabled: boolean;
    sessionId: string;
    pendingLogs: number;
  };
  webSocketLogging: {
    enabled: boolean;
    connected: boolean;
    connectionId?: string;
    queuedMessages: number;
  };
  debugLogger: {
    enabled: boolean;
    logCount: number;
  };
}

export class UnifiedLoggingService {
  private initialized = false;

  /**
   * Initialize the unified logging service
   */
  public initialize(): void {
    if (this.initialized) return;

    // Log initialization across all systems
    this.logToAll('info', 'unified-logging', 'Unified logging service initialized', {
      timestamp: new Date().toISOString(),
      systems: ['iosLogging', 'webSocketLogging', 'debugLogger']
    }, 'system');

    this.initialized = true;
  }

  /**
   * Main logging method - intelligently routes to appropriate systems
   */
  public log(entry: UnifiedLogEntry): void {
    const {
      level,
      category,
      message,
      data,
      source = 'app',
      forceWebSocket = false,
      skipConsole = false
    } = entry;

    // Always log to iOS logging service (server-side)
    iosLoggingService.log(level, category, message, data, source);

    // Always log to debug logger (local debugging)
    debugLogger[level](category, message, data);

    // Conditionally log to console (for WebSocket pickup)
    const shouldLogToConsole = !skipConsole && (
      level === 'error' || 
      level === 'critical' || 
      level === 'warn' ||
      forceWebSocket ||
      category === 'service-worker' ||
      category === 'push-notification' ||
      category === 'camera' ||
      category === 'network'
    );

    if (shouldLogToConsole) {
      const logMessage = `[${source.toUpperCase()}] ${category}: ${message}`;
      const logData = data ? { 
        ...data, 
        unifiedLogging: true,
        category,
        source,
        level
      } : { unifiedLogging: true, category, source, level };

      switch (level) {
        case 'critical':
        case 'error':
          console.error(logMessage, logData);
          break;
        case 'warn':
          console.warn(logMessage, logData);
          break;
        case 'info':
          console.info(logMessage, logData);
          break;
        case 'debug':
          console.debug(logMessage, logData);
          break;
        default:
          console.log(logMessage, logData);
      }
    }
  }

  /**
   * Convenience methods for different log levels
   */
  public debug(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log({ level: 'debug', category, message, data, source });
  }

  public info(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log({ level: 'info', category, message, data, source });
  }

  public warn(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log({ level: 'warn', category, message, data, source });
  }

  public error(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log({ level: 'error', category, message, data, source });
  }

  public critical(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log({ level: 'critical', category, message, data, source, forceWebSocket: true });
  }

  /**
   * Force log to WebSocket (useful for testing or important events)
   */
  public logToWebSocket(level: LogLevel, category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log({ level, category, message, data, source, forceWebSocket: true });
  }

  /**
   * Log to all systems (useful for system events)
   */
  public logToAll(level: LogLevel, category: string, message: string, data?: any, source: LogSource = 'system'): void {
    this.log({ level, category, message, data, source, forceWebSocket: true, skipConsole: false });
  }

  /**
   * Get status of all logging systems
   */
  public getStatus(): LoggingSystemStatus {
    const iosSession = iosLoggingService.getSessionInfo();
    const wsStatus = webSocketLoggingIntegration.getStatus();
    const debugLogs = debugLogger.getLogs();

    return {
      iosLogging: {
        enabled: true, // iOS logging is always enabled when service exists
        sessionId: iosSession.sessionId,
        pendingLogs: (iosLoggingService as any).pendingLogs?.length || 0
      },
      webSocketLogging: {
        enabled: wsStatus.enabled,
        connected: wsStatus.connected,
        connectionId: wsStatus.connectionId,
        queuedMessages: wsStatus.queuedMessages
      },
      debugLogger: {
        enabled: true, // Debug logger is always enabled
        logCount: debugLogs.length
      }
    };
  }

  /**
   * Test all logging systems
   */
  public testAllSystems(): void {
    const testData = {
      timestamp: new Date().toISOString(),
      testId: `test_${Date.now()}`,
      systems: ['ios', 'websocket', 'debug', 'console']
    };

    this.info('test', '🧪 Testing iOS logging system', testData, 'system');
    this.warn('test', '⚠️ Testing warning level logging', testData, 'system');
    this.error('test', '❌ Testing error level logging', testData, 'system');
    this.logToWebSocket('info', 'test', '🔗 Testing WebSocket logging specifically', testData, 'system');
    
    // Test console directly for WebSocket pickup
    console.log('🔍 Direct console test for WebSocket logging', testData);
    
    this.info('test', '✅ All logging systems tested', {
      ...testData,
      status: this.getStatus()
    }, 'system');
  }

  /**
   * Log service worker events (high priority for iOS PWA debugging)
   */
  public logServiceWorker(level: LogLevel, message: string, data?: any): void {
    this.log({
      level,
      category: 'service-worker',
      message,
      data,
      source: 'service-worker',
      forceWebSocket: level === 'error' || level === 'warn'
    });
  }

  /**
   * Log push notification events (high priority for iOS PWA debugging)
   */
  public logPushNotification(level: LogLevel, message: string, data?: any): void {
    this.log({
      level,
      category: 'push-notification',
      message,
      data,
      source: 'push-notification',
      forceWebSocket: true // Always send push notification logs to WebSocket
    });
  }

  /**
   * Log camera/media events (important for Capacitor debugging)
   */
  public logCamera(level: LogLevel, message: string, data?: any): void {
    this.log({
      level,
      category: 'camera',
      message,
      data,
      source: 'camera',
      forceWebSocket: level === 'error' || level === 'warn'
    });
  }

  /**
   * Log network events (important for connectivity debugging)
   */
  public logNetwork(level: LogLevel, message: string, data?: any): void {
    this.log({
      level,
      category: 'network',
      message,
      data,
      source: 'network',
      forceWebSocket: level === 'error'
    });
  }

  /**
   * Log PWA-specific events (installation, display mode changes, etc.)
   */
  public logPWA(level: LogLevel, message: string, data?: any): void {
    this.log({
      level,
      category: 'pwa',
      message,
      data,
      source: 'app',
      forceWebSocket: true // PWA events are always important for debugging
    });
  }

  /**
   * Emergency logging - sends to all systems immediately
   */
  public emergency(message: string, data?: any): void {
    this.critical('emergency', `🚨 EMERGENCY: ${message}`, data, 'system');
    
    // Also send directly to console to ensure WebSocket pickup
    console.error(`🚨 EMERGENCY: ${message}`, {
      ...data,
      emergency: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if unified logging is properly initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get comprehensive debug information
   */
  public getDebugInfo() {
    return {
      unified: {
        initialized: this.initialized,
        timestamp: new Date().toISOString()
      },
      systems: this.getStatus(),
      webSocketDetails: webSocketLoggingIntegration.getDebugInfo(),
      iosSession: iosLoggingService.getSessionInfo()
    };
  }
}

// Create singleton instance
export const unifiedLoggingService = new UnifiedLoggingService();

// Global debugging helper
if (typeof window !== 'undefined') {
  (window as any).unifiedLogger = {
    test: () => unifiedLoggingService.testAllSystems(),
    status: () => unifiedLoggingService.getStatus(),
    debug: () => unifiedLoggingService.getDebugInfo(),
    emergency: (msg: string, data?: any) => unifiedLoggingService.emergency(msg, data),
    log: (level: LogLevel, category: string, message: string, data?: any) => 
      unifiedLoggingService.log({ level, category, message, data })
  };
}
