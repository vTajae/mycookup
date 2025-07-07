/**
 * WebSocket Logger Configuration Service
 * 
 * Manages configuration for the WebSocket console logger,
 * including environment-specific settings and runtime configuration.
 */

import type { WebSocketLoggerConfig } from './webSocketConsoleLogger';

export interface WebSocketLoggerEnvironmentConfig {
  development: WebSocketLoggerConfig;
  production: WebSocketLoggerConfig;
  local: WebSocketLoggerConfig;
}

/**
 * Default configuration for different environments
 */
export const DEFAULT_WEBSOCKET_LOGGER_CONFIG: WebSocketLoggerEnvironmentConfig = {
  development: {
    workerUrl: 'wss://mycookup-websocket-logger-dev.4ufood4u.workers.dev/ws',
    autoConnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    enableStackTrace: true,
    logLevels: ['log', 'warn', 'error', 'info', 'debug']
  },
  production: {
    workerUrl: 'wss://mycookup-websocket-logger.4ufood4u.workers.dev/ws',
    autoConnect: false, // Disabled by default in production
    reconnectInterval: 10000,
    maxReconnectAttempts: 5,
    enableStackTrace: false, // Disabled for performance in production
    logLevels: ['warn', 'error'] // Only critical logs in production
  },
  local: {
    workerUrl: 'ws://localhost:8787/ws', // For local wrangler dev
    autoConnect: true,
    reconnectInterval: 2000,
    maxReconnectAttempts: 15,
    enableStackTrace: true,
    logLevels: ['log', 'warn', 'error', 'info', 'debug']
  }
};

/**
 * Get environment-specific configuration
 */
export function getWebSocketLoggerConfig(environment?: string): WebSocketLoggerConfig {
  const env = environment || getEnvironment();
  
  const config = DEFAULT_WEBSOCKET_LOGGER_CONFIG[env as keyof WebSocketLoggerEnvironmentConfig] 
    || DEFAULT_WEBSOCKET_LOGGER_CONFIG.development;

  // Override with environment variables if available
  const envOverrides: Partial<WebSocketLoggerConfig> = {};

  // Check for environment variable overrides
  if (typeof window !== 'undefined') {
    // Client-side environment detection
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      envOverrides.workerUrl = 'ws://localhost:8787/ws';
    } else if (hostname.includes('ngrok') || hostname.includes('ngrok-free.app')) {
      // For ngrok tunnels, we need to use the deployed WebSocket worker since we can't tunnel both
      envOverrides.workerUrl = 'wss://mycookup-websocket-logger-dev.4ufood4u.workers.dev/ws';
    } else if (hostname.includes('development.') || hostname.includes('-dev.')) {
      envOverrides.workerUrl = 'wss://mycookup-websocket-logger-dev.4ufood4u.workers.dev/ws';
    } else {
      envOverrides.workerUrl = 'wss://mycookup-websocket-logger.4ufood4u.workers.dev/ws';
    }

    // Enable WebSocket logging only in development or when explicitly enabled
    const isDebugMode = hostname === 'localhost' ||
                       hostname.includes('development.') ||
                       hostname.includes('-dev.') ||
                       hostname.includes('ngrok') ||  // Auto-enable for ngrok tunnels
                       hostname.includes('ngrok-free.app') ||  // Auto-enable for ngrok free domains
                       new URLSearchParams(window.location.search).has('debug') ||
                       localStorage.getItem('enableWebSocketLogging') === 'true';

    if (!isDebugMode) {
      envOverrides.autoConnect = false;
    }
  }

  return {
    ...config,
    ...envOverrides
  };
}

/**
 * Detect current environment
 */
function getEnvironment(): string {
  if (typeof window === 'undefined') {
    return 'development';
  }

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
 * Enable WebSocket logging for current session
 */
export function enableWebSocketLogging(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('enableWebSocketLogging', 'true');
    console.log('WebSocket logging enabled for this session');
  }
}

/**
 * Disable WebSocket logging for current session
 */
export function disableWebSocketLogging(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('enableWebSocketLogging');
    console.log('WebSocket logging disabled for this session');
  }
}

/**
 * Check if WebSocket logging is enabled
 */
export function isWebSocketLoggingEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  const isDebugMode = hostname === 'localhost' ||
                     hostname.includes('development.') ||
                     hostname.includes('-dev.') ||
                     hostname.includes('ngrok') ||  // Auto-enable for ngrok tunnels
                     hostname.includes('ngrok-free.app') ||  // Auto-enable for ngrok free domains
                     new URLSearchParams(window.location.search).has('debug') ||
                     localStorage.getItem('enableWebSocketLogging') === 'true';

  return isDebugMode;
}

/**
 * Get WebSocket logger status information
 */
export function getWebSocketLoggerInfo() {
  const config = getWebSocketLoggerConfig();
  const environment = getEnvironment();
  const enabled = isWebSocketLoggingEnabled();

  return {
    environment,
    enabled,
    config,
    workerUrl: config.workerUrl,
    autoConnect: config.autoConnect,
    logLevels: config.logLevels
  };
}
