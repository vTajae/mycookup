#!/bin/bash

echo "🔍 Starting iOS Remote Debugging..."

# Check if iOS device is connected
if ! ios_webkit_debug_proxy -F 2>/dev/null | grep -q "Connected"; then
    echo "⚠️  No iOS device detected. Please:"
    echo "   1. Connect iOS device via USB"
    echo "   2. Trust this computer on the device"
    echo "   3. Enable Web Inspector in Safari settings"
    echo ""
fi

echo "Starting ios-webkit-debug-proxy..."
ios_webkit_debug_proxy -c null:9221,:9222-9322 &
PROXY_PID=$!

echo "Waiting for proxy to start..."
sleep 3

echo "Starting remotedebug-ios-webkit-adapter..."
remotedebug_ios_webkit_adapter --port=9000 &
ADAPTER_PID=$!

echo ""
echo "✅ Remote debugging started!"
echo ""
echo "Next steps:"
echo "1. Open Chrome and go to: chrome://inspect/#devices"
echo "2. Click 'Configure...' next to 'Discover network targets'"
echo "3. Add: localhost:9000"
echo "4. Open your PWA on iOS device"
echo "5. Click 'inspect' next to your device in Chrome"
echo ""
echo "To stop debugging, press Ctrl+C"

# Wait for interrupt
trap "echo 'Stopping remote debugging...'; kill $PROXY_PID $ADAPTER_PID 2>/dev/null; exit 0" INT
wait
