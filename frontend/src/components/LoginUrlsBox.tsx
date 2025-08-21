import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Copy, Check } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
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
  const [copiedUrl, setCopiedUrl] = useState<string>('')

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(''), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const generateLoginUrls = (): LoginUrl[] => {
    const urls: LoginUrl[] = []
    const tenantId = activeTenant?.id

    // OAuth2 Authorization URL
    const oauthParams = new URLSearchParams({
      response_type: 'code',
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri,
      scope: config.oauth.scope,
      state: 'dashboard-preview'
    })

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
          state: 'dashboard-preview'
        })

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
          state: 'dashboard-preview'
        })

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

  const loginUrls = generateLoginUrls()

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
                  title="Open URL"
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
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> These URLs are for integration and testing purposes. 
            The state parameter in OAuth URLs should be properly generated for production use.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}