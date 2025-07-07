/**
 * Mobile Debug Console Component
 * Provides a mobile-friendly console for debugging on iPhone
 */

import { useState, useEffect } from 'preact/hooks';
import { pwaService } from '../services/pwaService';

interface ConsoleLog {
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export function MobileDebugConsole() {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Capture console logs
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error
    };

    const captureLog = (level: 'log' | 'info' | 'warn' | 'error') => {
      return (...args: any[]) => {
        // Call original console method
        originalConsole[level](...args);
        
        // Capture for mobile display
        const logEntry: ConsoleLog = {
          timestamp: new Date(),
          level,
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '),
          data: args.length > 1 ? args.slice(1) : undefined
        };

        setLogs(prevLogs => {
          const newLogs = [logEntry, ...prevLogs];
          return newLogs.slice(0, 100); // Keep only last 100 logs
        });
      };
    };

    // Override console methods
    console.log = captureLog('log');
    console.info = captureLog('info');
    console.warn = captureLog('warn');
    console.error = captureLog('error');

    // Cleanup on unmount
    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logsText = logs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    if (navigator.share) {
      navigator.share({
        title: 'Debug Console Logs',
        text: logsText,
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(logsText).then(() => {
        alert('Logs copied to clipboard!');
      });
    } else {
      alert(`Debug Logs:\n\n${logsText.substring(0, 1000)}...`);
    }
  };

  const runDebugTests = () => {
    console.log('🧪 Starting PWA Debug Tests...');
    pwaService.startConsoleDebugging();
    pwaService.testRemoteDebugging();
  };

  const getLevelColor = (level: string) => {
    const colors = {
      log: 'text-gray-700',
      info: 'text-blue-600',
      warn: 'text-yellow-600',
      error: 'text-red-600'
    };
    return colors[level] || 'text-gray-700';
  };

  const getLevelBg = (level: string) => {
    const colors = {
      log: 'bg-gray-50',
      info: 'bg-blue-50',
      warn: 'bg-yellow-50',
      error: 'bg-red-50'
    };
    return colors[level] || 'bg-gray-50';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-500 text-white p-3 rounded-full shadow-lg mb-2"
      >
        {isVisible ? '📱' : '🔍'}
      </button>

      {/* Console Panel */}
      {isVisible && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-xl w-80 h-96 flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 text-white p-3 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold text-sm">Debug Console</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* Controls */}
          <div className="p-2 border-b border-gray-200 flex gap-2 flex-wrap">
            <button
              onClick={runDebugTests}
              className="bg-green-500 text-white px-2 py-1 rounded text-xs"
            >
              Run Tests
            </button>
            <button
              onClick={clearLogs}
              className="bg-red-500 text-white px-2 py-1 rounded text-xs"
            >
              Clear
            </button>
            <button
              onClick={exportLogs}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
            >
              Export
            </button>
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll((e.target as HTMLInputElement).checked)}
                className="mr-1"
              />
              Auto-scroll
            </label>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                No logs yet. Click "Run Tests" to start debugging.
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 p-2 rounded ${getLevelBg(log.level)} ${getLevelColor(log.level)}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs">
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 break-words">
                    {log.message}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Status */}
          <div className="p-2 border-t border-gray-200 text-xs text-gray-600">
            {logs.length} logs • {isVisible ? 'Capturing' : 'Paused'}
          </div>
        </div>
      )}
    </div>
  );
}
