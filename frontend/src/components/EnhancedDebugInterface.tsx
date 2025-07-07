import { useState, useEffect } from "react";
import { debugLogger, type DebugLogEntry, type DeviceInfo, type LogLevel } from "../services";

interface EnhancedDebugInterfaceProps {
  className?: string;
}

export function EnhancedDebugInterface({ className = "" }: EnhancedDebugInterfaceProps) {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Get initial data
    setDeviceInfo(debugLogger.getDeviceInfo());
    setSessionInfo(debugLogger.getSessionInfo());
    setLogs(debugLogger.getLogs());

    // Subscribe to log updates
    const unsubscribe = debugLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all') {
      const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
      const minPriority = levelPriority[filterLevel];
      const logPriority = levelPriority[log.level];
      if (logPriority < minPriority) return false;
    }
    
    if (filterCategory !== 'all' && log.category !== filterCategory) {
      return false;
    }
    
    return true;
  });

  const categories = Array.from(new Set(logs.map(log => log.category))).sort();

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      case 'critical': return '🚨';
      default: return '📝';
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'debug': return 'text-gray-600';
      case 'info': return 'text-blue-600';
      case 'warn': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'critical': return 'text-red-800 font-bold';
      default: return 'text-gray-600';
    }
  };

  const handleExportLogs = (format: 'json' | 'csv' | 'text') => {
    debugLogger.exportLogs({
      format,
      includeDeviceInfo: true,
      includePerformanceMetrics: true,
      filterLevel: filterLevel !== 'all' ? filterLevel : undefined,
      filterCategory: filterCategory !== 'all' ? filterCategory : undefined
    });
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all debug logs?')) {
      debugLogger.clearLogs();
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Session Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          🔧 Enhanced Debug Logger
        </h3>
        {sessionInfo && (
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div>Session: {sessionInfo.sessionId.split('_')[1]}</div>
            <div>Uptime: {formatUptime(sessionInfo.uptime)}</div>
            <div>Total Logs: {logs.length}</div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              showLogs 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            📋 Logs ({filteredLogs.length})
          </button>
          
          <button
            onClick={() => setShowDeviceInfo(!showDeviceInfo)}
            className={`px-3 py-1 rounded text-sm font-medium ${
              showDeviceInfo 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            📱 Device Info
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-1 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700"
          >
            🗑️ Clear
          </button>
        </div>

        {/* Export Options */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Export:</span>
          <button
            onClick={() => handleExportLogs('json')}
            className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700"
          >
            JSON
          </button>
          <button
            onClick={() => handleExportLogs('csv')}
            className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700"
          >
            CSV
          </button>
          <button
            onClick={() => handleExportLogs('text')}
            className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700"
          >
            Text
          </button>
        </div>

        {/* Filters */}
        {showLogs && (
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Level:</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
                className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All</option>
                <option value="debug">Debug+</option>
                <option value="info">Info+</option>
                <option value="warn">Warn+</option>
                <option value="error">Error+</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="mr-1"
                />
                Auto-scroll
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Device Information */}
      {showDeviceInfo && deviceInfo && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">📱 Device Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Platform</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.platform}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">iOS Device</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.isIOS ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Safari Browser</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.isSafari ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">PWA Standalone</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.isPWAStandalone ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Capacitor</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.isCapacitor ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Screen Size</div>
              <div className="text-gray-600 dark:text-gray-400">
                {deviceInfo.screenSize.width}×{deviceInfo.screenSize.height}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Viewport Size</div>
              <div className="text-gray-600 dark:text-gray-400">
                {deviceInfo.viewportSize.width}×{deviceInfo.viewportSize.height}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Orientation</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.orientation}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Online Status</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.isOnline ? 'Online' : 'Offline'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Secure Context</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.isSecureContext ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Service Worker</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.serviceWorkerSupported ? 'Supported' : 'Not Supported'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">Notifications</div>
              <div className="text-gray-600 dark:text-gray-400">{deviceInfo.notificationSupported ? 'Supported' : 'Not Supported'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Logs */}
      {showLogs && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              📋 Debug Logs ({filteredLogs.length})
            </h4>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No logs match the current filters
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded text-xs border-l-4 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
                    style={{
                      borderLeftColor: log.level === 'error' || log.level === 'critical' ? '#ef4444' :
                                      log.level === 'warn' ? '#f59e0b' :
                                      log.level === 'info' ? '#3b82f6' : '#6b7280'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getLevelIcon(log.level)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            [{log.category}]
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 mb-1">
                          {log.message}
                        </div>
                        {log.data && (
                          <details className="mt-1">
                            <summary className="text-gray-500 dark:text-gray-400 cursor-pointer text-xs">
                              Show data
                            </summary>
                            <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                        {log.stackTrace && (
                          <details className="mt-1">
                            <summary className="text-red-500 cursor-pointer text-xs">
                              Show stack trace
                            </summary>
                            <pre className="mt-1 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto text-red-700 dark:text-red-300">
                              {log.stackTrace}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
