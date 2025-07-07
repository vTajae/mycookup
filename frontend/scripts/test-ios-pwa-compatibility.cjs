#!/usr/bin/env node

/**
 * iOS PWA WebSocket Logging Compatibility Test Suite
 * 
 * Comprehensive testing script to validate WebSocket logging system
 * compatibility with iOS PWA standalone mode and Capacitor integration.
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
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

function logTest(message) {
  log(`🧪 ${message}`, colors.cyan);
}

// Test configuration
const TEST_CONFIG = {
  requiredFiles: [
    'src/services/webSocketConsoleLogger.ts',
    'src/services/webSocketLoggingIntegration.ts',
    'src/services/unifiedLoggingService.ts',
    'src/services/webSocketLoggerConfig.ts',
    'websocket-logger-worker.js',
    'wrangler-websocket.toml',
    'debug-console.html',
    'debug-console.js'
  ],
  capacitorFiles: [
    'capacitor.config.ts',
    'ios/App/App/Info.plist',
    'android/app/src/main/AndroidManifest.xml'
  ],
  pwaFiles: [
    'public/manifest.json',
    'index.html'
  ],
  serviceFiles: [
    'src/services/iosLoggingService.ts',
    'src/services/oneSignalService.ts',
    'src/services/pwaService.ts'
  ]
};

// Test results storage
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function addTestResult(name, status, message, details = null) {
  const result = { name, status, message, details, timestamp: new Date().toISOString() };
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

// Test 1: File Structure Validation
function testFileStructure() {
  logTest('Testing file structure...');
  
  const missingFiles = [];
  const presentFiles = [];
  
  TEST_CONFIG.requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      presentFiles.push(file);
    } else {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length === 0) {
    addTestResult(
      'File Structure',
      'pass',
      `All ${TEST_CONFIG.requiredFiles.length} required files present`,
      `Files: ${presentFiles.length} found`
    );
  } else {
    addTestResult(
      'File Structure',
      'fail',
      `Missing ${missingFiles.length} required files`,
      `Missing: ${missingFiles.join(', ')}`
    );
  }
}

// Test 2: Capacitor Integration
function testCapacitorIntegration() {
  logTest('Testing Capacitor integration...');
  
  const capacitorConfig = 'capacitor.config.ts';
  if (!fs.existsSync(capacitorConfig)) {
    addTestResult(
      'Capacitor Integration',
      'fail',
      'Capacitor configuration not found',
      'capacitor.config.ts is missing'
    );
    return;
  }
  
  try {
    const configContent = fs.readFileSync(capacitorConfig, 'utf8');
    
    // Check for required Capacitor configuration
    const hasAppId = configContent.includes('appId');
    const hasWebDir = configContent.includes('webDir');
    const hasServer = configContent.includes('server');
    
    if (hasAppId && hasWebDir) {
      addTestResult(
        'Capacitor Integration',
        'pass',
        'Capacitor configuration is properly set up',
        `App ID and web directory configured${hasServer ? ', server config found' : ''}`
      );
    } else {
      addTestResult(
        'Capacitor Integration',
        'warning',
        'Capacitor configuration may be incomplete',
        `Missing: ${!hasAppId ? 'appId ' : ''}${!hasWebDir ? 'webDir' : ''}`
      );
    }
  } catch (error) {
    addTestResult(
      'Capacitor Integration',
      'fail',
      'Failed to read Capacitor configuration',
      error.message
    );
  }
}

// Test 3: PWA Manifest Validation
function testPWAManifest() {
  logTest('Testing PWA manifest...');
  
  const manifestPath = 'public/manifest.json';
  if (!fs.existsSync(manifestPath)) {
    addTestResult(
      'PWA Manifest',
      'fail',
      'PWA manifest not found',
      'public/manifest.json is missing'
    );
    return;
  }
  
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length === 0) {
      const isStandalone = manifest.display === 'standalone' || manifest.display === 'fullscreen';
      addTestResult(
        'PWA Manifest',
        'pass',
        'PWA manifest is properly configured',
        `Display mode: ${manifest.display}${isStandalone ? ' (standalone compatible)' : ''}`
      );
    } else {
      addTestResult(
        'PWA Manifest',
        'warning',
        'PWA manifest may be incomplete',
        `Missing fields: ${missingFields.join(', ')}`
      );
    }
  } catch (error) {
    addTestResult(
      'PWA Manifest',
      'fail',
      'Failed to parse PWA manifest',
      error.message
    );
  }
}

// Test 4: WebSocket Configuration Validation
function testWebSocketConfiguration() {
  logTest('Testing WebSocket configuration...');
  
  const configPath = 'src/services/webSocketLoggerConfig.ts';
  if (!fs.existsSync(configPath)) {
    addTestResult(
      'WebSocket Configuration',
      'fail',
      'WebSocket configuration file not found',
      configPath
    );
    return;
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for placeholder URLs
    const hasPlaceholders = configContent.includes('your-subdomain.workers.dev');
    const hasValidUrls = configContent.match(/wss:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/ws/g);
    
    if (hasPlaceholders) {
      addTestResult(
        'WebSocket Configuration',
        'warning',
        'Configuration contains placeholder URLs',
        'Run: npm run update:websocket-urls'
      );
    } else if (hasValidUrls) {
      addTestResult(
        'WebSocket Configuration',
        'pass',
        'WebSocket URLs are properly configured',
        `Found ${hasValidUrls.length} valid WebSocket URLs`
      );
    } else {
      addTestResult(
        'WebSocket Configuration',
        'fail',
        'No valid WebSocket URLs found',
        'Check webSocketLoggerConfig.ts'
      );
    }
  } catch (error) {
    addTestResult(
      'WebSocket Configuration',
      'fail',
      'Failed to read WebSocket configuration',
      error.message
    );
  }
}

// Test 5: Service Integration
function testServiceIntegration() {
  logTest('Testing service integration...');
  
  const mainFile = 'src/main.tsx';
  if (!fs.existsSync(mainFile)) {
    addTestResult(
      'Service Integration',
      'fail',
      'Main application file not found',
      'src/main.tsx is missing'
    );
    return;
  }
  
  try {
    const mainContent = fs.readFileSync(mainFile, 'utf8');
    
    const hasUnifiedLogging = mainContent.includes('unifiedLoggingService');
    const hasWebSocketIntegration = mainContent.includes('webSocketLoggingIntegration');
    const hasLoggingIntegration = mainContent.includes('initializeAllLoggingIntegrations');
    
    if (hasUnifiedLogging && hasLoggingIntegration) {
      addTestResult(
        'Service Integration',
        'pass',
        'Logging services are properly integrated',
        `Unified logging: ${hasUnifiedLogging}, WebSocket: ${hasWebSocketIntegration}, Integration: ${hasLoggingIntegration}`
      );
    } else {
      addTestResult(
        'Service Integration',
        'warning',
        'Service integration may be incomplete',
        `Missing: ${!hasUnifiedLogging ? 'unified logging ' : ''}${!hasLoggingIntegration ? 'logging integration' : ''}`
      );
    }
  } catch (error) {
    addTestResult(
      'Service Integration',
      'fail',
      'Failed to read main application file',
      error.message
    );
  }
}

// Test 6: iOS Compatibility Features
function testIOSCompatibility() {
  logTest('Testing iOS compatibility features...');
  
  const checks = [
    {
      name: 'iOS Detection',
      file: 'src/services/webSocketConsoleLogger.ts',
      pattern: /isIOS.*iPad|iPhone|iPod/,
      description: 'iOS device detection'
    },
    {
      name: 'Standalone Mode Detection',
      file: 'src/services/webSocketConsoleLogger.ts',
      pattern: /standalone.*navigator\.standalone|display-mode.*standalone/,
      description: 'PWA standalone mode detection'
    },
    {
      name: 'Device Info Collection',
      file: 'src/services/webSocketConsoleLogger.ts',
      pattern: /deviceInfo.*viewport|userAgent/,
      description: 'Device information collection'
    }
  ];
  
  let passedChecks = 0;
  
  checks.forEach(check => {
    if (fs.existsSync(check.file)) {
      const content = fs.readFileSync(check.file, 'utf8');
      if (check.pattern.test(content)) {
        passedChecks++;
      }
    }
  });
  
  if (passedChecks === checks.length) {
    addTestResult(
      'iOS Compatibility',
      'pass',
      'All iOS compatibility features implemented',
      `${passedChecks}/${checks.length} features found`
    );
  } else {
    addTestResult(
      'iOS Compatibility',
      'warning',
      'Some iOS compatibility features may be missing',
      `${passedChecks}/${checks.length} features found`
    );
  }
}

// Test 7: Debug Console Availability
function testDebugConsole() {
  logTest('Testing debug console availability...');
  
  const htmlConsole = fs.existsSync('debug-console.html');
  const jsConsole = fs.existsSync('debug-console.js');
  const packageScripts = fs.existsSync('package.json');
  
  let scriptCount = 0;
  if (packageScripts) {
    const packageContent = fs.readFileSync('package.json', 'utf8');
    const hasDebugScripts = packageContent.includes('debug:console');
    if (hasDebugScripts) scriptCount++;
  }
  
  if (htmlConsole && jsConsole && scriptCount > 0) {
    addTestResult(
      'Debug Console',
      'pass',
      'Debug console tools are available',
      `HTML console: ${htmlConsole}, Node.js console: ${jsConsole}, NPM scripts: ${scriptCount > 0}`
    );
  } else {
    addTestResult(
      'Debug Console',
      'fail',
      'Debug console tools are incomplete',
      `Missing: ${!htmlConsole ? 'HTML console ' : ''}${!jsConsole ? 'Node.js console ' : ''}${scriptCount === 0 ? 'NPM scripts' : ''}`
    );
  }
}

// Test 8: Worker Deployment Configuration
function testWorkerDeployment() {
  logTest('Testing worker deployment configuration...');
  
  const workerFile = fs.existsSync('websocket-logger-worker.js');
  const wranglerConfig = fs.existsSync('wrangler-websocket.toml');
  const deployScript = fs.existsSync('scripts/deploy-websocket-worker.sh');
  
  if (workerFile && wranglerConfig) {
    addTestResult(
      'Worker Deployment',
      'pass',
      'Worker deployment files are present',
      `Worker: ${workerFile}, Config: ${wranglerConfig}, Script: ${deployScript}`
    );
  } else {
    addTestResult(
      'Worker Deployment',
      'fail',
      'Worker deployment files are missing',
      `Missing: ${!workerFile ? 'worker file ' : ''}${!wranglerConfig ? 'wrangler config' : ''}`
    );
  }
}

// Generate test report
function generateTestReport() {
  log('\n📊 Test Report Summary', colors.bright);
  log('═'.repeat(50), colors.cyan);
  
  log(`Total Tests: ${testResults.tests.length}`, colors.cyan);
  log(`✅ Passed: ${testResults.passed}`, colors.green);
  log(`❌ Failed: ${testResults.failed}`, colors.red);
  log(`⚠️  Warnings: ${testResults.warnings}`, colors.yellow);
  
  const successRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, colors.cyan);
  
  // Overall status
  if (testResults.failed === 0) {
    if (testResults.warnings === 0) {
      logSuccess('\n🎉 All tests passed! iOS PWA compatibility looks excellent.');
    } else {
      logWarning('\n✅ Tests passed with warnings. Review warnings before iOS testing.');
    }
  } else {
    logError('\n❌ Some tests failed. Fix issues before proceeding with iOS testing.');
  }
  
  // Next steps
  log('\n📋 Next Steps:', colors.bright);
  if (testResults.failed > 0) {
    log('1. Fix failed tests before proceeding');
    log('2. Re-run tests: npm run test:ios-compatibility');
  } else {
    log('1. Deploy WebSocket worker: npm run deploy:websocket:dev');
    log('2. Update configuration: npm run update:websocket-urls');
    log('3. Test on iOS device following the iOS testing guide');
  }
  
  // Save detailed report
  const reportPath = 'ios-pwa-compatibility-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`\n📄 Detailed report saved: ${reportPath}`, colors.cyan);
}

// Main test runner
function runAllTests() {
  log('🧪 iOS PWA WebSocket Logging Compatibility Test Suite', colors.bright);
  log('═'.repeat(60), colors.cyan);
  log('Testing WebSocket logging system compatibility with iOS PWA...\n');
  
  testFileStructure();
  testCapacitorIntegration();
  testPWAManifest();
  testWebSocketConfiguration();
  testServiceIntegration();
  testIOSCompatibility();
  testDebugConsole();
  testWorkerDeployment();
  
  generateTestReport();
}

// Handle command line arguments
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  log('iOS PWA WebSocket Logging Compatibility Test Suite\n', colors.bright);
  log('Usage: node test-ios-pwa-compatibility.js [options]\n');
  log('Options:');
  log('  -h, --help    Show this help message');
  log('  --report      Generate detailed JSON report only\n');
  log('This script validates the WebSocket logging system compatibility');
  log('with iOS PWA standalone mode and Capacitor integration.');
  process.exit(0);
}

// Run tests
runAllTests();
