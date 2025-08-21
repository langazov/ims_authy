# AutoDiscovery Module

This module provides OpenID Connect Discovery (autodiscovery) functionality for the OAuth2/OpenID Connect server.

## Features

- **Standard compliance**: Implements OpenID Connect Discovery 1.0 specification
- **Multi-tenant support**: Separate configurations for tenant-specific and legacy endpoints
- **Flexible configuration**: Builder pattern for easy configuration customization
- **HTTP/HTTPS detection**: Automatic scheme detection with X-Forwarded-Proto support
- **Comprehensive metadata**: All required and recommended OpenID Connect Discovery fields

## Usage

### Basic Handler Setup

```go
import "oauth2-openid-server/autodiscovery"

handler := autodiscovery.NewHandler()

// Legacy endpoint
router.HandleFunc("/.well-known/openid_configuration", handler.LegacyDiscoveryHandler).Methods("GET")

// Tenant-specific endpoint
tenantRouter.HandleFunc("/.well-known/openid_configuration", 
    handler.TenantDiscoveryHandler(middleware.GetTenantIDFromRequest)).Methods("GET")
```

### Configuration Builder

```go
// Legacy configuration
config := autodiscovery.NewConfigBuilder("https://example.com").Build()

// Tenant-specific configuration
tenantConfig := autodiscovery.NewConfigBuilder("https://example.com").
    WithTenant("tenant-id").
    Build()

// Write to HTTP response
config.WriteJSON(w)
```

## Endpoints

### Legacy Endpoint
- **URL**: `/.well-known/openid_configuration`
- **Issuer**: Base URL (e.g., `https://example.com`)
- **Endpoints**: Root-level OAuth endpoints

### Tenant-Specific Endpoint  
- **URL**: `/tenant/{tenantId}/.well-known/openid_configuration`
- **Issuer**: Tenant-specific URL (e.g., `https://example.com/tenant/tenant-123`)
- **Endpoints**: Tenant-specific OAuth endpoints

## Configuration Fields

The autodiscovery response includes:

- `issuer`: The OAuth2/OpenID issuer identifier
- `authorization_endpoint`: OAuth2 authorization endpoint
- `token_endpoint`: OAuth2 token endpoint  
- `userinfo_endpoint`: OpenID Connect UserInfo endpoint
- `jwks_uri`: JSON Web Key Set document location
- `scopes_supported`: Supported OAuth2 scopes
- `response_types_supported`: Supported OAuth2 response types
- `response_modes_supported`: Supported OAuth2 response modes
- `grant_types_supported`: Supported OAuth2 grant types
- `token_endpoint_auth_methods_supported`: Client authentication methods
- `code_challenge_methods_supported`: PKCE code challenge methods
- `subject_types_supported`: Subject identifier types
- `id_token_signing_alg_values_supported`: ID token signing algorithms
- `claims_supported`: Supported claims in ID tokens

## Testing

Run the module tests:

```bash
go test ./autodiscovery/
```

The test suite includes:
- Handler functionality tests
- Configuration builder tests  
- HTTP/HTTPS scheme detection tests
- X-Forwarded-Proto header support tests
- Integration compatibility tests