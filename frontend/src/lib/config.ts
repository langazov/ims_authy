export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  oauth: {
    clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || 'frontend-client',
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || 'http://localhost:80/callback',
    authUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth/authorize`,
    tokenUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/oauth/token`,
    scope: 'openid profile email admin'
  },
  social: {
    google: {
      enabled: import.meta.env.VITE_GOOGLE_ENABLED === 'true' || true,
      name: 'Google'
    },
    github: {
      enabled: import.meta.env.VITE_GITHUB_ENABLED === 'true' || true,
      name: 'GitHub'
    },
    facebook: {
      enabled: import.meta.env.VITE_FACEBOOK_ENABLED === 'true' || true,
      name: 'Facebook'
    },
    apple: {
      enabled: import.meta.env.VITE_APPLE_ENABLED === 'true' || true,
      name: 'Apple'
    }
  }
} as const