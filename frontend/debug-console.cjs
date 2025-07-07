#!/usr/bin/env node

/**
 * iOS PWA WebSocket Debug Console - Node.js Version
 * 
 * Command-line tool for monitoring real-time console logs from iOS PWA applications
 * via WebSocket connection to Cloudflare Worker.
 * 
 * Usage:
 *   node debug-console.js [websocket-url]
 *   npm run debug:console [websocket-url]
 */

const WebSocket = require('ws');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Log level colors
const levelColors = {
  log: colors.blue,
  info: colors.cyan,
  warn: colors.yellow,
  error: colors.red,
  debug: colors.magenta,
  connection: colors.green
};

class WebSocketDebugConsole {
  constructor() {
    this.websocket = null;
    this.isConnected = false;
    this.logs = [];
    this.connections = new Set();
    this.startTime = Date.now();
    this.logFile = null;
    
    this.setupReadline();
    this.setupSignalHandlers();
  }

  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.rl.on('line', (input) => {
      this.handleCommand(input.trim());
    });
  }

  setupSignalHandlers() {
    process.on('SIGINT', () => {
      this.log('\n👋 Shutting down debug console...', 'connection');
      this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.disconnect();
      process.exit(0);
    });
  }

  async connect(url) {
    if (!url) {
      url = process.argv[2] || 'wss://mycookup-websocket-logger-dev.4ufood4u.workers.dev/ws';
    }

    this.log(`🔗 Connecting to: ${url}`, 'connection');

    try {
      this.websocket = new WebSocket(url);

      this.websocket.on('open', () => {
        this.isConnected = true;
        this.log('✅ Connected to WebSocket server', 'connection');
        this.showHelp();
        this.showPrompt();
      });

      this.websocket.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      this.websocket.on('close', (code, reason) => {
        this.isConnected = false;
        this.log(`❌ Connection closed: ${code} ${reason}`, 'connection');
        this.showPrompt();
      });

      this.websocket.on('error', (error) => {
        this.log(`🚨 WebSocket error: ${error.message}`, 'error');
        this.showPrompt();
      });

    } catch (error) {
      this.log(`❌ Failed to connect: ${error.message}`, 'error');
    }
  }

  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    if (this.logFile) {
      this.logFile.end();
      this.logFile = null;
    }
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'console') {
        this.handleConsoleLog(message);
      } else if (message.type === 'connection') {
        this.connections.add(message.connectionId);
        this.log(`🔗 New connection: ${message.connectionId}`, 'connection');
      } else if (message.type === 'disconnection') {
        this.connections.delete(message.connectionId);
        this.log(`💔 Connection disconnected: ${message.connectionId}`, 'connection');
      } else {
        this.log(`❓ Unknown message type: ${message.type}`, 'debug');
      }
      
    } catch (error) {
      this.log(`⚠️ Failed to parse message: ${error.message}`, 'error');
    }
  }

  handleConsoleLog(message) {
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    const args = message.args || [];
    const content = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    const deviceInfo = message.deviceInfo || {};
    const deviceTags = [
      deviceInfo.isIOS && '📱',
      deviceInfo.isPWA && '🔗',
      deviceInfo.isStandalone && '📲'
    ].filter(Boolean).join('');

    const connectionId = message.connectionId ? 
      `${colors.green}[${message.connectionId.slice(-8)}]${colors.reset}` : '';

    const levelColor = levelColors[message.level] || colors.white;
    const level = `${levelColor}${message.level.toUpperCase()}${colors.reset}`;

    const logLine = `${colors.gray}${timestamp}${colors.reset} ${connectionId} ${deviceTags} ${level} ${content}`;
    
    console.log(logLine);
    
    // Save to log file if enabled
    if (this.logFile) {
      const plainLogLine = `${timestamp} [${message.connectionId || 'unknown'}] ${deviceTags} ${message.level.toUpperCase()} ${content}\n`;
      this.logFile.write(plainLogLine);
    }

    this.logs.push(message);
    this.showPrompt();
  }

  handleCommand(command) {
    const [cmd, ...args] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
      case 'h':
        this.showHelp();
        break;

      case 'status':
      case 's':
        this.showStatus();
        break;

      case 'clear':
      case 'c':
        this.clearLogs();
        break;

      case 'connections':
      case 'conn':
        this.showConnections();
        break;

      case 'stats':
        this.showStats();
        break;

      case 'save':
        this.saveLogs(args[0]);
        break;

      case 'log':
        this.enableLogging(args[0]);
        break;

      case 'filter':
        this.filterLogs(args[0]);
        break;

      case 'reconnect':
      case 'r':
        this.reconnect();
        break;

      case 'quit':
      case 'exit':
      case 'q':
        this.disconnect();
        process.exit(0);
        break;

      case '':
        // Empty command, just show prompt
        break;

      default:
        this.log(`❓ Unknown command: ${cmd}. Type 'help' for available commands.`, 'warn');
    }

    this.showPrompt();
  }

  showHelp() {
    console.log(`
${colors.bright}📱 iOS PWA WebSocket Debug Console${colors.reset}

${colors.bright}Commands:${colors.reset}
  ${colors.cyan}help, h${colors.reset}        - Show this help message
  ${colors.cyan}status, s${colors.reset}      - Show connection status
  ${colors.cyan}clear, c${colors.reset}       - Clear console logs
  ${colors.cyan}connections${colors.reset}    - Show active connections
  ${colors.cyan}stats${colors.reset}          - Show session statistics
  ${colors.cyan}save [file]${colors.reset}    - Save logs to file
  ${colors.cyan}log [file]${colors.reset}     - Enable logging to file
  ${colors.cyan}filter [level]${colors.reset} - Filter logs by level
  ${colors.cyan}reconnect, r${colors.reset}   - Reconnect to WebSocket
  ${colors.cyan}quit, exit, q${colors.reset}  - Exit the console

${colors.bright}Log Levels:${colors.reset} ${colors.blue}LOG${colors.reset} ${colors.cyan}INFO${colors.reset} ${colors.yellow}WARN${colors.reset} ${colors.red}ERROR${colors.reset} ${colors.magenta}DEBUG${colors.reset}
${colors.bright}Device Icons:${colors.reset} 📱 iOS | 🔗 PWA | 📲 Standalone
    `);
  }

  showStatus() {
    const status = this.isConnected ? 
      `${colors.green}Connected${colors.reset}` : 
      `${colors.red}Disconnected${colors.reset}`;
    
    this.log(`Status: ${status}`, 'info');
    this.log(`Active connections: ${this.connections.size}`, 'info');
    this.log(`Total logs received: ${this.logs.length}`, 'info');
  }

  showConnections() {
    if (this.connections.size === 0) {
      this.log('No active connections', 'info');
    } else {
      this.log(`Active connections (${this.connections.size}):`, 'info');
      this.connections.forEach(id => {
        console.log(`  ${colors.green}${id}${colors.reset}`);
      });
    }
  }

  showStats() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const logsByLevel = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {});

    this.log(`Session uptime: ${uptime}s`, 'info');
    this.log(`Total logs: ${this.logs.length}`, 'info');
    this.log(`Active connections: ${this.connections.size}`, 'info');
    
    Object.entries(logsByLevel).forEach(([level, count]) => {
      const color = levelColors[level] || colors.white;
      console.log(`  ${color}${level.toUpperCase()}${colors.reset}: ${count}`);
    });
  }

  clearLogs() {
    this.logs = [];
    console.clear();
    this.log('Console cleared', 'info');
  }

  saveLogs(filename) {
    if (!filename) {
      filename = `debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    }

    try {
      fs.writeFileSync(filename, JSON.stringify(this.logs, null, 2));
      this.log(`Logs saved to: ${filename}`, 'info');
    } catch (error) {
      this.log(`Failed to save logs: ${error.message}`, 'error');
    }
  }

  enableLogging(filename) {
    if (!filename) {
      filename = `debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    }

    try {
      this.logFile = fs.createWriteStream(filename, { flags: 'a' });
      this.log(`Logging enabled to: ${filename}`, 'info');
    } catch (error) {
      this.log(`Failed to enable logging: ${error.message}`, 'error');
    }
  }

  filterLogs(level) {
    if (!level) {
      this.log('Available levels: log, info, warn, error, debug', 'info');
      return;
    }

    const filtered = this.logs.filter(log => log.level === level.toLowerCase());
    this.log(`Found ${filtered.length} logs with level: ${level}`, 'info');
    
    filtered.slice(-10).forEach(log => {
      this.handleConsoleLog(log);
    });
  }

  reconnect() {
    this.log('Reconnecting...', 'connection');
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const levelColor = levelColors[level] || colors.white;
    const levelText = `${levelColor}${level.toUpperCase()}${colors.reset}`;
    console.log(`${colors.gray}${timestamp}${colors.reset} ${levelText} ${message}`);
  }

  showPrompt() {
    if (this.isConnected) {
      process.stdout.write(`${colors.green}debug>${colors.reset} `);
    } else {
      process.stdout.write(`${colors.red}debug>${colors.reset} `);
    }
  }
}

// Initialize and start the debug console
const debugConsole = new WebSocketDebugConsole();

console.log(`${colors.bright}🔍 iOS PWA WebSocket Debug Console${colors.reset}`);
console.log(`${colors.dim}Starting debug console...${colors.reset}\n`);

// Connect to WebSocket
debugConsole.connect().catch(error => {
  console.error(`Failed to start debug console: ${error.message}`);
  process.exit(1);
});
