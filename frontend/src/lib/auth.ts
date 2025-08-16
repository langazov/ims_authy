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
    const storedState = localStorage.getItem('oauth_state')
    if (state !== storedState) {
      throw new Error('Invalid state parameter')
    }

    const codeVerifier = localStorage.getItem(this.CODE_VERIFIER_KEY)
    if (!codeVerifier) {
      throw new Error('Code verifier not found')
    }

    const tokenData = new FormData()
    tokenData.append('grant_type', 'authorization_code')
    tokenData.append('code', code)
    tokenData.append('redirect_uri', config.oauth.redirectUri)
    tokenData.append('client_id', config.oauth.clientId)
    tokenData.append('code_verifier', codeVerifier)

    const response = await fetch(config.oauth.tokenUrl, {
      method: 'POST',
      body: tokenData
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    const tokens: AuthTokens = await response.json()
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
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens))
  }

  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens()
    if (!tokens) return false

    const expiresAt = Date.now() + (tokens.expires_in * 1000)
    return Date.now() < expiresAt
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.CODE_VERIFIER_KEY)
    localStorage.removeItem('oauth_state')
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const tokens = this.getStoredTokens()
    if (!tokens) {
      throw new Error('No authentication tokens available')
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    }

    return fetch(url, {
      ...options,
      headers
    })
  }
}

export const authService = new AuthService()