# IMS Angular Authentication Workspace

This workspace contains the IMS Authentication Library and a demo application showing how to integrate with your OAuth2 server.

## Projects

### 1. IMS Auth Library (`projects/ims-auth/`)

A comprehensive Angular authentication library that integrates with your OAuth2 server featuring:

- **Multi-tenant authentication** - Support for tenant-based authentication
- **Two-factor authentication** - Complete 2FA setup and verification
- **JWT token management** - Automatic token handling and storage
- **Route guards** - Protect routes with authentication and permission checks
- **HTTP interceptor** - Automatic token injection and error handling
- **Responsive components** - Ready-to-use login and 2FA setup components

#### Key Components:
- `IMSAuthService` - Core authentication service
- `IMSLoginComponent` - Login form with tenant and 2FA support
- `IMSTwoFactorSetupComponent` - Complete 2FA setup workflow
- `IMSAuthGuard` - Route protection guard
- `IMSAuthInterceptor` - HTTP request interceptor

### 2. Auth Demo App (`projects/auth-demo/`)

A demonstration application showing the authentication library in action:

- **Login page** - Multi-tenant login with 2FA support
- **Dashboard** - Protected area showing user information and permissions
- **2FA setup** - Interactive two-factor authentication setup
- **Access control** - Scope and group-based permission demos

## Quick Start

### Prerequisites

1. **OAuth2 Server Running**: Your server should be running on `https://oauth2.imsc.eu`
2. **Demo User**: Create a user with these credentials in your database:
   - Email: `demo@example.com`
   - Password: `password123`
   - Tenant: `default`

### Building and Running

```bash
# Install dependencies
npm install

# Build the authentication library
npm run build:lib

# Start the demo application
npm run start:demo
```

The demo will be available at `http://localhost:4200`.

## Server Integration

The library is configured to work with your OAuth2 server endpoints:

### Authentication Endpoints
- `POST /tenant/{tenantId}/login` - User login
- `POST /logout` - User logout

### Two-Factor Authentication Endpoints
- `POST /2fa/setup` - Initialize 2FA setup
- `POST /2fa/enable` - Enable 2FA with verification
- `POST /2fa/disable` - Disable 2FA
- `GET /2fa/status` - Check 2FA status
- `POST /2fa/verify` - Verify 2FA code

### Headers Required
- `Authorization: Bearer {token}` - For authenticated requests
- `X-Tenant-ID: {tenantId}` - For tenant-specific requests
- `Content-Type: application/json` - For JSON requests

## Library Usage

### 1. Install the Library

After building, you can use the library in your Angular applications:

```typescript
import { IMSAuthModule } from 'ims-auth';

@NgModule({
  imports: [
    IMSAuthModule.forRoot()
  ]
})
export class AppModule { }
```

### 2. Configure Authentication

```typescript
import { IMSAuthService } from 'ims-auth';

constructor(private authService: IMSAuthService) {
  // Configure the service
  this.authService.configure({
    serverUrl: 'https://oauth2.imsc.eu',
    tenantId: 'your-tenant-id'
  });
}
```

### 3. Use Components

```typescript
// Login component
<ims-login
  [showTenantField]="true"
  (loginSuccess)="onLoginSuccess($event)"
  (loginError)="onLoginError($event)">
</ims-login>

// Two-factor setup
<ims-two-factor-setup
  (setupComplete)="onSetupComplete($event)"
  (setupCancelled)="onSetupCancelled()">
</ims-two-factor-setup>
```

### 4. Protect Routes

```typescript
import { IMSAuthGuard } from 'ims-auth';

const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [IMSAuthGuard],
    data: { scopes: ['admin:read'] }
  }
];
```

## Development Scripts

```bash
# Library development
npm run build:lib          # Build the library
npm run watch:lib          # Build library in watch mode
npm run test:lib           # Test the library

# Demo application
npm run start:demo         # Start demo app
npm run build:demo         # Build demo app

# All projects
npm run build:all          # Build library and demo
npm run test               # Run all tests
```

## Authentication Flow

### Standard Login
1. User enters credentials (email, password, optional tenant)
2. Library sends POST to `/tenant/{tenantId}/login`
3. Server validates credentials
4. If 2FA required, server responds with `two_factor_required: true`
5. User enters 2FA code, library sends code with credentials
6. Server validates 2FA and returns tokens
7. Library stores tokens and user data

### Two-Factor Setup
1. User initiates 2FA setup
2. Library calls `/2fa/setup` to get QR code and secret
3. User scans QR code with authenticator app
4. User enters verification code
5. Library calls `/2fa/enable` with code
6. Server validates and returns backup codes
7. Setup complete

## Security Features

- **JWT Token Storage**: Secure token storage in localStorage
- **Automatic Token Injection**: HTTP interceptor adds tokens to requests
- **Token Expiry Handling**: Automatic logout on token expiry
- **Tenant Isolation**: Multi-tenant support with proper headers
- **CORS Support**: Configured for cross-origin requests
- **2FA Protection**: Time-based one-time password (TOTP) support

## Production Deployment

### Security Checklist
- [ ] Use HTTPS only
- [ ] Configure proper CORS on server
- [ ] Set secure token storage options
- [ ] Implement proper error handling
- [ ] Add request/response logging
- [ ] Configure CSP headers
- [ ] Validate all user inputs

### Server Requirements
- OAuth2/OpenID Connect server
- CORS enabled for your domain
- Proper error responses (401, 403, etc.)
- Rate limiting on authentication endpoints
- 2FA endpoint implementation

## License

This project is part of the IMS (Identity Management System) and is intended for integration with your OAuth2 authentication server.
