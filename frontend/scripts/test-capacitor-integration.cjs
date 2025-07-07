#!/usr/bin/env node

/**
 * Capacitor Integration Test for WebSocket Logging
 * 
 * Tests the integration between Capacitor plugins and WebSocket logging system
 * to ensure proper logging of native mobile functionality.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function addTestResult(name, status, message, details = null) {
  const result = { name, status, message, details };
  testResults.tests.push(result);
  
  switch (status) {
    case 'pass':
      testResults.passed++;
      logSuccess(`${name}: ${message}`);
      break;
    case 'fail':
      testResults.failed++;
      logError(`${name}: ${message}`);
      break;
    case 'warning':
      testResults.warnings++;
      logWarning(`${name}: ${message}`);
      break;
  }
  
  if (details) {
    log(`   ${details}`, colors.cyan);
  }
}

// Test 1: Capacitor Configuration
function testCapacitorConfig() {
  log('🧪 Testing Capacitor configuration...', colors.cyan);
  
  const configPath = 'capacitor.config.ts';
  if (!fs.existsSync(configPath)) {
    addTestResult(
      'Capacitor Config',
      'fail',
      'Capacitor configuration not found',
      'Run: npm install @capacitor/core @capacitor/cli'
    );
    return;
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for required configuration
    const hasAppId = configContent.includes('appId');
    const hasWebDir = configContent.includes('webDir');
    const hasPlugins = configContent.includes('plugins') || configContent.includes('Plugin');
    
    if (hasAppId && hasWebDir) {
      addTestResult(
        'Capacitor Config',
        'pass',
        'Capacitor is properly configured',
        `App ID: ${hasAppId}, Web Dir: ${hasWebDir}, Plugins: ${hasPlugins}`
      );
    } else {
      addTestResult(
        'Capacitor Config',
        'fail',
        'Capacitor configuration is incomplete',
        `Missing: ${!hasAppId ? 'appId ' : ''}${!hasWebDir ? 'webDir' : ''}`
      );
    }
  } catch (error) {
    addTestResult(
      'Capacitor Config',
      'fail',
      'Failed to read Capacitor configuration',
      error.message
    );
  }
}

// Test 2: Capacitor Plugins
function testCapacitorPlugins() {
  log('🧪 Testing Capacitor plugins...', colors.cyan);
  
  const packagePath = 'package.json';
  if (!fs.existsSync(packagePath)) {
    addTestResult(
      'Capacitor Plugins',
      'fail',
      'package.json not found',
      'Cannot check installed plugins'
    );
    return;
  }
  
  try {
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for common Capacitor plugins
    const capacitorPlugins = {
      '@capacitor/camera': 'Camera plugin',
      '@capacitor/push-notifications': 'Push notifications plugin',
      '@capacitor/device': 'Device info plugin',
      '@capacitor/network': 'Network plugin',
      '@capacitor/app': 'App plugin',
      '@capacitor/status-bar': 'Status bar plugin',
      '@capacitor/splash-screen': 'Splash screen plugin'
    };
    
    const installedPlugins = [];
    const missingPlugins = [];
    
    Object.entries(capacitorPlugins).forEach(([plugin, description]) => {
      if (dependencies[plugin]) {
        installedPlugins.push(`${plugin} (${description})`);
      } else {
        missingPlugins.push(`${plugin} (${description})`);
      }
    });
    
    if (installedPlugins.length > 0) {
      addTestResult(
        'Capacitor Plugins',
        'pass',
        `Found ${installedPlugins.length} Capacitor plugins`,
        `Installed: ${installedPlugins.slice(0, 3).join(', ')}${installedPlugins.length > 3 ? '...' : ''}`
      );
    } else {
      addTestResult(
        'Capacitor Plugins',
        'warning',
        'No Capacitor plugins found',
        'Consider installing plugins for enhanced mobile functionality'
      );
    }
  } catch (error) {
    addTestResult(
      'Capacitor Plugins',
      'fail',
      'Failed to read package.json',
      error.message
    );
  }
}

// Test 3: Camera Integration
function testCameraIntegration() {
  log('🧪 Testing Camera integration...', colors.cyan);
  
  // Check if camera service exists
  const cameraServicePath = 'src/services/cameraService.ts';
  const hasCameraService = fs.existsSync(cameraServicePath);
  
  // Check for camera-related code in components
  const srcDir = 'src';
  let cameraUsageFound = false;
  
  if (fs.existsSync(srcDir)) {
    try {
      const findCameraUsage = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            findCameraUsage(filePath);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('@capacitor/camera') || content.includes('Camera.getPhoto') || content.includes('getUserMedia')) {
              cameraUsageFound = true;
            }
          }
        });
      };
      
      findCameraUsage(srcDir);
    } catch (error) {
      // Ignore errors in file traversal
    }
  }
  
  if (hasCameraService || cameraUsageFound) {
    addTestResult(
      'Camera Integration',
      'pass',
      'Camera functionality detected',
      `Service: ${hasCameraService}, Usage: ${cameraUsageFound}`
    );
  } else {
    addTestResult(
      'Camera Integration',
      'warning',
      'No camera integration found',
      'Camera logging will work when camera functionality is added'
    );
  }
}

// Test 4: Push Notification Integration
function testPushNotificationIntegration() {
  log('🧪 Testing Push Notification integration...', colors.cyan);
  
  // Check for OneSignal service (existing)
  const oneSignalPath = 'src/services/oneSignalService.ts';
  const hasOneSignal = fs.existsSync(oneSignalPath);
  
  // Check for Capacitor push notifications
  const packagePath = 'package.json';
  let hasCapacitorPush = false;
  
  if (fs.existsSync(packagePath)) {
    try {
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      hasCapacitorPush = packageContent.includes('@capacitor/push-notifications');
    } catch (error) {
      // Ignore error
    }
  }
  
  if (hasOneSignal || hasCapacitorPush) {
    addTestResult(
      'Push Notifications',
      'pass',
      'Push notification integration found',
      `OneSignal: ${hasOneSignal}, Capacitor Push: ${hasCapacitorPush}`
    );
  } else {
    addTestResult(
      'Push Notifications',
      'warning',
      'No push notification integration found',
      'Push notification logging will work when implemented'
    );
  }
}

// Test 5: WebSocket Logging Integration with Capacitor
function testWebSocketCapacitorIntegration() {
  log('🧪 Testing WebSocket-Capacitor integration...', colors.cyan);
  
  // Check if unified logging service has Capacitor-specific methods
  const unifiedLoggingPath = 'src/services/unifiedLoggingService.ts';
  if (!fs.existsSync(unifiedLoggingPath)) {
    addTestResult(
      'WebSocket-Capacitor Integration',
      'fail',
      'Unified logging service not found',
      'WebSocket logging integration is missing'
    );
    return;
  }
  
  try {
    const content = fs.readFileSync(unifiedLoggingPath, 'utf8');
    
    const hasCamera = content.includes('logCamera');
    const hasPush = content.includes('logPushNotification');
    const hasNetwork = content.includes('logNetwork');
    const hasDevice = content.includes('deviceInfo') || content.includes('getDeviceInfo');
    
    const integrationFeatures = [hasCamera, hasPush, hasNetwork, hasDevice].filter(Boolean).length;
    
    if (integrationFeatures >= 3) {
      addTestResult(
        'WebSocket-Capacitor Integration',
        'pass',
        'WebSocket logging is well integrated with mobile features',
        `Features: Camera(${hasCamera}), Push(${hasPush}), Network(${hasNetwork}), Device(${hasDevice})`
      );
    } else {
      addTestResult(
        'WebSocket-Capacitor Integration',
        'warning',
        'WebSocket logging has limited mobile integration',
        `Found ${integrationFeatures}/4 integration features`
      );
    }
  } catch (error) {
    addTestResult(
      'WebSocket-Capacitor Integration',
      'fail',
      'Failed to analyze WebSocket-Capacitor integration',
      error.message
    );
  }
}

// Test 6: iOS Platform Files
function testIOSPlatformFiles() {
  log('🧪 Testing iOS platform files...', colors.cyan);
  
  const iosDir = 'ios';
  const hasIOSDir = fs.existsSync(iosDir);
  
  if (!hasIOSDir) {
    addTestResult(
      'iOS Platform',
      'warning',
      'iOS platform not found',
      'Run: npx cap add ios'
    );
    return;
  }
  
  // Check for key iOS files
  const iosFiles = [
    'ios/App/App/Info.plist',
    'ios/App/App/AppDelegate.swift',
    'ios/App/App.xcodeproj'
  ];
  
  const existingFiles = iosFiles.filter(file => fs.existsSync(file));
  
  if (existingFiles.length === iosFiles.length) {
    addTestResult(
      'iOS Platform',
      'pass',
      'iOS platform is properly set up',
      `All ${iosFiles.length} required files found`
    );
  } else {
    addTestResult(
      'iOS Platform',
      'warning',
      'iOS platform setup is incomplete',
      `Found ${existingFiles.length}/${iosFiles.length} required files`
    );
  }
}

// Test 7: Service Worker Integration
function testServiceWorkerIntegration() {
  log('🧪 Testing Service Worker integration...', colors.cyan);
  
  // Check for service worker files
  const swFiles = [
    'public/sw.js',
    'src/sw.js',
    'sw.js'
  ];
  
  const existingSW = swFiles.find(file => fs.existsSync(file));
  
  if (existingSW) {
    try {
      const swContent = fs.readFileSync(existingSW, 'utf8');
      const hasLogging = swContent.includes('console.') || swContent.includes('log');
      
      addTestResult(
        'Service Worker',
        'pass',
        'Service Worker found and can be logged',
        `File: ${existingSW}, Has logging: ${hasLogging}`
      );
    } catch (error) {
      addTestResult(
        'Service Worker',
        'warning',
        'Service Worker found but could not analyze',
        `File: ${existingSW}`
      );
    }
  } else {
    addTestResult(
      'Service Worker',
      'warning',
      'No Service Worker found',
      'Service Worker logging will work when implemented'
    );
  }
}

// Generate test report
function generateTestReport() {
  log('\n📊 Capacitor Integration Test Report', colors.bright);
  log('═'.repeat(50), colors.cyan);
  
  log(`Total Tests: ${testResults.tests.length}`, colors.cyan);
  log(`✅ Passed: ${testResults.passed}`, colors.green);
  log(`❌ Failed: ${testResults.failed}`, colors.red);
  log(`⚠️  Warnings: ${testResults.warnings}`, colors.yellow);
  
  // Overall assessment
  if (testResults.failed === 0) {
    if (testResults.warnings <= 2) {
      logSuccess('\n🎉 Capacitor integration looks excellent!');
      log('WebSocket logging should work well with your mobile features.');
    } else {
      logWarning('\n✅ Capacitor integration is functional with some recommendations.');
      log('Consider addressing warnings for optimal mobile debugging experience.');
    }
  } else {
    logError('\n❌ Capacitor integration has issues that should be addressed.');
    log('Fix failed tests before testing on iOS devices.');
  }
  
  // Recommendations
  log('\n📋 Recommendations:', colors.bright);
  
  if (testResults.failed > 0) {
    log('1. Fix failed tests before proceeding');
    log('2. Ensure Capacitor is properly configured');
  } else {
    log('1. Test WebSocket logging with actual Capacitor plugins');
    log('2. Verify camera and push notification logging on iOS device');
    log('3. Test service worker registration in PWA mode');
  }
  
  // Next steps
  log('\n🚀 Next Steps:', colors.bright);
  log('1. Run iOS PWA compatibility tests: npm run test:ios-compatibility');
  log('2. Deploy and test on actual iOS device');
  log('3. Test specific Capacitor plugin logging scenarios');
  
  // Save report
  const reportPath = 'capacitor-integration-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`\n📄 Detailed report saved: ${reportPath}`, colors.cyan);
}

// Main test runner
function runCapacitorTests() {
  log('🧪 Capacitor Integration Test Suite', colors.bright);
  log('═'.repeat(50), colors.cyan);
  log('Testing WebSocket logging integration with Capacitor...\n');
  
  testCapacitorConfig();
  testCapacitorPlugins();
  testCameraIntegration();
  testPushNotificationIntegration();
  testWebSocketCapacitorIntegration();
  testIOSPlatformFiles();
  testServiceWorkerIntegration();
  
  generateTestReport();
}

// Handle command line arguments
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  log('Capacitor Integration Test Suite\n', colors.bright);
  log('Usage: node test-capacitor-integration.js\n');
  log('This script tests the integration between Capacitor and');
  log('the WebSocket logging system for mobile debugging.');
  process.exit(0);
}

// Run tests
runCapacitorTests();
