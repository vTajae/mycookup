import { useState, useEffect } from 'preact/hooks';
import { oneSignalService, type NotificationPermissionState, type OneSignalUser } from '../services/oneSignalService';

// Enhanced logging interface for mobile debugging
interface OneSignalLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  action: string;
  message: string;
  data?: any;
}

export function OneSignalTest() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState | null>(null);
  const [userStatus, setUserStatus] = useState<OneSignalUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<OneSignalLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showIOSRequirements, setShowIOSRequirements] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Enhanced logging function for mobile debugging
  const addLog = (level: 'info' | 'warn' | 'error' | 'debug', action: string, message: string, data?: any) => {
    const logEntry: OneSignalLog = {
      timestamp: new Date(),
      level,
      action,
      message,
      data
    };

    setLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
    console[level](`[OneSignal ${action}] ${message}`, data || '');

    // For critical errors on mobile, show alert
    if (level === 'error' && navigator.userAgent.includes('Mobile')) {
      setTimeout(() => {
        alert(`OneSignal Error in ${action}: ${message}`);
      }, 100);
    }
  };

  useEffect(() => {
    // Initialize OneSignal on component mount
    addLog('info', 'Component', 'OneSignalTest component mounted');
    initializeOneSignal();
  }, []);

  const initializeOneSignal = async (isRetry: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const actionType = isRetry ? 'Retry' : 'Initialize';
      addLog('info', actionType, `${isRetry ? 'Retrying' : 'Starting'} OneSignal initialization...`);

      // Enhanced environment logging for iOS PWA debugging
      const isPWAStandalone = (window.navigator as any).standalone === true;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      addLog('debug', 'Environment', 'Environment details', {
        userAgent: navigator.userAgent,
        url: window.location.href,
        isSecureContext: window.isSecureContext,
        hasNotificationAPI: 'Notification' in window,
        hasServiceWorker: 'serviceWorker' in navigator,
        notificationPermission: 'Notification' in window ? Notification.permission : 'not available',
        isPWAStandalone,
        isIOS,
        oneSignalScriptLoaded: !!window.OneSignalDeferred
      });

      // Special logging for iOS PWA mode
      if (isIOS && isPWAStandalone) {
        addLog('info', 'iOS-PWA', 'iOS PWA standalone mode detected', {
          standalone: isPWAStandalone,
          oneSignalDeferred: !!window.OneSignalDeferred,
          location: window.location.href
        });
      }

      const success = isRetry
        ? await oneSignalService.retryInitialization()
        : await oneSignalService.initialize();

      setIsInitialized(success);

      if (success) {
        addLog('info', actionType, 'OneSignal initialization successful');
        await updatePermissionState();
        await updateUserStatus();
      } else {
        addLog('error', actionType, 'OneSignal initialization failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog('error', 'Initialize', `Initialization failed: ${errorMessage}`, err);
      setError(errorMessage);

      // For iOS PWA, provide specific guidance
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isPWAStandalone = (window.navigator as any).standalone === true;

      if (isIOS && isPWAStandalone) {
        addLog('error', 'iOS-PWA', 'iOS PWA initialization failed. Common causes: network issues, script loading problems, or caching issues in standalone mode.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermissionState = async () => {
    try {
      addLog('debug', 'Permission', 'Getting permission state...');
      const state = await oneSignalService.getPermissionState();
      setPermissionState(state);
      addLog('info', 'Permission', `Permission state updated: ${state.permission}`, state);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog('error', 'Permission', `Failed to get permission state: ${errorMessage}`, err);
    }
  };

  const updateUserStatus = async () => {
    try {
      addLog('debug', 'UserStatus', 'Getting user status...');
      const status = await oneSignalService.getUserStatus();
      setUserStatus(status);
      addLog('info', 'UserStatus', `User status updated - Subscribed: ${status.subscribed}`, status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog('error', 'UserStatus', `Failed to get user status: ${errorMessage}`, err);
    }
  };

  const requestPermission = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addLog('info', 'Permission', 'Requesting notification permission...');

      // Log pre-request state
      addLog('debug', 'Permission', 'Pre-request permission state', {
        currentPermission: 'Notification' in window ? Notification.permission : 'not available',
        isSecureContext: window.isSecureContext,
        userAgent: navigator.userAgent
      });

      const state = await oneSignalService.requestPermission();
      setPermissionState(state);

      addLog('info', 'Permission', `Permission request result: ${state.permission}`, state);

      if (state.permission === 'granted') {
        addLog('info', 'Permission', 'Permission granted, updating user status...');
        await updateUserStatus();
      } else {
        addLog('warn', 'Permission', `Permission not granted: ${state.permission}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Permission request failed';
      addLog('error', 'Permission', `Permission request failed: ${errorMessage}`, err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addLog('info', 'Subscribe', 'Subscribing user to notifications...');

      // Log pre-subscription state
      addLog('debug', 'Subscribe', 'Pre-subscription state', {
        permissionState,
        userStatus,
        isInitialized
      });

      const user = await oneSignalService.subscribeUser();
      setUserStatus(user);

      addLog('info', 'Subscribe', `Subscription successful - User ID: ${user.userId || 'N/A'}`, user);

      // Show success modal for mobile users
      if (user.subscribed && (user.userId || user.pushToken)) {
        setShowSuccessModal(true);

        // Auto-hide success modal after 10 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 10000);

        // Also show a mobile-friendly alert with the key information
        setTimeout(() => {
          const message = `🎉 Successfully subscribed to notifications!\n\n` +
                         `User ID: ${user.userId || 'N/A'}\n` +
                         `Push Token: ${user.pushToken ? user.pushToken.substring(0, 30) + '...' : 'N/A'}\n\n` +
                         `You can now receive push notifications!`;
          alert(message);
        }, 500);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Subscription failed';
      addLog('error', 'Subscribe', `Subscription failed: ${errorMessage}`, err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addLog('info', 'Unsubscribe', 'Unsubscribing user from notifications...');

      const success = await oneSignalService.unsubscribeUser();
      addLog('info', 'Unsubscribe', `Unsubscription ${success ? 'successful' : 'failed'}`);

      if (success) {
        await updateUserStatus();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unsubscription failed';
      addLog('error', 'Unsubscribe', `Unsubscription failed: ${errorMessage}`, err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getDiagnosticInfo = () => {
    addLog('info', 'Diagnostics', 'Getting diagnostic information...');
    const info = oneSignalService.getDiagnosticInfo();
    addLog('info', 'Diagnostics', 'Diagnostic info retrieved', info);

    // Show diagnostic info in a more mobile-friendly way
    const diagnosticText = JSON.stringify(info, null, 2);
    if (navigator.share) {
      navigator.share({
        title: 'OneSignal Diagnostics',
        text: diagnosticText,
      }).catch(() => {
        // Fallback to alert
        alert(`Diagnostic Info:\n\n${diagnosticText.substring(0, 500)}${diagnosticText.length > 500 ? '...' : ''}`);
      });
    } else {
      alert(`Diagnostic Info:\n\n${diagnosticText.substring(0, 500)}${diagnosticText.length > 500 ? '...' : ''}`);
    }
  };

  // Utility functions for log display
  const formatLogTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

  return (
    <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          🔔 OneSignal Debug Console
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Comprehensive OneSignal testing and debugging
        </p>
      </div>

      {/* Loading and Error States */}
      {isLoading && (
        <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-blue-700 dark:text-blue-300">Processing...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300 font-medium">Error:</p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Success Banner - Prominent for mobile */}
      {showSuccessModal && userStatus?.subscribed && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg relative">
          <button
            onClick={() => setShowSuccessModal(false)}
            className="absolute top-2 right-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            ✕
          </button>
          <div className="text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-2">
              Successfully Subscribed!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              You can now receive push notifications from MyCookup
            </p>

            {userStatus.userId && (
              <div className="bg-white dark:bg-green-950 p-3 rounded border mb-2">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Your User ID:</div>
                <div className="font-mono text-sm text-green-800 dark:text-green-200 break-all">
                  {userStatus.userId}
                </div>
              </div>
            )}

            <div className="text-xs text-green-600 dark:text-green-400">
              This banner will auto-hide in 10 seconds
            </div>
          </div>
        </div>
      )}

      {/* Status Information */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Initialization</span>
          <span className={`text-sm ${isInitialized ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isInitialized ? '✅ Initialized' : '❌ Not Initialized'}
          </span>
        </div>

        {permissionState && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Permission</span>
            <div className="text-right">
              <span className={`text-sm ${
                permissionState.permission === 'granted' ? 'text-green-600 dark:text-green-400' :
                permissionState.permission === 'denied' ? 'text-red-600 dark:text-red-400' :
                'text-yellow-600 dark:text-yellow-400'
              }`}>
                {permissionState.permission}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {permissionState.isSupported ? '✅ Supported' : '❌ Not Supported'} •
                {permissionState.isNative ? ' Native' : ' Web'}
              </div>
            </div>
          </div>
        )}

        {userStatus && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subscription</span>
              <span className={`text-sm ${userStatus.subscribed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {userStatus.subscribed ? '✅ Subscribed' : '❌ Not Subscribed'}
              </span>
            </div>

            {/* User ID Display - Prominent for mobile */}
            {userStatus.userId && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    🆔 OneSignal User ID
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userStatus.userId!).then(() => {
                        addLog('info', 'Copy', 'User ID copied to clipboard');
                        alert('User ID copied to clipboard!');
                      }).catch(() => {
                        addLog('warn', 'Copy', 'Failed to copy User ID');
                        // Fallback: show in alert for manual copy
                        alert(`User ID: ${userStatus.userId}`);
                      });
                    }}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="font-mono text-sm text-blue-800 dark:text-blue-200 break-all bg-white dark:bg-blue-950 p-2 rounded border">
                  {userStatus.userId}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Use this ID to send targeted notifications via OneSignal API
                </div>
              </div>
            )}

            {/* Push Token Display - Prominent for mobile */}
            {userStatus.pushToken && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-900 dark:text-green-100">
                    🔑 Push Token
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userStatus.pushToken!).then(() => {
                        addLog('info', 'Copy', 'Push token copied to clipboard');
                        alert('Push token copied to clipboard!');
                      }).catch(() => {
                        addLog('warn', 'Copy', 'Failed to copy push token');
                        // Fallback: show in alert for manual copy
                        alert(`Push Token: ${userStatus.pushToken}`);
                      });
                    }}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="font-mono text-xs text-green-800 dark:text-green-200 break-all bg-white dark:bg-green-950 p-2 rounded border max-h-20 overflow-y-auto">
                  {userStatus.pushToken}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Device-specific token for push notification delivery
                </div>
              </div>
            )}

            {/* External ID if available */}
            {userStatus.externalId && (
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    🔗 External ID
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userStatus.externalId!).then(() => {
                        addLog('info', 'Copy', 'External ID copied to clipboard');
                        alert('External ID copied to clipboard!');
                      }).catch(() => {
                        addLog('warn', 'Copy', 'Failed to copy External ID');
                        alert(`External ID: ${userStatus.externalId}`);
                      });
                    }}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="font-mono text-sm text-purple-800 dark:text-purple-200 break-all">
                  {userStatus.externalId}
                </div>
              </div>
            )}

            {/* Tags if available */}
            {userStatus.tags && Object.keys(userStatus.tags).length > 0 && (
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <span className="text-sm font-medium text-orange-900 dark:text-orange-100 block mb-2">
                  🏷️ User Tags
                </span>
                <div className="space-y-1">
                  {Object.entries(userStatus.tags).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-orange-700 dark:text-orange-300 font-medium">{key}:</span>
                      <span className="text-orange-600 dark:text-orange-400">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => initializeOneSignal(false)}
          disabled={isLoading}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          🔄 Reinitialize
        </button>

        {/* Retry button for failed initializations */}
        {error && !isInitialized && (
          <button
            onClick={() => initializeOneSignal(true)}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/40"
          >
            🔁 Retry Init
          </button>
        )}

        <button
          onClick={requestPermission}
          disabled={isLoading || !isInitialized || permissionState?.permission === 'granted'}
          className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          🔔 Request Permission
        </button>

        <button
          onClick={subscribeUser}
          disabled={isLoading || !isInitialized || permissionState?.permission !== 'granted' || userStatus?.subscribed}
          className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40"
        >
          ✅ Subscribe
        </button>

        <button
          onClick={unsubscribeUser}
          disabled={isLoading || !isInitialized || !userStatus?.subscribed}
          className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
        >
          ❌ Unsubscribe
        </button>
      </div>

      {/* Debug Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
            showLogs
              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
              : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
          }`}
        >
          📋 Logs ({logs.length})
        </button>

        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
            showDiagnostics
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
              : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
          }`}
        >
          🔍 Diagnostics
        </button>

        <button
          onClick={() => setShowIOSRequirements(!showIOSRequirements)}
          className={`px-3 py-2 text-sm rounded-lg border ${
            showIOSRequirements
              ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300'
              : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
          }`}
        >
          🍎 iOS
        </button>

        <button
          onClick={getDiagnosticInfo}
          className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
        >
          📤 Export
        </button>
      </div>

      {/* OneSignal Logs */}
      {showLogs && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              📋 OneSignal Activity Logs
            </h3>
            <button
              onClick={() => setLogs([])}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            >
              Clear
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No logs yet. Logs will appear here as you interact with OneSignal.
              </p>
            ) : (
              logs.map((log, index) => (
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
                          {log.action}
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
      )}

      {/* Diagnostic Information */}
      {showDiagnostics && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            🔍 System Diagnostics
          </h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div><strong>User Agent:</strong> {navigator.userAgent}</div>
            <div><strong>URL:</strong> {window.location.href}</div>
            <div><strong>Secure Context:</strong> {window.isSecureContext ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Notification API:</strong> {'Notification' in window ? '✅ Available' : '❌ Not Available'}</div>
            <div><strong>Service Worker:</strong> {'serviceWorker' in navigator ? '✅ Available' : '❌ Not Available'}</div>
            <div><strong>Push Manager:</strong> {'PushManager' in window ? '✅ Available' : '❌ Not Available'}</div>
            <div><strong>Online:</strong> {navigator.onLine ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>
      )}

      {/* iOS Web Push Requirements */}
      {showIOSRequirements && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            🍎 iOS Safari Web Push Requirements
          </h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Based on Apple's requirements for Web Push on iOS 16.4+
          </div>

          {(() => {
            const requirements = oneSignalService.checkiOSWebPushRequirements();

            if (!requirements.isIOS) {
              return (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This device is not running iOS. iOS Web Push requirements only apply to iPhone and iPad devices.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {/* iOS Permission Issue Alert */}
                {requirements.iOSPermissionIssue && (
                  <div className={`p-4 rounded-lg border-2 ${
                    requirements.iOSPermissionIssue.severity === 'critical'
                      ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                      : 'bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700'
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {requirements.iOSPermissionIssue.severity === 'critical' ? '🚨' : '⚠️'}
                      </span>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-red-900 dark:text-red-100 mb-2">
                          {requirements.iOSPermissionIssue.title}
                        </h4>
                        <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                          {requirements.iOSPermissionIssue.message}
                        </p>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-red-700 dark:text-red-300">
                            Solution:
                          </p>
                          {requirements.iOSPermissionIssue.solution.map((step, index) => (
                            <p key={index} className="text-xs text-red-600 dark:text-red-400">
                              {step}
                            </p>
                          ))}
                        </div>
                        {requirements.iOSPermissionIssue.documentation && (
                          <a
                            href={requirements.iOSPermissionIssue.documentation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 underline"
                          >
                            📖 View Documentation
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className={`p-3 rounded-lg border ${
                  requirements.supported
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {requirements.supported ? '✅ Requirements Met' : '❌ Requirements Not Met'}
                    </span>
                    <span className="text-xs">
                      {requirements.summary?.met || 0}/{requirements.summary?.total || 0}
                    </span>
                  </div>
                  {(requirements.summary?.critical || 0) > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {requirements.summary?.critical} critical requirement(s) not met
                    </p>
                  )}
                </div>

                {/* Individual Requirements */}
                <div className="space-y-2">
                  {requirements.requirements.map((req, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        req.met
                          ? 'bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-600'
                          : 'bg-red-50 border-red-400 dark:bg-red-900/20 dark:border-red-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs">{req.met ? '✅' : '❌'}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {req.requirement}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Current: {req.current}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {req.details}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!requirements.supported && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      💡 Next Steps for iOS Web Push
                    </h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Ensure you're using Safari (not Chrome or in-app browser)</li>
                      <li>• Update to iOS 16.4 or later if possible</li>
                      <li>• Add this PWA to your home screen using Safari's share menu</li>
                      <li>• Open the app from the home screen icon (not Safari)</li>
                      <li>• Then try requesting notification permission</li>
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
