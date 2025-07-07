/**
 * WebSocket Logging Integration Service
 * 
 * Integrates WebSocket console logging with existing logging infrastructure
 * and provides a unified interface for iOS PWA debugging.
 */

import { webSocketConsoleLogger, WebSocketConsoleLogger } from './webSocketConsoleLogger';
import { getWebSocketLoggerConfig, isWebSocketLoggingEnabled } from './webSocketLoggerConfig';
import { debugLogger } from './debugLogger';
import { iosLoggingService } from './iosLoggingService';

export interface WebSocketLoggingStatus {
  enabled: boolean;
  connected: boolean;
  connectionId?: string;
  workerUrl: string;
  environment: string;
  lastConnected?: Date;
  reconnectAttempts: number;
  queuedMessages: number;
}

export class WebSocketLoggingIntegration {
  private initialized = false;
  private logger: WebSocketConsoleLogger;

  constructor() {
    this.logger = webSocketConsoleLogger;
  }

  /**
   * Initialize WebSocket logging integration
   */
  public async initialize(): Promise<boolean> {
    try {
      // Check if WebSocket logging should be enabled
      if (!isWebSocketLoggingEnabled()) {
        debugLogger.info('websocket', 'WebSocket logging disabled for this environment');
        return false;
      }

      // Get environment-specific configuration
      const config = getWebSocketLoggerConfig();
      
      debugLogger.info('websocket', 'Initializing WebSocket logging integration', {
        workerUrl: config.workerUrl,
        autoConnect: config.autoConnect,
        logLevels: config.logLevels
      });

      // Initialize the WebSocket console logger
      this.logger.initialize(config);

      // Connect if auto-connect is enabled
      if (config.autoConnect) {
        await this.connect();
      }

      this.initialized = true;
      
      // Log successful initialization
      debugLogger.info('websocket', 'WebSocket logging integration initialized successfully');
      
      // Also log to iOS logging service for comprehensive tracking
      iosLoggingService.log('info', 'WebSocket logging integration initialized', {
        config: {
          workerUrl: config.workerUrl,
          autoConnect: config.autoConnect,
          logLevels: config.logLevels
        }
      });

      return true;

    } catch (error) {
      debugLogger.error('websocket', 'Failed to initialize WebSocket logging integration', { error });
      iosLoggingService.log('error', 'WebSocket logging integration failed', { error });
      return false;
    }
  }

  /**
   * Connect to WebSocket logger
   */
  public async connect(): Promise<boolean> {
    try {
      await this.logger.connect();
      debugLogger.info('websocket', 'WebSocket logger connected successfully');
      return true;
    } catch (error) {
      debugLogger.error('websocket', 'Failed to connect WebSocket logger', { error });
      return false;
    }
  }

  /**
   * Disconnect WebSocket logger
   */
  public disconnect(): void {
    this.logger.disconnect();
    debugLogger.info('websocket', 'WebSocket logger disconnected');
  }

  /**
   * Get current status of WebSocket logging
   */
  public getStatus(): WebSocketLoggingStatus {
    const connectionStatus = this.logger.getStatus();
    const config = getWebSocketLoggerConfig();
    
    return {
      enabled: isWebSocketLoggingEnabled(),
      connected: connectionStatus.connected,
      connectionId: connectionStatus.connectionId,
      workerUrl: config.workerUrl,
      environment: this.getEnvironment(),
      lastConnected: connectionStatus.lastConnected,
      reconnectAttempts: connectionStatus.reconnectAttempts,
      queuedMessages: (this.logger as any).messageQueue?.length || 0
    };
  }

  /**
   * Send a test message to verify WebSocket connection
   */
  public sendTestMessage(): void {
    console.log('🧪 WebSocket Logger Test Message', {
      timestamp: new Date().toISOString(),
      testData: {
        string: 'Hello WebSocket Logger!',
        number: 42,
        boolean: true,
        object: { nested: { value: 'test' } },
        array: [1, 2, 3, 'test']
      },
      deviceInfo: this.getDeviceInfo()
    });

    console.warn('⚠️ WebSocket Logger Test Warning');
    console.error('❌ WebSocket Logger Test Error');
    console.info('ℹ️ WebSocket Logger Test Info');
  }

  /**
   * Enable WebSocket logging for debugging
   */
  public enable(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableWebSocketLogging', 'true');
      console.log('✅ WebSocket logging enabled. Refresh the page to activate.');
    }
  }

  /**
   * Disable WebSocket logging
   */
  public disable(): void {
    this.disconnect();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('enableWebSocketLogging');
      console.log('❌ WebSocket logging disabled.');
    }
  }

  /**
   * Get comprehensive logging status for debugging
   */
  public getDebugInfo() {
    const wsStatus = this.getStatus();
    const iosLoggingStatus = iosLoggingService.getStatus();
    
    return {
      webSocket: wsStatus,
      iosLogging: iosLoggingStatus,
      debugLogger: {
        enabled: true,
        logCount: debugLogger.getLogs().length
      },
      device: this.getDeviceInfo(),
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Log debug information to all available loggers
   */
  public logDebugInfo(): void {
    const debugInfo = this.getDebugInfo();
    
    console.group('🔍 WebSocket Logging Debug Information');
    console.log('WebSocket Status:', debugInfo.webSocket);
    console.log('iOS Logging Status:', debugInfo.iosLogging);
    console.log('Device Info:', debugInfo.device);
    console.log('Environment:', debugInfo.environment);
    console.groupEnd();

    // Also send to other logging services
    debugLogger.info('websocket-debug', 'Debug information logged', debugInfo);
    iosLoggingService.log('info', 'WebSocket logging debug info', debugInfo);
  }

  /**
   * Restore original console methods and cleanup
   */
  public restore(): void {
    this.logger.restore();
    this.initialized = false;
    debugLogger.info('websocket', 'WebSocket logging integration restored');
  }

  /**
   * Check if WebSocket logging is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current environment
   */
  private getEnvironment(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local';
    }
    
    if (hostname.includes('development.') || hostname.includes('-dev.')) {
      return 'development';
    }
    
    return 'production';
  }

  /**
   * Get device information for debugging
   */
  private getDeviceInfo() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isPWAStandalone = (window.navigator as any).standalone === true;
    const hasDisplayStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    
    return {
      isIOS,
      isPWA: isPWAStandalone || hasDisplayStandalone,
      isStandalone: isPWAStandalone || hasDisplayStandalone,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }
}

// Create singleton instance
export const webSocketLoggingIntegration = new WebSocketLoggingIntegration();

// Global debugging helpers (available in console)
if (typeof window !== 'undefined') {
  (window as any).wsLogger = {
    status: () => webSocketLoggingIntegration.getStatus(),
    connect: () => webSocketLoggingIntegration.connect(),
    disconnect: () => webSocketLoggingIntegration.disconnect(),
    test: () => webSocketLoggingIntegration.sendTestMessage(),
    enable: () => webSocketLoggingIntegration.enable(),
    disable: () => webSocketLoggingIntegration.disable(),
    debug: () => webSocketLoggingIntegration.logDebugInfo(),
    info: () => webSocketLoggingIntegration.getDebugInfo()
  };
}
