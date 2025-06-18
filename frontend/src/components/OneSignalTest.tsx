import { useState, useEffect } from 'preact/hooks';
import { oneSignalService, type NotificationPermissionState, type OneSignalUser } from '../services/oneSignalService';

export function OneSignalTest() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState | null>(null);
  const [userStatus, setUserStatus] = useState<OneSignalUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize OneSignal on component mount
    initializeOneSignal();
  }, []);

  const initializeOneSignal = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('OneSignalTest: Starting initialization...');
      
      const success = await oneSignalService.initialize();
      setIsInitialized(success);
      
      if (success) {
        console.log('OneSignalTest: Initialization successful');
        await updatePermissionState();
        await updateUserStatus();
      }
    } catch (err) {
      console.error('OneSignalTest: Initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermissionState = async () => {
    try {
      const state = await oneSignalService.getPermissionState();
      setPermissionState(state);
    } catch (err) {
      console.error('OneSignalTest: Failed to get permission state:', err);
    }
  };

  const updateUserStatus = async () => {
    try {
      const status = await oneSignalService.getUserStatus();
      setUserStatus(status);
    } catch (err) {
      console.error('OneSignalTest: Failed to get user status:', err);
    }
  };

  const requestPermission = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('OneSignalTest: Requesting permission...');
      
      const state = await oneSignalService.requestPermission();
      setPermissionState(state);
      
      if (state.permission === 'granted') {
        await updateUserStatus();
      }
    } catch (err) {
      console.error('OneSignalTest: Permission request failed:', err);
      setError(err instanceof Error ? err.message : 'Permission request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('OneSignalTest: Subscribing user...');
      
      const user = await oneSignalService.subscribeUser();
      setUserStatus(user);
    } catch (err) {
      console.error('OneSignalTest: Subscription failed:', err);
      setError(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('OneSignalTest: Unsubscribing user...');
      
      const success = await oneSignalService.unsubscribeUser();
      if (success) {
        await updateUserStatus();
      }
    } catch (err) {
      console.error('OneSignalTest: Unsubscription failed:', err);
      setError(err instanceof Error ? err.message : 'Unsubscription failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getDiagnosticInfo = () => {
    const info = oneSignalService.getDiagnosticInfo();
    console.log('OneSignal Diagnostic Info:', info);
    alert('Diagnostic info logged to console');
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h3>OneSignal Test Component</h3>
      
      {isLoading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Initialization Status:</strong> {isInitialized ? '✅ Initialized' : '❌ Not Initialized'}
      </div>
      
      {permissionState && (
        <div style={{ marginBottom: '10px' }}>
          <strong>Permission:</strong> {permissionState.permission} 
          {permissionState.isSupported ? ' (Supported)' : ' (Not Supported)'}
          {permissionState.isNative ? ' (Native)' : ' (Web)'}
        </div>
      )}
      
      {userStatus && (
        <div style={{ marginBottom: '10px' }}>
          <strong>Subscription:</strong> {userStatus.subscribed ? '✅ Subscribed' : '❌ Not Subscribed'}
          {userStatus.userId && <div><strong>User ID:</strong> {userStatus.userId}</div>}
          {userStatus.pushToken && <div><strong>Push Token:</strong> {userStatus.pushToken.substring(0, 20)}...</div>}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
        <button onClick={initializeOneSignal} disabled={isLoading}>
          Reinitialize
        </button>
        
        <button 
          onClick={requestPermission} 
          disabled={isLoading || !isInitialized || permissionState?.permission === 'granted'}
        >
          Request Permission
        </button>
        
        <button 
          onClick={subscribeUser} 
          disabled={isLoading || !isInitialized || permissionState?.permission !== 'granted' || userStatus?.subscribed}
        >
          Subscribe
        </button>
        
        <button 
          onClick={unsubscribeUser} 
          disabled={isLoading || !isInitialized || !userStatus?.subscribed}
        >
          Unsubscribe
        </button>
        
        <button onClick={getDiagnosticInfo}>
          Show Diagnostics
        </button>
      </div>
    </div>
  );
}
