# OAuth2 Frontend Integration

This document describes the integration between the React frontend and the OAuth2 OpenID server.

## Architecture

The integration implements OAuth2 Authorization Code flow with PKCE (Proof Key for Code Exchange) for secure authentication.

### Components Added

1. **Authentication Service** (`src/lib/auth.ts`)
   - Handles OAuth2 PKCE flow
   - Manages tokens in localStorage
   - Provides authenticated API requests

2. **Authentication Context** (`src/contexts/AuthContext.tsx`)
   - React context for auth state management
   - Provides hooks for login/logout
   - Handles callback processing

3. **API Client** (`src/lib/api.ts`)
   - Centralized API communication
   - Automatic token attachment
   - Typed endpoints for all backend services

4. **Configuration** (`src/lib/config.ts`, `.env`)
   - Environment-based configuration
   - OAuth2 client settings
   - API endpoints

### New Components

- **LoginPage** - OAuth2 login initiation
- **CallbackPage** - OAuth2 callback handling
- **AuthenticatedApp** - Main app with user info and logout

## Setup Instructions

### 1. MongoDB Setup (Optional)

The development script will automatically start MongoDB using one of these methods:

**Option A: Docker Compose (Recommended)**
```bash
# MongoDB will start automatically with docker-compose.yml
docker-compose up -d mongodb
```

**Option B: Native Installation**
```bash
# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo service mongod start

# Docker (manual)
docker run -d -p 27017:27017 --name oauth2-mongodb mongo:7.0
```

### 2. Start Development Environment

```bash
# From the frontend directory
./start-development.sh
```

This script will:
- Start MongoDB (automatically detects installation method)
- Start the OAuth2 server on port 8080
- Create a test admin user
- Create the frontend OAuth2 client
- Start the React dev server on port 5173

### 2. Access the Application

- Frontend: http://localhost:5173
- OAuth2 Server: http://localhost:8080
- MongoDB: localhost:27017

### 3. Test Credentials

- **Email:** admin@example.com
- **Password:** admin123

## Authentication Flow

1. User clicks "Sign In with OAuth2"
2. Frontend generates PKCE code verifier/challenge
3. User redirected to OAuth2 server authorization page
4. User enters credentials on OAuth2 server
5. OAuth2 server redirects back with authorization code
6. Frontend exchanges code for tokens using PKCE
7. Tokens stored in localStorage
8. API requests include Bearer token

## Environment Variables

Create `.env` file with:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_OAUTH_CLIENT_ID=frontend-client
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/callback
```

## Security Features

- **PKCE Flow**: Protects against authorization code interception
- **State Parameter**: Prevents CSRF attacks
- **Token Storage**: Uses localStorage with expiration checks
- **Automatic Logout**: On token expiration or API failures

## API Integration

All existing components now use the authenticated API client:

- **Dashboard**: Fetches real user/group/client counts
- **UserManagement**: CRUD operations for users
- **GroupManagement**: Group management with API
- **ClientManagement**: OAuth2 client management

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure OAuth2 server allows frontend origin
2. **Token Expiration**: Automatic logout should handle this
3. **Network Errors**: Check both servers are running

### Development Tips

- Check browser console for auth errors
- Verify `.env` configuration
- Ensure OAuth2 server has frontend client registered
- Test with fresh localStorage (clear tokens)

## Production Considerations

1. **HTTPS**: Use HTTPS for both frontend and OAuth2 server
2. **Environment Variables**: Use production values
3. **Token Security**: Consider shorter expiration times
4. **Error Handling**: Add comprehensive error boundaries
5. **Monitoring**: Add authentication metrics

## Next Steps

- [ ] Add refresh token rotation
- [ ] Implement session management
- [ ] Add comprehensive error handling
- [ ] Create user onboarding flow
- [ ] Add audit logging
- [ ] Implement role-based access control