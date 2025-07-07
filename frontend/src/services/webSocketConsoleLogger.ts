/**
 * WebSocket Console Logger Service
 * 
 * Intercepts all console methods and forwards them via WebSocket to Cloudflare Worker
 * for real-time debugging of iOS PWA applications.
 * 
 * Features:
 * - Intercepts console.log, console.warn, console.error, console.info
 * - WebSocket connection management with auto-reconnection
 * - Preserves original console behavior
 * - Includes metadata (timestamp, level, device info)
 * - Graceful handling of connection states
 * - iOS PWA standalone mode compatibility
 */

export interface ConsoleLogMessage {
  type: 'console';
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: any[];
  timestamp: string;
  url: string;
  userAgent: string;
  deviceInfo: {
    isIOS: boolean;
    isPWA: boolean;
    isStandalone: boolean;
    viewport: string;
  };
  stackTrace?: string;
}

export interface WebSocketLoggerConfig {
  workerUrl: string;
  autoConnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  enableStackTrace: boolean;
  logLevels: ('log' | 'warn' | 'error' | 'info' | 'debug')[];
}

export interface ConnectionStatus {
  connected: boolean;
  connectionId?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

export class WebSocketConsoleLogger {
  private config: WebSocketLoggerConfig;
  private websocket: WebSocket | null = null;
  private originalConsole: Console;
  private connectionStatus: ConnectionStatus;
  private reconnectTimer: number | null = null;
  private messageQueue: ConsoleLogMessage[] = [];
  private maxQueueSize = 100;

  constructor(config: Partial<WebSocketLoggerConfig> = {}) {
    this.config = {
      workerUrl: 'wss://mycookup-websocket-logger-dev.your-subdomain.workers.dev/ws',
      autoConnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      enableStackTrace: true,
      logLevels: ['log', 'warn', 'error', 'info', 'debug'],
      ...config
    };

    this.connectionStatus = {
      connected: false,
      reconnectAttempts: 0
    };

    // Store original console methods
    this.originalConsole = { ...console };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Initialize the WebSocket console logger
   */
  public initialize(config?: Partial<WebSocketLoggerConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.interceptConsole();
    
    if (!this.websocket && this.config.autoConnect) {
      this.connect();
    }

    this.originalConsole.info('[WebSocketConsoleLogger] Initialized with config:', {
      workerUrl: this.config.workerUrl,
      logLevels: this.config.logLevels,
      autoConnect: this.config.autoConnect
    });
  }

  /**
   * Connect to WebSocket endpoint
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.originalConsole.info('[WebSocketConsoleLogger] Connecting to:', this.config.workerUrl);
        
        this.websocket = new WebSocket(this.config.workerUrl);

        this.websocket.onopen = (event) => {
          this.originalConsole.info('[WebSocketConsoleLogger] Connected successfully');
          this.connectionStatus = {
            connected: true,
            lastConnected: new Date(),
            reconnectAttempts: 0
          };
          
          // Send queued messages
          this.flushMessageQueue();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'connection' && message.connectionId) {
              this.connectionStatus.connectionId = message.connectionId;
              this.originalConsole.info('[WebSocketConsoleLogger] Assigned connection ID:', message.connectionId);
            }
          } catch (error) {
            this.originalConsole.warn('[WebSocketConsoleLogger] Failed to parse server message:', error);
          }
        };

        this.websocket.onclose = (event) => {
          this.originalConsole.warn('[WebSocketConsoleLogger] Connection closed:', event.code, event.reason);
          this.connectionStatus.connected = false;
          this.websocket = null;
          
          // Attempt reconnection if not at max attempts
          if (this.connectionStatus.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.websocket.onerror = (error) => {
          this.originalConsole.error('[WebSocketConsoleLogger] WebSocket error:', error);
          this.connectionStatus.error = 'WebSocket connection error';
          reject(error);
        };

      } catch (error) {
        this.originalConsole.error('[WebSocketConsoleLogger] Failed to create WebSocket:', error);
        this.connectionStatus.error = 'Failed to create WebSocket connection';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.connectionStatus.connected = false;
    this.originalConsole.info('[WebSocketConsoleLogger] Disconnected');
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Intercept console methods
   */
  private interceptConsole(): void {
    const logLevels = this.config.logLevels;

    logLevels.forEach(level => {
      if (level in console) {
        const originalMethod = this.originalConsole[level];
        
        (console as any)[level] = (...args: any[]) => {
          // Call original console method first
          originalMethod.apply(console, args);
          
          // Send to WebSocket
          this.sendConsoleMessage(level, args);
        };
      }
    });
  }

  /**
   * Send console message via WebSocket
   */
  private sendConsoleMessage(level: string, args: any[]): void {
    const message: ConsoleLogMessage = {
      type: 'console',
      level: level as any,
      args: this.serializeArgs(args),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo(),
      ...(this.config.enableStackTrace && { stackTrace: this.getStackTrace() })
    };

    if (this.websocket && this.connectionStatus.connected) {
      try {
        this.websocket.send(JSON.stringify(message));
      } catch (error) {
        this.originalConsole.warn('[WebSocketConsoleLogger] Failed to send message:', error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Serialize console arguments for JSON transmission
   */
  private serializeArgs(args: any[]): any[] {
    return args.map(arg => {
      try {
        if (arg === null || arg === undefined) {
          return arg;
        }
        if (typeof arg === 'object') {
          // Handle circular references and complex objects
          return JSON.parse(JSON.stringify(arg, this.getCircularReplacer()));
        }
        return arg;
      } catch (error) {
        return `[Serialization Error: ${error.message}]`;
      }
    });
  }

  /**
   * Get circular reference replacer for JSON.stringify
   */
  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * Get device information
   */
  private getDeviceInfo() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isPWAStandalone = (window.navigator as any).standalone === true;
    const hasDisplayStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    
    return {
      isIOS,
      isPWA: isPWAStandalone || hasDisplayStandalone,
      isStandalone: isPWAStandalone || hasDisplayStandalone,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  /**
   * Get stack trace for debugging
   */
  private getStackTrace(): string {
    try {
      throw new Error();
    } catch (error) {
      return error.stack || 'Stack trace not available';
    }
  }

  /**
   * Queue message when WebSocket is not connected
   */
  private queueMessage(message: ConsoleLogMessage): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift(); // Remove oldest message
    }
    this.messageQueue.push(message);
  }

  /**
   * Send all queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.originalConsole.info(`[WebSocketConsoleLogger] Flushing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      if (this.websocket && this.connectionStatus.connected) {
        try {
          this.websocket.send(JSON.stringify(message));
        } catch (error) {
          this.originalConsole.warn('[WebSocketConsoleLogger] Failed to send queued message:', error);
        }
      }
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.connectionStatus.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, Math.min(this.connectionStatus.reconnectAttempts - 1, 5));

    this.originalConsole.info(`[WebSocketConsoleLogger] Scheduling reconnect attempt ${this.connectionStatus.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // Reconnection failed, will be handled by onclose event
      });
    }, delay);
  }

  /**
   * Restore original console methods
   */
  public restore(): void {
    this.config.logLevels.forEach(level => {
      if (level in this.originalConsole) {
        (console as any)[level] = this.originalConsole[level];
      }
    });
    
    this.disconnect();
    this.originalConsole.info('[WebSocketConsoleLogger] Console methods restored');
  }
}

// Create singleton instance
export const webSocketConsoleLogger = new WebSocketConsoleLogger();
