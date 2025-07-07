import { useState, useEffect } from "react";
import { Link } from "react-router";
import { NotificationTester, EnhancedDebugInterface, IOSPWAStandaloneTest } from "../components";
import { OneSignalTest } from "../components/OneSignalTest";
import { LoggingTestPanel } from "../components/LoggingTestPanel";
import { pwaService, debugLogger, type PWAStatus } from "../services";

// Debug logging interface for mobile devices
interface DebugLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

// Use PWAStatus from the service instead of local interface

export function Notifications() {
  const [subscriptionHistory, setSubscriptionHistory] = useState<Array<{
    timestamp: Date;
    action: 'subscribed' | 'unsubscribed';
    success: boolean;
  }>>([]);

  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [pwaState, setPwaState] = useState<PWAStatus>({
    isInstallable: false,
    isInstalled: false,
    installPrompt: null,
    serviceWorkerRegistered: false,
    serviceWorkerReady: false,
    manifestLoaded: false,
  });
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [showPWADebug, setShowPWADebug] = useState(false);
  const [lastSubscriptionSuccess, setLastSubscriptionSuccess] = useState<{
    userId?: string;
    pushToken?: string;
    timestamp: Date;
  } | null>(null);

  // Enhanced logging function that works on mobile devices
  const addDebugLog = (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => {
    const logEntry: DebugLog = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    setDebugLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs

    // Also log to console for development
    console[level](`[${level.toUpperCase()}] ${message}`, data || '');

    // For critical errors, also show an alert on mobile
    if (level === 'error' && navigator.userAgent.includes('Mobile')) {
      // Use a timeout to avoid blocking the UI
      setTimeout(() => {
        if (confirm(`Error: ${message}\n\nShow debug logs?`)) {
          setShowDebugLogs(true);
        }
      }, 100);
    }
  };

  // PWA and Service Worker debugging
  useEffect(() => {
    addDebugLog('info', 'Starting PWA and OneSignal debugging session');

    // Subscribe to PWA service updates
    const unsubscribe = pwaService.subscribe((status) => {
      setPwaState(status);
      addDebugLog('info', 'PWA status updated', status);
    });

    // Get initial PWA status
    const initialStatus = pwaService.getStatus();
    setPwaState(initialStatus);
    addDebugLog('info', 'Initial PWA status', initialStatus);

    // Get PWA logs and merge with debug logs
    const pwaLogs = pwaService.getLogs();
    const convertedLogs = pwaLogs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: `[PWA] ${log.message}`,
      data: log.data
    }));
    setDebugLogs(prev => [...convertedLogs, ...prev]);

    // Check for iOS-specific issues and show prominent warnings
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const isPWAInstalled = (window.navigator as any).standalone === true;
      const notificationPermission = 'Notification' in window ? Notification.permission : 'not-available';

      if (!isPWAInstalled) {
        addDebugLog('error', 'iOS Critical Issue: PWA not installed to home screen. iOS Safari Web Push requires PWA installation.');
      }

      if (notificationPermission === 'denied') {
        addDebugLog('error', 'iOS Critical Issue: Permission denied. PWA must be removed and re-added to home screen.');
      }

      addDebugLog('info', 'iOS Safari Web Push Status', {
        isPWAInstalled,
        notificationPermission,
        standalone: (window.navigator as any).standalone,
        userAgent: navigator.userAgent
      });
    }

    return unsubscribe;
  }, []);



  // Enhanced subscription change handler with logging
  const handleSubscriptionChange = (subscribed: boolean, userDetails?: { userId?: string; pushToken?: string }) => {
    const newEntry = {
      timestamp: new Date(),
      action: subscribed ? 'subscribed' as const : 'unsubscribed' as const,
      success: true,
    };

    setSubscriptionHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
    addDebugLog('info', `User ${subscribed ? 'subscribed to' : 'unsubscribed from'} notifications`, userDetails);

    // Capture successful subscription details for prominent display
    if (subscribed && userDetails && (userDetails.userId || userDetails.pushToken)) {
      setLastSubscriptionSuccess({
        userId: userDetails.userId,
        pushToken: userDetails.pushToken,
        timestamp: new Date()
      });

      // Auto-hide after 15 seconds
      setTimeout(() => {
        setLastSubscriptionSuccess(null);
      }, 15000);

      // Show mobile-friendly alert with key information
      setTimeout(() => {
        const message = `🎉 Successfully subscribed to push notifications!\n\n` +
                       `${userDetails.userId ? `User ID: ${userDetails.userId}\n` : ''}` +
                       `${userDetails.pushToken ? `Token: ${userDetails.pushToken.substring(0, 30)}...\n` : ''}` +
                       `\nYou can now receive notifications from MyCookup!`;
        alert(message);
      }, 1000);
    }
  };

  // Enhanced error handler with logging
  const handleNotificationError = (error: string) => {
    addDebugLog('error', `Notification error: ${error}`);

    // Add error to history
    const newEntry = {
      timestamp: new Date(),
      action: 'subscribed' as const, // Default action for error tracking
      success: false,
    };

    setSubscriptionHistory(prev => [newEntry, ...prev.slice(0, 9)]);
  };

  // Utility functions
  const formatTime = (date: Date | string | number) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.warn('Failed to format time:', date, error);
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatLogTime = (date: Date | string | number) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.warn('Failed to format log time:', date, error);
      return new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warn': return 'text-yellow-600 dark:text-yellow-400';
      case 'info': return 'text-blue-600 dark:text-blue-400';
      case 'debug': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '🔴';
      case 'warn': return '🟡';
      case 'info': return '🔵';
      case 'debug': return '⚪';
      default: return '⚪';
    }
  };

  // PWA installation handler
  const handlePWAInstall = async () => {
    addDebugLog('info', 'Attempting PWA installation...');
    try {
      const success = await pwaService.installPWA();
      if (success) {
        addDebugLog('info', 'PWA installation successful');
      } else {
        addDebugLog('warn', 'PWA installation was dismissed or failed');
      }
    } catch (error) {
      addDebugLog('error', 'Failed to install PWA', error);
    }
  };

  // Service worker registration handler
  const handleServiceWorkerRegister = async () => {
    addDebugLog('info', 'Attempting manual service worker registration...');
    try {
      const success = await pwaService.registerServiceWorker();
      if (success) {
        addDebugLog('info', 'Service worker registration successful');
        alert('✅ Service worker registered successfully! OneSignal should now work.');
      } else {
        addDebugLog('warn', 'Service worker registration failed');
        alert('❌ Service worker registration failed. Check debug logs for details.');
      }
    } catch (error) {
      addDebugLog('error', 'Failed to register service worker', error);
      alert('❌ Service worker registration error. Check debug logs for details.');
    }
  };

  // Clear debug logs
  const clearDebugLogs = () => {
    setDebugLogs([]);
    addDebugLog('info', 'Debug logs cleared');
  };

  // Export debug logs for sharing
  const exportDebugLogs = () => {
    // Combine app debug logs with PWA service logs
    const pwaLogs = pwaService.getLogs();
    const allLogs = [
      ...debugLogs,
      ...pwaLogs.map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: `[PWA] ${log.message}`,
        data: log.data
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const logsText = allLogs.map(log =>
      `[${formatLogTime(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n\n');

    if (navigator.share) {
      navigator.share({
        title: 'MyCookup Debug Logs',
        text: logsText,
      }).catch(err => addDebugLog('warn', 'Failed to share logs', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(logsText).then(() => {
        addDebugLog('info', 'Debug logs copied to clipboard');
        alert('Debug logs copied to clipboard!');
      }).catch(err => {
        addDebugLog('warn', 'Failed to copy logs to clipboard', err);
        // Final fallback: show in alert
        alert(`Debug Logs:\n\n${logsText.substring(0, 1000)}${logsText.length > 1000 ? '...' : ''}`);
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Home
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              🔔 Push Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Test and manage your push notification settings
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner - Prominent for mobile */}
      {lastSubscriptionSuccess && (
        <section className="px-4 pb-4">
          <div className="max-w-md mx-auto">
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-300 dark:border-green-700 rounded-3xl relative shadow-lg">
              <button
                onClick={() => setLastSubscriptionSuccess(null)}
                className="absolute top-3 right-3 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 text-lg"
              >
                ✕
              </button>

              <div className="text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                  Notification Registration Successful!
                </h2>
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                  You're now registered to receive push notifications from MyCookup
                </p>

                {/* User ID Display */}
                {lastSubscriptionSuccess.userId && (
                  <div className="bg-white dark:bg-green-950 p-4 rounded-lg border mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                        🆔 Your OneSignal User ID
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lastSubscriptionSuccess.userId!).then(() => {
                            alert('User ID copied to clipboard!');
                          }).catch(() => {
                            alert(`User ID: ${lastSubscriptionSuccess.userId}`);
                          });
                        }}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-800 dark:text-green-200"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="font-mono text-sm text-green-800 dark:text-green-200 break-all bg-green-50 dark:bg-green-900/30 p-2 rounded">
                      {lastSubscriptionSuccess.userId}
                    </div>
                  </div>
                )}

                {/* Push Token Display */}
                {lastSubscriptionSuccess.pushToken && (
                  <div className="bg-white dark:bg-blue-950 p-4 rounded-lg border mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        🔑 Push Token
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lastSubscriptionSuccess.pushToken!).then(() => {
                            alert('Push token copied to clipboard!');
                          }).catch(() => {
                            alert(`Push Token: ${lastSubscriptionSuccess.pushToken}`);
                          });
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="font-mono text-xs text-blue-800 dark:text-blue-200 break-all bg-blue-50 dark:bg-blue-900/30 p-2 rounded max-h-16 overflow-y-auto">
                      {lastSubscriptionSuccess.pushToken}
                    </div>
                  </div>
                )}

                <div className="text-xs text-green-600 dark:text-green-400 mt-3">
                  Registered at {lastSubscriptionSuccess.timestamp.toLocaleTimeString()} • Auto-hide in 15s
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Debug Controls */}
      <section className="px-4 pb-4">
        <div className="max-w-md mx-auto">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowDebugLogs(!showDebugLogs)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                showDebugLogs
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                  : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              🐛 Debug Logs ({debugLogs.length})
            </button>
            <button
              onClick={() => setShowPWADebug(!showPWADebug)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                showPWADebug
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                  : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              📱 PWA Status
            </button>
          </div>
        </div>
      </section>

      {/* PWA Debug Section */}
      {showPWADebug && (
        <section className="px-4 pb-6">
          <div className="max-w-md mx-auto">
            <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  📱 PWA Debug Information
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Progressive Web App installation and service worker status
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PWA Installed</span>
                  <span className={`text-sm ${pwaState.isInstalled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {pwaState.isInstalled ? '✅ Yes' : '❌ No'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PWA Installable</span>
                  <span className={`text-sm ${pwaState.isInstallable ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {pwaState.isInstallable ? '✅ Yes' : '⚪ No'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Service Worker</span>
                  <span className={`text-sm ${pwaState.serviceWorkerRegistered ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {pwaState.serviceWorkerRegistered ? '✅ Registered' : '❌ Not Registered'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SW Ready</span>
                  <span className={`text-sm ${pwaState.serviceWorkerReady ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {pwaState.serviceWorkerReady ? '✅ Ready' : '⏳ Loading'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manifest</span>
                  <span className={`text-sm ${pwaState.manifestLoaded ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {pwaState.manifestLoaded ? '✅ Loaded' : '❌ Failed'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {pwaState.isInstallable && (
                  <button
                    onClick={handlePWAInstall}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    📱 Install PWA
                  </button>
                )}

                {!pwaState.serviceWorkerRegistered && (
                  <button
                    onClick={handleServiceWorkerRegister}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  >
                    🔧 Register Service Worker
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Debug Logs Section */}
      {showDebugLogs && (
        <section className="px-4 pb-6">
          <div className="max-w-md mx-auto">
            <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  🐛 Debug Logs
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={clearDebugLogs}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Clear
                  </button>
                  <button
                    onClick={exportDebugLogs}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                  >
                    Export
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {debugLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No debug logs yet. Logs will appear here as you interact with the app.
                  </p>
                ) : (
                  debugLogs.map((log, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border-l-4"
                      style={{
                        borderLeftColor:
                          log.level === 'error' ? '#ef4444' :
                          log.level === 'warn' ? '#f59e0b' :
                          log.level === 'info' ? '#3b82f6' : '#6b7280'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs">{getLogLevelIcon(log.level)}</span>
                            <span className={`text-xs font-medium ${getLogLevelColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatLogTime(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                            {log.message}
                          </p>
                          {log.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                                Show data
                              </summary>
                              <pre className="mt-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* iOS PWA Standalone Test Section */}
      <section className="px-4 pb-8">
        <div className="max-w-md mx-auto">
          <IOSPWAStandaloneTest />
        </div>
      </section>

      {/* Enhanced Debug Logger Section */}
      <section className="px-4 pb-8">
        <div className="max-w-md mx-auto">
          <EnhancedDebugInterface />
        </div>
      </section>

      {/* OneSignal Debug Section */}
      <section className="px-4 pb-8">
        <div className="max-w-md mx-auto">
          <OneSignalTest />
        </div>
      </section>

      {/* iOS Logging Test Panel */}
      <section className="px-4 pb-8">
        <div className="max-w-md mx-auto">
          <LoggingTestPanel />
        </div>
      </section>

      {/* Notification Tester Section */}
      <section className="px-4 pb-8">
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                📱 Notification Registration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Subscribe to receive push notifications from MyCookup
              </p>
            </div>

            <NotificationTester
              onSubscriptionChange={handleSubscriptionChange}
              onError={handleNotificationError}
              showDetails={true}
            />
          </div>
        </div>
      </section>

      {/* Activity History Section */}
      {subscriptionHistory.length > 0 && (
        <section className="px-4 pb-8">
          <div className="max-w-md mx-auto">
            <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📋 Activity History
              </h3>
              <div className="space-y-3">
                {subscriptionHistory.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      entry.success
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {entry.success 
                          ? (entry.action === 'subscribed' ? '✅' : '❌')
                          : '⚠️'
                        }
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${
                          entry.success
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          {entry.success 
                            ? `Successfully ${entry.action}`
                            : 'Action failed'
                          }
                        </p>
                        <p className={`text-xs ${
                          entry.success
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatTime(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSubscriptionHistory([])}
                className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear History
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Information Section */}
      <section className="px-4 pb-8">
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ℹ️ About Push Notifications
            </h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>
                Push notifications allow MyCookup to send you updates even when the app is closed.
              </p>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  What you'll receive:
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Recipe reminders and cooking tips</li>
                  <li>New feature announcements</li>
                  <li>Community updates and highlights</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Platform Support:
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>📱 Native iOS and Android apps</li>
                  <li>🌐 Modern web browsers (Chrome, Firefox, Safari)</li>
                  <li>💻 Desktop PWA installations</li>
                </ul>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                You can unsubscribe at any time. Your privacy is important to us.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
