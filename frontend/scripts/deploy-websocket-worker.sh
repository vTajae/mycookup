#!/bin/bash

# WebSocket Worker Deployment Script
# Automates the deployment of the WebSocket logger worker to Cloudflare

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKER_FILE="websocket-logger-worker.js"
CONFIG_FILE="wrangler-websocket.toml"
DEFAULT_ENV="development"

# Function to print colored output
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

# Function to check if required files exist
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if [ ! -f "$WORKER_FILE" ]; then
        print_error "Worker file '$WORKER_FILE' not found!"
        exit 1
    fi
    
    if [ ! -f "$CONFIG_FILE" ]; then
        print_error "Configuration file '$CONFIG_FILE' not found!"
        exit 1
    fi
    
    # Check if wrangler is installed
    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed. Please install Node.js and npm."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to check Wrangler authentication
check_auth() {
    print_status "Checking Wrangler authentication..."
    
    if ! npx wrangler whoami &> /dev/null; then
        print_warning "Not authenticated with Cloudflare. Please run:"
        echo "npx wrangler auth login"
        exit 1
    fi
    
    print_success "Authenticated with Cloudflare"
}

# Function to deploy worker
deploy_worker() {
    local env=$1
    
    print_status "Deploying WebSocket worker to '$env' environment..."
    
    if [ "$env" = "local" ]; then
        print_status "Starting local development server..."
        npx wrangler dev "$WORKER_FILE" --config "$CONFIG_FILE"
    else
        # Deploy to Cloudflare
        npx wrangler deploy "$WORKER_FILE" --config "$CONFIG_FILE" --env "$env"
        
        if [ $? -eq 0 ]; then
            print_success "Worker deployed successfully to '$env' environment"
            
            # Get the worker URL
            local worker_name
            if [ "$env" = "production" ]; then
                worker_name="mycookup-websocket-logger"
            else
                worker_name="mycookup-websocket-logger-dev"
            fi
            
            print_status "Worker URL: https://$worker_name.YOUR-SUBDOMAIN.workers.dev"
            print_status "WebSocket URL: wss://$worker_name.YOUR-SUBDOMAIN.workers.dev/ws"
            print_status "Health Check: https://$worker_name.YOUR-SUBDOMAIN.workers.dev/health"
        else
            print_error "Deployment failed!"
            exit 1
        fi
    fi
}

# Function to test deployment
test_deployment() {
    local env=$1
    
    if [ "$env" = "local" ]; then
        print_status "Skipping test for local deployment"
        return
    fi
    
    print_status "Testing deployment..."
    
    local worker_name
    if [ "$env" = "production" ]; then
        worker_name="mycookup-websocket-logger"
    else
        worker_name="mycookup-websocket-logger-dev"
    fi
    
    local health_url="https://$worker_name.YOUR-SUBDOMAIN.workers.dev/health"
    
    print_status "Testing health endpoint: $health_url"
    
    # Test health endpoint
    if curl -s -f "$health_url" > /dev/null; then
        print_success "Health check passed"
    else
        print_warning "Health check failed. The worker might still be starting up."
        print_status "You can manually test: curl $health_url"
    fi
}

# Function to show post-deployment instructions
show_instructions() {
    local env=$1
    
    if [ "$env" = "local" ]; then
        return
    fi
    
    print_success "Deployment completed!"
    echo
    print_status "Next steps:"
    echo "1. Update WebSocket URLs in your configuration files:"
    echo "   - src/services/webSocketLoggerConfig.ts"
    echo "   - debug-console.html"
    echo "   - debug-console.js"
    echo
    echo "2. Replace 'YOUR-SUBDOMAIN' with your actual Cloudflare Workers subdomain"
    echo
    echo "3. Test the WebSocket connection:"
    echo "   npm run debug:console:$env"
    echo
    echo "4. Enable WebSocket logging in your PWA:"
    echo "   wsLogger.enable() // in browser console"
    echo
    print_status "For detailed instructions, see: WEBSOCKET_DEPLOYMENT_GUIDE.md"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [environment]"
    echo
    echo "Environments:"
    echo "  development  Deploy to development environment (default)"
    echo "  production   Deploy to production environment"
    echo "  local        Start local development server"
    echo
    echo "Examples:"
    echo "  $0                    # Deploy to development"
    echo "  $0 development        # Deploy to development"
    echo "  $0 production         # Deploy to production"
    echo "  $0 local              # Start local server"
}

# Main script
main() {
    local env=${1:-$DEFAULT_ENV}
    
    # Validate environment
    case $env in
        development|production|local)
            ;;
        *)
            print_error "Invalid environment: $env"
            show_usage
            exit 1
            ;;
    esac
    
    print_status "Starting WebSocket worker deployment..."
    print_status "Environment: $env"
    echo
    
    # Run checks
    check_prerequisites
    
    if [ "$env" != "local" ]; then
        check_auth
    fi
    
    # Deploy
    deploy_worker "$env"
    
    # Test deployment
    if [ "$env" != "local" ]; then
        echo
        test_deployment "$env"
        echo
        show_instructions "$env"
    fi
}

# Handle help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"
