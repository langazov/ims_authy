import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Copy, Check, Play } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/contexts/AuthContext'
import { config } from '@/lib/config'
import { TenantUrlBuilder } from '@/lib/tenantUrls'

interface LoginUrl {
  name: string
  url: string
  description: string
  type: 'direct' | 'oauth' | 'social'
  provider?: string
}

export function LoginUrlsBox() {
  const { activeTenant } = useTenant()
  const { login, loginWithSocial } = useAuth()
  const [copiedUrl, setCopiedUrl] = useState<string>('')
  const [loginUrls, setLoginUrls] = useState<LoginUrl[]>([])
  const [loading, setLoading] = useState(true)

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(''), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const handleTestLogin = (loginUrl: LoginUrl) => {
    if (loginUrl.type === 'oauth') {
      // Use proper OAuth flow with AuthService, passing tenant ID
      login(activeTenant?.id)
    } else if (loginUrl.type === 'social' && loginUrl.provider) {
      // Use proper social login flow with AuthService
      loginWithSocial(loginUrl.provider as 'google' | 'github' | 'facebook' | 'apple', activeTenant?.id)
    } else {
      // For direct login, just open the URL since it requires user input
      window.open(loginUrl.url, '_blank')
    }
  }

  // Generate PKCE parameters for OAuth URLs
  const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  }

  const generateLoginUrls = async (): Promise<LoginUrl[]> => {
    const urls: LoginUrl[] = []
    const tenantId = activeTenant?.id

    // Generate PKCE parameters for OAuth URLs
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = crypto.randomUUID()

    // OAuth2 Authorization URL with PKCE
    const oauthParams = new URLSearchParams({
      response_type: 'code',
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri,
      scope: config.oauth.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    // Add tenant ID as query parameter when available
    if (tenantId) {
      oauthParams.set('tenant_id', tenantId)
    }

    if (tenantId) {
      urls.push({
        name: 'OAuth2 Login',
        url: TenantUrlBuilder.buildOAuthAuthorizeUrl(tenantId, oauthParams),
        description: 'Standard OAuth2 authorization flow for this tenant',
        type: 'oauth'
      })

      urls.push({
        name: 'Direct Login',
        url: TenantUrlBuilder.buildDirectLoginUrl(tenantId),
        description: 'Direct username/password login endpoint for this tenant',
        type: 'direct'
      })

      // Social login URLs
      const enabledProviders = Object.entries(config.social)
        .filter(([_, providerConfig]) => providerConfig.enabled)

      enabledProviders.forEach(([provider, providerConfig]) => {
        const socialParams = new URLSearchParams({
          client_id: config.oauth.clientId,
          redirect_uri: config.oauth.redirectUri,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256'
        })

        // Add tenant ID as query parameter
        if (tenantId) {
          socialParams.set('tenant_id', tenantId)
        }

        urls.push({
          name: `${providerConfig.name} Login`,
          url: TenantUrlBuilder.buildSocialLoginUrl(tenantId, provider, socialParams),
          description: `Login with ${providerConfig.name} for this tenant`,
          type: 'social',
          provider
        })
      })
    } else {
      // Legacy URLs when no tenant is selected
      urls.push({
        name: 'OAuth2 Login (Legacy)',
        url: TenantUrlBuilder.buildLegacyOAuthAuthorizeUrl(oauthParams),
        description: 'Standard OAuth2 authorization flow (legacy)',
        type: 'oauth'
      })

      urls.push({
        name: 'Direct Login (Legacy)',
        url: TenantUrlBuilder.buildLegacyDirectLoginUrl(),
        description: 'Direct username/password login endpoint (legacy)',
        type: 'direct'
      })

      // Legacy social login URLs
      const enabledProviders = Object.entries(config.social)
        .filter(([_, providerConfig]) => providerConfig.enabled)

      enabledProviders.forEach(([provider, providerConfig]) => {
        const socialParams = new URLSearchParams({
          client_id: config.oauth.clientId,
          redirect_uri: config.oauth.redirectUri,
          state: state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256'
        })

        // Legacy mode - no tenant ID added

        urls.push({
          name: `${providerConfig.name} Login (Legacy)`,
          url: TenantUrlBuilder.buildLegacySocialLoginUrl(provider, socialParams),
          description: `Login with ${providerConfig.name} (legacy)`,
          type: 'social',
          provider
        })
      })
    }

    return urls
  }

  // Generate URLs when component mounts or tenant changes
  useEffect(() => {
    const loadUrls = async () => {
      setLoading(true)
      try {
        const urls = await generateLoginUrls()
        setLoginUrls(urls)
      } catch (error) {
        console.error('Failed to generate login URLs:', error)
        setLoginUrls([])
      } finally {
        setLoading(false)
      }
    }

    loadUrls()
  }, [activeTenant?.id])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'direct':
        return 'bg-blue-100 text-blue-800'
      case 'oauth':
        return 'bg-green-100 text-green-800'
      case 'social':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getProviderIcon = (provider?: string) => {
    switch (provider) {
      case 'google':
        return '🔍'
      case 'github':
        return '🐙'
      case 'facebook':
        return '📘'
      case 'apple':
        return '🍎'
      default:
        return '🔗'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ExternalLink className="mr-2 h-5 w-5" />
            Login URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loginUrls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ExternalLink className="mr-2 h-5 w-5" />
            Login URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No login URLs available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ExternalLink className="mr-2 h-5 w-5" />
          Login URLs
          {activeTenant && (
            <Badge variant="outline" className="ml-2">
              {activeTenant.name}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Available authentication endpoints for {activeTenant ? 'this tenant' : 'the system'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loginUrls.map((loginUrl, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {loginUrl.type === 'social' ? getProviderIcon(loginUrl.provider) : '🔐'}
                </span>
                <h4 className="font-medium">{loginUrl.name}</h4>
                <Badge className={getTypeColor(loginUrl.type)}>
                  {loginUrl.type}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestLogin(loginUrl)}
                  className="px-2 py-1 h-8"
                  title="Test this login method properly"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Test
                </Button>
                <button
                  onClick={() => copyToClipboard(loginUrl.url)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Copy URL"
                >
                  {copiedUrl === loginUrl.url ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => window.open(loginUrl.url, '_blank')}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Open URL (will fail - see warning below)"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">{loginUrl.description}</p>
            <div className="bg-gray-50 rounded p-2">
              <code className="text-xs break-all text-gray-800">{loginUrl.url}</code>
            </div>
          </div>
        ))}
        
        <div className="mt-4 space-y-2">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-800">
              <strong>✅ Test Buttons:</strong> Use the "Test" buttons for proper authentication flows. 
              These buttons use the correct auth service methods with fresh PKCE parameters and tenant context.
            </p>
          </div>
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800">
              <strong>🚧 Backend Status:</strong> Currently using legacy endpoints with tenant context in headers/body. 
              Tenant-specific URLs (like <code>/tenant/{'{tenantId}'}/login</code>) return 404 - backend implementation needed.
            </p>
          </div>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ URL Reference:</strong> The displayed URLs contain pre-generated PKCE parameters and are for 
              integration reference only. Direct use of these URLs will fail because the code verifier is not stored 
              in your session. Use the Test buttons for actual authentication testing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}