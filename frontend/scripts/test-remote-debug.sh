#!/bin/bash

echo "🧪 Testing Remote Debug Setup..."

# Test ios-webkit-debug-proxy
if command -v ios_webkit_debug_proxy >/dev/null 2>&1; then
    echo "✅ ios-webkit-debug-proxy installed"
    ios_webkit_debug_proxy --version
else
    echo "❌ ios-webkit-debug-proxy not found"
    exit 1
fi

# Test remotedebug-ios-webkit-adapter
if command -v remotedebug_ios_webkit_adapter >/dev/null 2>&1; then
    echo "✅ remotedebug-ios-webkit-adapter installed"
else
    echo "❌ remotedebug-ios-webkit-adapter not found"
    exit 1
fi

# Test device connection
echo ""
echo "Testing device connection..."
if ios_webkit_debug_proxy -F 2>/dev/null | grep -q "Connected"; then
    echo "✅ iOS device detected"
    ios_webkit_debug_proxy -F
else
    echo "⚠️  No iOS device detected"
    echo "Please connect your iOS device and enable Web Inspector"
fi

echo ""
echo "Setup test complete!"
