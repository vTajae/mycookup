/**
 * API Route for iOS PWA Debug Logging
 * 
 * This route handles log submissions from iOS devices and provides
 * a simple server-side logging mechanism using React Router actions.
 */

import { type ActionFunction,type LoaderFunction } from "react-router";

export interface LogEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  data?: any;
  stackTrace?: string;
  deviceInfo?: DeviceInfo;
  source: 'console' | 'network' | 'service-worker' | 'push-notification' | 'camera' | 'app' | 'system';
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isIOS: boolean;
  isStandalone: boolean;
  viewport: { width: number; height: number };
  capabilities: {
    hasServiceWorker: boolean;
    hasNotificationAPI: boolean;
    hasPushManager: boolean;
    hasWebShare: boolean;
    hasClipboard: boolean;
  };
}

export interface LogBatch {
  sessionId: string;
  deviceInfo: DeviceInfo;
  logs: LogEntry[];
  batchId: string;
  timestamp: string;
}

// In-memory storage for development (replace with persistent storage in production)
const logStorage = new Map<string, LogEntry[]>();
const sessionStorage = new Map<string, { deviceInfo: DeviceInfo; lastActivity: string; logCount: number }>();

/**
 * Action function to handle log submissions
 */
export const action: ActionFunction = async ({ request }) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Debug-Source, X-Session-ID',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const body = await request.json() as LogBatch | LogEntry;
    
    // Handle both single log entries and batches
    const logs: LogEntry[] = Array.isArray((body as LogBatch).logs) 
      ? (body as LogBatch).logs 
      : [body as LogEntry];

    const sessionId = (body as LogBatch).sessionId || (body as LogEntry).sessionId;
    const deviceInfo = (body as LogBatch).deviceInfo || (body as LogEntry).deviceInfo;
    const timestamp = new Date().toISOString();

    // Validate and process each log entry
    const processedLogs: LogEntry[] = [];
    for (const log of logs) {
      if (!isValidLogEntry(log)) {
        console.warn('Invalid log entry:', log);
        continue;
      }

      // Ensure required fields
      const processedLog: LogEntry = {
        ...log,
        id: log.id || generateLogId(),
        timestamp: log.timestamp || timestamp,
        sessionId: log.sessionId || sessionId,
      };

      processedLogs.push(processedLog);
    }

    if (processedLogs.length === 0) {
      return new Response(JSON.stringify({
        error: 'No valid log entries',
        message: 'All log entries were invalid or missing required fields'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Store logs in memory
    const existingLogs = logStorage.get(sessionId) || [];
    existingLogs.push(...processedLogs);
    
    // Keep only the last 1000 logs per session
    if (existingLogs.length > 1000) {
      existingLogs.splice(0, existingLogs.length - 1000);
    }
    
    logStorage.set(sessionId, existingLogs);

    // Update session metadata
    if (deviceInfo) {
      sessionStorage.set(sessionId, {
        deviceInfo,
        lastActivity: timestamp,
        logCount: existingLogs.length
      });
    }

    // Log to server console for development monitoring
    console.log(`📱 [iOS-PWA-LOGS] Session: ${sessionId}`);
    processedLogs.forEach(log => {
      const emoji = getLogEmoji(log.level, log.source);
      console.log(`${emoji} [${log.level.toUpperCase()}] [${log.category}] ${log.message}`, log.data || '');
      
      if (log.stackTrace) {
        console.log(`   Stack: ${log.stackTrace}`);
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Stored ${processedLogs.length} log entries`,
      sessionId,
      logIds: processedLogs.map(log => log.id)
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('❌ [iOS-PWA-LOGS] Log ingestion error:', error);
    return new Response(JSON.stringify({
      error: 'Log ingestion failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};

/**
 * Loader function to handle log queries
 */
export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const level = url.searchParams.get('level');
  const category = url.searchParams.get('category');
  const source = url.searchParams.get('source');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const format = url.searchParams.get('format') || 'json';

  try {
    let allLogs: LogEntry[] = [];

    if (sessionId) {
      // Get logs for specific session
      allLogs = logStorage.get(sessionId) || [];
    } else {
      // Get logs from all sessions (limited to last 10 sessions)
      const sessions = Array.from(sessionStorage.entries())
        .sort(([, a], [, b]) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        .slice(0, 10);

      for (const [sid] of sessions) {
        const sessionLogs = logStorage.get(sid) || [];
        allLogs.push(...sessionLogs);
      }
    }

    // Apply filters
    let filteredLogs = allLogs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }
    
    if (source) {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    filteredLogs = filteredLogs.slice(0, limit);

    // Format response
    let responseBody: string;
    let contentType: string;

    switch (format) {
      case 'csv':
        responseBody = formatLogsAsCSV(filteredLogs);
        contentType = 'text/csv';
        break;
      case 'text':
        responseBody = formatLogsAsText(filteredLogs);
        contentType = 'text/plain';
        break;
      default:
        responseBody = JSON.stringify({
          success: true,
          data: filteredLogs,
          sessions: sessionId ? undefined : Array.from(sessionStorage.entries()).map(([id, meta]) => ({
            sessionId: id,
            ...meta
          })),
          meta: {
            count: filteredLogs.length,
            timestamp: new Date().toISOString()
          }
        });
        contentType = 'application/json';
    }

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('❌ [iOS-PWA-LOGS] Log query error:', error);
    return new Response(JSON.stringify({
      error: 'Log query failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};

// Helper functions
function isValidLogEntry(log: any): log is LogEntry {
  return (
    log &&
    typeof log === 'object' &&
    typeof log.level === 'string' &&
    ['debug', 'info', 'warn', 'error', 'critical'].includes(log.level) &&
    typeof log.message === 'string' &&
    log.message.length > 0
  );
}

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function getLogEmoji(level: string, source: string): string {
  const sourceEmojis: Record<string, string> = {
    'console': '💬',
    'network': '🌐',
    'service-worker': '⚙️',
    'push-notification': '🔔',
    'camera': '📸',
    'app': '📱',
    'system': '🔧'
  };

  const levelEmojis: Record<string, string> = {
    'debug': '🐛',
    'info': 'ℹ️',
    'warn': '⚠️',
    'error': '❌',
    'critical': '🚨'
  };

  return sourceEmojis[source] || levelEmojis[level] || '📝';
}

function formatLogsAsCSV(logs: LogEntry[]): string {
  if (logs.length === 0) {
    return 'timestamp,level,category,message,sessionId,source\n';
  }
  
  const headers = 'timestamp,level,category,message,sessionId,source,userAgent\n';
  const rows = logs.map(log => {
    const userAgent = log.deviceInfo?.userAgent || '';
    return [
      log.timestamp,
      log.level,
      log.category || '',
      `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
      log.sessionId,
      log.source || '',
      `"${userAgent.replace(/"/g, '""')}"`
    ].join(',');
  }).join('\n');
  
  return headers + rows;
}

function formatLogsAsText(logs: LogEntry[]): string {
  if (logs.length === 0) {
    return 'No logs found.\n';
  }
  
  return logs.map(log => {
    const timestamp = new Date(log.timestamp).toISOString();
    const level = log.level.toUpperCase().padEnd(8);
    const category = log.category ? `[${log.category}]` : '';
    const source = log.source ? `{${log.source}}` : '';
    
    let output = `${timestamp} ${level} ${category}${source} ${log.message}`;
    
    if (log.data) {
      output += `\n  Data: ${JSON.stringify(log.data, null, 2)}`;
    }
    
    if (log.stackTrace) {
      output += `\n  Stack: ${log.stackTrace}`;
    }
    
    return output;
  }).join('\n\n');
}

// This component won't be rendered since it's an API route
export default function LogsAPI() {
  return null;
}
