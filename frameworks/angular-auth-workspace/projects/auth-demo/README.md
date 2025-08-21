# IMS Authentication Demo

This is a demonstration application showing how to use the IMS Angular Authentication Library with your OAuth2 server.

## Features

- **Login with tenant support** - Authenticate users against your multi-tenant OAuth2 server
- **Two-factor authentication** - Setup and manage 2FA for enhanced security
- **Token-based authentication** - Automatic token handling and refresh
- **Route protection** - Protect routes with authentication guards
- **Permission-based access** - Check user scopes and groups
- **Responsive design** - Works on desktop and mobile devices

## Server Integration

The demo is configured to work with your OAuth2 server running on `https://oauth2.imsc.eu`. The following endpoints are used:

- `POST /tenant/{tenantId}/login` - User authentication
- `POST /2fa/setup` - Initialize 2FA setup
- `POST /2fa/enable` - Enable 2FA with verification code
- `GET /2fa/status` - Check 2FA status
- `POST /2fa/verify` - Verify 2FA code

## Authentication Flow

1. **Login Page** - Users enter email, password, and optionally tenant ID
2. **Two-Factor Challenge** - If 2FA is enabled, users must provide a TOTP code
3. **Dashboard** - Protected area showing user information and permissions
4. **2FA Setup** - Users can enable two-factor authentication

## Demo Credentials

The demo includes sample credentials for testing:

- **Email:** demo@example.com
- **Password:** password123
- **Tenant:** default

*Note: These credentials need to exist in your server's database.*

## Library Usage

The demo shows how to:

### 1. Configure the Authentication Service

\`\`\`typescript
// Configure the auth service with your server URL
this.authService.configure({
  serverUrl: 'https://oauth2.imsc.eu',
  tenantId: 'default'
});
\`\`\`

### 2. Use the Login Component

\`\`\`typescript
<ims-login
  title="Demo Login"
  subtitle="Sign in to test the authentication"
  [showTenantField]="true"
  [showAdditionalActions]="true"
  defaultTenant="default"
  (loginSuccess)="onLoginSuccess($event)"
  (loginError)="onLoginError($event)">
</ims-login>
\`\`\`

### 3. Protect Routes

\`\`\`typescript
const routes: Routes = [
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [IMSAuthGuard]
  }
];
\`\`\`

### 4. Check User Permissions

\`\`\`typescript
// Check if user has specific scope
if (this.authService.hasScope('admin:read')) {
  // Allow admin access
}

// Check if user belongs to group
if (this.authService.hasGroup('administrators')) {
  // Allow group-based access
}
\`\`\`

### 5. Setup Two-Factor Authentication

\`\`\`typescript
<ims-two-factor-setup
  (setupComplete)="onTwoFactorComplete($event)"
  (setupCancelled)="onTwoFactorCancelled()">
</ims-two-factor-setup>
\`\`\`

## Building and Running

### Prerequisites

1. Your OAuth2 server must be running on `https://oauth2.imsc.eu`
2. Create a demo user in your database with the credentials above
3. Node.js and npm installed

### Running the Demo

\`\`\`bash
# Build the library
npm run build:lib

# Start the demo application
npm run start:demo
\`\`\`

The demo will be available at `http://localhost:4200`.

## Library Components

### IMSAuthService

Core service for authentication operations:
- `login(credentials)` - Authenticate user
- `logout()` - Sign out user
- `setup2FA()` - Initialize 2FA setup
- `enable2FA(code)` - Enable 2FA
- `getCurrentUser()` - Get current user info
- `hasScope(scope)` - Check user scope
- `hasGroup(group)` - Check user group

### IMSAuthGuard

Route guard for protecting authenticated routes:
- Redirects unauthenticated users to login
- Supports scope and group-based protection

### IMSLoginComponent

Ready-to-use login form with:
- Email/password authentication
- Tenant selection
- Two-factor code input
- Responsive design

### IMSTwoFactorSetupComponent

Complete 2FA setup workflow:
- QR code generation
- Manual secret key entry
- Code verification
- Backup codes generation

## Security Features

- **JWT token handling** - Automatic token storage and transmission
- **HTTP interceptor** - Adds auth headers to API calls
- **Token validation** - Automatic logout on token expiry
- **Tenant isolation** - Multi-tenant support with tenant headers
- **Two-factor authentication** - TOTP-based 2FA support
- **Backup codes** - Emergency access codes

## Customization

The library components are highly customizable:

- **Styling** - Override CSS classes for custom branding
- **Configuration** - Flexible server URL and tenant configuration
- **Events** - React to authentication events
- **Guards** - Create custom permission guards
- **Interceptors** - Add custom HTTP interceptors

## Production Considerations

When using this library in production:

1. **HTTPS only** - Always use HTTPS in production
2. **Token security** - Consider token storage options
3. **CORS configuration** - Ensure proper CORS setup
4. **Error handling** - Implement comprehensive error handling
5. **Monitoring** - Add authentication monitoring and logging

## Support

For issues with the IMS Authentication Library, please check:

1. Server logs for authentication errors
2. Browser console for client-side errors
3. Network tab for HTTP request/response details
4. Server configuration for CORS and endpoints

## License

This demo application is provided as an example implementation of the IMS Authentication Library.
