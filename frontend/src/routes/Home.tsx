import { useState } from "react";
import { Link } from "react-router";
import { Welcome } from "../welcome/welcome";
import { CameraCapture } from "../components";
import type { CameraPhoto } from "../hooks/useCamera";

export function Home() {
  const [capturedPhotos, setCapturedPhotos] = useState<CameraPhoto[]>([]);

  const handlePhotoCapture = (photo: CameraPhoto) => {
    setCapturedPhotos(prev => [photo, ...prev]);
    console.log("Photo captured:", photo);
  };

  const handleCameraError = (error: string) => {
    console.error("Camera error:", error);
    // You could show a toast notification here
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Welcome message="Welcome to MyCookup!" />

      {/* Navigation Section */}
      <section className="px-4 pb-4">
        <div className="max-w-md mx-auto">
          <div className="flex justify-center space-x-4">
            <Link
              to="/notifications"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              🔔 Test Notifications
            </Link>
            <Link
              to="/debug-logs"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-500 dark:hover:bg-green-600"
            >
              📱 Debug Logs
            </Link>
          </div>
        </div>
      </section>

      {/* Camera Section */}
      <section className="px-4 pb-8">
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700 space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                📸 Capture Your Cooking
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Take photos of your delicious recipes and cooking process
              </p>
            </div>

            <CameraCapture
              onPhotoCapture={handlePhotoCapture}
              onError={handleCameraError}
              quality={85}
              showPreview={true}
              saveToGallery={false}
            />
          </div>
        </div>
      </section>

      {/* Photo Gallery Section */}
      {capturedPhotos.length > 0 && (
        <section className="px-4 pb-8">
          <div className="max-w-md mx-auto">
            <div className="rounded-3xl border border-gray-200 p-6 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                📷 Your Photos ({capturedPhotos.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {capturedPhotos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.webPath || `data:image/${photo.format};base64,${photo.base64String}`}
                      alt={`Captured photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              {capturedPhotos.length > 0 && (
                <button
                  onClick={() => setCapturedPhotos([])}
                  className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear All Photos
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
