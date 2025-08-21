# OAuth2 Server Scripts

This directory contains utility scripts for managing the OAuth2 server.

## add-frontend-client.sh

Creates default OAuth clients in MongoDB for the OAuth2 server, including the `frontend-client` needed for social login and PKCE flows.

### Usage

```bash
./scripts/add-frontend-client.sh [OPTIONS]
```

### Options

- `-h, --host HOST` - MongoDB host (default: localhost)
- `-p, --port PORT` - MongoDB port (default: 27017)
- `-u, --user USER` - MongoDB username (default: admin)
- `-P, --password PASS` - MongoDB password (default: password123)
- `-d, --database DB` - Database name (default: oauth2_server)
- `-t, --tenant-id ID` - Tenant ID (optional, leave empty for default tenant)
- `-D, --domain DOMAIN` - Domain for redirect URIs (e.g., authy.imsc.eu)
- `--help` - Show help message

### Examples

**Basic usage with domain:**
```bash
./scripts/add-frontend-client.sh --domain authy.imsc.eu
```

**Custom MongoDB connection:**
```bash
./scripts/add-frontend-client.sh \
  --host mongodb.example.com \
  --user oauth2user \
  --password secret123 \
  --domain myapp.com
```

**For specific tenant:**
```bash
./scripts/add-frontend-client.sh \
  --tenant-id 64f1a2b3c4d5e6f7g8h9i0j1 \
  --domain myapp.com
```

**Using environment variables:**
```bash
# You can also use Docker Compose environment
docker-compose exec oauth2-server ./scripts/add-frontend-client.sh --domain authy.imsc.eu
```

### What it creates

The script creates two OAuth clients:

1. **Frontend Client** (`frontend-client`)
   - Purpose: Social login and PKCE flows
   - Client ID: `frontend-client`
   - Client Secret: `frontend-secret`
   - Scopes: `read`, `write`, `openid`, `profile`, `email`

2. **Test Client** (`test-client-id`)
   - Purpose: Development and testing
   - Client ID: `test-client-id`
   - Client Secret: `test-client-secret`
   - Scopes: `read`, `write`, `openid`, `profile`, `email`

### Redirect URIs

When you specify a domain with `--domain`, the script creates redirect URIs:
- `https://yourdomain.com/callback`
- `https://yourdomain.com/auth/callback`
- `http://localhost:3000/callback` (development fallback)

Without a domain, it uses default URIs:
- `http://localhost:3000/callback`
- `https://authy.imsc.eu/callback`
- `https://authy.imsc.eu/auth/callback`

### Notes

- The script checks for existing clients to avoid duplicates
- It works with both `mongosh` (MongoDB 5.0+) and legacy `mongo` client
- Safe to run multiple times - won't create duplicates
- Supports both multi-tenant and single-tenant setups