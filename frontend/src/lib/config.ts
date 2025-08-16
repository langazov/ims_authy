export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  oauth: {
    clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || 'frontend-client',
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || 'http://localhost:5173/callback',
    authUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth/authorize`,
    tokenUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth/token`,
    scope: 'openid profile email admin'
  }
} as const