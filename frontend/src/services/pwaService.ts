/**
 * PWA Service for debugging and managing Progressive Web App functionality
 * Includes comprehensive logging for mobile debugging
 */

import { debugLogger } from './debugLogger';
import { remoteDebugService } from './remoteDebugService';

export interface PWAInstallPrompt extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerReady: boolean;
  manifestLoaded: boolean;
  installPrompt: PWAInstallPrompt | null;
}

export interface PWALog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export class PWAService {
  private static instance: PWAService;
  private status: PWAStatus = {
    isInstallable: false,
    isInstalled: false,
    serviceWorkerRegistered: false,
    serviceWorkerReady: false,
    manifestLoaded: false,
    installPrompt: null,
  };
  private logs: PWALog[] = [];
  private listeners: Array<(status: PWAStatus) => void> = [];

  private constructor() {
    this.initialize();
    this.setupConsoleCapture();
  }

  public static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  private addLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
    const logEntry: PWALog = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }

    // Enhanced console logging for remote debugging
    const timestamp = new Date().toISOString();
    const logPrefix = `[PWA-${level.toUpperCase()}] ${timestamp}`;

    // Use different console methods for better visibility
    switch (level) {
      case 'error':
        console.error(`🚨 ${logPrefix}: ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${logPrefix}: ${message}`, data || '');
        break;
      case 'info':
        console.info(`ℹ️ ${logPrefix}: ${message}`, data || '');
        break;
      case 'debug':
        console.debug(`🔍 ${logPrefix}: ${message}`, data || '');
        break;
    }

    // Also log to the centralized debug logger
    debugLogger.log(level, 'pwa', message, data);

    // Enhanced mobile debugging with visual indicators
    if (navigator.userAgent.includes('Mobile') || navigator.userAgent.includes('iPhone')) {
      // Create visual log indicator for mobile debugging
      this.createMobileLogIndicator(level, message, data);

      // For critical errors, show alert with more details
      if (level === 'error') {
        setTimeout(() => {
          const errorDetails = data ? `\n\nDetails: ${JSON.stringify(data, null, 2)}` : '';
          if (confirm(`🚨 PWA Error: ${message}${errorDetails}\n\nExport debug logs?`)) {
            this.exportLogs();
          }
        }, 100);
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  private async initialize() {
    this.addLog('info', 'Initializing PWA Service');

    // Initialize remote debugging if available
    if (remoteDebugService.isInRemoteDebugSession()) {
      this.addLog('info', 'Remote debugging session detected');
      remoteDebugService.log('info', 'pwa', 'PWA Service initializing in remote debug mode');
    }

    // Check if already installed
    this.checkInstallationStatus();

    // Set up event listeners
    this.setupEventListeners();

    // Check service worker status
    await this.checkServiceWorkerStatus();

    // Check manifest
    await this.checkManifestStatus();

    // iOS-specific checks
    if (this.isIOS()) {
      this.performIOSChecks();
    }
  }

  private checkInstallationStatus() {
    this.addLog('debug', 'Checking PWA installation status');
    
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isInWebAppiOS;
    
    this.status.isInstalled = isInstalled;
    this.addLog('info', `PWA installation status: ${isInstalled ? 'Installed' : 'Not installed'}`, {
      isStandalone,
      isInWebAppiOS,
      displayMode: window.matchMedia('(display-mode: standalone)').media
    });
    
    this.notifyListeners();
  }

  private setupEventListeners() {
    this.addLog('debug', 'Setting up PWA event listeners');
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      this.addLog('info', 'beforeinstallprompt event fired - PWA is installable');
      e.preventDefault();
      this.status.isInstallable = true;
      this.status.installPrompt = e as PWAInstallPrompt;
      this.notifyListeners();
    });
    
    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      this.addLog('info', 'PWA was installed successfully');
      this.status.isInstalled = true;
      this.status.isInstallable = false;
      this.status.installPrompt = null;
      this.notifyListeners();
    });
    
    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.addLog('info', `Display mode changed: ${e.matches ? 'standalone' : 'browser'}`);
      this.checkInstallationStatus();
    });
  }

  private async checkServiceWorkerStatus() {
    this.addLog('debug', 'Checking service worker status');

    if (!('serviceWorker' in navigator)) {
      this.addLog('error', 'Service Worker not supported in this browser');
      return;
    }

    try {
      // Check existing registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      this.addLog('info', `Found ${registrations.length} service worker registrations`,
        registrations.map(reg => ({
          scope: reg.scope,
          state: reg.active?.state,
          scriptURL: reg.active?.scriptURL
        })));

      if (registrations.length > 0) {
        this.status.serviceWorkerRegistered = true;
        this.notifyListeners();
      } else {
        // No service workers found - register OneSignal service worker
        this.addLog('info', 'No service workers found, registering OneSignal service worker...');
        await this.registerOneSignalServiceWorker();
      }

      // Wait for service worker to be ready
      navigator.serviceWorker.ready.then((registration) => {
        this.addLog('info', 'Service worker is ready', {
          scope: registration.scope,
          scriptURL: registration.active?.scriptURL
        });
        this.status.serviceWorkerReady = true;
        this.notifyListeners();
      });

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.addLog('info', 'Service worker controller changed');
      });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.addLog('debug', 'Service worker message received', event.data);
      });

    } catch (error) {
      this.addLog('error', 'Failed to check service worker status', error);
    }
  }

  private async checkManifestStatus() {
    this.addLog('debug', 'Checking manifest status');
    
    try {
      const response = await fetch('/manifest.json');
      if (response.ok) {
        const manifest = await response.json();
        this.addLog('info', 'Manifest loaded successfully', manifest);
        this.status.manifestLoaded = true;
        this.notifyListeners();
      } else {
        this.addLog('error', `Failed to load manifest: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.addLog('error', 'Failed to fetch manifest', error);
    }
  }

  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  private performIOSChecks() {
    this.addLog('debug', 'Performing iOS-specific PWA checks');
    
    const isIOSPWA = (window.navigator as any).standalone === true;
    const isIOSSafari = /Safari/.test(navigator.userAgent) && this.isIOS();
    const hasIOSPWAMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    
    this.addLog('info', 'iOS PWA Status', {
      isIOSPWA,
      isIOSSafari,
      hasIOSPWAMeta: !!hasIOSPWAMeta,
      standalone: (window.navigator as any).standalone,
      userAgent: navigator.userAgent
    });
    
    // Check for iOS 16.4+ Web Push support
    const hasNotificationAPI = 'Notification' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    
    this.addLog('info', 'iOS Web Push Support', {
      hasNotificationAPI,
      hasServiceWorker,
      hasPushManager,
      notificationPermission: hasNotificationAPI ? Notification.permission : 'not available',
      iOSVersion: this.getIOSVersion()
    });
  }

  private getIOSVersion(): string | null {
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      return `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}`;
    }
    return null;
  }

  /**
   * Register OneSignal service worker for push notifications
   */
  private async registerOneSignalServiceWorker(): Promise<void> {
    try {
      this.addLog('info', 'Attempting to register OneSignal service worker...');

      // Try multiple registration approaches for better compatibility
      let registration: ServiceWorkerRegistration | null = null;

      // Approach 1: Register with minimal options (most compatible)
      try {
        registration = await navigator.serviceWorker.register('/OneSignalSDK.sw.js');
        this.addLog('info', 'OneSignal service worker registered with minimal config');
      } catch (minimalError) {
        this.addLog('debug', 'Minimal registration failed, trying with options', {
          error: minimalError instanceof Error ? minimalError.message : String(minimalError)
        });

        // Approach 2: Register with explicit options
        registration = await navigator.serviceWorker.register('/OneSignalSDK.sw.js', {
          updateViaCache: 'none'
        });
        this.addLog('info', 'OneSignal service worker registered with options');
      }

      if (registration) {
        this.addLog('info', 'OneSignal service worker registered successfully', {
          scope: registration.scope,
          scriptURL: registration.active?.scriptURL || 'pending'
        });

        this.status.serviceWorkerRegistered = true;
        this.notifyListeners();

        // Wait for the service worker to become active
        if (registration.installing) {
          this.addLog('debug', 'Service worker is installing...');
          registration.installing.addEventListener('statechange', () => {
            if (registration.installing?.state === 'activated') {
              this.addLog('info', 'Service worker activated');
            }
          });
        }

        // Handle updates
        registration.addEventListener('updatefound', () => {
          this.addLog('info', 'Service worker update found');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.addLog('info', 'New service worker available, refresh to update');
              }
            });
          }
        });
      }

    } catch (error) {
      this.addLog('error', 'Failed to register OneSignal service worker', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Try fallback registration with OneSignalSDKWorker.js
      try {
        this.addLog('info', 'Trying fallback service worker registration...');
        const fallbackRegistration = await navigator.serviceWorker.register('/OneSignalSDKWorker.js');

        this.addLog('info', 'Fallback service worker registered successfully', {
          scope: fallbackRegistration.scope,
          scriptURL: fallbackRegistration.active?.scriptURL || 'pending'
        });

        this.status.serviceWorkerRegistered = true;
        this.notifyListeners();

      } catch (fallbackError) {
        this.addLog('error', 'Fallback service worker registration also failed', {
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });

        // Final attempt: Try to register a basic service worker
        try {
          this.addLog('info', 'Trying basic service worker registration...');
          const basicRegistration = await navigator.serviceWorker.register('data:application/javascript,// Basic service worker');
          this.addLog('info', 'Basic service worker registered as last resort', {
            scope: basicRegistration.scope
          });
          this.status.serviceWorkerRegistered = true;
          this.notifyListeners();
        } catch (basicError) {
          this.addLog('error', 'All service worker registration attempts failed', {
            error: basicError instanceof Error ? basicError.message : String(basicError)
          });
        }
      }
    }
  }

  // Public methods
  public getStatus(): PWAStatus {
    return { ...this.status };
  }

  public getLogs(): PWALog[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.addLog('info', 'PWA logs cleared');
  }

  public async installPWA(): Promise<boolean> {
    if (!this.status.installPrompt) {
      this.addLog('warn', 'No install prompt available');
      return false;
    }

    try {
      this.addLog('info', 'Triggering PWA installation prompt');
      const result = await this.status.installPrompt.prompt();
      this.addLog('info', `PWA installation prompt result: ${result.outcome}`);

      if (result.outcome === 'accepted') {
        this.status.installPrompt = null;
        this.status.isInstallable = false;
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      this.addLog('error', 'Failed to show PWA installation prompt', error);
      return false;
    }
  }

  /**
   * Manually register service worker (useful for debugging)
   */
  public async registerServiceWorker(): Promise<boolean> {
    this.addLog('info', 'Manual service worker registration requested');
    try {
      await this.registerOneSignalServiceWorker();
      return true;
    } catch (error) {
      this.addLog('error', 'Manual service worker registration failed', error);
      return false;
    }
  }

  public exportLogs(): void {
    const logsText = this.logs.map(log =>
      `[${this.safeTimestampToString(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n\n');
    
    if (navigator.share) {
      navigator.share({
        title: 'MyCookup PWA Debug Logs',
        text: logsText,
      }).catch(() => {
        this.copyToClipboard(logsText);
      });
    } else {
      this.copyToClipboard(logsText);
    }
  }

  private copyToClipboard(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.addLog('info', 'PWA logs copied to clipboard');
        alert('PWA logs copied to clipboard!');
      }).catch(() => {
        this.showLogsInAlert(text);
      });
    } else {
      this.showLogsInAlert(text);
    }
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

  private showLogsInAlert(text: string) {
    const truncated = text.substring(0, 1000);
    alert(`PWA Debug Logs:\n\n${truncated}${text.length > 1000 ? '\n\n... (truncated)' : ''}`);
  }

  /**
   * Create visual log indicator for mobile debugging
   */
  private createMobileLogIndicator(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    // Create a temporary visual indicator that appears on screen
    const indicator = document.createElement('div');
    const colors = {
      error: '#F44336',
      warn: '#FF9800',
      info: '#2196F3',
      debug: '#9E9E9E'
    };

    const icons = {
      error: '🚨',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍'
    };

    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[level]};
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 10000;
      max-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    const timestamp = new Date().toLocaleTimeString();
    indicator.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">
        ${icons[level]} ${level.toUpperCase()} - ${timestamp}
      </div>
      <div style="word-break: break-word;">
        ${message}
      </div>
      ${data ? `<div style="margin-top: 4px; font-size: 10px; opacity: 0.9;">Data: ${JSON.stringify(data).substring(0, 50)}...</div>` : ''}
    `;

    document.body.appendChild(indicator);

    // Animate in
    setTimeout(() => {
      indicator.style.transform = 'translateX(0)';
    }, 10);

    // Remove after delay (longer for errors)
    const delay = level === 'error' ? 8000 : level === 'warn' ? 5000 : 3000;
    setTimeout(() => {
      indicator.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, delay);

    // Click to dismiss
    indicator.addEventListener('click', () => {
      indicator.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    });
  }

  public subscribe(listener: (status: PWAStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Test remote debugging connection and log comprehensive debug info
   */
  public testRemoteDebugging(): void {
    this.addLog('info', 'Testing remote debugging connection');

    if (remoteDebugService.isInRemoteDebugSession()) {
      remoteDebugService.testRemoteConnection();

      // Log current PWA status for remote debugging
      remoteDebugService.log('info', 'pwa-status', 'Current PWA Status', {
        status: this.getStatus(),
        logs: this.getLogs().slice(0, 10), // Last 10 logs
        userAgent: navigator.userAgent,
        location: window.location.href
      });

      this.addLog('info', 'Remote debugging test completed - check Chrome DevTools');
    } else {
      this.addLog('warn', 'No remote debugging session detected');
      console.log('🔍 To enable remote debugging:');
      console.log('1. Connect iOS device via USB');
      console.log('2. Start ios-webkit-debug-proxy');
      console.log('3. Start remotedebug-ios-webkit-adapter');
      console.log('4. Open chrome://inspect in Chrome');
    }
  }

  /**
   * Enhanced console debugging for mobile devices
   */
  public startConsoleDebugging(): void {
    this.addLog('info', 'Starting enhanced console debugging for mobile');

    // Log comprehensive device and PWA information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      pwa: {
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isIOSStandalone: (navigator as any).standalone === true,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasNotificationAPI: 'Notification' in window,
        hasPushManager: 'PushManager' in window
      },
      oneSignal: {
        loaded: typeof (window as any).OneSignal !== 'undefined',
        initialized: (window as any).OneSignal ? 'initialized' : 'not loaded'
      }
    };

    console.group('🔍 PWA Debug Information');
    console.log('📱 Device Info:', debugInfo);
    console.log('🔧 PWA Status:', this.getStatus());
    console.log('📋 Recent Logs:', this.getLogs().slice(0, 5));
    console.groupEnd();

    // Test all major PWA features
    this.testPWAFeatures();
  }

  /**
   * Test all major PWA features and log results
   */
  private testPWAFeatures(): void {
    console.group('🧪 PWA Feature Tests');

    // Test Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('🔧 Service Workers:', registrations.map(reg => ({
          scope: reg.scope,
          state: reg.active?.state,
          scriptURL: reg.active?.scriptURL
        })));
      });
    } else {
      console.warn('❌ Service Worker not supported');
    }

    // Test Notification API
    if ('Notification' in window) {
      console.log('🔔 Notification Permission:', Notification.permission);
      console.log('🔔 Notification API: Supported');
    } else {
      console.warn('❌ Notification API not supported');
    }

    // Test Push Manager
    if ('PushManager' in window) {
      console.log('📤 Push Manager: Supported');
      navigator.serviceWorker.ready.then(registration => {
        return registration.pushManager.getSubscription();
      }).then(subscription => {
        console.log('📤 Push Subscription:', subscription ? 'Active' : 'None');
      });
    } else {
      console.warn('❌ Push Manager not supported');
    }

    // Test OneSignal
    if ((window as any).OneSignal) {
      console.log('🔔 OneSignal: Loaded');
      (window as any).OneSignal.getNotificationPermission().then((permission: any) => {
        console.log('🔔 OneSignal Permission:', permission);
      });
    } else {
      console.warn('⚠️ OneSignal: Not loaded yet');
    }

    console.groupEnd();
  }

  /**
   * Send logs to remote endpoint for inspection from development machine
   */
  public sendLogsToRemote(): void {
    const logs = this.getLogs();
    const debugInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href,
      logs: logs.slice(0, 20), // Last 20 logs
      pwaStatus: this.getStatus(),
      deviceInfo: {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isIOSStandalone: (navigator as any).standalone === true
      }
    };

    // Send to a debug endpoint that you can monitor
    fetch('/api/debug-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debugInfo)
    }).catch(() => {
      // If endpoint doesn't exist, log to console with special prefix for easy filtering
      console.log('🔍 REMOTE_DEBUG_LOGS:', JSON.stringify(debugInfo, null, 2));
    });
  }

  /**
   * Start periodic log streaming to remote
   */
  public startLogStreaming(intervalMs: number = 5000): () => void {
    this.addLog('info', `Starting log streaming every ${intervalMs}ms`);

    const interval = setInterval(() => {
      this.sendLogsToRemote();
    }, intervalMs);

    return () => {
      clearInterval(interval);
      this.addLog('info', 'Stopped log streaming');
    };
  }

  /**
   * Setup console capture to automatically send console logs to remote
   */
  private setupConsoleCapture(): void {
    // Store original console methods
    const originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };

    // Create a buffer for logs
    const logBuffer: any[] = [];

    const captureAndSend = (level: 'log' | 'info' | 'warn' | 'error') => {
      return (...args: any[]) => {
        // Always call original console method first
        originalConsole[level](...args);

        try {
          // Create readable message
          const message = args.map(arg => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg, null, 2);
              } catch (e) {
                return String(arg);
              }
            }
            return String(arg);
          }).join(' ');

          // Create log entry
          const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            args: args.map(arg => {
              try {
                return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
              } catch (e) {
                return String(arg);
              }
            }),
            userAgent: navigator.userAgent.substring(0, 100),
            location: window.location.href,
            type: 'console-log',
            source: 'iPhone-PWA'
          };

          // Add to buffer
          logBuffer.unshift(logEntry);
          if (logBuffer.length > 50) {
            logBuffer.splice(50);
          }

          // Send immediately to debug server
          this.sendLogToRemote(logEntry);

        } catch (error) {
          originalConsole.error('Failed to capture log:', error);
        }
      };
    };

    // Override console methods
    console.log = captureAndSend('log');
    console.info = captureAndSend('info');
    console.warn = captureAndSend('warn');
    console.error = captureAndSend('error');

    // Store buffer reference for access
    (window as any).__logBuffer = logBuffer;

    this.addLog('info', 'Console capture setup complete - all console logs will be sent to debug server');

    // Send initial test log
    setTimeout(() => {
      console.log('🔍 Console capture is active - this message should appear on your debug server');
    }, 1000);
  }

  /**
   * Send individual log entry to remote debug server
   */
  private sendLogToRemote(logEntry: any): void {
    // Send to debug server running on dev machine through ngrok
    // The ngrok tunnel forwards to your local dev server
    const debugEndpoints = [
      '/api/debug-logs',  // This will go through ngrok to your dev machine
      '/debug-logs',
      '/logs'
    ];

    debugEndpoints.forEach(endpoint => {
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Source': 'iPhone-PWA',
          'X-Forwarded-For': 'ngrok-tunnel'
        },
        body: JSON.stringify(logEntry)
      }).then(response => {
        if (response.ok) {
          // Successfully sent to debug server
          console.log(`📤 Log sent to debug server via ${endpoint}`);
        }
      }).catch(error => {
        // Try next endpoint or fail silently
        console.log(`⚠️ Failed to send to ${endpoint}:`, error.message);
      });
    });
  }

  /**
   * Force send current logs to debug server (call this from iPhone console)
   */
  public forceSendLogs(): void {
    console.log('🔍 Force sending logs to debug server...');
    this.sendLogsToRemote();

    // Also send a test message
    const testData = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '🧪 Test log from iPhone - if you see this, console capture is working!',
      userAgent: navigator.userAgent,
      location: window.location.href,
      type: 'test-log',
      pwaStatus: this.getStatus()
    };

    fetch('/api/debug-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    }).then(() => {
      console.log('✅ Test log sent successfully');
    }).catch(error => {
      console.error('❌ Failed to send test log:', error);
    });
  }
}

// Export singleton instance
export const pwaService = PWAService.getInstance();

// Make debugging functions globally available for easy access from iPhone console
(window as any).debugPWA = {
  sendLogs: () => pwaService.forceSendLogs(),
  startStreaming: (interval = 3000) => pwaService.startLogStreaming(interval),
  testDebug: () => pwaService.startConsoleDebugging(),
  testRemote: () => pwaService.testRemoteDebugging(),
  getStatus: () => pwaService.getStatus(),
  getLogs: () => pwaService.getLogs(),
  exportLogs: () => pwaService.exportLogs()
};
