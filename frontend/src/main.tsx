import { render } from "preact";
import { App } from "./App";
import "./app.css";

// Initialize PWA Elements for Capacitor web support
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Initialize OneSignal service and logging systems
import { oneSignalService, debugLogger, unifiedLoggingService } from './services';
import { iosLoggingService } from './services/iosLoggingService';
import { initializeAllLoggingIntegrations } from './services/loggingIntegration';
import { webSocketLoggingIntegration } from './services/webSocketLoggingIntegration';
import { initializeLoggingCompatibility } from './services/loggingCompatibility';

// Initialize application services
async function initializeApp() {
  try {
    // Initialize iOS logging service first for comprehensive logging
    iosLoggingService.initialize({
      captureConsole: true,
      captureNetwork: true,
      captureErrors: true,
      flushInterval: 3000, // Flush every 3 seconds for development
    });

    // Initialize unified logging service first
    unifiedLoggingService.initialize();
    unifiedLoggingService.info('app', 'Application initialization started', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Initialize all logging integrations (includes WebSocket integration)
    initializeAllLoggingIntegrations();

    // Initialize logging compatibility layer
    initializeLoggingCompatibility();

    // Test logging systems to ensure they're working
    setTimeout(() => {
      unifiedLoggingService.info('app', 'Logging systems integration test', {
        systems: unifiedLoggingService.getStatus(),
        environment: window.location.hostname
      });
    }, 2000);

    // Call the PWA element loader after the platform has been bootstrapped
    defineCustomElements(window);

    // Render the app first to ensure it loads
    render(<App />, document.getElementById("app")!);

    // Initialize OneSignal service after app renders (non-blocking)
    unifiedLoggingService.info('app', 'Initializing OneSignal service...');
    oneSignalService.initialize()
      .then((oneSignalInitialized) => {
        if (oneSignalInitialized) {
          unifiedLoggingService.logPushNotification('info', 'OneSignal service initialized successfully');
        } else {
          unifiedLoggingService.logPushNotification('warn', 'OneSignal service failed to initialize');
        }
      })
      .catch((error) => {
        unifiedLoggingService.logPushNotification('error', 'OneSignal initialization error', { error });
      });

  } catch (error) {
    // Use unified logging for error reporting
    if (unifiedLoggingService.isInitialized()) {
      unifiedLoggingService.emergency('Failed to initialize application', { error });
    } else {
      console.error('Failed to initialize application:', error);
    }

    // Still render the app even if other services fail
    render(<App />, document.getElementById("app")!);
  }
}

// Start the application
initializeApp();
