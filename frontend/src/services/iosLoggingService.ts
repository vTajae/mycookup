/**
 * iOS PWA Logging Service
 * 
 * Comprehensive logging service specifically designed for iOS PWA debugging.
 * Uses React Router actions for server-side log processing and storage.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogSource = 'console' | 'network' | 'service-worker' | 'push-notification' | 'camera' | 'app' | 'system';

export interface LogEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
  deviceInfo?: DeviceInfo;
  source: LogSource;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isIOS: boolean;
  isStandalone: boolean;
  viewport: { width: number; height: number };
  capabilities: {
    hasServiceWorker: boolean;
    hasNotificationAPI: boolean;
    hasPushManager: boolean;
    hasWebShare: boolean;
    hasClipboard: boolean;
  };
}

export interface LogBatch {
  sessionId: string;
  deviceInfo: DeviceInfo;
  logs: LogEntry[];
  batchId: string;
  timestamp: string;
}

export interface LoggingConfig {
  enabled: boolean;
  endpoint: string;
  batchSize: number;
  flushInterval: number;
  retryAttempts: number;
  retryDelay: number;
  captureConsole: boolean;
  captureNetwork: boolean;
  captureErrors: boolean;
}

class IOSLoggingService {
  private sessionId: string;
  private deviceInfo: DeviceInfo;
  private pendingLogs: LogEntry[] = [];
  private config: LoggingConfig;
  private flushTimer?: number;
  private originalConsole: Console;
  private originalFetch: typeof fetch;
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.collectDeviceInfo();
    this.originalConsole = { ...console };
    this.originalFetch = window.fetch;
    
    this.config = {
      enabled: true,
      endpoint: '/api/logs',
      batchSize: 10,
      flushInterval: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      captureConsole: true,
      captureNetwork: true,
      captureErrors: true,
    };
  }

  /**
   * Initialize the logging service
   */
  public initialize(config?: Partial<LoggingConfig>): void {
    if (this.isInitialized) return;

    // Merge config
    this.config = { ...this.config, ...config };

    if (!this.config.enabled) return;

    // Set up error handlers
    if (this.config.captureErrors) {
      this.setupErrorHandlers();
    }

    // Set up console interception
    if (this.config.captureConsole) {
      this.setupConsoleInterception();
    }

    // Set up network monitoring
    if (this.config.captureNetwork) {
      this.setupNetworkMonitoring();
    }

    // Start periodic flushing
    this.startPeriodicFlush();

    // Log initialization
    this.log('info', 'system', 'iOS Logging Service initialized', {
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
      config: this.config
    }, 'system');

    this.isInitialized = true;
  }

  /**
   * Log a message
   */
  public log(level: LogLevel, category: string, message: string, data?: any, source: LogSource = 'app'): void {
    if (!this.config.enabled) return;

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level,
      category,
      message,
      data,
      stackTrace: (level === 'error' || level === 'critical') ? new Error().stack : undefined,
      deviceInfo: level === 'critical' ? this.deviceInfo : undefined,
      source
    };

    this.pendingLogs.push(entry);

    // Immediate flush for critical errors
    if (level === 'critical') {
      this.flushLogs();
    }

    // Auto-flush if batch size reached
    if (this.pendingLogs.length >= this.config.batchSize) {
      this.flushLogs();
    }
  }

  // Convenience methods
  public debug(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log('debug', category, message, data, source);
  }

  public info(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log('info', category, message, data, source);
  }

  public warn(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log('warn', category, message, data, source);
  }

  public error(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log('error', category, message, data, source);
  }

  public critical(category: string, message: string, data?: any, source: LogSource = 'app'): void {
    this.log('critical', category, message, data, source);
  }

  /**
   * Manually flush pending logs
   */
  public async flushLogs(): Promise<void> {
    if (this.pendingLogs.length === 0) return;

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    const batch: LogBatch = {
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
      logs: logsToSend,
      batchId: this.generateLogId(),
      timestamp: new Date().toISOString()
    };

    await this.sendLogBatch(batch);
  }

  /**
   * Get session information
   */
  public getSessionInfo(): { sessionId: string; deviceInfo: DeviceInfo } {
    return {
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private collectDeviceInfo(): DeviceInfo {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isIOS,
      isStandalone,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      capabilities: {
        hasServiceWorker: 'serviceWorker' in navigator,
        hasNotificationAPI: 'Notification' in window,
        hasPushManager: 'PushManager' in window,
        hasWebShare: 'share' in navigator,
        hasClipboard: 'clipboard' in navigator
      }
    };
  }

  private setupErrorHandlers(): void {
    // Uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.log('error', 'javascript', 'Uncaught JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      }, 'app');
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'promise', 'Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      }, 'app');
    });

    // Network status changes
    window.addEventListener('online', () => {
      this.log('info', 'network', 'Network connection restored', undefined, 'system');
    });

    window.addEventListener('offline', () => {
      this.log('warn', 'network', 'Network connection lost', undefined, 'system');
    });

    // Visibility changes (important for PWA)
    document.addEventListener('visibilitychange', () => {
      this.log('info', 'pwa', `App visibility changed to: ${document.visibilityState}`, undefined, 'app');
    });
  }

  private setupConsoleInterception(): void {
    const logMethods: Array<{ method: keyof Console; level: LogLevel }> = [
      { method: 'log', level: 'info' },
      { method: 'info', level: 'info' },
      { method: 'warn', level: 'warn' },
      { method: 'error', level: 'error' },
      { method: 'debug', level: 'debug' }
    ];

    logMethods.forEach(({ method, level }) => {
      const originalMethod = this.originalConsole[method];
      (console as any)[method] = (...args: any[]) => {
        // Extract message first to check for filtering
        const message = args.length > 0 ? String(args[0]) : '';

        // Filter out our own logging service messages to prevent infinite loops
        const shouldSkip = message.includes('[iOS-PWA-LOGS]') ||
                          message.includes('📱') ||
                          message.includes('📤') ||
                          message.includes('⚠️') ||
                          message.includes('❌') ||
                          message.includes('[DEBUG_LOGGER]') ||
                          message.includes('debugLogger.ts') ||
                          message.includes('iosLoggingService');

        // Call original console method first
        originalMethod.apply(console, args);

        // Only log to our service if it's not our own message
        if (!shouldSkip) {
          const data = args.length > 1 ? args.slice(1) : undefined;
          this.log(level, 'console', message, data, 'console');
        }
      };
    });
  }

  private setupNetworkMonitoring(): void {
    // Intercept fetch requests
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = args[1]?.method || 'GET';

      // Don't log requests to our own logging endpoint or other internal requests
      if (url.includes('/api/logs') || url.includes('localhost') || url.includes('127.0.0.1')) {
        return this.originalFetch(...args);
      }

      try {
        const response = await this.originalFetch(...args);
        const duration = Date.now() - startTime;

        // Only log external requests to avoid noise
        if (!url.startsWith('data:') && !url.startsWith('blob:')) {
          this.log('info', 'network', `${method} ${url}`, {
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            duration
          }, 'network');
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Only log external request failures
        if (!url.startsWith('data:') && !url.startsWith('blob:')) {
          this.log('error', 'network', `${method} ${url} failed`, {
            url,
            method,
            duration,
            error: error instanceof Error ? error.message : String(error)
          }, 'network');
        }

        throw error;
      }
    };
  }

  private startPeriodicFlush(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushLogs();
    }, this.config.flushInterval);
  }

  private async sendLogBatch(batch: LogBatch, attempt = 1): Promise<void> {
    try {
      const response = await this.originalFetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Source': 'iOS-PWA',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(batch)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success - logs have been sent to server
      console.log(`📤 [iOS-PWA-LOGS] Sent ${batch.logs.length} logs to server`);

    } catch (error) {
      console.warn(`⚠️ [iOS-PWA-LOGS] Failed to send logs (attempt ${attempt}):`, error);

      // Retry logic
      if (attempt < this.config.retryAttempts) {
        setTimeout(() => {
          this.sendLogBatch(batch, attempt + 1);
        }, this.config.retryDelay * attempt);
      } else {
        console.error(`❌ [iOS-PWA-LOGS] Failed to send logs after ${this.config.retryAttempts} attempts`);
        
        // Store failed logs in localStorage as fallback
        this.storeFailedLogs(batch);
      }
    }
  }

  private storeFailedLogs(batch: LogBatch): void {
    try {
      const stored = localStorage.getItem('failed_logs') || '[]';
      const failedLogs = JSON.parse(stored);
      failedLogs.push(batch);
      
      // Keep only the last 100 failed log batches
      if (failedLogs.length > 100) {
        failedLogs.splice(0, failedLogs.length - 100);
      }
      
      localStorage.setItem('failed_logs', JSON.stringify(failedLogs));
    } catch (error) {
      console.warn('Failed to store failed logs in localStorage:', error);
    }
  }
}

// Create singleton instance
export const iosLoggingService = new IOSLoggingService();
