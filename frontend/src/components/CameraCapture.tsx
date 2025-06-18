import { useState } from "react";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import { useCamera, type CameraOptions, type CameraPhoto } from "../hooks/useCamera";

export interface CameraCaptureProps {
  onPhotoCapture?: (photo: CameraPhoto) => void;
  onError?: (error: string) => void;
  className?: string;
  quality?: number;
  allowEditing?: boolean;
  saveToGallery?: boolean;
  resultType?: CameraResultType;
  source?: CameraSource;
  showPreview?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export function CameraCapture({
  onPhotoCapture,
  onError,
  className = "",
  quality = 90,
  allowEditing = false,
  saveToGallery = false,
  resultType = CameraResultType.Uri,
  source = CameraSource.Camera,
  showPreview = true,
  maxWidth,
  maxHeight,
}: CameraCaptureProps) {
  const {
    isCapturing,
    lastPhoto,
    error,
    hasPermission,
    isNative,
    takePhoto,
    requestPermissions,
    clearError,
    clearPhoto,
  } = useCamera();

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const handleTakePhoto = async () => {
    clearError();

    // Check permissions first
    if (hasPermission === false) {
      setShowPermissionPrompt(true);
      return;
    }

    const options: CameraOptions = {
      quality,
      allowEditing,
      saveToGallery,
      resultType,
      source,
      width: maxWidth,
      height: maxHeight,
    };

    const photo = await takePhoto(options);
    
    if (photo) {
      onPhotoCapture?.(photo);
    } else if (error) {
      onError?.(error.message);
    }
  };

  const handleRequestPermissions = async () => {
    const granted = await requestPermissions();
    setShowPermissionPrompt(false);
    
    if (granted) {
      // Automatically take photo after permission is granted
      handleTakePhoto();
    }
  };

  const handleRetakePhoto = () => {
    clearPhoto();
    clearError();
  };

  const CameraIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <path
        d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3" strokeWidth="2" />
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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Camera Status */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {isNative ? "📱 Native Camera" : "🌐 Web Camera"}
      </div>

      {/* Permission Prompt */}
      {showPermissionPrompt && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="flex items-center gap-3">
            <AlertIcon />
            <div className="flex-1">
              <h3 className="font-medium text-orange-800 dark:text-orange-200">
                Camera Permission Required
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                This app needs access to your camera to take photos.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleRequestPermissions}
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

      {/* Error Display */}
      {error && !showPermissionPrompt && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertIcon />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 dark:text-red-200">
                Camera Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {error.message}
              </p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Photo Preview */}
      {showPreview && lastPhoto && (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Captured Photo
            </h3>
            <div className="relative">
              <img
                src={lastPhoto.webPath || `data:image/${lastPhoto.format};base64,${lastPhoto.base64String}`}
                alt="Captured photo"
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: '300px' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRetakePhoto}
                className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <RefreshIcon />
                Retake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capture Button */}
      {(!lastPhoto || !showPreview) && (
        <div className="text-center">
          <button
            onClick={handleTakePhoto}
            disabled={isCapturing}
            className="inline-flex items-center gap-3 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <CameraIcon />
            {isCapturing ? "Taking Photo..." : "Take Photo"}
          </button>
        </div>
      )}
    </div>
  );
}
