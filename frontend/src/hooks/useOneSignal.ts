import { useEffect, useState, useCallback } from "react";
import { oneSignalService } from "../services";
import type { NotificationPermissionState, OneSignalUser } from "../services";
import { OneSignalError } from "../utils/errorHandling";

export interface OneSignalState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  errorDetails: OneSignalError | null;
  permissionState: NotificationPermissionState;
  user: OneSignalUser;
  platformInfo: {
    isNative: boolean;
    platform: string;
    isSupported: boolean;
  };
}

export function useOneSignal() {
  const [state, setState] = useState<OneSignalState>({
    initialized: false,
    loading: true,
    error: null,
    errorDetails: null,
    permissionState: {
      permission: 'default',
      isSupported: false,
      isNative: false,
    },
    user: {
      subscribed: false,
    },
    platformInfo: {
      isNative: false,
      platform: 'web',
      isSupported: false,
    },
  });

  // Initialize OneSignal service with retry logic for v16
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const initializeOneSignal = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Get platform info immediately
        const platformInfo = oneSignalService.getPlatformInfo();

        // For web platforms, we need to wait for OneSignal v16 to be ready
        // This might take a moment as it loads asynchronously
        const initialized = await oneSignalService.initialize();

        if (!initialized) {
          throw new Error('Failed to initialize OneSignal service');
        }

        // Add a small delay to ensure v16 SDK is fully ready
        if (!platformInfo.isNative) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Get initial permission state
        const permissionState = await oneSignalService.getPermissionState();

        // Get initial user status
        const user = await oneSignalService.getUserStatus();

        setState(prev => ({
          ...prev,
          initialized: true,
          loading: false,
          error: null,
          errorDetails: null,
          permissionState,
          user,
          platformInfo,
        }));

        console.log('OneSignal hook initialized successfully');
      } catch (error) {
        const oneSignalError = error instanceof OneSignalError ? error : null;
        const errorMessage = oneSignalError?.userMessage || (error instanceof Error ? error.message : 'Unknown error occurred');
        console.error(`Failed to initialize OneSignal hook (attempt ${retryCount + 1}):`, error);

        // Retry logic for v16 initialization (but not for critical errors)
        const shouldRetry = retryCount < maxRetries &&
                           !oneSignalService.getPlatformInfo().isNative &&
                           (!oneSignalError || oneSignalError.severity !== 'high');

        if (shouldRetry) {
          retryCount++;
          console.log(`Retrying OneSignal initialization in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})`);
          setTimeout(initializeOneSignal, retryDelay);
          return;
        }

        setState(prev => ({
          ...prev,
          initialized: false,
          loading: false,
          error: errorMessage,
          errorDetails: oneSignalError,
          platformInfo: oneSignalService.getPlatformInfo(),
        }));
      }
    };

    initializeOneSignal();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const permissionState = await oneSignalService.requestPermission();
      
      setState(prev => ({
        ...prev,
        loading: false,
        permissionState,
      }));

      return permissionState.permission === 'granted';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permission';
      console.error('Failed to request notification permission:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  // Subscribe user to notifications
  const subscribeUser = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check current permission state
      const currentPermissionState = await oneSignalService.getPermissionState();

      // First ensure we have permission
      if (currentPermissionState.permission !== 'granted') {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          throw new Error('Permission not granted');
        }
      }

      const user = await oneSignalService.subscribeUser();

      // Update both user and permission state
      const updatedPermissionState = await oneSignalService.getPermissionState();

      setState(prev => ({
        ...prev,
        loading: false,
        user,
        permissionState: updatedPermissionState,
      }));

      return user.subscribed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe user';
      console.error('Failed to subscribe user:', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [requestPermission]);

  // Unsubscribe user from notifications
  const unsubscribeUser = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const success = await oneSignalService.unsubscribeUser();
      
      if (success) {
        const user = await oneSignalService.getUserStatus();
        setState(prev => ({
          ...prev,
          loading: false,
          user,
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unsubscribe user';
      console.error('Failed to unsubscribe user:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  // Refresh user status
  const refreshUserStatus = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [permissionState, user] = await Promise.all([
        oneSignalService.getPermissionState(),
        oneSignalService.getUserStatus(),
      ]);

      setState(prev => ({
        ...prev,
        loading: false,
        permissionState,
        user,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh status';
      console.error('Failed to refresh user status:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, errorDetails: null }));
  }, []);

  // Set external user ID
  const setExternalUserId = useCallback(async (externalId: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      await oneSignalService.setExternalUserId(externalId);

      // Refresh user status to get updated info
      const user = await oneSignalService.getUserStatus();

      setState(prev => ({
        ...prev,
        loading: false,
        user,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set external user ID';
      console.error('Failed to set external user ID:', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  // Set user tags
  const setUserTags = useCallback(async (tags: Record<string, string>): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      await oneSignalService.setUserTags(tags);

      // Refresh user status to get updated info
      const user = await oneSignalService.getUserStatus();

      setState(prev => ({
        ...prev,
        loading: false,
        user,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set user tags';
      console.error('Failed to set user tags:', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  // Retry initialization (useful for v16 if initial load failed)
  const retryInitialization = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null, initialized: false }));

      // Reset the initialization state to allow retry
      oneSignalService.resetInitializationState();

      const platformInfo = oneSignalService.getPlatformInfo();
      const initialized = await oneSignalService.initialize();

      if (!initialized) {
        throw new Error('Failed to retry OneSignal initialization');
      }

      // Add delay for v16 web platforms
      if (!platformInfo.isNative) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const [permissionState, user] = await Promise.all([
        oneSignalService.getPermissionState(),
        oneSignalService.getUserStatus(),
      ]);

      setState(prev => ({
        ...prev,
        initialized: true,
        loading: false,
        error: null,
        permissionState,
        user,
        platformInfo,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry initialization';
      console.error('Failed to retry OneSignal initialization:', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  // Check if notifications are available and ready
  const isReady = state.initialized && !state.loading && !state.error;
  const canSubscribe = isReady && state.platformInfo.isSupported && !state.user.subscribed;
  const canUnsubscribe = isReady && state.user.subscribed;
  const needsPermission = state.permissionState.permission === 'default';
  const hasPermission = state.permissionState.permission === 'granted';
  const permissionDenied = state.permissionState.permission === 'denied';

  return {
    // State
    ...state,

    // Computed state
    isReady,
    canSubscribe,
    canUnsubscribe,
    needsPermission,
    hasPermission,
    permissionDenied,

    // Actions
    requestPermission,
    subscribeUser,
    unsubscribeUser,
    refreshUserStatus,
    clearError,
    retryInitialization,
    setExternalUserId,
    setUserTags,

    // Diagnostic information
    getDiagnosticInfo: () => oneSignalService.getDiagnosticInfo(),
  };
}
