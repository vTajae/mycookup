/**
 * Cloudflare Worker for WebSocket-based iOS PWA Console Logging
 * 
 * This worker provides a WebSocket endpoint for real-time console log streaming
 * from iOS PWA applications to development environments.
 * 
 * Features:
 * - WebSocket endpoint at /ws for log streaming
 * - Handles multiple concurrent connections
 * - Broadcasts logs to all connected development clients
 * - Graceful connection state management
 * - CORS support for cross-origin requests
 */

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};

/**
 * Active WebSocket connections for broadcasting logs
 * Key: connection ID, Value: WebSocket connection
 */
const connections = new Map();

/**
 * Generate unique connection ID
 */
function generateConnectionId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle incoming HTTP requests
 */
async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }

  // WebSocket upgrade endpoint
  if (pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
    return handleWebSocketUpgrade(request);
  }

  // Health check endpoint
  if (pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeConnections: connections.size,
      service: 'websocket-logger'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    });
  }

  // Status endpoint with connection info
  if (pathname === '/status') {
    return new Response(JSON.stringify({
      activeConnections: connections.size,
      connectionIds: Array.from(connections.keys()),
      timestamp: new Date().toISOString(),
      uptime: Date.now()
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    });
  }

  // Default response for non-WebSocket requests
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>iOS PWA WebSocket Logger</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .endpoint { background: #e8f4f8; padding: 10px; border-radius: 4px; margin: 10px 0; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>iOS PWA WebSocket Logger</h1>
      <div class="status">
        <h2>Service Status</h2>
        <p>✅ WebSocket Logger is running</p>
        <p>Active connections: <span id="connections">${connections.size}</span></p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </div>
      
      <h2>Available Endpoints</h2>
      <div class="endpoint">
        <strong>WebSocket:</strong> <code>wss://your-worker.your-subdomain.workers.dev/ws</code>
      </div>
      <div class="endpoint">
        <strong>Health Check:</strong> <code>GET /health</code>
      </div>
      <div class="endpoint">
        <strong>Status:</strong> <code>GET /status</code>
      </div>
      
      <h2>Usage</h2>
      <p>Connect your PWA to the WebSocket endpoint to stream console logs in real-time.</p>
      <p>Development clients can connect to receive broadcasted logs from all PWA instances.</p>
    </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
      ...getCORSHeaders()
    }
  });
}

/**
 * Handle WebSocket upgrade requests
 */
function handleWebSocketUpgrade(request) {
  // Create WebSocket pair
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  // Accept the WebSocket connection
  server.accept();

  // Generate unique connection ID
  const connectionId = generateConnectionId();
  
  // Store the connection
  connections.set(connectionId, server);

  // Set up event handlers
  server.addEventListener('message', (event) => {
    handleWebSocketMessage(connectionId, event.data);
  });

  server.addEventListener('close', () => {
    handleWebSocketClose(connectionId);
  });

  server.addEventListener('error', (error) => {
    console.error(`WebSocket error for connection ${connectionId}:`, error);
    handleWebSocketClose(connectionId);
  });

  // Send welcome message
  server.send(JSON.stringify({
    type: 'connection',
    connectionId,
    timestamp: new Date().toISOString(),
    message: 'Connected to iOS PWA WebSocket Logger'
  }));

  // Return the client WebSocket in the response
  return new Response(null, {
    status: 101,
    webSocket: client,
    headers: getCORSHeaders()
  });
}

/**
 * Handle incoming WebSocket messages
 */
function handleWebSocketMessage(connectionId, data) {
  try {
    const message = JSON.parse(data);
    
    // Add connection metadata
    const enrichedMessage = {
      ...message,
      connectionId,
      receivedAt: new Date().toISOString(),
      source: 'pwa'
    };

    // Log to worker console for debugging
    console.log(`[${connectionId}] Received log:`, enrichedMessage);

    // Broadcast to all other connections (development clients)
    broadcastToOtherConnections(connectionId, enrichedMessage);

  } catch (error) {
    console.error(`Failed to parse message from ${connectionId}:`, error);
    
    // Send error back to sender
    const connection = connections.get(connectionId);
    if (connection) {
      connection.send(JSON.stringify({
        type: 'error',
        message: 'Failed to parse message',
        timestamp: new Date().toISOString()
      }));
    }
  }
}

/**
 * Broadcast message to all connections except the sender
 */
function broadcastToOtherConnections(senderConnectionId, message) {
  const broadcastMessage = JSON.stringify(message);
  
  for (const [connectionId, connection] of connections) {
    // Don't send back to sender
    if (connectionId === senderConnectionId) continue;
    
    try {
      if (connection.readyState === WebSocket.READY_STATE_OPEN) {
        connection.send(broadcastMessage);
      } else {
        // Clean up closed connections
        connections.delete(connectionId);
      }
    } catch (error) {
      console.error(`Failed to send to connection ${connectionId}:`, error);
      connections.delete(connectionId);
    }
  }
}

/**
 * Handle WebSocket connection close
 */
function handleWebSocketClose(connectionId) {
  connections.delete(connectionId);
  console.log(`Connection ${connectionId} closed. Active connections: ${connections.size}`);
  
  // Notify other connections about disconnection
  broadcastToOtherConnections(connectionId, {
    type: 'disconnection',
    connectionId,
    timestamp: new Date().toISOString(),
    message: `Connection ${connectionId} disconnected`,
    activeConnections: connections.size
  });
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders()
  });
}

/**
 * Get CORS headers for cross-origin requests
 */
function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Debug-Source',
    'Access-Control-Max-Age': '86400'
  };
}
