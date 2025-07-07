#!/bin/bash

# iOS Remote Debugging Setup Script
# Sets up ios-webkit-debug-proxy and remotedebug-ios-webkit-adapter

set -e

echo "🔍 iOS Remote Debugging Setup"
echo "=============================="

# Detect OS
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "Detected OS: $MACHINE"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install on Linux
install_linux() {
    echo "Installing for Linux..."
    
    # Check if running on Ubuntu/Debian
    if command_exists apt-get; then
        echo "Installing ios-webkit-debug-proxy via apt..."
        sudo apt-get update
        sudo apt-get install -y ios-webkit-debug-proxy
    else
        echo "Building ios-webkit-debug-proxy from source..."
        
        # Install dependencies
        if command_exists yum; then
            sudo yum install -y git autoconf automake libtool libplist-devel libusbmuxd-devel libimobiledevice-devel
        elif command_exists dnf; then
            sudo dnf install -y git autoconf automake libtool libplist-devel libusbmuxd-devel libimobiledevice-devel
        else
            echo "Please install dependencies manually: git autoconf automake libtool libplist-devel libusbmuxd-devel libimobiledevice-devel"
        fi
        
        # Clone and build
        if [ ! -d "ios-webkit-debug-proxy" ]; then
            git clone https://github.com/google/ios-webkit-debug-proxy.git
        fi
        
        cd ios-webkit-debug-proxy
        ./autogen.sh
        make
        sudo make install
        cd ..
    fi
}

# Function to install on Mac
install_mac() {
    echo "Installing for macOS..."
    
    if command_exists brew; then
        echo "Installing ios-webkit-debug-proxy via Homebrew..."
        brew install ios-webkit-debug-proxy
    else
        echo "Homebrew not found. Please install Homebrew first:"
        echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
}

# Function to install on Windows (via WSL or Git Bash)
install_windows() {
    echo "For Windows, please use one of these methods:"
    echo ""
    echo "Method 1: Scoop (Recommended)"
    echo "  1. Install Scoop: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser; irm get.scoop.sh | iex"
    echo "  2. scoop bucket add extras"
    echo "  3. scoop install ios-webkit-debug-proxy"
    echo ""
    echo "Method 2: WSL (Windows Subsystem for Linux)"
    echo "  1. Install WSL2 with Ubuntu"
    echo "  2. Run this script inside WSL"
    echo ""
    echo "Method 3: Manual installation"
    echo "  Download precompiled binaries from: https://github.com/google/ios-webkit-debug-proxy/releases"
}

# Main installation
echo ""
echo "Step 1: Installing ios-webkit-debug-proxy..."

if command_exists ios_webkit_debug_proxy; then
    echo "✅ ios-webkit-debug-proxy already installed"
    ios_webkit_debug_proxy --version
else
    case $MACHINE in
        Linux)
            install_linux
            ;;
        Mac)
            install_mac
            ;;
        Cygwin|MinGw)
            install_windows
            exit 0
            ;;
        *)
            echo "❌ Unsupported OS: $MACHINE"
            exit 1
            ;;
    esac
fi

echo ""
echo "Step 2: Installing remotedebug-ios-webkit-adapter..."

if command_exists npm; then
    if npm list -g remotedebug-ios-webkit-adapter >/dev/null 2>&1; then
        echo "✅ remotedebug-ios-webkit-adapter already installed"
    else
        echo "Installing remotedebug-ios-webkit-adapter..."
        npm install -g remotedebug-ios-webkit-adapter
    fi
else
    echo "❌ npm not found. Please install Node.js first."
    exit 1
fi

echo ""
echo "Step 3: Creating helper scripts..."

# Create start script
cat > start-remote-debug.sh << 'EOF'
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
EOF

chmod +x start-remote-debug.sh

# Create test script
cat > test-remote-debug.sh << 'EOF'
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
EOF

chmod +x test-remote-debug.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "Created helper scripts:"
echo "  - start-remote-debug.sh: Start debugging session"
echo "  - test-remote-debug.sh: Test installation"
echo ""
echo "To start debugging:"
echo "  ./start-remote-debug.sh"
echo ""
echo "To test installation:"
echo "  ./test-remote-debug.sh"
echo ""
echo "Manual commands:"
echo "  ios_webkit_debug_proxy -c null:9221,:9222-9322"
echo "  remotedebug_ios_webkit_adapter --port=9000"
