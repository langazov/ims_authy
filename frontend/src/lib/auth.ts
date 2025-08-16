import { config } from './config'

export interface User {
  id: string
  email: string
  scopes: string[]
  groups: string[]
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

  async startLogin(): Promise<void> {
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    const state = crypto.randomUUID()

    localStorage.setItem(this.CODE_VERIFIER_KEY, codeVerifier)
    localStorage.setItem('oauth_state', state)

  console.info('[auth] startLogin', { clientId: config.oauth.clientId, redirectUri: config.oauth.redirectUri, scope: config.oauth.scope, state })

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri,
      scope: config.oauth.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    window.location.href = `${config.oauth.authUrl}?${params.toString()}`
  }

  async handleCallback(code: string, state: string): Promise<User> {
    // Check if we're already authenticated (prevents duplicate processing)
    if (this.isAuthenticated()) {
      console.info('[auth] handleCallback - already authenticated, returning current user')
      return this.getCurrentUser()
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

    if (state !== storedState) {
      console.warn('[auth] handleCallback - invalid state', { received: state, stored: storedState })
      throw new Error('Invalid state parameter')
    }

    if (!codeVerifier) {
      console.warn('[auth] handleCallback - code verifier not found')
      throw new Error('Code verifier not found')
    }

    const tokenData = new FormData()
    tokenData.append('grant_type', 'authorization_code')
    tokenData.append('code', code)
    tokenData.append('redirect_uri', config.oauth.redirectUri)
    tokenData.append('client_id', config.oauth.clientId)
    tokenData.append('code_verifier', codeVerifier)

    console.debug('[auth] exchanging code for tokens', { tokenUrl: config.oauth.tokenUrl })
    const response = await fetch(config.oauth.tokenUrl, {
      method: 'POST',
      body: tokenData
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
    if (!tokens) {
      throw new Error('No tokens available')
    }

    if (!tokens.id_token) {
      throw new Error('No ID token available')
    }

    const payload = this.parseJwtPayload(tokens.id_token)
    return {
      id: payload.sub,
      email: payload.email,
      scopes: payload.scopes || [],
      groups: payload.groups || []
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
    if (!tokens) return false

    // If stored_at is available, use it to calculate expiration properly
    if (tokens.stored_at) {
      const expiresAt = tokens.stored_at + (tokens.expires_in * 1000)
      return Date.now() < expiresAt
    }
    
    // Fallback: assume token was just issued (not accurate but safe)
    return false
  }

  logout(): void {
  console.info('[auth] logout')
  localStorage.removeItem(this.STORAGE_KEY)
  localStorage.removeItem(this.CODE_VERIFIER_KEY)
  localStorage.removeItem('oauth_state')
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const tokens = this.getStoredTokens()
    if (!tokens) {
      console.warn('[auth] makeAuthenticatedRequest - no tokens available for', url)
      throw new Error('No authentication tokens available')
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    }

    console.debug('[auth] makeAuthenticatedRequest', { url, method: options.method || 'GET' })
    return fetch(url, {
      ...options,
      headers
    })
  }
}

export const authService = new AuthService()