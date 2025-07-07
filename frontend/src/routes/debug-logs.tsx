/**
 * Debug Logs Viewer Route
 * 
 * A simple interface for viewing logs in real-time during development.
 * This route fetches logs from the logging API and displays them in a user-friendly format.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router";

interface LogEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
  deviceInfo?: any;
  source: string;
}

interface Session {
  sessionId: string;
  deviceInfo: any;
  lastActivity: string;
  logCount: number;
}

export function DebugLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSession) params.set('sessionId', selectedSession);
      if (selectedLevel) params.set('level', selectedLevel);
      if (selectedSource) params.set('source', selectedSource);
      params.set('limit', '100');

      const response = await fetch(`/api/logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data || []);
        if (data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh logs
  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedSession, selectedLevel, selectedSource, autoRefresh]);

  // Get log level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'text-gray-600';
      case 'info': return 'text-blue-600';
      case 'warn': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'critical': return 'text-red-800 font-bold';
      default: return 'text-gray-600';
    }
  };

  // Get source emoji
  const getSourceEmoji = (source: string) => {
    const emojis: Record<string, string> = {
      'console': '💬',
      'network': '🌐',
      'service-worker': '⚙️',
      'push-notification': '🔔',
      'camera': '📸',
      'app': '📱',
      'system': '🔧'
    };
    return emojis[source] || '📝';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                📱 iOS PWA Debug Logs
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Real-time logging for iOS PWA debugging
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Session Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Sessions</option>
                {sessions.map((session) => (
                  <option key={session.sessionId} value={session.sessionId}>
                    {session.sessionId.slice(-8)} ({session.logCount} logs)
                  </option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Levels</option>
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Sources</option>
                <option value="console">Console</option>
                <option value="network">Network</option>
                <option value="service-worker">Service Worker</option>
                <option value="push-notification">Push Notification</option>
                <option value="camera">Camera</option>
                <option value="app">App</option>
                <option value="system">System</option>
              </select>
            </div>

            {/* Controls */}
            <div className="flex flex-col justify-end space-y-2">
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh
              </label>
            </div>
          </div>
        </div>

        {/* Sessions Overview */}
        {sessions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Active Sessions ({sessions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.slice(0, 6).map((session) => (
                <div
                  key={session.sessionId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setSelectedSession(session.sessionId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {session.sessionId.slice(-12)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {session.logCount} logs
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {session.deviceInfo?.isIOS ? '📱 iOS' : '💻 Other'} • 
                    {session.deviceInfo?.isStandalone ? ' PWA' : ' Browser'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last: {new Date(session.lastActivity).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Logs ({logs.length})
            </h2>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No logs found. Try adjusting your filters or check if the iOS device is sending logs.
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">{getSourceEmoji(log.source)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-sm font-medium ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            [{log.category}]
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {log.message}
                        </p>
                        {log.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer">
                              Show data
                            </summary>
                            <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                        {log.stackTrace && (
                          <details className="mt-2">
                            <summary className="text-xs text-red-600 cursor-pointer">
                              Show stack trace
                            </summary>
                            <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
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
      </div>
    </div>
  );
}
