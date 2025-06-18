import { OneSignalError } from './errorHandling';

export interface ErrorReport {
  timestamp: Date;
  error: Error | OneSignalError;
  context: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  additionalData?: Record<string, any>;
}

export interface ErrorStats {
  totalErrors: number;
  oneSignalErrors: number;
  networkErrors: number;
  permissionErrors: number;
  initializationErrors: number;
  lastError?: ErrorReport;
  errorsByType: Record<string, number>;
}

/**
 * Error monitoring and reporting utility
 */
class ErrorMonitor {
  private errors: ErrorReport[] = [];
  private sessionId: string;
  private maxErrors = 100; // Keep last 100 errors
  private listeners: ((report: ErrorReport) => void)[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        'unhandledrejection'
      );
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError(
        new Error(`Global Error: ${event.message} at ${event.filename}:${event.lineno}`),
        'global_error'
      );
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        this.reportError(
          new Error(`Resource Load Error: ${target.tagName} - ${target.getAttribute('src') || target.getAttribute('href')}`),
          'resource_error'
        );
      }
    }, true);
  }

  /**
   * Report an error
   */
  public reportError(
    error: Error | OneSignalError,
    context: string,
    additionalData?: Record<string, any>
  ): void {
    const report: ErrorReport = {
      timestamp: new Date(),
      error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
      additionalData,
    };

    // Add to errors array
    this.errors.push(report);

    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(report);
      } catch (err) {
        console.error('Error in error monitor listener:', err);
      }
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group(`🚨 Error Report - ${context}`);
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Additional Data:', additionalData);
      console.log('Session ID:', this.sessionId);
      console.groupEnd();
    }
  }

  /**
   * Add error listener
   */
  public addListener(listener: (report: ErrorReport) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get error statistics
   */
  public getStats(): ErrorStats {
    const stats: ErrorStats = {
      totalErrors: this.errors.length,
      oneSignalErrors: 0,
      networkErrors: 0,
      permissionErrors: 0,
      initializationErrors: 0,
      errorsByType: {},
    };

    this.errors.forEach(report => {
      const error = report.error;
      
      if (error instanceof OneSignalError) {
        stats.oneSignalErrors++;
        
        // Categorize OneSignal errors
        if (error.code.includes('NETWORK') || error.code.includes('OFFLINE')) {
          stats.networkErrors++;
        }
        if (error.code.includes('PERMISSION')) {
          stats.permissionErrors++;
        }
        if (error.code.includes('INIT') || error.code.includes('SDK')) {
          stats.initializationErrors++;
        }
        
        // Count by error code
        stats.errorsByType[error.code] = (stats.errorsByType[error.code] || 0) + 1;
      } else {
        // Count by error message for regular errors
        const errorType = error.name || 'Unknown';
        stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
      }
    });

    if (this.errors.length > 0) {
      stats.lastError = this.errors[this.errors.length - 1];
    }

    return stats;
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errors.slice(-limit);
  }

  /**
   * Clear all errors
   */
  public clearErrors(): void {
    this.errors = [];
  }

  /**
   * Export errors for debugging
   */
  public exportErrors(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      errors: this.errors.map(report => ({
        timestamp: report.timestamp.toISOString(),
        error: {
          name: report.error.name,
          message: report.error.message,
          stack: report.error.stack,
          ...(report.error instanceof OneSignalError ? {
            code: report.error.code,
            userMessage: report.error.userMessage,
            severity: report.error.severity,
          } : {}),
        },
        context: report.context,
        url: report.url,
        userAgent: report.userAgent,
        additionalData: report.additionalData,
      })),
      stats: this.getStats(),
    }, null, 2);
  }

  /**
   * Get session information
   */
  public getSessionInfo() {
    return {
      sessionId: this.sessionId,
      startTime: new Date(parseInt(this.sessionId.split('_')[1])),
      errorCount: this.errors.length,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor();

/**
 * Hook for using error monitoring in React components
 */
export function useErrorMonitoring() {
  return {
    reportError: (error: Error | OneSignalError, context: string, additionalData?: Record<string, any>) => {
      errorMonitor.reportError(error, context, additionalData);
    },
    getStats: () => errorMonitor.getStats(),
    getRecentErrors: (limit?: number) => errorMonitor.getRecentErrors(limit),
    exportErrors: () => errorMonitor.exportErrors(),
    getSessionInfo: () => errorMonitor.getSessionInfo(),
  };
}
