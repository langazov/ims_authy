# Tenant API Changes - Well-Known OpenID Configuration URLs

## Overview

Tenant management API endpoints now include OpenID Connect Discovery URLs in their responses, making it easy to discover the autodiscovery endpoint for each tenant.

## Enhanced Response Format

All tenant-related API endpoints now return enhanced responses that include a `well_known_urls` object containing the tenant-specific OpenID Connect discovery endpoint.

### Before (Original Response)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Example Tenant",
  "domain": "example.com",
  "subdomain": "example",
  "active": true,
  "is_default": false,
  "settings": {
    "allow_user_registration": true,
    "require_two_factor": false,
    "session_timeout": 30,
    "custom_branding": {
      "logo_url": "",
      "company_name": "",
      "primary_color": "",
      "secondary_color": ""
    }
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### After (Enhanced Response)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Example Tenant",
  "domain": "example.com", 
  "subdomain": "example",
  "active": true,
  "is_default": false,
  "settings": {
    "allow_user_registration": true,
    "require_two_factor": false,
    "session_timeout": 30,
    "custom_branding": {
      "logo_url": "",
      "company_name": "",
      "primary_color": "",
      "secondary_color": ""
    }
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "well_known_urls": {
    "openid_configuration": "https://authy.imsc.eu/.well-known/507f1f77bcf86cd799439011/openid_configuration"
  }
}
```

## Affected Endpoints

The following tenant management endpoints now include the `well_known_urls` object:

### GET /api/v1/tenants
**Description**: List all tenants  
**Response**: Array of enhanced tenant objects with well-known URLs

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "Tenant 1",
    "domain": "tenant1.example.com",
    "subdomain": "tenant1",
    "active": true,
    "well_known_urls": {
      "openid_configuration": "https://authy.imsc.eu/.well-known/507f1f77bcf86cd799439011/openid_configuration"
    }
  },
  {
    "id": "507f1f77bcf86cd799439012", 
    "name": "Tenant 2",
    "domain": "tenant2.example.com",
    "subdomain": "tenant2",
    "active": true,
    "well_known_urls": {
      "openid_configuration": "https://authy.imsc.eu/.well-known/507f1f77bcf86cd799439012/openid_configuration"
    }
  }
]
```

### GET /api/v1/tenants/{id}
**Description**: Get a specific tenant  
**Response**: Enhanced tenant object with well-known URLs

### POST /api/v1/tenants
**Description**: Create a new tenant  
**Response**: Enhanced tenant object with well-known URLs for the newly created tenant

### PUT /api/v1/tenants/{id}
**Description**: Update a tenant  
**Response**: Enhanced tenant object with well-known URLs for the updated tenant

## Benefits

1. **Easy Discovery**: Clients can easily discover the OpenID Connect configuration endpoint for each tenant
2. **Reduced Manual URL Construction**: No need to manually build autodiscovery URLs
3. **Dynamic Host Support**: URLs are dynamically generated based on the request host (supports different environments)
4. **Protocol Detection**: Automatically detects HTTP vs HTTPS based on the request

## Usage Examples

### Frontend Integration
```javascript
// Fetch tenants and their autodiscovery URLs
const response = await fetch('/api/v1/tenants');
const tenants = await response.json();

// Use the well-known URL for each tenant
tenants.forEach(tenant => {
  console.log(`Tenant: ${tenant.name}`);
  console.log(`Autodiscovery URL: ${tenant.well_known_urls.openid_configuration}`);
  
  // Fetch OpenID Connect configuration for this tenant
  fetch(tenant.well_known_urls.openid_configuration)
    .then(res => res.json())
    .then(config => {
      console.log(`Authorization endpoint: ${config.authorization_endpoint}`);
      console.log(`Token endpoint: ${config.token_endpoint}`);
    });
});
```

### OpenID Connect Client Configuration
```javascript
// Configure OIDC client for a specific tenant
async function configureOIDCClient(tenantId) {
  const tenant = await fetch(`/api/v1/tenants/${tenantId}`).then(r => r.json());
  const oidcConfig = await fetch(tenant.well_known_urls.openid_configuration).then(r => r.json());
  
  return new OIDCClient({
    issuer: oidcConfig.issuer,
    authorization_endpoint: oidcConfig.authorization_endpoint,
    token_endpoint: oidcConfig.token_endpoint,
    userinfo_endpoint: oidcConfig.userinfo_endpoint,
    // ... other configuration
  });
}
```

## Implementation Details

- URLs are built dynamically based on the request's host and protocol
- Supports both HTTP and HTTPS environments
- Honors `X-Forwarded-Proto` header for proper protocol detection in proxy setups
- URLs follow the format: `{protocol}://{host}/.well-known/{tenantId}/openid_configuration`

## Backward Compatibility

This change is fully backward compatible:
- All existing tenant fields remain unchanged
- Only adds the new `well_known_urls` object to responses
- Existing clients will continue to work normally
- New clients can take advantage of the well-known URLs for easier integration