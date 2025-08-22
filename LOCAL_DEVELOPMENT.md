# Local Development Setup

This guide explains how to run the OAuth2 server and frontend locally using Docker with custom hostnames, supporting both HTTP and HTTPS configurations.

## Prerequisites

1. Docker and Docker Compose installed
2. Add the following entries to your `/etc/hosts` file:
   ```
   127.0.0.1    authy.docker.local
   127.0.0.1    oauth2.docker.local
   ```

## Quick Start

### Option 1: HTTP Development (Simple)

Run the following command to start the local development environment with HTTP:

```bash
./start-local-development.sh
```

This will start:
- **Frontend**: Available at `http://authy.docker.local`
- **OAuth2 Server**: Available at `http://oauth2.docker.local:8080`
- **MongoDB**: Internal service (port 27017)
- **MongoDB Express**: Available at `http://localhost:8081` (optional, use profile `tools`)

### Option 2: HTTPS Development (Recommended)

For a production-like environment with SSL certificates:

```bash
./start-ssl-development.sh
```

This will start:
- **Frontend**: Available at `https://authy.docker.local` (HTTP redirects to HTTPS)
- **OAuth2 Server**: Available at `https://oauth2.docker.local:8443` (also available on HTTP port 8080)
- **MongoDB**: Internal service (port 27017)
- **MongoDB Express**: Available at `http://localhost:8081` (optional, use profile `tools`)

#### SSL Certificate Trust

To avoid browser security warnings, trust the generated CA certificate:

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./certs/ca-cert.pem
```

**Linux:**
```bash
sudo cp ./certs/ca-cert.pem /usr/local/share/ca-certificates/local-ca.crt
sudo update-ca-certificates
```

**Windows:**
Import `certs/ca-cert.pem` into the "Trusted Root Certification Authorities" store.

## Manual Setup

If you prefer to run commands manually:

### HTTP Development
```bash
# Start services
docker-compose -f docker-compose.development.yml --env-file .env.development up -d

# View logs
docker-compose -f docker-compose.development.yml logs -f

# Stop services
docker-compose -f docker-compose.development.yml down
```

### HTTPS Development
```bash
# Generate SSL certificates (if not already done)
./scripts/generate-ssl-certs.sh

# Start services with SSL
docker-compose -f docker-compose.ssl.yml --env-file .env.ssl up -d

# View logs
docker-compose -f docker-compose.ssl.yml logs -f

# Stop services
docker-compose -f docker-compose.ssl.yml down
```

## Configuration Files

### HTTP Development
- `.env.development` - Environment variables for HTTP local development
- `docker-compose.development.yml` - Docker Compose configuration for HTTP

### HTTPS Development
- `.env.ssl` - Environment variables for HTTPS local development
- `docker-compose.ssl.yml` - Docker Compose configuration with SSL support
- `frontend/nginx-ssl.conf` - HTTPS-enabled nginx configuration
- `frontend/Dockerfile.ssl` - SSL-enabled frontend Docker image

### SSL Certificates
- `certs/ca-cert.pem` - Certificate Authority certificate
- `certs/ca-key.pem` - Certificate Authority private key
- `certs/server-cert.pem` - Server certificate (valid for *.docker.local)
- `certs/server-key.pem` - Server private key
- `scripts/generate-ssl-certs.sh` - Script to generate SSL certificates

### Production (Unchanged)
- `.env.example` - Template for production environment variables
- `docker-compose.yml` - Production Docker Compose configuration

## Production vs Development

### Production Configuration
- Uses `https://oauth2.imsc.eu` for API base URL
- Uses `https://authy.imsc.eu` for frontend
- Configured in `frontend/src/lib/config.ts` with production defaults

### Development Configuration
- Uses `http://oauth2.docker.local:8080` for API base URL
- Uses `http://authy.docker.local` for frontend
- Environment variables override production defaults

## Social Login Configuration

Update the social login provider URLs with your development credentials:

### HTTP Development (.env.development)
- Google OAuth: `http://oauth2.docker.local:8080/auth/google/callback`
- GitHub OAuth: `http://oauth2.docker.local:8080/auth/github/callback`
- Facebook OAuth: `http://oauth2.docker.local:8080/auth/facebook/callback`
- Apple Sign In: `http://oauth2.docker.local:8080/auth/apple/callback`

### HTTPS Development (.env.ssl)
- Google OAuth: `https://oauth2.docker.local:8443/auth/google/callback`
- GitHub OAuth: `https://oauth2.docker.local:8443/auth/github/callback`
- Facebook OAuth: `https://oauth2.docker.local:8443/auth/facebook/callback`
- Apple Sign In: `https://oauth2.docker.local:8443/auth/apple/callback`

## Troubleshooting

1. **Cannot access authy.docker.local**: Ensure `/etc/hosts` entries are added
2. **Services not starting**: Check Docker daemon is running
3. **Port conflicts**: Ensure ports 80, 8080, 27017, 8081 are available
4. **Database issues**: Remove volumes with `docker-compose -f docker-compose.development.yml down -v`

## Network Architecture

The development setup uses a Docker bridge network with:
- Container aliases for internal communication
- Host aliases for external access
- Extra hosts configuration for cross-container communication