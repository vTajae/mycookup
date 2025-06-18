import { render } from "preact";
import { App } from "./App";
import "./app.css";

// Initialize PWA Elements for Capacitor web support
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Initialize OneSignal service
import { oneSignalService } from './services';

// Initialize application services
async function initializeApp() {
  try {
    // Call the PWA element loader after the platform has been bootstrapped
    defineCustomElements(window);

    // Render the app first to ensure it loads
    render(<App />, document.getElementById("app")!);

    // Initialize OneSignal service after app renders (non-blocking)
    console.log('Initializing OneSignal service...');
    oneSignalService.initialize()
      .then((oneSignalInitialized) => {
        if (oneSignalInitialized) {
          console.log('OneSignal service initialized successfully');
        } else {
          console.warn('OneSignal service failed to initialize');
        }
      })
      .catch((error) => {
        console.error('OneSignal initialization error:', error);
      });

  } catch (error) {
    console.error('Failed to initialize application:', error);

    // Still render the app even if other services fail
    render(<App />, document.getElementById("app")!);
  }
}

// Start the application
initializeApp();
