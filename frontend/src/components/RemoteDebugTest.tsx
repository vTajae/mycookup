/**
 * Remote Debug Test Component
 * Provides UI for testing remote debugging functionality
 */

import { useState, useEffect } from 'preact/hooks';
import { pwaService } from '../services/pwaService';
import { remoteDebugService } from '../services/remoteDebugService';

export function RemoteDebugTest() {
  const [isRemoteDebugging, setIsRemoteDebugging] = useState(false);
  const [session, setSession] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    setIsRemoteDebugging(remoteDebugService.isInRemoteDebugSession());
    setSession(remoteDebugService.getSession());
    
    // Update logs periodically
    const interval = setInterval(() => {
      if (remoteDebugService.isInRemoteDebugSession()) {
        const currentSession = remoteDebugService.getSession();
        setSession(currentSession);
        setLogs(currentSession?.logs?.slice(0, 20) || []);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = () => {
    pwaService.testRemoteDebugging();
    remoteDebugService.log('info', 'test', 'Manual remote debug test triggered');
  };

  const handleTestError = () => {
    remoteDebugService.log('error', 'test', 'Test error for remote debugging', {
      testData: 'This is a test error',
      timestamp: new Date().toISOString()
    });
  };

  const handleTestNetwork = async () => {
    try {
      remoteDebugService.log('info', 'test', 'Testing network request');
      const response = await fetch('/manifest.json');
      const data = await response.json();
      remoteDebugService.log('info', 'test', 'Network test successful', data);
    } catch (error) {
      remoteDebugService.log('error', 'test', 'Network test failed', error);
    }
  };

  const handleExportSession = () => {
    const sessionData = remoteDebugService.exportDebugSession();
    
    if (navigator.share) {
      navigator.share({
        title: 'Remote Debug Session',
        text: sessionData,
      }).catch(() => {
        copyToClipboard(sessionData);
      });
    } else {
      copyToClipboard(sessionData);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Debug session copied to clipboard!');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Debug session copied to clipboard!');
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString();
  };

  const getLevelColor = (level: string) => {
    const colors = {
      debug: 'text-gray-600',
      info: 'text-blue-600',
      warn: 'text-yellow-600',
      error: 'text-red-600'
    };
    return colors[level] || 'text-gray-600';
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          🔍 Remote Debug Test
          {isRemoteDebugging && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
              Active
            </span>
          )}
        </h2>

        {/* Connection Status */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
          <div className="bg-gray-50 p-4 rounded">
            <p className="mb-2">
              <strong>Remote Debugging:</strong>{' '}
              <span className={isRemoteDebugging ? 'text-green-600' : 'text-red-600'}>
                {isRemoteDebugging ? 'Connected' : 'Not Connected'}
              </span>
            </p>
            {session && (
              <>
                <p className="mb-2">
                  <strong>Session ID:</strong> {session.id}
                </p>
                <p className="mb-2">
                  <strong>Started:</strong> {session.startTime.toLocaleString()}
                </p>
                <p className="mb-2">
                  <strong>Device:</strong> {session.deviceInfo.isIOS ? 'iOS' : 'Other'} 
                  {session.deviceInfo.isStandalone && ' (Standalone)'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Test Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Test Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={handleTestConnection}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Test Connection
            </button>
            <button
              onClick={handleTestError}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Test Error Log
            </button>
            <button
              onClick={handleTestNetwork}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test Network
            </button>
            <button
              onClick={handleExportSession}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              Export Session
            </button>
          </div>
        </div>

        {/* Setup Instructions */}
        {!isRemoteDebugging && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Setup Remote Debugging</h3>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Connect iOS device via USB</li>
                <li>Enable Web Inspector in Safari settings</li>
                <li>Start: <code className="bg-gray-200 px-1 rounded">ios_webkit_debug_proxy -c null:9221,:9222-9322</code></li>
                <li>Start: <code className="bg-gray-200 px-1 rounded">remotedebug_ios_webkit_adapter --port=9000</code></li>
                <li>Open <code className="bg-gray-200 px-1 rounded">chrome://inspect</code> in Chrome</li>
                <li>Add <code className="bg-gray-200 px-1 rounded">localhost:9000</code> to network targets</li>
                <li>Click "inspect" next to your iOS device</li>
              </ol>
            </div>
          </div>
        )}

        {/* Recent Logs */}
        {isRemoteDebugging && logs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Recent Debug Logs</h3>
            <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-2 text-sm border-b border-gray-200 pb-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${getLevelColor(log.level)}`}>
                      [{log.level.toUpperCase()}] {log.category}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <div className="text-gray-700 mt-1">{log.message}</div>
                  {log.data && (
                    <div className="text-gray-600 text-xs mt-1 bg-gray-100 p-2 rounded">
                      <pre>{JSON.stringify(log.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
