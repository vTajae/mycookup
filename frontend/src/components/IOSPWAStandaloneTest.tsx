import { useState, useEffect } from "react";
import { oneSignalService, debugLogger } from "../services";
import { Capacitor } from '@capacitor/core';

interface IOSPWATestState {
  isIOSPWAStandalone: boolean;
  capacitorAvailable: boolean;
  pushPermissionStatus: string;
  registrationStatus: 'idle' | 'requesting' | 'success' | 'error';
  errorMessage: string;
  pushToken: string;
  oneSignalPlayerId: string;
  testResults: Array<{
    test: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
  }>;
}

export function IOSPWAStandaloneTest() {
  const [state, setState] = useState<IOSPWATestState>({
    isIOSPWAStandalone: false,
    capacitorAvailable: false,
    pushPermissionStatus: 'unknown',
    registrationStatus: 'idle',
    errorMessage: '',
    pushToken: '',
    oneSignalPlayerId: '',
    testResults: []
  });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results: IOSPWATestState['testResults'] = [];

    // Test 1: iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    results.push({
      test: 'iOS Device Detection',
      status: isIOS ? 'pass' : 'fail',
      message: isIOS ? 'iOS device detected' : 'Not an iOS device'
    });

    // Test 2: PWA Standalone Mode
    const isPWAStandalone = (window.navigator as any).standalone === true;
    const hasDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWAContext = isPWAStandalone || hasDisplayStandalone;
    
    results.push({
      test: 'PWA Standalone Mode',
      status: isPWAContext ? 'pass' : 'fail',
      message: isPWAContext 
        ? `PWA standalone detected (standalone: ${isPWAStandalone}, display-mode: ${hasDisplayStandalone})`
        : 'Not in PWA standalone mode - add to home screen first'
    });

    // Test 3: Capacitor Availability
    const capacitorAvailable = Capacitor.isPluginAvailable('PushNotifications');
    results.push({
      test: 'Capacitor Push Plugin',
      status: capacitorAvailable ? 'pass' : 'fail',
      message: capacitorAvailable ? 'Capacitor PushNotifications plugin available' : 'Capacitor plugin not available'
    });

    // Test 4: Web View Detection
    const isInWebView = window.navigator.userAgent.includes('WebView');
    results.push({
      test: 'Web View Check',
      status: !isInWebView ? 'pass' : 'warning',
      message: !isInWebView ? 'Not in web view (good)' : 'Running in web view - may affect functionality'
    });

    // Test 5: OneSignal Service Detection
    const isIOSPWAStandalone = isIOS && isPWAContext && capacitorAvailable && !isInWebView;
    results.push({
      test: 'iOS PWA Standalone Detection',
      status: isIOSPWAStandalone ? 'pass' : 'fail',
      message: isIOSPWAStandalone
        ? 'iOS PWA standalone mode confirmed - will use Web SDK with PWA-specific configuration'
        : 'Not iOS PWA standalone mode - will use standard approach'
    });

    // Test 6: Stored Tokens
    const storedPlayerId = localStorage.getItem('oneSignalPlayerId');
    const storedPushToken = localStorage.getItem('oneSignalPushToken');
    
    results.push({
      test: 'Stored Registration Data',
      status: (storedPlayerId && storedPushToken) ? 'pass' : 'warning',
      message: (storedPlayerId && storedPushToken) 
        ? 'Previous registration data found'
        : 'No previous registration data found'
    });

    setState(prev => ({
      ...prev,
      isIOSPWAStandalone,
      capacitorAvailable,
      testResults: results,
      oneSignalPlayerId: storedPlayerId || '',
      pushToken: storedPushToken || ''
    }));
  };

  const testIOSPWAWebRegistration = async () => {
    setState(prev => ({ ...prev, registrationStatus: 'requesting', errorMessage: '' }));

    try {
      debugLogger.info('ios-pwa-test', 'Starting iOS PWA Web SDK registration test...');

      // Initialize OneSignal service
      const initialized = await oneSignalService.initialize();
      
      if (!initialized) {
        throw new Error('OneSignal service failed to initialize');
      }

      // Request permissions
      const permissionResult = await oneSignalService.requestPermission();
      
      setState(prev => ({ 
        ...prev, 
        pushPermissionStatus: permissionResult.permission 
      }));

      if (permissionResult.permission !== 'granted') {
        throw new Error(`Push permission not granted: ${permissionResult.permission}`);
      }

      // Subscribe user
      const userResult = await oneSignalService.subscribeUser();
      
      if (!userResult.subscribed) {
        throw new Error('Failed to subscribe user');
      }

      setState(prev => ({
        ...prev,
        registrationStatus: 'success',
        pushToken: userResult.pushToken || '',
        oneSignalPlayerId: userResult.userId || ''
      }));

      debugLogger.info('ios-pwa-test', 'iOS PWA Web SDK registration successful', userResult);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState(prev => ({
        ...prev,
        registrationStatus: 'error',
        errorMessage
      }));

      debugLogger.error('ios-pwa-test', 'iOS PWA Web SDK registration failed', { error: errorMessage });
    }
  };

  const clearStoredData = () => {
    localStorage.removeItem('oneSignalPlayerId');
    localStorage.removeItem('oneSignalPushToken');
    setState(prev => ({
      ...prev,
      pushToken: '',
      oneSignalPlayerId: ''
    }));
    runDiagnostics();
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
    }
  };

  const getStatusColor = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass': return 'text-green-600 dark:text-green-400';
      case 'fail': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          🧪 iOS PWA Standalone Test
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Comprehensive test for iOS PWA standalone mode push notifications
        </p>
      </div>

      {/* Diagnostic Results */}
      <div className="space-y-3">
        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
          📋 Diagnostic Results
        </h3>
        {state.testResults.map((result, index) => (
          <div
            key={index}
            className="flex items-start justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex items-start gap-3 flex-1">
              <span className="text-lg">{getStatusIcon(result.status)}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {result.test}
                </div>
                <div className={`text-sm ${getStatusColor(result.status)}`}>
                  {result.message}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Registration Test */}
      <div className="space-y-4">
        <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
          🚀 iOS PWA Web SDK Registration Test
        </h3>
        
        <button
          onClick={testIOSPWAWebRegistration}
          disabled={state.registrationStatus === 'requesting'}
          className={`w-full px-4 py-3 rounded-lg font-medium ${
            state.registrationStatus === 'requesting'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : state.isIOSPWAStandalone
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }`}
        >
          {state.registrationStatus === 'requesting'
            ? '🔄 Testing Registration...'
            : '🧪 Test iOS PWA Web SDK Registration'
          }
        </button>

        {state.registrationStatus === 'success' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
            <div className="text-green-800 dark:text-green-200 font-medium mb-2">
              ✅ Registration Successful!
            </div>
            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <div>OneSignal Player ID: {state.oneSignalPlayerId}</div>
              <div>Push Token: {state.pushToken.substring(0, 30)}...</div>
            </div>
          </div>
        )}

        {state.registrationStatus === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
            <div className="text-red-800 dark:text-red-200 font-medium mb-2">
              ❌ Registration Failed
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">
              {state.errorMessage}
            </div>
          </div>
        )}
      </div>

      {/* Stored Data */}
      {(state.oneSignalPlayerId || state.pushToken) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
              💾 Stored Registration Data
            </h3>
            <button
              onClick={clearStoredData}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300"
            >
              Clear Data
            </button>
          </div>
          
          {state.oneSignalPlayerId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                OneSignal Player ID:
              </div>
              <div className="text-xs font-mono text-blue-700 dark:text-blue-300 break-all">
                {state.oneSignalPlayerId}
              </div>
            </div>
          )}
          
          {state.pushToken && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                Push Token:
              </div>
              <div className="text-xs font-mono text-green-700 dark:text-green-300 break-all">
                {state.pushToken}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
        <div className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
          📱 iOS PWA Testing Instructions
        </div>
        <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          <div>1. Open this app in Safari on iOS</div>
          <div>2. Tap Share → Add to Home Screen</div>
          <div>3. Open the app from home screen (standalone mode)</div>
          <div>4. Navigate to this page and run the test</div>
          <div>5. Grant push notification permissions when prompted</div>
        </div>
      </div>
    </div>
  );
}
