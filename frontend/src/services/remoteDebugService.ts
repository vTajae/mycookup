/**
 * Remote Debug Service for iOS PWA debugging
 * Provides enhanced logging and debugging utilities for remote debugging sessions
 */

import { debugLogger } from './debugLogger';

export interface RemoteDebugSession {
  id: string;
  startTime: Date;
  deviceInfo: DeviceInfo;
  isActive: boolean;
  logs: RemoteDebugLog[];
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isIOS: boolean;
  isStandalone: boolean;
  viewport: { width: number; height: number };
  capabilities: DeviceCapabilities;
}

export interface DeviceCapabilities {
  hasServiceWorker: boolean;
  hasNotificationAPI: boolean;
  hasPushManager: boolean;
  hasWebShare: boolean;
  hasClipboard: boolean;
}

export interface RemoteDebugLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
}

export class RemoteDebugService {
  private static instance: RemoteDebugService;
  private session: RemoteDebugSession | null = null;
  private isRemoteDebugging = false;

  private constructor() {
    this.detectRemoteDebugging();
    this.setupRemoteDebugHandlers();
  }

  public static getInstance(): RemoteDebugService {
    if (!RemoteDebugService.instance) {
      RemoteDebugService.instance = new RemoteDebugService();
    }
    return RemoteDebugService.instance;
  }

  /**
   * Detect if we're in a remote debugging session
   */
  private detectRemoteDebugging(): void {
    // Check for WebKit debug proxy indicators
    const hasWebKitDebug = !!(window as any).__webkit_debug_proxy;
    
    // Check for Chrome DevTools connection
    const hasDevTools = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ || 
                        !!(window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
    
    // Check for remote debugging user agent patterns
    const userAgent = navigator.userAgent;
    const hasRemoteUA = userAgent.includes('Remote') || 
                       userAgent.includes('WebKit/') && userAgent.includes('Chrome/');

    this.isRemoteDebugging = hasWebKitDebug || hasDevTools || hasRemoteUA;

    if (this.isRemoteDebugging) {
      this.startRemoteDebugSession();
    }
  }

  /**
   * Start a remote debugging session
   */
  private startRemoteDebugSession(): void {
    const deviceInfo = this.collectDeviceInfo();
    
    this.session = {
      id: this.generateSessionId(),
      startTime: new Date(),
      deviceInfo,
      isActive: true,
      logs: []
    };

    this.log('info', 'remote-debug', 'Remote debugging session started', {
      sessionId: this.session.id,
      deviceInfo
    });

    // Announce debugging session
    console.log('%c🔍 Remote Debug Session Started', 
      'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;',
      this.session);
  }

  /**
   * Setup enhanced error handling and logging for remote debugging
   */
  private setupRemoteDebugHandlers(): void {
    // Enhanced error handling
    window.addEventListener('error', (event) => {
      this.log('error', 'javascript', 'Uncaught Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // Promise rejection handling
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'promise', 'Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });

    // Service Worker debugging
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.log('debug', 'service-worker', 'SW Message Received', event.data);
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.log('info', 'service-worker', 'SW Controller Changed');
      });
    }

    // Network debugging (if available)
    this.setupNetworkDebugging();
  }

  /**
   * Setup network request debugging
   */
  private setupNetworkDebugging(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      
      this.log('debug', 'network', 'Fetch Request', {
        url,
        method: config?.method || 'GET',
        headers: config?.headers
      });

      try {
        const response = await originalFetch(...args);
        
        this.log('debug', 'network', 'Fetch Response', {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        return response;
      } catch (error) {
        this.log('error', 'network', 'Fetch Error', {
          url,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this.addEventListener('loadend', () => {
        RemoteDebugService.getInstance().log('debug', 'network', 'XHR Complete', {
          method,
          url,
          status: this.status,
          statusText: this.statusText
        });
      });

      return originalXHROpen.call(this, method, url, ...args);
    };
  }

  /**
   * Collect comprehensive device information
   */
  private collectDeviceInfo(): DeviceInfo {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (navigator as any).standalone === true;

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

  /**
   * Enhanced logging for remote debugging
   */
  public log(level: 'debug' | 'info' | 'warn' | 'error', category: string, message: string, data?: any): void {
    const logEntry: RemoteDebugLog = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      stackTrace: level === 'error' ? new Error().stack : undefined
    };

    // Add to session logs
    if (this.session) {
      this.session.logs.unshift(logEntry);
      // Keep only last 200 logs
      if (this.session.logs.length > 200) {
        this.session.logs = this.session.logs.slice(0, 200);
      }
    }

    // Enhanced console output for remote debugging
    const style = this.getLogStyle(level);
    const prefix = `[${category.toUpperCase()}]`;
    
    console.groupCollapsed(`%c${prefix} ${message}`, style);
    if (data) {
      console.log('Data:', data);
    }
    if (logEntry.stackTrace) {
      console.log('Stack:', logEntry.stackTrace);
    }
    console.groupEnd();

    // Also log to centralized debug logger
    debugLogger.log(level, category, message, data);

    // For critical errors, create visual indicator
    if (level === 'error' && this.isRemoteDebugging) {
      this.showVisualError(message, data);
    }
  }

  /**
   * Get console styling for log levels
   */
  private getLogStyle(level: string): string {
    const styles = {
      debug: 'background: #9E9E9E; color: white; padding: 1px 3px; border-radius: 2px;',
      info: 'background: #2196F3; color: white; padding: 1px 3px; border-radius: 2px;',
      warn: 'background: #FF9800; color: white; padding: 1px 3px; border-radius: 2px;',
      error: 'background: #F44336; color: white; padding: 1px 3px; border-radius: 2px;'
    };
    return styles[level] || styles.info;
  }

  /**
   * Show visual error indicator for remote debugging
   */
  private showVisualError(message: string, data?: any): void {
    // Create temporary visual indicator
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #F44336;
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      max-width: 300px;
      font-family: monospace;
      font-size: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    indicator.innerHTML = `
      <strong>🚨 Debug Error</strong><br>
      ${message}<br>
      <small>Check console for details</small>
    `;

    document.body.appendChild(indicator);

    // Remove after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 5000);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods

  public isInRemoteDebugSession(): boolean {
    return this.isRemoteDebugging && this.session?.isActive === true;
  }

  public getSession(): RemoteDebugSession | null {
    return this.session;
  }

  public exportDebugSession(): string {
    if (!this.session) {
      return 'No active debug session';
    }

    const sessionData = {
      ...this.session,
      logs: this.session.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }))
    };

    return JSON.stringify(sessionData, null, 2);
  }

  public clearLogs(): void {
    if (this.session) {
      this.session.logs = [];
      this.log('info', 'remote-debug', 'Debug logs cleared');
    }
  }

  /**
   * Test remote debugging connection
   */
  public testRemoteConnection(): void {
    this.log('info', 'remote-debug', 'Testing remote debug connection', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href,
      capabilities: this.session?.deviceInfo.capabilities
    });

    // Test console methods
    console.log('🔍 Remote Debug Test - console.log');
    console.warn('🔍 Remote Debug Test - console.warn');
    console.error('🔍 Remote Debug Test - console.error');
    console.table({ test: 'data', remote: 'debugging' });
  }
}

// Export singleton instance
export const remoteDebugService = RemoteDebugService.getInstance();
