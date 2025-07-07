#!/bin/bash

# Local iOS PWA Debugging Setup
# Starts all necessary services for local debugging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                 🎯 Local iOS PWA Debugging Setup             ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 1
    else
        return 0
    fi
}

# Function to start service in background
start_service() {
    local name=$1
    local command=$2
    local port=$3
    local log_file=$4
    
    print_status "Starting $name..."
    
    if [ ! -z "$port" ] && ! check_port $port; then
        print_warning "$name port $port is already in use"
        return 1
    fi
    
    # Start service in background
    nohup $command > $log_file 2>&1 &
    local pid=$!
    
    # Wait a moment for service to start
    sleep 2
    
    # Check if process is still running
    if kill -0 $pid 2>/dev/null; then
        print_success "$name started (PID: $pid)"
        echo $pid > "${name,,}.pid"
        return 0
    else
        print_error "$name failed to start"
        return 1
    fi
}

# Function to show running services
show_services() {
    echo
    print_status "🚀 Local Debugging Services:"
    echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│ Service                │ URL                                │${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│ PWA Development        │ http://localhost:5173              │${NC}"
    echo -e "${CYAN}│ WebSocket Worker       │ ws://localhost:8787/ws             │${NC}"
    echo -e "${CYAN}│ Debug Console          │ Terminal (interactive)             │${NC}"
    echo -e "${CYAN}│ Ngrok Tunnel           │ https://[random].ngrok.io          │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
    echo
}

# Function to show debugging instructions
show_instructions() {
    echo
    print_status "📱 iPhone Debugging Instructions:"
    echo
    echo -e "${GREEN}Option 1: Local Network Access${NC}"
    echo "1. Connect iPhone to same WiFi network"
    echo "2. Find your local IP: ip addr show | grep 'inet 192'"
    echo "3. Access: http://[YOUR_IP]:5173"
    echo "4. WebSocket will auto-connect to local worker"
    echo
    echo -e "${GREEN}Option 2: Ngrok Tunnel (Recommended)${NC}"
    echo "1. Use the ngrok URL shown above"
    echo "2. Access from iPhone Safari"
    echo "3. Add to home screen for PWA mode"
    echo "4. WebSocket logging will work automatically"
    echo
    echo -e "${GREEN}Option 3: Remote Debugging${NC}"
    echo "1. Use deployed PWA: https://development.mycookup.pages.dev/"
    echo "2. Monitor with: npx wrangler tail mycookup-websocket-logger-dev"
    echo "3. View logs in real-time debug console"
    echo
}

# Function to show monitoring commands
show_monitoring() {
    echo
    print_status "🔍 Monitoring Commands:"
    echo
    echo -e "${YELLOW}Local Logs:${NC}"
    echo "  tail -f vite.log          # Vite development server logs"
    echo "  tail -f websocket.log     # WebSocket worker logs"
    echo "  tail -f debug-console.log # Debug console logs"
    echo
    echo -e "${YELLOW}Remote Monitoring:${NC}"
    echo "  npx wrangler tail mycookup-websocket-logger-dev  # WebSocket worker logs"
    echo "  npx wrangler pages deployment tail               # Cloudflare Pages logs"
    echo
    echo -e "${YELLOW}Debug Console Commands:${NC}"
    echo "  npm run debug:console:local   # Connect to local WebSocket"
    echo "  npm run debug:console:dev     # Connect to deployed WebSocket"
    echo
}

# Function to cleanup on exit
cleanup() {
    echo
    print_status "🧹 Cleaning up services..."
    
    # Kill background processes
    for pid_file in vite.pid websocket.pid ngrok.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat $pid_file)
            if kill -0 $pid 2>/dev/null; then
                kill $pid
                print_success "Stopped service (PID: $pid)"
            fi
            rm -f $pid_file
        fi
    done
    
    print_success "Cleanup completed"
    exit 0
}

# Function to start all services
start_all_services() {
    print_status "🚀 Starting all debugging services..."
    echo
    
    # Start Vite development server
    start_service "vite" "npm run dev" "5173" "vite.log"
    
    # Start WebSocket worker (local)
    start_service "websocket" "npm run deploy:websocket:local" "8787" "websocket.log"
    
    # Start ngrok tunnel
    if command -v ngrok &> /dev/null; then
        start_service "ngrok" "npm run ngrok" "" "ngrok.log"
        sleep 3
        
        # Get ngrok URL
        local ngrok_url=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok\.io')
        if [ ! -z "$ngrok_url" ]; then
            print_success "Ngrok tunnel: $ngrok_url"
        fi
    else
        print_warning "Ngrok not installed. Install with: npm install -g ngrok"
    fi
    
    show_services
    show_instructions
    show_monitoring
    
    echo
    print_status "🎯 Ready for iOS PWA debugging!"
    echo
    print_warning "Press Ctrl+C to stop all services"
    echo
}

# Function to show help
show_help() {
    echo "Local iOS PWA Debugging Setup"
    echo
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  start     Start all debugging services (default)"
    echo "  stop      Stop all running services"
    echo "  status    Show status of running services"
    echo "  logs      Show recent logs from all services"
    echo "  help      Show this help message"
    echo
    echo "Services started:"
    echo "  - Vite development server (http://localhost:5173)"
    echo "  - WebSocket worker (ws://localhost:8787/ws)"
    echo "  - Ngrok tunnel (public HTTPS URL)"
    echo
}

# Function to show status
show_status() {
    print_status "🔍 Service Status:"
    echo
    
    for service in vite websocket ngrok; do
        local pid_file="${service}.pid"
        if [ -f "$pid_file" ]; then
            local pid=$(cat $pid_file)
            if kill -0 $pid 2>/dev/null; then
                print_success "$service is running (PID: $pid)"
            else
                print_error "$service is not running (stale PID file)"
                rm -f $pid_file
            fi
        else
            print_warning "$service is not running"
        fi
    done
}

# Function to stop services
stop_services() {
    cleanup
}

# Function to show logs
show_logs() {
    print_status "📋 Recent logs from all services:"
    echo
    
    for log_file in vite.log websocket.log ngrok.log debug-console.log; do
        if [ -f "$log_file" ]; then
            echo -e "${CYAN}=== $log_file ===${NC}"
            tail -n 10 $log_file
            echo
        fi
    done
}

# Main script
main() {
    local command=${1:-start}
    
    case $command in
        start)
            print_header
            trap cleanup SIGINT SIGTERM
            start_all_services
            
            # Keep script running
            while true; do
                sleep 1
            done
            ;;
        stop)
            stop_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
