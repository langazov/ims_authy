#!/bin/bash

# Start local development environment with Docker hostnames
# This script uses the development environment configuration

echo "Starting OAuth2 Server for local development..."
echo "Frontend will be available at: http://authy.docker.local"
echo "OAuth2 Server will be available at: http://oauth2.docker.local:8080"
echo ""
echo "Make sure to add these entries to your /etc/hosts file:"
echo "127.0.0.1    authy.docker.local"
echo "127.0.0.1    oauth2.docker.local"
echo ""

# Use the development environment file and docker-compose configuration
docker-compose -f docker-compose.development.yml --env-file .env.development up -d

echo ""
echo "Services starting... You can check the status with:"
echo "docker-compose -f docker-compose.development.yml ps"
echo ""
echo "To view logs:"
echo "docker-compose -f docker-compose.development.yml logs -f"
echo ""
echo "To stop the services:"
echo "docker-compose -f docker-compose.development.yml down"