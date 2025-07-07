/**
 * Enhanced Debug Logger Service for iOS PWA Debugging
 * Provides comprehensive logging capabilities specifically designed for iOS devices
 * where console access is limited in PWA standalone mode.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface DebugLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
  deviceInfo?: DeviceInfo;
  performanceMetrics?: PerformanceMetrics;
  source: 'console' | 'network' | 'service-worker' | 'push-notification' | 'camera' | 'app' | 'system';
  sessionId: string;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isIOS: boolean;
  isSafari: boolean;
  isPWAStandalone: boolean;
  isCapacitor: boolean;
  screenSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  devicePixelRatio: number;
  orientation: string;
  connectionType?: string;
  isOnline: boolean;
  language: string;
  timezone: string;
  cookiesEnabled: boolean;
  localStorageAvailable: boolean;
  sessionStorageAvailable: boolean;
  serviceWorkerSupported: boolean;
  notificationSupported: boolean;
  pushManagerSupported: boolean;
  isSecureContext: boolean;
}

export interface PerformanceMetrics {
  memoryUsage?: any;
  navigationTiming?: any;
  connectionInfo?: any;
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface LogExportOptions {
  format: 'json' | 'csv' | 'text';
  includeDeviceInfo: boolean;
  includePerformanceMetrics: boolean;
  filterLevel?: LogLevel;
  filterCategory?: string;
  maxEntries?: number;
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  duration?: number;
  error?: string;
}

export interface RemoteLoggingConfig {
  enabled: boolean;
  endpoint: string;
  batchSize: number;
  flushInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

class DebugLogger {
  private logs: DebugLogEntry[] = [];
  private maxLogs = 500;
  private listeners: ((logs: DebugLogEntry[]) => void)[] = [];
  private deviceInfo: DeviceInfo;
  private sessionId: string;
  private startTime: number;
  private originalConsole: Console;
  private pendingLogs: DebugLogEntry[] = [];
  private remoteConfig: RemoteLoggingConfig;
  private flushTimer?: number;
  private isConsoleIntercepted = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.deviceInfo = this.collectDeviceInfo();
    this.originalConsole = { ...console };
    this.remoteConfig = {
      enabled: true,
      endpoint: '/api/logs',
      batchSize: 10,
      flushInterval: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    };
    this.initializeLogger();
    this.loadPersistedLogs();
    this.setupConsoleInterception();
    this.setupNetworkMonitoring();
    this.startRemoteLogging();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeLogger() {
    // Log initial session start
    this.log('info', 'system', 'Debug logger initialized', {
      sessionId: this.sessionId,
      startTime: new Date(this.startTime),
      deviceInfo: this.deviceInfo
    }, 'system');

    // Set up error handlers
    window.addEventListener('error', (event) => {
      this.log('error', 'javascript', 'Uncaught JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      }, 'app');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'promise', 'Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      }, 'app');
    });

    // Monitor network status
    window.addEventListener('online', () => {
      this.log('info', 'network', 'Network connection restored', undefined, 'system');
    });

    window.addEventListener('offline', () => {
      this.log('warn', 'network', 'Network connection lost', undefined, 'system');
    });

    // Monitor visibility changes (important for PWA)
    document.addEventListener('visibilitychange', () => {
      this.log('info', 'pwa', `App visibility changed to: ${document.visibilityState}`, undefined, 'app');
    });

    // Monitor orientation changes (important for mobile)
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.deviceInfo = this.collectDeviceInfo();
        this.log('info', 'device', 'Orientation changed', {
          orientation: this.deviceInfo.orientation,
          screenSize: this.deviceInfo.screenSize,
          viewportSize: this.deviceInfo.viewportSize
        }, 'system');
      }, 100);
    });

    // Persist logs periodically
    setInterval(() => {
      this.persistLogs();
    }, 30000); // Every 30 seconds
  }

  /**
   * Set up console interception to capture all console output
   */
  private setupConsoleInterception(): void {
    if (this.isConsoleIntercepted) return;

    const logLevels: Array<{ method: keyof Console; level: LogLevel }> = [
      { method: 'log', level: 'info' },
      { method: 'info', level: 'info' },
      { method: 'warn', level: 'warn' },
      { method: 'error', level: 'error' },
      { method: 'debug', level: 'debug' }
    ];

    logLevels.forEach(({ method, level }) => {
      const originalMethod = this.originalConsole[method];
      (console as any)[method] = (...args: any[]) => {
        // Call original console method first
        originalMethod.apply(console, args);

        // Extract message and data
        const message = args.length > 0 ? String(args[0]) : '';
        const data = args.length > 1 ? args.slice(1) : undefined;

        // Filter out our own logging service messages to prevent infinite loops
        const shouldSkip = message.includes('[DEBUG_LOGGER]') ||
                          message.includes('[iOS-PWA-LOGS]') ||
                          message.includes('📱') ||
                          message.includes('📤') ||
                          message.includes('⚠️') ||
                          message.includes('❌') ||
                          message.includes('debugLogger.ts') ||
                          message.includes('iosLoggingService');

        if (!shouldSkip) {
          this.log(level, 'console', message, data);
        }
      };
    });

    this.isConsoleIntercepted = true;
    this.originalConsole.info('[DEBUG_LOGGER] Console interception enabled');
  }

  /**
   * Set up network monitoring to capture fetch and XHR requests
   */
  private setupNetworkMonitoring(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        this.log('info', 'network', `${method} ${url}`, {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          duration,
          headers: Object.fromEntries(response.headers.entries())
        } as NetworkLogEntry, 'network');

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        this.log('error', 'network', `${method} ${url} failed`, {
          url,
          method,
          duration,
          error: error instanceof Error ? error.message : String(error)
        } as NetworkLogEntry, 'network');

        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      (this as any)._debugLogger = {
        method,
        url: url.toString(),
        startTime: Date.now()
      };
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(body?: any) {
      const debugInfo = (this as any)._debugLogger;
      if (debugInfo) {
        this.addEventListener('loadend', () => {
          const duration = Date.now() - debugInfo.startTime;
          const level = this.status >= 400 ? 'error' : 'info';

          debugLogger.log(level, 'network', `${debugInfo.method} ${debugInfo.url}`, {
            url: debugInfo.url,
            method: debugInfo.method,
            status: this.status,
            statusText: this.statusText,
            duration,
            requestBody: body
          } as NetworkLogEntry, 'network');
        });
      }
      return originalXHRSend.apply(this, [body]);
    };

    this.log('info', 'system', 'Network monitoring enabled', undefined, 'system');
  }

  private collectDeviceInfo(): DeviceInfo {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isPWAStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    const isCapacitor = !!(window as any).Capacitor;

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isIOS,
      isSafari,
      isPWAStandalone,
      isCapacitor,
      screenSize: {
        width: screen.width,
        height: screen.height
      },
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio,
      orientation: screen.orientation?.type || 'unknown',
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      isOnline: navigator.onLine,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      localStorageAvailable: this.isStorageAvailable('localStorage'),
      sessionStorageAvailable: this.isStorageAvailable('sessionStorage'),
      serviceWorkerSupported: 'serviceWorker' in navigator,
      notificationSupported: 'Notification' in window,
      pushManagerSupported: 'PushManager' in window,
      isSecureContext: window.isSecureContext
    };
  }

  private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private collectPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    // Memory usage (if available)
    if ('memory' in performance) {
      metrics.memoryUsage = (performance as any).memory;
    }

    // Navigation timing
    if ('getEntriesByType' in performance) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        metrics.navigationTiming = navEntries[0];
      }
    }

    // Connection info
    if ('connection' in navigator) {
      metrics.connectionInfo = (navigator as any).connection;
    }

    // Battery info (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        metrics.batteryLevel = battery.level;
        metrics.isCharging = battery.charging;
      }).catch(() => {
        // Battery API not available
      });
    }

    return metrics;
  }

  public log(level: LogLevel, category: string, message: string, data?: any): void {
    // Prevent logging our own messages to avoid infinite loops
    if (message.includes('[DEBUG_LOGGER]') ||
        message.includes('📱') ||
        message.includes('📤') ||
        message.includes('⚠️') ||
        message.includes('❌') ||
        message.includes('debugLogger.ts') ||
        message.includes('iosLoggingService')) {
      return;
    }

    const entry: DebugLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      stackTrace: level === 'error' || level === 'critical' ? new Error().stack : undefined,
      deviceInfo: level === 'critical' ? this.deviceInfo : undefined,
      performanceMetrics: level === 'critical' ? this.collectPerformanceMetrics() : undefined,
      source: 'app',
      sessionId: this.sessionId
    };

    this.logs.unshift(entry);

    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console logging for development - use original console to avoid loops
    const consoleMethod = level === 'critical' ? 'error' : level;
    this.originalConsole[consoleMethod](`[DEBUG_LOGGER] [${level.toUpperCase()}] [${category}] ${message}`, data || '');

    // Show alerts for critical errors on mobile
    if ((level === 'error' || level === 'critical') && this.deviceInfo.isIOS) {
      setTimeout(() => {
        if (confirm(`${level === 'critical' ? 'Critical Error' : 'Error'}: ${message}\n\nShow debug logs?`)) {
          this.exportLogs({ format: 'text', includeDeviceInfo: true, includePerformanceMetrics: true });
        }
      }, 100);
    }

    // Notify listeners
    this.notifyListeners();
  }

  public debug(category: string, message: string, data?: any): void {
    this.log('debug', category, message, data);
  }

  public info(category: string, message: string, data?: any): void {
    this.log('info', category, message, data);
  }

  public warn(category: string, message: string, data?: any): void {
    this.log('warn', category, message, data);
  }

  public error(category: string, message: string, data?: any): void {
    this.log('error', category, message, data);
  }

  public critical(category: string, message: string, data?: any): void {
    this.log('critical', category, message, data);
  }

  public getLogs(filter?: { level?: LogLevel; category?: string; limit?: number }): DebugLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter?.level) {
      const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
      const minPriority = levelPriority[filter.level];
      filteredLogs = filteredLogs.filter(log => levelPriority[log.level] >= minPriority);
    }

    if (filter?.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filter.category);
    }

    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  public clearLogs(): void {
    this.logs = [];
    this.clearPersistedLogs();
    this.notifyListeners();
    this.info('system', 'Debug logs cleared');
  }

  public subscribe(listener: (logs: DebugLogEntry[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  private persistLogs(): void {
    if (!this.deviceInfo.localStorageAvailable) return;

    try {
      const logsToStore = this.logs.slice(0, 100); // Store only last 100 logs
      localStorage.setItem('debugLogs', JSON.stringify({
        sessionId: this.sessionId,
        timestamp: Date.now(),
        logs: logsToStore
      }));
    } catch (error) {
      console.warn('Failed to persist debug logs:', error);
    }
  }

  private loadPersistedLogs(): void {
    if (!this.deviceInfo.localStorageAvailable) return;

    try {
      const stored = localStorage.getItem('debugLogs');
      if (stored) {
        const { logs, sessionId, timestamp } = JSON.parse(stored);

        // Only load logs from the last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          this.info('system', `Loaded ${logs.length} persisted logs from previous session`, {
            previousSessionId: sessionId
          });

          // Add a separator
          this.info('system', '--- Previous Session Logs ---');

          // Convert timestamp strings back to Date objects
          const restoredLogs = logs.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          }));

          // Add previous logs (but don't trigger notifications)
          this.logs.push(...restoredLogs);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted debug logs:', error);
    }
  }

  private clearPersistedLogs(): void {
    if (!this.deviceInfo.localStorageAvailable) return;

    try {
      localStorage.removeItem('debugLogs');
    } catch (error) {
      console.warn('Failed to clear persisted debug logs:', error);
    }
  }

  public exportLogs(options: LogExportOptions = { 
    format: 'json', 
    includeDeviceInfo: true, 
    includePerformanceMetrics: false 
  }): void {
    const logs = this.getLogs({
      level: options.filterLevel,
      category: options.filterCategory,
      limit: options.maxEntries
    });

    const exportData = {
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      deviceInfo: options.includeDeviceInfo ? this.deviceInfo : undefined,
      performanceMetrics: options.includePerformanceMetrics ? this.collectPerformanceMetrics() : undefined,
      logs: logs
    };

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (options.format) {
      case 'csv':
        content = this.formatLogsAsCSV(logs);
        filename = `debug-logs-${this.sessionId}.csv`;
        mimeType = 'text/csv';
        break;
      case 'text':
        content = this.formatLogsAsText(exportData);
        filename = `debug-logs-${this.sessionId}.txt`;
        mimeType = 'text/plain';
        break;
      default:
        content = JSON.stringify(exportData, null, 2);
        filename = `debug-logs-${this.sessionId}.json`;
        mimeType = 'application/json';
    }

    this.downloadFile(content, filename, mimeType);
  }

  private formatLogsAsCSV(logs: DebugLogEntry[]): string {
    const headers = ['Timestamp', 'Level', 'Category', 'Message', 'Data'];
    const rows = logs.map(log => [
      this.safeTimestampToString(log.timestamp),
      log.level,
      log.category,
      log.message,
      log.data ? JSON.stringify(log.data) : ''
    ]);

    return [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  private formatLogsAsText(exportData: any): string {
    let text = `Debug Logs Export\n`;
    text += `Session ID: ${exportData.sessionId}\n`;
    text += `Export Time: ${exportData.exportTime}\n`;
    text += `\n`;

    if (exportData.deviceInfo) {
      text += `Device Information:\n`;
      text += `- Platform: ${exportData.deviceInfo.platform}\n`;
      text += `- User Agent: ${exportData.deviceInfo.userAgent}\n`;
      text += `- iOS: ${exportData.deviceInfo.isIOS}\n`;
      text += `- Safari: ${exportData.deviceInfo.isSafari}\n`;
      text += `- PWA Standalone: ${exportData.deviceInfo.isPWAStandalone}\n`;
      text += `- Capacitor: ${exportData.deviceInfo.isCapacitor}\n`;
      text += `- Screen Size: ${exportData.deviceInfo.screenSize.width}x${exportData.deviceInfo.screenSize.height}\n`;
      text += `- Viewport Size: ${exportData.deviceInfo.viewportSize.width}x${exportData.deviceInfo.viewportSize.height}\n`;
      text += `- Online: ${exportData.deviceInfo.isOnline}\n`;
      text += `- Secure Context: ${exportData.deviceInfo.isSecureContext}\n`;
      text += `\n`;
    }

    text += `Logs (${exportData.logs.length} entries):\n`;
    text += `${'='.repeat(50)}\n`;

    exportData.logs.forEach((log: DebugLogEntry) => {
      text += `[${this.safeTimestampToString(log.timestamp)}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}\n`;
      if (log.data) {
        text += `  Data: ${JSON.stringify(log.data, null, 2)}\n`;
      }
      if (log.stackTrace) {
        text += `  Stack: ${log.stackTrace}\n`;
      }
      text += `\n`;
    });

    return text;
  }

  private safeTimestampToString(timestamp: Date | string | number): string {
    try {
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp).toISOString();
      } else if (typeof timestamp === 'number') {
        return new Date(timestamp).toISOString();
      } else {
        return new Date().toISOString(); // fallback to current time
      }
    } catch (error) {
      console.warn('Failed to convert timestamp to string:', timestamp, error);
      return new Date().toISOString(); // fallback to current time
    }
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.info('system', `Logs exported as ${filename}`);
    } catch (error) {
      this.error('system', 'Failed to export logs', error);
      
      // Fallback: copy to clipboard
      try {
        navigator.clipboard.writeText(content);
        alert('Export failed, but logs have been copied to clipboard');
      } catch {
        alert('Export failed and clipboard not available. Please check console.');
        console.log('Debug logs export:', content);
      }
    }
  }

  public getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  public getSessionInfo(): { sessionId: string; startTime: number; uptime: number } {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime
    };
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();
