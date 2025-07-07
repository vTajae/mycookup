/**
 * Remote Console Service
 * Captures console logs and sends them to debug server via ngrok
 */

export interface RemoteConsoleLog {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  args: any[];
  stack?: string;
  userAgent: string;
  location: string;
}

export class RemoteConsoleService {
  private static instance: RemoteConsoleService;
  private originalConsole: any;
  private isCapturing = false;
  private debugEndpoint = '/api/debug-logs';

  private constructor() {
    this.setupConsoleCapture();
  }

  public static getInstance(): RemoteConsoleService {
    if (!RemoteConsoleService.instance) {
      RemoteConsoleService.instance = new RemoteConsoleService();
    }
    return RemoteConsoleService.instance;
  }

  private setupConsoleCapture(): void {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console)
    };

    // Override console methods
    console.log = this.createCaptureMethod('log');
    console.info = this.createCaptureMethod('info');
    console.warn = this.createCaptureMethod('warn');
    console.error = this.createCaptureMethod('error');
    console.debug = this.createCaptureMethod('debug');

    this.isCapturing = true;
    
    // Send initial test message
    setTimeout(() => {
      console.log('🔍 Remote console capture is active');
    }, 1000);
  }

  private createCaptureMethod(level: 'log' | 'info' | 'warn' | 'error' | 'debug') {
    return (...args: any[]) => {
      // Always call original console method first
      this.originalConsole[level](...args);

      if (!this.isCapturing) return;

      try {
        // Create log entry
        const logEntry: RemoteConsoleLog = {
          timestamp: new Date().toISOString(),
          level: level === 'debug' ? 'log' : level,
          message: this.formatMessage(args),
          args: this.serializeArgs(args),
          stack: level === 'error' ? new Error().stack : undefined,
          userAgent: navigator.userAgent,
          location: window.location.href
        };

        // Send to remote debug server
        this.sendToRemote(logEntry);

      } catch (error) {
        // Don't let logging errors break the app
        this.originalConsole.error('Remote console error:', error);
      }
    };
  }

  private formatMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }).join(' ');
  }

  private serializeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          // Try to serialize objects
          return JSON.parse(JSON.stringify(arg));
        } catch (e) {
          return String(arg);
        }
      }
      return arg;
    });
  }

  private async sendToRemote(logEntry: RemoteConsoleLog): Promise<void> {
    try {
      const response = await fetch(this.debugEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Source': 'iPhone-Remote-Console'
        },
        body: JSON.stringify({
          type: 'remote-console',
          ...logEntry
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      // Silently fail to avoid infinite loops
      // But try to show visual indicator on mobile
      if (navigator.userAgent.includes('Mobile')) {
        this.showMobileError('Debug connection failed');
      }
    }
  }

  private showMobileError(message: string): void {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: #ff4444;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      z-index: 10000;
      font-size: 12px;
      font-family: monospace;
    `;
    indicator.textContent = `⚠️ ${message}`;
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 3000);
  }

  // Public methods
  public startCapture(): void {
    this.isCapturing = true;
    console.log('🔍 Remote console capture started');
  }

  public stopCapture(): void {
    this.isCapturing = false;
    console.log('🛑 Remote console capture stopped');
  }

  public testConnection(): void {
    console.log('🧪 Testing remote console connection...');
    console.info('ℹ️ This is an info message');
    console.warn('⚠️ This is a warning message');
    console.error('🚨 This is an error message');
    
    console.log('📊 Test object:', {
      device: 'iPhone',
      timestamp: new Date().toISOString(),
      testArray: [1, 2, 3],
      testNested: { a: 1, b: { c: 2 } }
    });
  }

  public getStatus(): any {
    return {
      isCapturing: this.isCapturing,
      endpoint: this.debugEndpoint,
      userAgent: navigator.userAgent,
      location: window.location.href
    };
  }
}

// Export singleton instance
export const remoteConsole = RemoteConsoleService.getInstance();

// Make it globally available for easy access
(window as any).remoteConsole = {
  test: () => remoteConsole.testConnection(),
  start: () => remoteConsole.startCapture(),
  stop: () => remoteConsole.stopCapture(),
  status: () => remoteConsole.getStatus()
};
