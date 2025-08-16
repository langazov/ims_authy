#!/bin/bash

echo "Creating frontend OAuth2 client..."

# Create the frontend client via API
curl -X POST http://localhost:8080/api/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Frontend Management UI",
    "description": "React frontend for OAuth2 server management",
    "redirect_uris": ["http://localhost:5173/callback"],
    "scopes": ["openid", "profile", "email", "admin"],
    "grant_types": ["authorization_code"]
  }'

echo -e "\n\nFrontend client created successfully!"
echo "Client ID: frontend-client"
echo "Redirect URI: http://localhost:5173/callback"