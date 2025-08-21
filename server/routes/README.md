# Routes Module

This module provides centralized route management for the OAuth2/OpenID Connect server, organizing all HTTP endpoints in a clean, maintainable structure.

## Features

- **Modular organization**: Routes are grouped by functionality (setup, API, tenant-specific, legacy)
- **Dependency injection**: Clean separation of dependencies through a structured Dependencies type
- **Maintainability**: Easy to add, modify, or remove routes
- **Testing**: Comprehensive test coverage for route setup
- **Documentation**: Clear organization and inline documentation

## Architecture

### Dependencies Structure

The `Dependencies` struct contains all services and handlers needed for route setup:

```go
type Dependencies struct {
    // Services
    TenantService     *services.TenantService
    UserService       *services.UserService
    GroupService      *services.GroupService
    // ... other services

    // Handlers  
    AuthHandler       *handlers.AuthHandler
    TenantHandler     *handlers.TenantHandler
    UserHandler       *handlers.UserHandler
    // ... other handlers
}
```

### Route Groups

Routes are organized into logical groups:

1. **Setup Routes** (`/api/setup/*`)
   - Initial application setup endpoints
   - No middleware required
   - Available during bootstrap

2. **API Routes** (`/api/v1/*`)
   - Core API endpoints with tenant middleware
   - User, tenant, client, scope management
   - Two-factor authentication
   - Dashboard statistics

3. **Tenant Routes** (`/tenant/{tenantId}/*`)
   - Tenant-specific OAuth and social auth endpoints
   - Tenant-scoped login and registration
   - Tenant autodiscovery

4. **Legacy Routes**
   - Backward compatibility endpoints
   - Root-level OAuth and auth endpoints
   - Legacy autodiscovery

## Usage

### Basic Setup

```go
import "oauth2-openid-server/routes"

// Create dependencies
deps := &routes.Dependencies{
    TenantService: tenantService,
    UserService: userService,
    // ... other dependencies
    AuthHandler: authHandler,
    UserHandler: userHandler,
    // ... other handlers
}

// Setup all routes
router := routes.SetupRoutes(deps)

// Start server
http.ListenAndServe(":8080", middleware.CorsMiddleware(router))
```

### Adding New Routes

To add new routes, follow these steps:

1. **Add to Dependencies** (if new handler/service needed):
```go
type Dependencies struct {
    // ... existing fields
    NewHandler *handlers.NewHandler
}
```

2. **Create route setup function**:
```go
func setupNewRoutes(api *mux.Router, deps *Dependencies) {
    api.HandleFunc("/new/endpoint", deps.NewHandler.HandleRequest).Methods("GET")
}
```

3. **Call from main setup function**:
```go
func setupAPIRoutes(router *mux.Router, deps *Dependencies) {
    api := router.PathPrefix("/api/v1").Subrouter()
    api.Use(middleware.TenantMiddleware(deps.TenantService))
    
    // ... existing route setups
    setupNewRoutes(api, deps)
}
```

## Route Categories

### Setup Routes
- `GET /api/setup/status` - Check setup status
- `POST /api/setup/validate-token` - Validate setup token
- `POST /api/setup/complete` - Complete initial setup

### API v1 Routes (with tenant middleware)

#### Tenant Management
- `POST /api/v1/tenants` - Create tenant
- `GET /api/v1/tenants` - List tenants
- `GET /api/v1/tenants/{id}` - Get tenant
- `PUT /api/v1/tenants/{id}` - Update tenant
- `DELETE /api/v1/tenants/{id}` - Delete tenant

#### User Management
- `POST /api/v1/users` - Create user
- `GET /api/v1/users` - List users  
- `GET /api/v1/users/me` - Get current user
- `GET /api/v1/users/{id}` - Get user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user
- `POST /api/v1/register` - Register new user

#### Group Management
- `POST /api/v1/groups` - Create group
- `GET /api/v1/groups` - List groups
- `GET /api/v1/groups/{id}` - Get group
- `PUT /api/v1/groups/{id}` - Update group
- `DELETE /api/v1/groups/{id}` - Delete group
- `POST /api/v1/groups/{id}/members` - Add member
- `DELETE /api/v1/groups/{id}/members/{userId}` - Remove member
- `GET /api/v1/users/{userId}/groups` - Get user groups

#### OAuth Client Management
- `POST /api/v1/clients` - Create client
- `GET /api/v1/clients` - List clients
- `GET /api/v1/clients/{id}` - Get client
- `PUT /api/v1/clients/{id}` - Update client
- `DELETE /api/v1/clients/{id}` - Delete client
- `PATCH /api/v1/clients/{id}/activate` - Activate client
- `PATCH /api/v1/clients/{id}/deactivate` - Deactivate client
- `POST /api/v1/clients/{id}/regenerate-secret` - Regenerate secret

#### Two-Factor Authentication
- `POST /api/v1/2fa/setup` - Setup 2FA
- `POST /api/v1/2fa/enable` - Enable 2FA
- `POST /api/v1/2fa/disable` - Disable 2FA
- `POST /api/v1/2fa/verify` - Verify 2FA code
- `POST /api/v1/2fa/verify-session` - Verify 2FA session
- `GET /api/v1/2fa/status` - Get 2FA status

### Tenant-Specific Routes

#### OAuth Endpoints
- `GET /tenant/{tenantId}/oauth` - OAuth server info
- `GET,POST /tenant/{tenantId}/oauth/authorize` - Authorization endpoint
- `POST /tenant/{tenantId}/oauth/token` - Token endpoint

#### Social Authentication  
- `GET /tenant/{tenantId}/auth` - Social auth info
- `GET /tenant/{tenantId}/auth/providers` - List providers
- `GET /tenant/{tenantId}/auth/{provider}/login` - Initiate social login
- `GET /tenant/{tenantId}/auth/{provider}/callback` - Handle callback

#### Other
- `POST /tenant/{tenantId}/login` - Direct login
- `POST /tenant/{tenantId}/register` - Registration
- `GET /tenant/{tenantId}/.well-known/openid_configuration` - Autodiscovery

### Legacy Routes (Backward Compatibility)

- `GET,POST /oauth/authorize` - Legacy authorization
- `POST /oauth/token` - Legacy token endpoint
- `GET /auth/providers` - Legacy social providers
- `GET /.well-known/openid_configuration` - Legacy autodiscovery
- `POST /login` - Legacy direct login

### Utility Routes
- `GET /health` - Health check endpoint

## Testing

Run the test suite:

```bash
go test ./routes/
```

The test suite covers:
- Route setup verification
- Health endpoint functionality  
- Autodiscovery endpoint functionality
- Individual route setup functions

## Benefits of This Architecture

1. **Separation of Concerns**: Route setup is separated from business logic
2. **Maintainability**: Easy to find and modify specific routes
3. **Testability**: Routes can be tested in isolation
4. **Scalability**: Easy to add new route groups
5. **Documentation**: Clear organization makes the API structure obvious
6. **Dependency Management**: Clean dependency injection pattern