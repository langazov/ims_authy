#!/bin/bash
set -e

echo "🔍 Checking OAuth2 Development Services Status"
echo "=============================================="

# Function to check if a port is in use
check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        echo "✅ Port $1 is in use"
        return 0
    else
        echo "❌ Port $1 is not in use"
        return 1
    fi
}

# Function to check if MongoDB is running
check_mongodb() {
    if pgrep mongod > /dev/null 2>&1; then
        echo "✅ MongoDB process is running"
        return 0
    else
        echo "❌ MongoDB process is not running"
        return 1
    fi
}

echo ""
echo "📊 Service Status:"
echo ""

# Check MongoDB
echo "MongoDB (Port 27017):"
if check_port 27017; then
    echo "   Database is accessible"
else
    check_mongodb
fi

echo ""

# Check OAuth2 Server
echo "OAuth2 Server (Port 8080):"
check_port 8080
if [ $? -eq 0 ]; then
    echo "   Testing health endpoint..."
    if curl -s http://localhost:8080/health > /dev/null; then
        echo "   ✅ Health check passed"
    else
        echo "   ⚠️  Health check failed"
    fi
fi

echo ""

# Check Frontend
echo "Frontend (Port 5173):"
check_port 5173
if [ $? -eq 0 ]; then
    echo "   ✅ Frontend development server is running"
fi

echo ""
echo "💡 Tips:"
echo "   - Start all services: ./start-development.sh"
echo "   - MongoDB only: docker-compose up -d mongodb"
echo "   - View logs: docker-compose logs -f mongodb"