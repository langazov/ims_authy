#!/bin/bash

echo "Starting OAuth2 development environment..."

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
}

# Function to check if MongoDB is running
check_mongodb() {
    pgrep mongod > /dev/null 2>&1
}

# Start MongoDB if not running
echo "Checking MongoDB status..."
if check_port 27017; then
    echo "✅ MongoDB is already running on port 27017"
elif check_mongodb; then
    echo "✅ MongoDB process is running"
else
    echo "Starting MongoDB..."
    # Try to start MongoDB using different methods based on installation
    if command -v docker > /dev/null && [ -f "docker-compose.yml" ]; then
        # Use Docker Compose if available
        echo "Starting MongoDB with Docker Compose..."
        docker-compose up -d mongodb
        echo "MongoDB started via Docker Compose"
    elif command -v brew > /dev/null && brew services list | grep mongodb-community > /dev/null; then
        # MongoDB installed via Homebrew
        brew services start mongodb-community
        echo "MongoDB started via Homebrew"
    elif command -v systemctl > /dev/null; then
        # MongoDB on systems with systemctl
        sudo systemctl start mongod
        echo "MongoDB started via systemctl"
    elif command -v service > /dev/null; then
        # MongoDB on systems with service command
        sudo service mongod start
        echo "MongoDB started via service"
    elif command -v mongod > /dev/null; then
        # Start MongoDB directly
        mkdir -p /usr/local/var/mongodb /usr/local/var/log/mongodb
        mongod --dbpath /usr/local/var/mongodb --logpath /usr/local/var/log/mongodb/mongo.log --fork
        echo "MongoDB started directly"
    else
        echo "❌ MongoDB not found. Starting with Docker..."
        if command -v docker > /dev/null; then
            docker run -d -p 27017:27017 --name oauth2-mongodb mongo:7.0
            echo "MongoDB started via Docker"
        else
            echo "❌ Neither MongoDB nor Docker found. Please install one of them:"
            echo "   - macOS (Homebrew): brew install mongodb-community"
            echo "   - Ubuntu/Debian: sudo apt-get install mongodb"
            echo "   - Docker: Install Docker and run: docker run -d -p 27017:27017 --name mongodb mongo:7.0"
            exit 1
        fi
    fi
    
    # Wait for MongoDB to start
    echo "Waiting for MongoDB to start..."
    sleep 5
    
    # Verify MongoDB is running
    if ! check_port 27017; then
        echo "❌ Failed to start MongoDB. Please start it manually."
        exit 1
    fi
    
    echo "✅ MongoDB is running on port 27017"
fi

# Start OAuth2 server in background
echo "Starting OAuth2 server on port 8080..."
cd ../oauth2-openid-server

if check_port 8080; then
    echo "Port 8080 is already in use. Stopping existing process..."
    fuser -k 8080/tcp
    sleep 2
fi

# Start the Go server in background
go run main.go &
SERVER_PID=$!
echo "OAuth2 server started with PID: $SERVER_PID"

# Wait for server to start
echo "Waiting for OAuth2 server to start..."
sleep 5

# Check if server is running
if ! check_port 8080; then
    echo "Failed to start OAuth2 server"
    exit 1
fi

echo "OAuth2 server is running!"

# Initialize frontend client
echo "Creating frontend OAuth2 client..."
sleep 2

# Create a test admin user first
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "first_name": "Admin",
    "last_name": "User",
    "scopes": ["admin", "read", "write"],
    "active": true
  }' > /dev/null 2>&1

# Create the frontend client
curl -X POST http://localhost:8080/api/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Frontend Management UI",
    "description": "React frontend for OAuth2 server management",
    "redirect_uris": ["http://localhost:5173/callback"],
    "scopes": ["openid", "profile", "email", "admin"],
    "grant_types": ["authorization_code"]
  }' > /dev/null 2>&1

echo "Frontend client created!"

# Start frontend development server
echo "Starting frontend development server on port 5173..."
cd ../oauth2-openid-identi

if check_port 5173; then
    echo "Port 5173 is already in use. Stopping existing process..."
    fuser -k 5173/tcp
    sleep 2
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

echo ""
echo "🚀 Development environment is ready!"
echo ""
echo "Services running:"
echo "MongoDB:       localhost:27017"
echo "OAuth2 Server: http://localhost:8080"
echo "Frontend UI:   http://localhost:5173"
echo ""
echo "Test credentials:"
echo "Email:    admin@example.com"
echo "Password: admin123"
echo ""
echo "Press Ctrl+C to stop all servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $SERVER_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    
    # Optionally stop MongoDB (comment out if you want to keep it running)
    # if command -v brew > /dev/null && brew services list | grep mongodb-community | grep started > /dev/null; then
    #     echo "Stopping MongoDB..."
    #     brew services stop mongodb-community
    # fi
    
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait