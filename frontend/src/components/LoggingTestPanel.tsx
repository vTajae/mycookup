/**
 * Logging Test Panel Component
 * 
 * A simple component to test the iOS logging system with various log types and scenarios.
 */

import { useState } from "react";
import { iosLoggingService } from "../services/iosLoggingService";

export function LoggingTestPanel() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const testBasicLogging = () => {
    iosLoggingService.debug('test', 'Debug message test', { testData: 'debug' });
    iosLoggingService.info('test', 'Info message test', { testData: 'info' });
    iosLoggingService.warn('test', 'Warning message test', { testData: 'warning' });
    iosLoggingService.error('test', 'Error message test', { testData: 'error' });
    addTestResult('Basic logging test completed');
  };

  const testNetworkLogging = async () => {
    try {
      // This will be intercepted by the network monitoring
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();
      addTestResult(`Network test completed: ${data.title?.slice(0, 30)}...`);
    } catch (error) {
      addTestResult('Network test failed');
    }
  };

  const testErrorLogging = () => {
    try {
      // Intentionally cause an error
      (window as any).nonExistentFunction();
    } catch (error) {
      iosLoggingService.error('test', 'Intentional error test', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      addTestResult('Error logging test completed');
    }
  };

  const testConsoleLogging = () => {
    console.log('Test console.log message');
    console.info('Test console.info message');
    console.warn('Test console.warn message');
    console.error('Test console.error message');
    addTestResult('Console logging test completed');
  };

  const testServiceWorkerLogging = () => {
    iosLoggingService.info('service-worker', 'Service worker test message', {
      testType: 'manual',
      timestamp: new Date().toISOString()
    }, 'service-worker');
    addTestResult('Service worker logging test completed');
  };

  const testPushNotificationLogging = () => {
    iosLoggingService.info('push-notification', 'Push notification test message', {
      testType: 'manual',
      permission: Notification.permission,
      supported: 'Notification' in window
    }, 'push-notification');
    addTestResult('Push notification logging test completed');
  };

  const testCameraLogging = () => {
    iosLoggingService.info('camera', 'Camera test message', {
      testType: 'manual',
      supported: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    }, 'camera');
    addTestResult('Camera logging test completed');
  };

  const testCriticalLogging = () => {
    iosLoggingService.critical('test', 'Critical error test - this should flush immediately', {
      testType: 'critical',
      deviceInfo: iosLoggingService.getSessionInfo().deviceInfo
    });
    addTestResult('Critical logging test completed (should flush immediately)');
  };

  const flushLogs = async () => {
    await iosLoggingService.flushLogs();
    addTestResult('Logs flushed manually');
  };

  const getSessionInfo = () => {
    const info = iosLoggingService.getSessionInfo();
    addTestResult(`Session: ${info.sessionId.slice(-8)}, iOS: ${info.deviceInfo.isIOS}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        📱 iOS Logging System Test Panel
      </h2>
      
      <div className="space-y-4">
        {/* Test Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={testBasicLogging}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Test Basic Logging
          </button>
          
          <button
            onClick={testNetworkLogging}
            className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Test Network Logging
          </button>
          
          <button
            onClick={testErrorLogging}
            className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Test Error Logging
          </button>
          
          <button
            onClick={testConsoleLogging}
            className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
          >
            Test Console Logging
          </button>
          
          <button
            onClick={testServiceWorkerLogging}
            className="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Test SW Logging
          </button>
          
          <button
            onClick={testPushNotificationLogging}
            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
          >
            Test Push Logging
          </button>
          
          <button
            onClick={testCameraLogging}
            className="px-3 py-2 bg-pink-600 text-white text-sm rounded hover:bg-pink-700"
          >
            Test Camera Logging
          </button>
          
          <button
            onClick={testCriticalLogging}
            className="px-3 py-2 bg-red-800 text-white text-sm rounded hover:bg-red-900"
          >
            Test Critical Logging
          </button>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={flushLogs}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Flush Logs Now
          </button>
          
          <button
            onClick={getSessionInfo}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Get Session Info
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Results:
            </h3>
            <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 max-h-32 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Instructions:</strong> Test different logging scenarios and then check the 
            <a href="/debug-logs" className="underline ml-1">Debug Logs Viewer</a> to see the results.
            On iOS devices, logs will be sent to the server for remote debugging.
          </p>
        </div>
      </div>
    </div>
  );
}
