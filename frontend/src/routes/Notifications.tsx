import { useState } from "react";
import { Link } from "react-router";
import { NotificationTester } from "../components";
import { OneSignalTest } from "../components/OneSignalTest";

export function Notifications() {
  const [subscriptionHistory, setSubscriptionHistory] = useState<Array<{
    timestamp: Date;
    action: 'subscribed' | 'unsubscribed';
    success: boolean;
  }>>([]);

  const handleSubscriptionChange = (subscribed: boolean) => {
    const newEntry = {
      timestamp: new Date(),
      action: subscribed ? 'subscribed' as const : 'unsubscribed' as const,
      success: true,
    };
    
    setSubscriptionHistory(prev => [newEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
    console.log(`User ${subscribed ? 'subscribed to' : 'unsubscribed from'} notifications`);
  };

  const handleNotificationError = (error: string) => {
    console.error("Notification error:", error);
    
    // Add error to history
    const newEntry = {
      timestamp: new Date(),
      action: 'subscribed' as const, // Default action for error tracking
      success: false,
    };
    
    setSubscriptionHistory(prev => [newEntry, ...prev.slice(0, 9)]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

      {/* OneSignal Debug Section */}
      <section className="px-4 pb-8">
        <div className="max-w-md mx-auto">
          <OneSignalTest />
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
