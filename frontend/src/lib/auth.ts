import { config } from './config'
import { TenantUrlBuilder } from './tenantUrls'

export interface User {
  id: string
  email: string
  scopes: string[]
  groups: string[]
  tenant_id?: string
  two_factor_verified?: boolean
}

export interface AuthTokens {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  id_token?: string
  stored_at?: number
}

class AuthService {
  private readonly STORAGE_KEY = 'auth_tokens'
  private readonly CODE_VERIFIER_KEY = 'code_verifier'

  // Note: getActiveTenantId method removed - no longer using activeTenantId in login flows

  generateCodeVerifier(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  async startLogin(tenantId?: string): Promise<void> {
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    const state = crypto.randomUUID()

    localStorage.setItem(this.CODE_VERIFIER_KEY, codeVerifier)
    localStorage.setItem('oauth_state', state)

    // Use provided tenantId or get from localStorage
    const activeTenantId = tenantId || localStorage.getItem('activeTenantId')

    console.info('[auth] startLogin', { 
      clientId: config.oauth.clientId, 
      redirectUri: config.oauth.redirectUri, 
      scope: config.oauth.scope, 
      state, 
      tenantId: activeTenantId 
    })

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri,
      scope: config.oauth.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    // Use tenant-specific URL if a tenant is selected, otherwise use legacy URL
    const authUrl = activeTenantId 
      ? TenantUrlBuilder.buildOAuthAuthorizeUrl(activeTenantId, params)
      : TenantUrlBuilder.buildLegacyOAuthAuthorizeUrl(params)

    console.info('[auth] redirecting to OAuth provider', { authUrl, tenantId: activeTenantId })
    window.location.href = authUrl
  }

  async startSocialLogin(provider: 'google' | 'github' | 'facebook' | 'apple', tenantId?: string): Promise<void> {
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    const state = crypto.randomUUID()

    localStorage.setItem(this.CODE_VERIFIER_KEY, codeVerifier)
    localStorage.setItem('oauth_state', state)

    console.info('[auth] startSocialLogin', { provider, tenantId, clientId: config.oauth.clientId, redirectUri: config.oauth.redirectUri, state })

    const params = new URLSearchParams({
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    // Use tenant-specific URL if a tenant is provided, otherwise use legacy URL
    const socialUrl = tenantId 
      ? TenantUrlBuilder.buildSocialLoginUrl(tenantId, provider, params)
      : TenantUrlBuilder.buildLegacySocialLoginUrl(provider, params)

    console.info('[auth] redirecting to social provider', { socialUrl })
    window.location.href = socialUrl
  }

  async handleCallback(code: string, state: string): Promise<User> {
    // For direct social login, always process the callback even if we have existing tokens
    // This ensures we get fresh tokens from the social login flow
    if (state !== 'direct-social-login' && this.isAuthenticated()) {
      console.info('[auth] handleCallback - already authenticated, returning current user')
      return this.getCurrentUser()
    }
    
    // Clear any existing tokens for direct social login to prevent conflicts
    if (state === 'direct-social-login') {
      console.info('[auth] handleCallback - processing direct social login, clearing existing tokens')
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.CODE_VERIFIER_KEY)
      localStorage.removeItem('oauth_state')
      // No longer using direct_login_user - all authentication via OAuth tokens
    }

    const storedState = localStorage.getItem('oauth_state')
    const codeVerifier = localStorage.getItem(this.CODE_VERIFIER_KEY)

    // If state/verifier are missing, check if we have stored tokens (recovery scenario)
    if (!storedState || !codeVerifier) {
      console.warn('[auth] handleCallback - missing state or verifier, checking for existing tokens')
      const existingTokens = this.getStoredTokens()
      if (existingTokens && existingTokens.access_token) {
        console.info('[auth] handleCallback - found existing tokens, returning current user')
        return this.getCurrentUser()
      }
    }

    // For direct social login, the state will be 'direct-social-login'
    if (state === 'direct-social-login') {
      console.info('[auth] handleCallback - direct social login detected')
      // Skip state validation for direct social login
    } else if (state !== storedState) {
      console.warn('[auth] handleCallback - invalid state', { received: state, stored: storedState })
      throw new Error('Invalid state parameter')
    }

    // Code verifier is not required for direct social login
    if (!codeVerifier && state !== 'direct-social-login') {
      console.warn('[auth] handleCallback - code verifier not found')
      throw new Error('Code verifier not found')
    }

    const tokenData = new FormData()
    tokenData.append('grant_type', 'authorization_code')
    tokenData.append('code', code)
    tokenData.append('redirect_uri', config.oauth.redirectUri)
    tokenData.append('client_id', config.oauth.clientId)
    
    // Only add code verifier if it exists (not needed for direct social login)
    if (codeVerifier) {
      tokenData.append('code_verifier', codeVerifier)
    }

    // Use tenant-specific URL if a tenant is selected
    const activeTenantId = localStorage.getItem('activeTenantId')
    const tokenUrl = activeTenantId 
      ? TenantUrlBuilder.buildOAuthTokenUrl(activeTenantId)
      : TenantUrlBuilder.buildLegacyOAuthTokenUrl()

    // Build headers with tenant context
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }
    
    // Add X-Tenant-ID header if tenant is available
    if (activeTenantId) {
      headers['X-Tenant-ID'] = activeTenantId
      console.info('[auth] token exchange - adding X-Tenant-ID header', { tenantId: activeTenantId })
    } else {
      console.warn('[auth] token exchange - no tenant ID available, using legacy flow')
    }
    
    console.debug('[auth] exchanging code for tokens', { tokenUrl, tenantId: activeTenantId })
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: tokenData,
      credentials: 'include',
      mode: 'cors'
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '<non-text>')
      console.error('[auth] token exchange failed', { status: response.status, body })
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens: AuthTokens = await response.json()
    console.info('[auth] received tokens', { hasAccessToken: !!tokens.access_token, hasIdToken: !!tokens.id_token })
    this.storeTokens(tokens)

    localStorage.removeItem(this.CODE_VERIFIER_KEY)
    localStorage.removeItem('oauth_state')

    return this.getCurrentUser()
  }

  async getCurrentUser(): Promise<User> {
    const tokens = this.getStoredTokens()
    if (tokens && tokens.id_token) {
      const payload = this.parseJwtPayload(tokens.id_token)
      return {
        id: payload.sub,
        email: payload.email,
        scopes: payload.scopes || [],
        groups: payload.groups || [],
        tenant_id: payload.tenant_id
      }
    }

    throw new Error('No authentication data available - OAuth tokens required')
  }

  async refreshCurrentUser(): Promise<User> {
    try {
      const response = await this.makeAuthenticatedRequest(`${config.apiBaseUrl}/api/v1/users/me`)
      if (!response.ok) {
        throw new Error('Failed to refresh user data')
      }
      const userData = await response.json()
      
      // Update cached user data with fresh data from database
      const refreshedUser: User = {
        id: userData.id,
        email: userData.email,
        scopes: userData.scopes || [],
        groups: userData.groups || [],
        tenant_id: userData.tenant_id
      }
      
      return refreshedUser
    } catch (error) {
      console.error('[auth] refreshCurrentUser failed:', error)
      // Fallback to cached user data
      return this.getCurrentUser()
    }
  }

  private parseJwtPayload(token: string): any {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token')
    }

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  }

  getStoredTokens(): AuthTokens | null {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  }

  private storeTokens(tokens: AuthTokens): void {
  console.debug('[auth] storing tokens (access_token redacted)', { expires_in: tokens.expires_in, hasRefresh: !!tokens.refresh_token })
  // Store the actual tokens (not redacted) and add timestamp
  const tokensWithTimestamp = { 
    ...tokens, 
    stored_at: Date.now() 
  }
  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokensWithTimestamp))
  }

  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens()
    if (tokens) {
      // If stored_at is available, use it to calculate expiration properly
      if (tokens.stored_at) {
        const expiresAt = tokens.stored_at + (tokens.expires_in * 1000)
        return Date.now() < expiresAt
      }
      // If we have tokens but no stored_at, assume they're valid for now
      return true
    }

    // Only use OAuth tokens for authentication - no fallback to direct_login_user
    return false
  }

  async directLogin(email: string, password: string, twoFACode?: string, tenantId?: string): Promise<{ success: boolean; user?: User; twoFactorRequired?: boolean; error?: string }> {
    try {
      // Use PKCE OAuth flow for secure authentication
      const codeVerifier = this.generateCodeVerifier()
      const codeChallenge = await this.generateCodeChallenge(codeVerifier)
      const state = crypto.randomUUID()

      // Store PKCE parameters for callback processing
      localStorage.setItem(this.CODE_VERIFIER_KEY, codeVerifier)
      localStorage.setItem('oauth_state', state)

      // Use provided tenantId or get from localStorage
      const activeTenantId = tenantId || localStorage.getItem('activeTenantId')

      // Step 1: Authenticate with credentials and get authorization code
      const loginUrl = activeTenantId 
        ? TenantUrlBuilder.buildDirectLoginUrl(activeTenantId)
        : TenantUrlBuilder.buildLegacyDirectLoginUrl()
      
      console.info('[auth] directLogin using URL', { loginUrl, tenantId: activeTenantId })
      
      // Build headers with tenant context
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add X-Tenant-ID header if tenant is available
      if (activeTenantId) {
        headers['X-Tenant-ID'] = activeTenantId
        console.info('[auth] directLogin - adding X-Tenant-ID header', { tenantId: activeTenantId })
      } else {
        console.warn('[auth] directLogin - no tenant ID available, using legacy flow')
      }
      
      // Build request body with explicit tenant ID handling
      const requestBody: any = {
        email,
        password,
        two_fa_code: twoFACode,
        // Include OAuth parameters for PKCE flow
        client_id: config.oauth.clientId,
        redirect_uri: config.oauth.redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state,
      }

      // Always include tenant_id in body when available (even if also in header)
      if (activeTenantId) {
        requestBody.tenant_id = activeTenantId
        console.info('[auth] directLogin - including tenant_id in request body', { tenant_id: activeTenantId })
      } else {
        console.warn('[auth] directLogin - no tenant_id in request body (legacy mode)')
      }

      console.info('[auth] directLogin - full request body', {
        ...requestBody,
        password: '***REDACTED***',
        two_fa_code: twoFACode ? '***REDACTED***' : undefined
      })

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: errorText }
      }

      const data = await response.json()
      
      if (data.two_factor_required) {
        return { success: false, twoFactorRequired: true }
      }

      // If backend returns an authorization code, exchange it for tokens
      if (data.code) {
        console.info('[auth] directLogin - received authorization code, exchanging for tokens')
        try {
          const user = await this.handleCallback(data.code, state)
          return { success: true, user }
        } catch (error) {
          console.error('[auth] directLogin - token exchange failed:', error)
          return { success: false, error: 'Token exchange failed' }
        }
      }

      // Fallback: if backend returns tokens directly (backward compatibility)
      if (data.tokens) {
        console.info('[auth] directLogin - received tokens directly')
        this.storeTokens(data.tokens)
        
        const user: User = {
          id: data.user_id,
          email: data.email,
          scopes: data.scopes || [],
          groups: data.groups || [],
          two_factor_verified: data.two_factor_verified || false,
        }
        
        return { success: true, user }
      }

      return { success: false, error: 'Invalid response from server' }
    } catch (error) {
      console.error('[auth] directLogin failed:', error)
      return { success: false, error: 'Login failed' }
    }
  }

  logout(): void {
    console.info('[auth] logout')
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.CODE_VERIFIER_KEY)
    localStorage.removeItem('oauth_state')
    // No longer using direct_login_user - all authentication via OAuth tokens
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const tokens = this.getStoredTokens()
    if (!tokens) {
      console.warn('[auth] makeAuthenticatedRequest - no tokens available for', url)
      throw new Error('No authentication tokens available')
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }

    // Prioritize activeTenantId for admin operations, fallback to JWT token tenant_id
    const activeTenantId = localStorage.getItem('activeTenantId')
    if (activeTenantId) {
      headers['X-Tenant-ID'] = activeTenantId
    } else if (tokens.id_token) {
      try {
        const payload = this.parseJwtPayload(tokens.id_token)
        if (payload.tenant_id) {
          headers['X-Tenant-ID'] = payload.tenant_id
        }
      } catch (error) {
        console.warn('[auth] Failed to parse ID token for tenant ID:', error)
      }
    }

    console.debug('[auth] makeAuthenticatedRequest', { url, method: options.method || 'GET' })
    return fetch(url, {
      ...options,
      headers
    })
  }
}

export const authService = new AuthService()