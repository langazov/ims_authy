#!/bin/bash

# Start local development environment with SSL and Docker hostnames
# This script uses the SSL environment configuration

echo "Starting OAuth2 Server for local development with SSL..."
echo "Frontend will be available at: https://authy.docker.local"
echo "OAuth2 Server will be available at: https://oauth2.docker.local:8443"
echo ""

# Check if certificates exist
if [ ! -f "./certs/server-cert.pem" ] || [ ! -f "./certs/server-key.pem" ]; then
    echo "SSL certificates not found. Generating them now..."
    ./scripts/generate-ssl-certs.sh
    echo ""
fi

echo "Make sure to add these entries to your /etc/hosts file:"
echo "127.0.0.1    authy.docker.local"
echo "127.0.0.1    oauth2.docker.local"
echo ""
echo "To trust the SSL certificates in your browser, run:"
echo "sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./certs/ca-cert.pem"
echo ""

# Use the SSL environment file and docker-compose configuration
docker-compose -f docker-compose.ssl.yml --env-file .env.ssl up -d

echo ""
echo "Services starting... You can check the status with:"
echo "docker-compose -f docker-compose.ssl.yml ps"
echo ""
echo "To view logs:"
echo "docker-compose -f docker-compose.ssl.yml logs -f"
echo ""
echo "To stop the services:"
echo "docker-compose -f docker-compose.ssl.yml down"
echo ""
echo "Access URLs:"
echo "- Frontend (HTTPS): https://authy.docker.local"
echo "- Frontend (HTTP redirect): http://authy.docker.local"
echo "- OAuth2 Server (HTTPS): https://oauth2.docker.local:8443"
echo "- OAuth2 Server (HTTP): http://oauth2.docker.local:8080"
echo "- MongoDB Express: http://localhost:8081"