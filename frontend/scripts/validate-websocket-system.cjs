#!/usr/bin/env node

/**
 * WebSocket Logging System Validation Script
 * 
 * Quick validation to ensure the entire WebSocket logging system
 * is properly configured and ready for iOS PWA testing.
 */

const fs = require('fs');
const { execSync } = require('child_process');

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

// Validation results
let validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  total: 0
};

function addResult(status, message) {
  validationResults.total++;
  
  switch (status) {
    case 'pass':
      validationResults.passed++;
      logSuccess(message);
      break;
    case 'fail':
      validationResults.failed++;
      logError(message);
      break;
    case 'warning':
      validationResults.warnings++;
      logWarning(message);
      break;
  }
}

// Quick validation checks
function validateFileStructure() {
  log('🔍 Validating file structure...', colors.cyan);
  
  const requiredFiles = [
    'websocket-logger-worker.js',
    'wrangler-websocket.toml',
    'debug-console.html',
    'debug-console.js',
    'src/services/webSocketConsoleLogger.ts',
    'src/services/webSocketLoggingIntegration.ts',
    'src/services/unifiedLoggingService.ts'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length === 0) {
    addResult('pass', 'All required files present');
  } else {
    addResult('fail', `Missing files: ${missingFiles.join(', ')}`);
  }
}

function validateConfiguration() {
  log('🔍 Validating configuration...', colors.cyan);
  
  try {
    const configContent = fs.readFileSync('src/services/webSocketLoggerConfig.ts', 'utf8');
    
    if (configContent.includes('your-subdomain.workers.dev')) {
      addResult('warning', 'Configuration contains placeholder URLs - run npm run update:websocket-urls after deployment');
    } else {
      addResult('pass', 'Configuration URLs appear to be updated');
    }
  } catch (error) {
    addResult('fail', 'Failed to read WebSocket configuration');
  }
}

function validatePackageScripts() {
  log('🔍 Validating package scripts...', colors.cyan);
  
  try {
    const packageContent = fs.readFileSync('package.json', 'utf8');
    const packageJson = JSON.parse(packageContent);
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      'deploy:websocket:dev',
      'debug:console:dev',
      'update:websocket-urls',
      'test:ios-compatibility'
    ];
    
    const missingScripts = requiredScripts.filter(script => !scripts[script]);
    
    if (missingScripts.length === 0) {
      addResult('pass', 'All required NPM scripts present');
    } else {
      addResult('fail', `Missing scripts: ${missingScripts.join(', ')}`);
    }
  } catch (error) {
    addResult('fail', 'Failed to validate package scripts');
  }
}

function validateDependencies() {
  log('🔍 Validating dependencies...', colors.cyan);
  
  try {
    const packageContent = fs.readFileSync('package.json', 'utf8');
    const packageJson = JSON.parse(packageContent);
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = ['ws'];
    const missingDeps = requiredDeps.filter(dep => !allDeps[dep]);
    
    if (missingDeps.length === 0) {
      addResult('pass', 'All required dependencies installed');
    } else {
      addResult('fail', `Missing dependencies: ${missingDeps.join(', ')}`);
    }
  } catch (error) {
    addResult('fail', 'Failed to validate dependencies');
  }
}

function validateCapacitorSetup() {
  log('🔍 Validating Capacitor setup...', colors.cyan);
  
  if (fs.existsSync('capacitor.config.ts')) {
    addResult('pass', 'Capacitor configuration found');
  } else {
    addResult('warning', 'Capacitor not configured - WebSocket logging will still work in PWA mode');
  }
}

function validatePWAManifest() {
  log('🔍 Validating PWA manifest...', colors.cyan);
  
  if (fs.existsSync('public/manifest.json')) {
    try {
      const manifestContent = fs.readFileSync('public/manifest.json', 'utf8');
      const manifest = JSON.parse(manifestContent);
      
      if (manifest.display === 'standalone' || manifest.display === 'fullscreen') {
        addResult('pass', 'PWA manifest configured for standalone mode');
      } else {
        addResult('warning', 'PWA manifest not configured for standalone mode');
      }
    } catch (error) {
      addResult('warning', 'PWA manifest exists but could not be parsed');
    }
  } else {
    addResult('warning', 'PWA manifest not found');
  }
}

function runQuickTests() {
  log('🔍 Running quick compatibility tests...', colors.cyan);
  
  try {
    execSync('npm run test:ios-compatibility', { stdio: 'pipe' });
    addResult('pass', 'iOS PWA compatibility tests passed');
  } catch (error) {
    addResult('fail', 'iOS PWA compatibility tests failed');
  }
  
  try {
    execSync('npm run test:capacitor', { stdio: 'pipe' });
    addResult('pass', 'Capacitor integration tests passed');
  } catch (error) {
    addResult('warning', 'Capacitor integration tests had warnings');
  }
}

function generateValidationReport() {
  log('\n📊 Validation Summary', colors.bright);
  log('═'.repeat(40), colors.cyan);
  
  log(`Total Checks: ${validationResults.total}`, colors.cyan);
  log(`✅ Passed: ${validationResults.passed}`, colors.green);
  log(`❌ Failed: ${validationResults.failed}`, colors.red);
  log(`⚠️  Warnings: ${validationResults.warnings}`, colors.yellow);
  
  const successRate = ((validationResults.passed / validationResults.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, colors.cyan);
  
  // Overall status
  if (validationResults.failed === 0) {
    if (validationResults.warnings <= 2) {
      logSuccess('\n🎉 System validation passed! Ready for iOS PWA testing.');
    } else {
      logWarning('\n✅ System validation passed with warnings. Review warnings before proceeding.');
    }
  } else {
    logError('\n❌ System validation failed. Fix issues before proceeding.');
  }
  
  // Next steps
  log('\n📋 Next Steps:', colors.bright);
  
  if (validationResults.failed === 0) {
    log('1. Deploy WebSocket worker: npm run deploy:websocket:dev');
    log('2. Update configuration: npm run update:websocket-urls');
    log('3. Test connection: npm run debug:console:dev');
    log('4. Follow iOS testing guide for device testing');
  } else {
    log('1. Fix failed validation checks');
    log('2. Re-run validation: npm run validate:system');
    log('3. Proceed with deployment after all checks pass');
  }
  
  log('\n📚 Documentation:', colors.bright);
  log('• Setup Guide: WEBSOCKET_SETUP_GUIDE.md');
  log('• iOS Testing: IOS_PWA_TESTING_GUIDE.md');
  log('• Quick Reference: WEBSOCKET_QUICK_REFERENCE.md');
  log('• Testing Summary: TESTING_SUMMARY.md');
}

// Main validation function
function runValidation() {
  log('🔍 WebSocket Logging System Validation', colors.bright);
  log('═'.repeat(50), colors.cyan);
  log('Validating iOS PWA WebSocket logging system...\n');
  
  validateFileStructure();
  validateConfiguration();
  validatePackageScripts();
  validateDependencies();
  validateCapacitorSetup();
  validatePWAManifest();
  runQuickTests();
  
  generateValidationReport();
}

// Handle command line arguments
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  log('WebSocket Logging System Validation\n', colors.bright);
  log('Usage: node validate-websocket-system.cjs\n');
  log('This script performs a quick validation of the entire');
  log('WebSocket logging system to ensure it\'s ready for iOS PWA testing.');
  process.exit(0);
}

// Run validation
runValidation();
