#!/bin/bash

# Setup script for ngrok to enable iOS device debugging
# This script sets up ngrok for tunneling the local development server

echo "🔧 Setting up ngrok for iOS device debugging..."

# Check if ngrok is already installed
if command -v ngrok &> /dev/null; then
    echo "✅ ngrok is already installed"
else
    echo "📦 Installing ngrok..."
    
    # Download and install ngrok
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
        echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
        sudo apt update && sudo apt install ngrok
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ngrok/ngrok/ngrok
        else
            echo "❌ Homebrew not found. Please install Homebrew first or install ngrok manually."
            exit 1
        fi
    else
        echo "❌ Unsupported OS. Please install ngrok manually from https://ngrok.com/download"
        exit 1
    fi
fi

echo ""
echo "🎯 ngrok Setup Complete!"
echo ""
echo "📱 To debug your PWA on iOS devices:"
echo ""
echo "1. Start your development server:"
echo "   npm run dev"
echo ""
echo "2. In another terminal, start ngrok:"
echo "   ngrok http 5173"
echo ""
echo "3. Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)"
echo ""
echo "4. On your iOS device:"
echo "   - Open Safari"
echo "   - Navigate to the ngrok HTTPS URL"
echo "   - Add to Home Screen (Share → Add to Home Screen)"
echo "   - Open from Home Screen to test in standalone mode"
echo ""
echo "5. Navigate to /notifications to access the enhanced debug interface"
echo ""
echo "🔍 Debug Features Available:"
echo "   - 🐛 Enhanced Debug Logs with iOS-specific logging"
echo "   - 📱 PWA Status monitoring"
echo "   - 🔔 OneSignal debug console with detailed logging"
echo "   - 🍎 iOS Safari Web Push requirements checker"
echo "   - 📤 Export functionality for sharing logs"
echo ""
echo "💡 Tips for iOS PWA debugging:"
echo "   - Use the enhanced debug logger we just implemented"
echo "   - Check PWA installation status in standalone mode"
echo "   - Monitor OneSignal initialization and permission requests"
echo "   - Export logs for remote debugging"
echo "   - Test push notifications in standalone mode"
echo ""
echo "⚠️  Important for iOS Web Push:"
echo "   - Requires iOS 16.4+ and Safari"
echo "   - Must be opened from Home Screen (standalone mode)"
echo "   - HTTPS is required (ngrok provides this automatically)"
echo "   - Check the iOS requirements in the debug interface"
echo ""
