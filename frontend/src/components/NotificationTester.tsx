import { useState, useEffect } from "react";
import { useOneSignal } from "../hooks/useOneSignal";
import { OneSignalError } from "../utils/errorHandling";

export interface NotificationTesterProps {
  onSubscriptionChange?: (subscribed: boolean, userDetails?: { userId?: string; pushToken?: string }) => void;
  onError?: (error: string) => void;
  className?: string;
  showDetails?: boolean;
}

export function NotificationTester({
  onSubscriptionChange,
  onError,
  className = "",
  showDetails = true,
}: NotificationTesterProps) {
  const {
    initialized,
    loading,
    error,
    errorDetails,
    permissionState,
    user,
    platformInfo,
    isReady,
    canSubscribe,
    canUnsubscribe,
    needsPermission,
    hasPermission,
    permissionDenied,
    requestPermission,
    subscribeUser,
    unsubscribeUser,
    refreshUserStatus,
    clearError,
    retryInitialization,
  } = useOneSignal();

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [showRecoveryActions, setShowRecoveryActions] = useState(false);
  const [lastActionTime, setLastActionTime] = useState<Date | null>(null);
  const [actionStatus, setActionStatus] = useState<'success' | 'error' | null>(null);

  // Track successful actions for better UX feedback
  useEffect(() => {
    if (user.subscribed && actionStatus !== 'success') {
      setActionStatus('success');
      setLastActionTime(new Date());
    }
  }, [user.subscribed, actionStatus]);

  // Clear action status after a delay
  useEffect(() => {
    if (actionStatus) {
      const timer = setTimeout(() => {
        setActionStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionStatus]);

  const handleRequestPermission = async () => {
    clearError();
    setActionStatus(null);
    const granted = await requestPermission();
    setShowPermissionPrompt(false);

    if (granted) {
      console.log('Notification permission granted');
      setActionStatus('success');
      setLastActionTime(new Date());
    } else {
      onError?.('Permission was denied');
      setActionStatus('error');
    }
  };

  const handleSubscribe = async () => {
    clearError();
    setActionStatus(null);

    // Check permissions first
    if (needsPermission) {
      setShowPermissionPrompt(true);
      return;
    }

    if (permissionDenied) {
      onError?.('Notifications are blocked. Please enable them in your browser settings.');
      setActionStatus('error');
      return;
    }

    const success = await subscribeUser();

    if (success) {
      // Pass user details to parent component for prominent display
      onSubscriptionChange?.(true, {
        userId: user.userId,
        pushToken: user.pushToken
      });
      setActionStatus('success');
      setLastActionTime(new Date());
    } else if (error) {
      onError?.(error);
      setActionStatus('error');
    }
  };

  const handleUnsubscribe = async () => {
    clearError();
    const success = await unsubscribeUser();

    if (success) {
      onSubscriptionChange?.(false, {
        userId: user.userId,
        pushToken: user.pushToken
      });
    } else if (error) {
      onError?.(error);
    }
  };

  const handleRefresh = async () => {
    clearError();
    await refreshUserStatus();
  };

  const handleRetryInitialization = async () => {
    clearError();
    const success = await retryInitialization();
    if (!success && error) {
      onError?.(error);
    }
  };

  // Icons
  const BellIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const BellOffIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.63 13A17.89 17.89 0 0118 8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 2l20 20"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const RefreshIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <path
        d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v5h-5M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 16H3v5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const AlertIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2" />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <polyline
        points="20,6 9,17 4,12"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const RetryIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <path
        d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v5h-5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Platform Status */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {platformInfo.isNative ? "📱 Native Push" : "🌐 Web Push"} •
        {platformInfo.isSupported ? " Supported" : " Not Supported"}
      </div>

      {/* HTTPS Information */}
      {!window.location.protocol.startsWith('https') && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-800 dark:text-blue-200">
                HTTPS Required for OneSignal v16
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                OneSignal v16 requires HTTPS. Please access this page using <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">https://</code> instead of <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://</code>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                For development: Run <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">npm run dev</code> which now includes HTTPS support
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Initialization Status */}
      {!initialized && !loading && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <AlertIcon />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                OneSignal Not Initialized
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                The notification service failed to initialize. This may happen with OneSignal v16 if the SDK hasn't loaded yet.
              </p>
            </div>
            <button
              onClick={handleRetryInitialization}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md bg-yellow-600 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RetryIcon />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>
              {!initialized
                ? 'Initializing OneSignal v16...'
                : 'Loading...'
              }
            </span>
          </div>
          {!initialized && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              This may take a moment as the SDK loads asynchronously
            </p>
          )}
        </div>
      )}

      {/* Permission Prompt */}
      {showPermissionPrompt && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="flex items-center gap-3">
            <AlertIcon />
            <div className="flex-1">
              <h3 className="font-medium text-orange-800 dark:text-orange-200">
                Notification Permission Required
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                This app needs permission to send you push notifications.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleRequestPermission}
              className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Grant Permission
            </button>
            <button
              onClick={() => setShowPermissionPrompt(false)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {actionStatus === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-green-800 dark:text-green-200">
                Success!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {user.subscribed
                  ? 'You are now subscribed to push notifications!'
                  : 'Action completed successfully!'
                }
              </p>
              {lastActionTime && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {lastActionTime.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && !showPermissionPrompt && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertIcon />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 dark:text-red-200">
                {errorDetails?.code === 'ONESIGNAL_V16_HTTPS_REQUIRED'
                  ? 'HTTPS Required for OneSignal v16'
                  : 'Notification Error'
                }
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {errorDetails?.userMessage || error}
              </p>

              {/* Recovery Actions */}
              {errorDetails?.recoveryActions && errorDetails.recoveryActions.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowRecoveryActions(!showRecoveryActions)}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 underline"
                  >
                    {showRecoveryActions ? 'Hide' : 'Show'} recovery steps
                  </button>

                  {showRecoveryActions && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-red-800 dark:text-red-200">
                        Try these steps:
                      </p>
                      <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                        {errorDetails.recoveryActions.map((action, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                clearError();
                setShowRecoveryActions(false);
              }}
              className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Subscription Status */}
      {isReady && (
        <div className={`rounded-lg border p-4 ${
          user.subscribed 
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20'
        }`}>
          <div className="flex items-center gap-3">
            {user.subscribed ? <CheckIcon /> : <BellOffIcon />}
            <div className="flex-1">
              <h3 className={`font-medium ${
                user.subscribed 
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-gray-800 dark:text-gray-200'
              }`}>
                {user.subscribed ? 'Subscribed to Notifications' : 'Not Subscribed'}
              </h3>
              <p className={`text-sm ${
                user.subscribed 
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {user.subscribed 
                  ? 'You will receive push notifications'
                  : 'Subscribe to receive push notifications'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isReady && (
        <div className="flex flex-col gap-3">
          {canSubscribe && (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <BellIcon />
              Subscribe to Notifications
            </button>
          )}

          {canUnsubscribe && (
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-500 dark:hover:bg-red-600"
            >
              <BellOffIcon />
              Unsubscribe from Notifications
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RefreshIcon />
            Refresh Status
          </button>
        </div>
      )}

      {/* Detailed Status (Debug Info) */}
      {showDetails && isReady && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/20">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Debug Information (OneSignal v16)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600 dark:text-gray-400">SDK Version:</span>
              <span className="text-gray-900 dark:text-gray-100">v16</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600 dark:text-gray-400">Platform:</span>
              <span className="text-gray-900 dark:text-gray-100">{platformInfo.platform}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600 dark:text-gray-400">Native:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {platformInfo.isNative ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600 dark:text-gray-400">Supported:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {platformInfo.isSupported ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600 dark:text-gray-400">Initialized:</span>
              <span className={initialized
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
              }>
                {initialized ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600 dark:text-gray-400">Permission:</span>
              <span className={`capitalize ${
                permissionState.permission === 'granted'
                  ? 'text-green-600 dark:text-green-400'
                  : permissionState.permission === 'denied'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {permissionState.permission}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-gray-600 dark:text-gray-400">Subscribed:</span>
              <span className={user.subscribed
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400'
              }>
                {user.subscribed ? 'Yes' : 'No'}
              </span>
            </div>
            {user.userId && (
              <div className="col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    🆔 OneSignal User ID
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.userId!).then(() => {
                        alert('User ID copied to clipboard!');
                      }).catch(() => {
                        alert(`User ID: ${user.userId}`);
                      });
                    }}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="font-mono text-xs text-blue-800 dark:text-blue-200 break-all bg-white dark:bg-blue-950 p-2 rounded border">
                  {user.userId}
                </div>
              </div>
            )}
            {user.pushToken && (
              <div className="col-span-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                    🔑 Push Token
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.pushToken!).then(() => {
                        alert('Push token copied to clipboard!');
                      }).catch(() => {
                        alert(`Push Token: ${user.pushToken}`);
                      });
                    }}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-800 dark:text-green-200"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="font-mono text-xs text-green-800 dark:text-green-200 break-all bg-white dark:bg-green-950 p-2 rounded border max-h-16 overflow-y-auto">
                  {user.pushToken}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permission Denied Help */}
      {permissionDenied && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <AlertIcon />
            <div className="flex-1">
              <h3 className="font-medium text-blue-800 dark:text-blue-200">
                Notifications Blocked
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                To enable notifications, please:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 ml-4 list-disc space-y-1">
                <li>Click the lock icon in your browser's address bar</li>
                <li>Change notifications from "Block" to "Allow"</li>
                <li>Refresh this page and try again</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Testing Guide */}
      {initialized && !error && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/20">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            🧪 Testing Guide
          </h3>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p><strong>Step 1:</strong> Ensure you're using HTTPS (check the address bar)</p>
            <p><strong>Step 2:</strong> Click "Subscribe to Notifications" and allow permissions</p>
            <p><strong>Step 3:</strong> Check that your subscription status shows "Subscribed"</p>
            <p><strong>Step 4:</strong> Your User ID and Push Token will appear in the debug info</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              💡 <strong>Tip:</strong> Use the OneSignal dashboard to send test notifications to your User ID
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
