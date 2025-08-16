# OAuth2 + PKCE + OpenID Connect + Social Login Architecture

## System Overview
```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        A[Login Page] --> B[Auth Service]
        B --> C[OAuth Flow Handler]
        D[User Management] --> E[Admin Dashboard]
        F[Group Management] --> E
        G[Client Management] --> E
    end

    subgraph "Backend (Go Server)"
        H[Auth Handler] --> I[OAuth Service]
        I --> J[User Service]
        K[Social Auth Handler] --> L[Social Auth Service]
        M[JWT Token Service] --> N[Database Layer]
        J --> N
        L --> N
    end

    subgraph "External Services"
        O[Google OAuth]
        P[GitHub OAuth]
        Q[Facebook OAuth]
        R[Apple OAuth]
    end

    subgraph "Database"
        S[(MongoDB)]
        T[Users Collection]
        U[Groups Collection]
        V[Clients Collection]
        S --> T
        S --> U
        S --> V
    end

    A --> H
    C --> I
    K --> O
    K --> P
    K --> Q
    K --> R
    N --> S
```

## Authentication Flow

### 1. OAuth2 Authorization Code Flow with PKCE
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database

    U->>F: Click Login
    F->>F: Generate code_verifier & code_challenge
    F->>F: Store code_verifier in localStorage
    F->>B: GET /authorize?client_id=...&code_challenge=...
    B->>B: Validate client_id
    B->>U: Show authorization page with login form
    U->>B: POST /authorize (email/password)
    B->>DB: Validate user credentials
    DB-->>B: User data
    B->>B: Generate authorization code
    B->>F: Redirect with code & state
    F->>B: POST /token (code + code_verifier)
    B->>B: Verify PKCE challenge
    B->>B: Generate access_token & id_token
    B-->>F: Return tokens
    F->>F: Store tokens & parse user from id_token
```

### 2. Social Login Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Social Provider
    participant DB as Database

    U->>F: Click "Login with Google"
    F->>B: GET /auth/google/oauth
    B->>B: Generate state & store in cookie
    B->>S: Redirect to Google OAuth
    S->>U: Show Google consent screen
    U->>S: Approve permissions
    S->>B: Callback with authorization code
    B->>S: Exchange code for tokens
    S-->>B: Access token & user info
    B->>DB: Find or create user
    B->>B: Generate OAuth code for our system
    B->>F: Redirect with our OAuth code
    F->>B: Exchange for our tokens (PKCE flow)
    B-->>F: Return access_token & id_token
```

## User Management System

### 3. User Lifecycle Management
```mermaid
graph LR
    subgraph "User Creation"
        A[Admin Creates User] --> B[Set Credentials]
        B --> C[Assign Groups]
        C --> D[Set Scopes]
        D --> E[Activate Account]
    end

    subgraph "Social User Creation"
        F[Social Login] --> G[Extract User Info]
        G --> H[Create/Update User]
        H --> I[Auto-assign Default Groups]
        I --> J[Set Social Scopes]
    end

    subgraph "User States"
        K[Active] --> L[Can Login]
        M[Inactive] --> N[Login Blocked]
        O[External] --> P[Social Login Only]
    end

    E --> K
    J --> O
```

### 4. Permission & Group Management
```mermaid
graph TB
    subgraph "Permission System"
        A[User] --> B[Groups]
        B --> C[Group Scopes]
        A --> D[Direct Scopes]
        C --> E[Effective Permissions]
        D --> E
    end

    subgraph "Available Scopes"
        F[read] --> G[Basic Read Access]
        H[write] --> I[Modify Resources]
        J[admin] --> K[Full Admin Access]
        L[openid] --> M[OpenID Connect]
        N[profile] --> O[Profile Information]
        P[email] --> Q[Email Access]
    end

    E --> F
    E --> H
    E --> J
    E --> L
    E --> N
    E --> P
```

## Frontend Architecture

### 5. React Component Structure
```mermaid
graph TB
    subgraph "App Structure"
        A[App.tsx] --> B[AuthProvider]
        B --> C[AuthenticatedApp]
        B --> D[LoginCallback]
        B --> E[Login Page]
    end

    subgraph "Management Components"
        C --> F[Dashboard]
        C --> G[UserManagement]
        C --> H[GroupManagement]
        C --> I[ClientManagement]
    end

    subgraph "Form Components"
        G --> J[UserForm]
        H --> K[GroupForm]
        I --> L[ClientForm]
    end

    subgraph "Auth Context"
        M[useAuth Hook] --> N[AuthService]
        N --> O[PKCE Implementation]
        N --> P[Token Management]
        N --> Q[API Requests]
    end

    B --> M
```

### 6. State Management & Security
```mermaid
graph LR
    subgraph "Frontend Security"
        A[localStorage] --> B[Encrypted Tokens]
        B --> C[Token Expiry Check]
        C --> D[Auto Logout]
        E[PKCE Code Verifier] --> F[SHA256 Challenge]
        F --> G[Secure Code Exchange]
    end

    subgraph "State Safety"
        H[Null Safety Patterns] --> I[safeUsers = users || []]
        I --> J[Prevent Runtime Errors]
        K[Loading States] --> L[Spinner Components]
        M[Error Handling] --> N[Toast Notifications]
    end
```

## Key Security Features

### 7. Security Implementation
```mermaid
graph TB
    subgraph "Backend Security"
        A[PKCE Verification] --> B[SHA256 Challenge]
        C[State Parameter] --> D[CSRF Protection]
        E[JWT Validation] --> F[Token Signatures]
        G[CORS Configuration] --> H[Cross-Origin Security]
    end

    subgraph "Social Auth Security"
        I[Provider State Validation] --> J[Cookie-based State]
        K[Token Exchange] --> L[Secure Provider Communication]
        M[User Mapping] --> N[Consistent Identity]
    end

    subgraph "Database Security"
        O[Password Hashing] --> P[bcrypt]
        Q[User Validation] --> R[Active Status Check]
        S[Group Permissions] --> T[Scope Inheritance]
    end
```

## Supported Social Providers

### 8. Social Login Configuration
```mermaid
graph LR
    subgraph "Google OAuth"
        A[client_id] --> B[oauth2.googleapis.com]
        B --> C[profile + email scopes]
    end

    subgraph "GitHub OAuth"
        D[client_id] --> E[github.com/login/oauth]
        E --> F[user:email scope]
    end

    subgraph "Facebook OAuth"
        G[app_id] --> H[facebook.com/oauth]
        H --> I[email + public_profile]
    end

    subgraph "Apple OAuth"
        J[services_id] --> K[appleid.apple.com]
        K --> L[name + email scopes]
    end
```

## API Endpoints

### 9. Backend API Structure
```mermaid
graph TB
    subgraph "Auth Endpoints"
        A[GET /authorize] --> B[Authorization Page]
        C[POST /authorize] --> D[Generate Auth Code]
        E[POST /token] --> F[Exchange for Tokens]
        G[POST /login] --> H[Direct Login]
    end

    subgraph "Social Auth Endpoints"
        I[GET /auth/{provider}/oauth] --> J[Provider Redirect]
        K[GET /auth/{provider}/callback] --> L[Handle Provider Response]
    end

    subgraph "Management Endpoints"
        M[GET /api/users] --> N[List Users]
        O[POST /api/users] --> P[Create User]
        Q[GET /api/groups] --> R[List Groups]
        S[GET /api/clients] --> T[List OAuth Clients]
    end

    subgraph "Dashboard Endpoints"
        U[GET /api/dashboard/stats] --> V[System Statistics]
        W[GET /api/dashboard/activity] --> X[Recent Activity]
    end
```

This comprehensive architecture supports:
- **OAuth2 Authorization Code Flow with PKCE** for secure authentication
- **Social login federation** with Google, GitHub, Facebook, and Apple
- **OpenID Connect** with ID tokens containing user information
- **Comprehensive user management** with groups, scopes, and permissions
- **Modern React frontend** with TypeScript and null safety
- **Production-ready security** with proper token handling and validation