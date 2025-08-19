#!/bin/bash

# Script to add frontend-client to MongoDB for OAuth2 server
# This creates the default frontend client needed for social login and PKCE flows

set -e

# Default values
MONGO_HOST="localhost"
MONGO_PORT="27017"
MONGO_USER="admin"
MONGO_PASSWORD="password123"
DATABASE_NAME="oauth2_server"
TENANT_ID=""
DOMAIN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
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

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --host HOST         MongoDB host (default: localhost)"
    echo "  -p, --port PORT         MongoDB port (default: 27017)"
    echo "  -u, --user USER         MongoDB username (default: admin)"
    echo "  -P, --password PASS     MongoDB password (default: password123)"
    echo "  -d, --database DB       Database name (default: oauth2_server)"
    echo "  -t, --tenant-id ID      Tenant ID (optional, leave empty for default tenant)"
    echo "  -D, --domain DOMAIN     Domain for redirect URIs (e.g., authy.imsc.eu)"
    echo "  --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --domain authy.imsc.eu"
    echo "  $0 --host mongodb.example.com --user oauth2user --password secret123"
    echo "  $0 --tenant-id 64f1a2b3c4d5e6f7g8h9i0j1 --domain myapp.com"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            MONGO_HOST="$2"
            shift 2
            ;;
        -p|--port)
            MONGO_PORT="$2"
            shift 2
            ;;
        -u|--user)
            MONGO_USER="$2"
            shift 2
            ;;
        -P|--password)
            MONGO_PASSWORD="$2"
            shift 2
            ;;
        -d|--database)
            DATABASE_NAME="$2"
            shift 2
            ;;
        -t|--tenant-id)
            TENANT_ID="$2"
            shift 2
            ;;
        -D|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Build MongoDB connection string
if [ -n "$MONGO_USER" ] && [ -n "$MONGO_PASSWORD" ]; then
    MONGO_URI="mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${DATABASE_NAME}?authSource=admin"
else
    MONGO_URI="mongodb://${MONGO_HOST}:${MONGO_PORT}/${DATABASE_NAME}"
fi

print_info "Connecting to MongoDB at ${MONGO_HOST}:${MONGO_PORT}"
print_info "Database: ${DATABASE_NAME}"

# Build redirect URIs based on domain
if [ -n "$DOMAIN" ]; then
    REDIRECT_URIS="[
        \"https://${DOMAIN}/callback\",
        \"https://${DOMAIN}/auth/callback\",
        \"http://localhost:3000/callback\"
    ]"
    print_info "Using domain: ${DOMAIN}"
else
    REDIRECT_URIS="[
        \"http://localhost:3000/callback\",
        \"https://authy.imsc.eu/callback\",
        \"https://authy.imsc.eu/auth/callback\"
    ]"
    print_warning "No domain specified, using default redirect URIs"
fi

# Create MongoDB script
MONGO_SCRIPT=$(cat <<EOF
use $DATABASE_NAME;

// Check if frontend-client already exists
var existingClient = db.clients.findOne({client_id: "frontend-client"});
if (existingClient) {
    print("Frontend client already exists with ID: " + existingClient._id);
    print("Skipping creation to avoid duplicates.");
} else {
    // Create frontend client
    var frontendClient = {
        client_id: "frontend-client",
        client_secret: "frontend-secret",
        name: "Frontend Client",
        description: "Default frontend client for social login and PKCE flows",
        redirect_uris: $REDIRECT_URIS,
        scopes: ["read", "write", "openid", "profile", "email"],
        grant_types: ["authorization_code", "refresh_token"],
        active: true,
        created_at: new Date(),
        updated_at: new Date()
    };
    
    // Add tenant_id if specified
    if ("$TENANT_ID" !== "") {
        frontendClient.tenant_id = "$TENANT_ID";
    }
    
    var result = db.clients.insertOne(frontendClient);
    print("Created frontend client with ID: " + result.insertedId);
}

// Check if test-client-id already exists
var existingTestClient = db.clients.findOne({client_id: "test-client-id"});
if (existingTestClient) {
    print("Test client already exists with ID: " + existingTestClient._id);
    print("Skipping creation to avoid duplicates.");
} else {
    // Create test client
    var testClient = {
        client_id: "test-client-id",
        client_secret: "test-client-secret",
        name: "Test OAuth2 Client",
        description: "Default test client for development",
        redirect_uris: $REDIRECT_URIS.concat(["https://oauth.pstmn.io/v1/callback"]),
        scopes: ["read", "write", "openid", "profile", "email"],
        grant_types: ["authorization_code", "refresh_token"],
        active: true,
        created_at: new Date(),
        updated_at: new Date()
    };
    
    // Add tenant_id if specified
    if ("$TENANT_ID" !== "") {
        testClient.tenant_id = "$TENANT_ID";
    }
    
    var result = db.clients.insertOne(testClient);
    print("Created test client with ID: " + result.insertedId);
}

// Show created clients
print("\\nCurrent OAuth clients:");
db.clients.find({}, {client_id: 1, name: 1, active: 1, tenant_id: 1}).forEach(function(client) {
    print("- " + client.client_id + " (" + client.name + ") - Active: " + client.active + 
          (client.tenant_id ? " - Tenant: " + client.tenant_id : ""));
});
EOF
)

# Execute MongoDB script
print_info "Creating OAuth clients..."

if command -v mongosh >/dev/null 2>&1; then
    # Use mongosh (MongoDB 5.0+)
    echo "$MONGO_SCRIPT" | mongosh "$MONGO_URI" --quiet
elif command -v mongo >/dev/null 2>&1; then
    # Use legacy mongo client
    echo "$MONGO_SCRIPT" | mongo "$MONGO_URI" --quiet
else
    print_error "Neither 'mongosh' nor 'mongo' command found. Please install MongoDB client."
    exit 1
fi

if [ $? -eq 0 ]; then
    print_success "OAuth clients created successfully!"
    echo ""
    print_info "Frontend client details:"
    echo "  Client ID: frontend-client"
    echo "  Client Secret: frontend-secret"
    echo "  Purpose: Social login and PKCE flows"
    echo ""
    print_info "Test client details:"
    echo "  Client ID: test-client-id"
    echo "  Client Secret: test-client-secret"
    echo "  Purpose: Development and testing"
    echo ""
    if [ -n "$DOMAIN" ]; then
        print_info "Redirect URIs configured for domain: ${DOMAIN}"
    fi
else
    print_error "Failed to create OAuth clients"
    exit 1
fi