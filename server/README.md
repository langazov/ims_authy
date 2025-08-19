# OAuth2 OpenID Server

A comprehensive OAuth2/OpenID Connect server implementation in Go using MongoDB for storage.

## Features

- OAuth2 Authorization Code flow
- User management with bcrypt password hashing
- MongoDB integration for data persistence
- JWT access tokens with refresh token support
- RESTful API for user and client management
- Built-in authorization page
- Configurable via environment variables

## API Endpoints

### OAuth2 Endpoints
- `GET /oauth/authorize` - Authorization endpoint (shows login page)
- `POST /oauth/authorize` - Authorization submission
- `POST /oauth/token` - Token exchange endpoint

### User Management
- `POST /api/v1/users` - Create user
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/{id}` - Get specific user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### Group Management
- `POST /api/v1/groups` - Create group
- `GET /api/v1/groups` - List all groups
- `GET /api/v1/groups/{id}` - Get specific group
- `PUT /api/v1/groups/{id}` - Update group
- `DELETE /api/v1/groups/{id}` - Delete group
- `POST /api/v1/groups/{id}/members` - Add member to group
- `DELETE /api/v1/groups/{id}/members/{userId}` - Remove member from group
- `GET /api/v1/users/{userId}/groups` - Get user's groups

### OAuth2 Client Management
- `POST /api/v1/clients` - Create OAuth2 client
- `GET /api/v1/clients` - List all clients
- `GET /api/v1/clients/{id}` - Get specific client
- `PUT /api/v1/clients/{id}` - Update client
- `DELETE /api/v1/clients/{id}` - Delete client
- `PATCH /api/v1/clients/{id}/activate` - Activate client
- `PATCH /api/v1/clients/{id}/deactivate` - Deactivate client
- `POST /api/v1/clients/{id}/regenerate-secret` - Regenerate client secret

### Dashboard & Analytics
- `GET /api/v1/dashboard/stats` - Get dashboard statistics

### Authentication
- `POST /login` - User login endpoint

### Health Check
- `GET /health` - Health check endpoint

## Setup

### Option 1: Docker Compose (Recommended)

1. Clone the repository and navigate to the project directory

2. Set up environment variables:
```bash
cp .env.docker .env
# Edit .env with your configuration
```

3. Start the services:
```bash
docker-compose up -d
```

4. The services will be available at:
   - OAuth2 Server: https://oauth2.imsc.eu
   - MongoDB: localhost:27017
   - MongoDB Express (optional): https://authy.imsc.eu81

5. Default credentials:
   - Admin user: `admin@oauth2server.local` / `admin123`
   - Test OAuth2 client: `test-client-id` / `test-client-secret`
   - MongoDB Express: `admin` / `password123`

### Option 2: Local Development

1. Install dependencies:
```bash
go mod tidy
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start MongoDB (if running locally):
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

4. Run the server:
```bash
go run main.go
```

## Configuration

Environment variables:

- `PORT` - Server port (default: 8080)
- `MONGO_URI` - MongoDB connection URI (default: mongodb://localhost:27017)
- `DATABASE_NAME` - MongoDB database name (default: oauth2_server)
- `JWT_SECRET` - Secret key for JWT signing (required in production)
- `CLIENT_ID` - Default OAuth2 client ID
- `CLIENT_SECRET` - Default OAuth2 client secret
- `REDIRECT_URL` - Default redirect URL for OAuth2 flow
- `AUTH_SERVER_URL` - Authorization server URL
- `TOKEN_SERVER_URL` - Token server URL

## Usage Examples

### Create a User
```bash
curl -X POST https://oauth2.imsc.eu/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User",
    "groups": ["users"],
    "scopes": ["read", "write"]
  }'
```

### OAuth2 Authorization Flow

1. Direct user to authorization URL:
```
https://oauth2.imsc.eu/oauth/authorize?response_type=code&client_id=oauth2-client&redirect_uri=http://localhost:3000/callback&scope=read&state=xyz
```

2. User logs in and authorizes, gets redirected with code

3. Exchange code for tokens:
```bash
curl -X POST https://oauth2.imsc.eu/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTHORIZATION_CODE&client_id=oauth2-client&client_secret=oauth2-secret&redirect_uri=http://localhost:3000/callback"
```

## Integration with Frontend

This server is designed to work with the OAuth2 management dashboard frontend. The frontend can be found in the `../oauth2-openid-identi` directory.

To connect the frontend to this server:

1. Update the frontend's API configuration to point to this server
2. Ensure CORS is configured if running on different ports
3. Create appropriate OAuth2 clients using the API endpoints

## Docker Commands

### Basic Operations
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f oauth2-server
docker-compose logs -f mongodb

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Access MongoDB Express (database management UI)
docker-compose --profile tools up -d mongo-express
```

### Database Management
```bash
# Backup database
docker exec oauth2-mongodb mongodump --db oauth2_server --out /tmp/backup

# Restore database
docker exec oauth2-mongodb mongorestore /tmp/backup

# Connect to MongoDB shell
docker exec -it oauth2-mongodb mongosh oauth2_server
```

### Production Deployment
```bash
# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale the API server
docker-compose up -d --scale oauth2-server=3
```

## Security Considerations

- Always use HTTPS in production
- Change the default JWT secret and MongoDB passwords
- Implement rate limiting and CORS configuration
- Use strong passwords for client secrets and database access
- Regularly rotate secrets and tokens
- Run containers as non-root users (already configured)
- Use Docker secrets management in production