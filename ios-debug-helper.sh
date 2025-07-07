#!/bin/bash

# iOS Debug Helper Script
# Automatically manages ios-webkit-debug-proxy and remotedebug-ios-webkit-adapter

echo "🔍 iOS Debug Helper Starting..."

# Kill existing processes
echo "Stopping existing processes..."
pkill -f ios_webkit_debug_proxy
pkill -f remotedebug_ios_webkit_adapter
sleep 2

# Start ios-webkit-debug-proxy
echo "Starting ios-webkit-debug-proxy..."
ios_webkit_debug_proxy -F &
PROXY_PID=$!
sleep 3

# Check for connected devices
echo "Checking for connected devices..."
DEVICE_INFO=$(curl -s http://localhost:9100/json)
echo "Device info: $DEVICE_INFO"

if [[ "$DEVICE_INFO" == "[]" ]]; then
    echo "❌ No iOS devices detected!"
    echo "Make sure:"
    echo "1. iPhone is connected via USB"
    echo "2. Trust this computer on iPhone"
    echo "3. Safari > Advanced > Web Inspector is enabled"
    exit 1
fi

# Extract device port
DEVICE_PORT=$(echo "$DEVICE_INFO" | grep -o 'localhost:[0-9]*' | cut -d: -f2)
echo "Device port: $DEVICE_PORT"

# Wait for Safari tabs
echo "Waiting for Safari tabs..."
for i in {1..10}; do
    TABS=$(curl -s http://localhost:$DEVICE_PORT/json)
    if [[ "$TABS" != "[]" ]]; then
        echo "✅ Safari tabs detected!"
        echo "$TABS" | jq . 2>/dev/null || echo "$TABS"
        break
    fi
    echo "Waiting for Safari tabs... ($i/10)"
    sleep 2
done

if [[ "$TABS" == "[]" ]]; then
    echo "❌ No Safari tabs found!"
    echo "Open Safari on your iPhone and navigate to your PWA"
    exit 1
fi

# Start remotedebug adapter
echo "Starting remotedebug-ios-webkit-adapter..."
remotedebug_ios_webkit_adapter --port=9000 &
ADAPTER_PID=$!
sleep 3

# Test connection
echo "Testing connection..."
ADAPTER_RESPONSE=$(curl -s http://localhost:9000/json)
if [[ "$ADAPTER_RESPONSE" != "[]" && "$ADAPTER_RESPONSE" != "" ]]; then
    echo "✅ Remote debugging ready!"
    echo "Chrome DevTools URL:"
    echo "$ADAPTER_RESPONSE" | jq -r '.[0].devtoolsFrontendUrl' 2>/dev/null || echo "Check chrome://inspect/#devices"
    echo ""
    echo "Configure Chrome DevTools:"
    echo "1. Open chrome://inspect/#devices"
    echo "2. Click 'Configure...'"
    echo "3. Add 'localhost:9000'"
    echo "4. Look for your iPhone device"
else
    echo "❌ Adapter connection failed"
    echo "Response: $ADAPTER_RESPONSE"
fi

# Keep running and monitor
echo ""
echo "🔄 Monitoring connections... (Ctrl+C to stop)"
echo "If connection drops, restart this script"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping debug services..."
    kill $PROXY_PID 2>/dev/null
    kill $ADAPTER_PID 2>/dev/null
    pkill -f ios_webkit_debug_proxy
    pkill -f remotedebug_ios_webkit_adapter
    exit 0
}

trap cleanup SIGINT SIGTERM

# Monitor loop
while true; do
    sleep 10
    # Check if processes are still running
    if ! kill -0 $PROXY_PID 2>/dev/null; then
        echo "❌ ios_webkit_debug_proxy died, restarting..."
        ios_webkit_debug_proxy -F &
        PROXY_PID=$!
        sleep 3
    fi
    
    if ! kill -0 $ADAPTER_PID 2>/dev/null; then
        echo "❌ remotedebug adapter died, restarting..."
        remotedebug_ios_webkit_adapter --port=9000 &
        ADAPTER_PID=$!
        sleep 3
    fi
done
