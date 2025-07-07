#!/usr/bin/env node

/**
 * WebSocket URL Configuration Update Script
 * 
 * Updates WebSocket URLs across all configuration files after deployment.
 * This script helps automate the process of updating URLs with your actual
 * Cloudflare Workers subdomain.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration files to update
const CONFIG_FILES = [
  {
    path: 'src/services/webSocketLoggerConfig.ts',
    type: 'typescript',
    patterns: [
      {
        search: /workerUrl: 'wss:\/\/mycookup-websocket-logger-dev\.your-subdomain\.workers\.dev\/ws'/g,
        replace: (subdomain) => `workerUrl: 'wss://mycookup-websocket-logger-dev.${subdomain}.workers.dev/ws'`
      },
      {
        search: /workerUrl: 'wss:\/\/mycookup-websocket-logger\.your-subdomain\.workers\.dev\/ws'/g,
        replace: (subdomain) => `workerUrl: 'wss://mycookup-websocket-logger.${subdomain}.workers.dev/ws'`
      }
    ]
  },
  {
    path: 'debug-console.html',
    type: 'html',
    patterns: [
      {
        search: /value="wss:\/\/mycookup-websocket-logger-dev\.your-subdomain\.workers\.dev\/ws"/g,
        replace: (subdomain) => `value="wss://mycookup-websocket-logger-dev.${subdomain}.workers.dev/ws"`
      }
    ]
  },
  {
    path: 'debug-console.js',
    type: 'javascript',
    patterns: [
      {
        search: /url = process\.argv\[2\] \|\| 'wss:\/\/mycookup-websocket-logger-dev\.your-subdomain\.workers\.dev\/ws'/g,
        replace: (subdomain) => `url = process.argv[2] || 'wss://mycookup-websocket-logger-dev.${subdomain}.workers.dev/ws'`
      }
    ]
  },
  {
    path: 'package.json',
    type: 'json',
    patterns: [
      {
        search: /"debug:console:dev": "node debug-console\.js wss:\/\/mycookup-websocket-logger-dev\.your-subdomain\.workers\.dev\/ws"/g,
        replace: (subdomain) => `"debug:console:dev": "node debug-console.js wss://mycookup-websocket-logger-dev.${subdomain}.workers.dev/ws"`
      }
    ]
  }
];

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

// Function to prompt user for input
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Function to validate subdomain format
function validateSubdomain(subdomain) {
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return subdomainRegex.test(subdomain) && subdomain.length <= 63;
}

// Function to backup a file
function backupFile(filePath) {
  const backupPath = `${filePath}.backup`;
  try {
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    logWarning(`Failed to create backup for ${filePath}: ${error.message}`);
    return null;
  }
}

// Function to update a single file
function updateFile(fileConfig, subdomain) {
  const filePath = fileConfig.path;
  
  if (!fs.existsSync(filePath)) {
    logWarning(`File not found: ${filePath}`);
    return false;
  }

  try {
    // Create backup
    const backupPath = backupFile(filePath);
    if (backupPath) {
      logInfo(`Created backup: ${backupPath}`);
    }

    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Apply all patterns for this file
    fileConfig.patterns.forEach((pattern, index) => {
      const originalContent = content;
      content = content.replace(pattern.search, pattern.replace(subdomain));
      
      if (content !== originalContent) {
        updated = true;
        logInfo(`Applied pattern ${index + 1} to ${filePath}`);
      }
    });

    if (updated) {
      // Write updated content
      fs.writeFileSync(filePath, content, 'utf8');
      logSuccess(`Updated ${filePath}`);
      return true;
    } else {
      logInfo(`No changes needed for ${filePath}`);
      return false;
    }

  } catch (error) {
    logError(`Failed to update ${filePath}: ${error.message}`);
    return false;
  }
}

// Function to show current configuration
function showCurrentConfig() {
  log('\n📋 Current WebSocket Configuration:', colors.cyan);
  
  CONFIG_FILES.forEach(fileConfig => {
    const filePath = fileConfig.path;
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for WebSocket URLs
        const wsUrlRegex = /wss?:\/\/[^'"]+\.workers\.dev\/ws/g;
        const matches = content.match(wsUrlRegex);
        
        if (matches && matches.length > 0) {
          log(`\n  ${filePath}:`);
          matches.forEach(match => {
            log(`    ${match}`, colors.yellow);
          });
        }
      } catch (error) {
        logWarning(`Could not read ${filePath}: ${error.message}`);
      }
    }
  });
  
  console.log();
}

// Function to get subdomain from user
async function getSubdomain() {
  log('🔧 WebSocket URL Configuration Update', colors.bright);
  log('This script will update WebSocket URLs with your Cloudflare Workers subdomain.\n');
  
  showCurrentConfig();
  
  let subdomain;
  
  // Check if subdomain was provided as command line argument
  if (process.argv[2]) {
    subdomain = process.argv[2];
    log(`Using subdomain from command line: ${subdomain}`, colors.cyan);
  } else {
    // Prompt user for subdomain
    log('You can find your subdomain in the Cloudflare Workers dashboard.');
    log('Example: If your worker URL is "https://my-worker.my-subdomain.workers.dev"');
    log('Then your subdomain is "my-subdomain"\n');
    
    subdomain = await promptUser('Enter your Cloudflare Workers subdomain: ');
  }
  
  // Validate subdomain
  if (!subdomain) {
    logError('Subdomain is required!');
    process.exit(1);
  }
  
  if (!validateSubdomain(subdomain)) {
    logError('Invalid subdomain format! Use only lowercase letters, numbers, and hyphens.');
    process.exit(1);
  }
  
  return subdomain;
}

// Function to confirm changes
async function confirmChanges(subdomain) {
  log(`\n🔍 Preview of changes:`, colors.cyan);
  log(`  Development: wss://mycookup-websocket-logger-dev.${subdomain}.workers.dev/ws`);
  log(`  Production:  wss://mycookup-websocket-logger.${subdomain}.workers.dev/ws\n`);
  
  const confirm = await promptUser('Do you want to proceed with these changes? (y/N): ');
  return confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes';
}

// Function to validate current configuration
function validateConfiguration() {
  log('\n🔍 Validating WebSocket Configuration...', colors.cyan);

  let allValid = true;
  const issues = [];

  CONFIG_FILES.forEach(fileConfig => {
    const filePath = fileConfig.path;

    if (!fs.existsSync(filePath)) {
      issues.push(`❌ Missing file: ${filePath}`);
      allValid = false;
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for placeholder URLs
      if (content.includes('your-subdomain.workers.dev')) {
        issues.push(`⚠️  ${filePath} contains placeholder URLs`);
        allValid = false;
      }

      // Check for valid WebSocket URLs
      const wsUrlRegex = /wss:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/ws/g;
      const matches = content.match(wsUrlRegex);

      if (matches && matches.length > 0) {
        log(`✅ ${filePath}: Found ${matches.length} valid WebSocket URL(s)`, colors.green);
      }

    } catch (error) {
      issues.push(`❌ Error reading ${filePath}: ${error.message}`);
      allValid = false;
    }
  });

  if (allValid && issues.length === 0) {
    logSuccess('\n✨ Configuration validation passed!');
    log('All WebSocket URLs appear to be properly configured.', colors.green);
  } else {
    logWarning('\n⚠️  Configuration issues found:');
    issues.forEach(issue => log(`  ${issue}`));
    log('\nRun this script to fix configuration issues.', colors.yellow);
  }

  return allValid;
}

// Main function
async function main() {
  try {
    // Check if this is a validation run
    if (process.argv.includes('--validate') || process.argv.includes('-v')) {
      validateConfiguration();
      return;
    }

    // Get subdomain
    const subdomain = await getSubdomain();

    // Confirm changes
    const confirmed = await confirmChanges(subdomain);
    if (!confirmed) {
      log('Operation cancelled.', colors.yellow);
      process.exit(0);
    }

    log('\n🚀 Updating configuration files...', colors.cyan);

    let updatedCount = 0;
    let totalFiles = 0;

    // Update each file
    CONFIG_FILES.forEach(fileConfig => {
      totalFiles++;
      if (updateFile(fileConfig, subdomain)) {
        updatedCount++;
      }
    });

    // Summary
    log(`\n📊 Update Summary:`, colors.cyan);
    log(`  Files processed: ${totalFiles}`);
    log(`  Files updated: ${updatedCount}`);
    log(`  Files unchanged: ${totalFiles - updatedCount}`);

    if (updatedCount > 0) {
      logSuccess('\n✨ Configuration update completed!');
      log('\nNext steps:', colors.cyan);
      log('1. Test your WebSocket connection:');
      log(`   npm run debug:console:dev`);
      log('2. Deploy your PWA with updated configuration');
      log('3. Test on iOS devices');

      // Validate the updated configuration
      log('\n🔍 Validating updated configuration...');
      validateConfiguration();
    } else {
      logInfo('\nNo files were updated. Configuration may already be correct.');
      validateConfiguration();
    }

  } catch (error) {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle help flag
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  log('WebSocket URL Configuration Update Script\n', colors.bright);
  log('Usage:');
  log('  node update-websocket-urls.js [subdomain]');
  log('  npm run update:websocket-urls [subdomain]\n');
  log('Options:');
  log('  -v, --validate    Validate current configuration without making changes');
  log('  -h, --help        Show this help message\n');
  log('Examples:');
  log('  node update-websocket-urls.js my-subdomain');
  log('  npm run update:websocket-urls');
  log('  node update-websocket-urls.js --validate\n');
  log('This script updates WebSocket URLs in configuration files with your');
  log('actual Cloudflare Workers subdomain after deployment.');
  process.exit(0);
}

// Run the script
main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});
