import { useState, useCallback } from "react";
import { Camera, CameraResultType, CameraSource, type Photo } from "@capacitor/camera";
import { useCapacitor } from "./useCapacitor";

export interface CameraError {
  message: string;
  code?: string;
}

export interface CameraPhoto {
  webPath?: string;
  base64String?: string;
  format: string;
  saved: boolean;
}

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  resultType: CameraResultType;
  source?: CameraSource;
  saveToGallery?: boolean;
  width?: number;
  height?: number;
}

export function useCamera() {
  const { isNative } = useCapacitor();
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<CameraPhoto | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Check camera permissions
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    // Skip permission checks on web platform - permissions are handled by browser
    if (!isNative) {
      setHasPermission(true);
      return true;
    }

    try {
      const permissions = await Camera.checkPermissions();
      const hasAccess = permissions.camera === 'granted';
      setHasPermission(hasAccess);
      return hasAccess;
    } catch (err) {
      console.log('Permission check failed:', err);
      setHasPermission(false);
      return false;
    }
  }, [isNative]);

  // Request camera permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    // Skip permission requests on web platform - permissions are handled by browser
    if (!isNative) {
      setHasPermission(true);
      return true;
    }

    try {
      const permissions = await Camera.requestPermissions();
      const hasAccess = permissions.camera === 'granted';
      setHasPermission(hasAccess);

      if (!hasAccess) {
        setError({
          message: 'Camera permission denied. Please enable camera access in your device settings.',
          code: 'PERMISSION_DENIED'
        });
      }

      return hasAccess;
    } catch (err) {
      console.log('Permission request failed:', err);
      setError({
        message: 'Failed to request camera permissions.',
        code: 'PERMISSION_REQUEST_FAILED'
      });
      setHasPermission(false);
      return false;
    }
  }, [isNative]);

  // Take a photo
  const takePhoto = useCallback(async (options: Partial<CameraOptions> = {}): Promise<CameraPhoto | null> => {
    setError(null);
    setIsCapturing(true);

    try {
      // Check permissions first (only for native platforms)
      if (isNative) {
        const hasAccess = hasPermission ?? await checkPermissions();
        if (!hasAccess) {
          const granted = await requestPermissions();
          if (!granted) {
            return null;
          }
        }
      }

      // Default options
      const defaultOptions: CameraOptions = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        ...options
      };

      // Use Capacitor's Camera.getPhoto for both native and web
      // PWA Elements will handle the web UI automatically
      const photo: Photo = await Camera.getPhoto(defaultOptions);

      const cameraPhoto: CameraPhoto = {
        webPath: photo.webPath,
        base64String: photo.base64String,
        format: photo.format,
        saved: photo.saved ?? false
      };

      setLastPhoto(cameraPhoto);
      return cameraPhoto;

    } catch (err: any) {
      console.error('Camera error:', err);
      
      // Handle specific error cases
      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
        setError({
          message: 'Photo capture was cancelled.',
          code: 'USER_CANCELLED'
        });
      } else if (err.message?.includes('permission')) {
        setError({
          message: 'Camera permission is required to take photos.',
          code: 'PERMISSION_DENIED'
        });
      } else {
        setError({
          message: err.message || 'Failed to capture photo. Please try again.',
          code: 'CAPTURE_FAILED'
        });
      }
      
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isNative, hasPermission, checkPermissions, requestPermissions]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear last photo
  const clearPhoto = useCallback(() => {
    setLastPhoto(null);
  }, []);

  return {
    // State
    isCapturing,
    lastPhoto,
    error,
    hasPermission,
    isNative,
    
    // Actions
    takePhoto,
    checkPermissions,
    requestPermissions,
    clearError,
    clearPhoto,
  };
}
