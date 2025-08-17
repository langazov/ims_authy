import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, ExternalLink, Settings, Eye, EyeOff, CheckCircle, XCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import AccessDenied from './AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'

interface SocialProvider {
  id: string
  name: string
  enabled: boolean
  clientId: string
  clientSecret: string
  redirectUrl: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
  userInfoUrl: string
  configured: boolean
}

const defaultProviders: SocialProvider[] = [
  {
    id: 'google',
    name: 'Google',
    enabled: true,
    clientId: '',
    clientSecret: '',
    redirectUrl: 'http://localhost:8080/auth/google/callback',
    scopes: ['openid', 'profile', 'email'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    configured: false
  },
  {
    id: 'github',
    name: 'GitHub',
    enabled: true,
    clientId: '',
    clientSecret: '',
    redirectUrl: 'http://localhost:8080/auth/github/callback',
    scopes: ['user:email'],
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    configured: false
  },
  {
    id: 'facebook',
    name: 'Facebook',
    enabled: true,
    clientId: '',
    clientSecret: '',
    redirectUrl: 'http://localhost:8080/auth/facebook/callback',
    scopes: ['email', 'public_profile'],
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v18.0/me',
    configured: false
  },
  {
    id: 'apple',
    name: 'Apple',
    enabled: true,
    clientId: '',
    clientSecret: '',
    redirectUrl: 'http://localhost:8080/auth/apple/callback',
    scopes: ['name', 'email'],
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    userInfoUrl: '',
    configured: false
  }
]

const providerIcons = {
  google: (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

const setupGuides = {
  google: {
    title: 'Google OAuth 2.0 Setup',
    steps: [
      'Go to Google Cloud Console (console.cloud.google.com)',
      'Create a new project or select existing one',
      'Enable Google+ API',
      'Go to Credentials → Create OAuth 2.0 Client ID',
      'Set authorized redirect URI to: http://localhost:8080/auth/google/callback',
      'Copy Client ID and Client Secret'
    ],
    docsUrl: 'https://developers.google.com/identity/protocols/oauth2'
  },
  github: {
    title: 'GitHub OAuth App Setup',
    steps: [
      'Go to GitHub Settings → Developer settings',
      'Click "New OAuth App"',
      'Set Authorization callback URL to: http://localhost:8080/auth/github/callback',
      'Register application',
      'Copy Client ID and generate Client Secret'
    ],
    docsUrl: 'https://docs.github.com/en/developers/apps/building-oauth-apps'
  },
  facebook: {
    title: 'Facebook App Setup',
    steps: [
      'Go to Facebook for Developers (developers.facebook.com)',
      'Create a new app',
      'Add Facebook Login product',
      'Set Valid OAuth Redirect URI to: http://localhost:8080/auth/facebook/callback',
      'Copy App ID and App Secret'
    ],
    docsUrl: 'https://developers.facebook.com/docs/facebook-login'
  },
  apple: {
    title: 'Apple Sign In Setup',
    steps: [
      'Go to Apple Developer Account',
      'Create a Services ID',
      'Configure Sign In with Apple',
      'Set Return URL to: http://localhost:8080/auth/apple/callback',
      'Generate private key and create JWT client secret'
    ],
    docsUrl: 'https://developer.apple.com/documentation/sign_in_with_apple'
  }
}

export default function SocialLoginSetup() {
  const { isAdmin } = usePermissions()
  const [providers, setProviders] = useState<SocialProvider[]>(defaultProviders)
  const [selectedProvider, setSelectedProvider] = useState<SocialProvider | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Check permissions - only admin can manage social login setup
  if (!isAdmin()) {
    return (
      <AccessDenied 
        title="Social Login Setup"
        message="You don't have permission to configure social login providers."
        requiredPermissions={['admin']}
      />
    )
  }

  // Fetch provider configurations from backend
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/v1/social/providers')
        if (response.ok) {
          const backendProviders = await response.json()
          setProviders(backendProviders)
        }
      } catch (error) {
        console.error('Failed to fetch provider configurations:', error)
        toast.error('Failed to load provider configurations')
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const toggleSecretVisibility = (providerId: string) => {
    setShowSecrets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(providerId)) {
        newSet.delete(providerId)
      } else {
        newSet.add(providerId)
      }
      return newSet
    })
  }

  const handleProviderUpdate = async (updatedProvider: SocialProvider) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/social/providers/${updatedProvider.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: updatedProvider.enabled,
          clientId: updatedProvider.clientId,
          clientSecret: updatedProvider.clientSecret,
          redirectUrl: updatedProvider.redirectUrl,
        }),
      })

      if (response.ok) {
        setProviders(prev => prev.map(p => 
          p.id === updatedProvider.id 
            ? { ...updatedProvider, configured: !!(updatedProvider.clientId && updatedProvider.clientSecret) }
            : p
        ))
        setIsDialogOpen(false)
        toast.success(`${updatedProvider.name} configuration updated`)
      } else {
        toast.error('Failed to update provider configuration')
      }
    } catch (error) {
      console.error('Failed to update provider:', error)
      toast.error('Failed to update provider configuration')
    }
  }

  const toggleProviderEnabled = (providerId: string) => {
    setProviders(prev => prev.map(p => 
      p.id === providerId ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const testProviderConfig = async (providerId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/social/providers/${providerId}/test`, {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`${providerId} configuration is valid`)
      } else {
        toast.error(`${providerId} configuration test failed: ${result.message}`)
      }
    } catch (error) {
      console.error('Failed to test provider configuration:', error)
      toast.error('Failed to test provider configuration')
    }
  }

  const getProviderIcon = (providerId: string) => {
    return providerIcons[providerId as keyof typeof providerIcons]
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Social Login Setup</h2>
            <p className="text-muted-foreground">Loading provider configurations...</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Social Login Setup</h2>
          <p className="text-muted-foreground">Configure social authentication providers for your OAuth2 server</p>
        </div>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info size={20} />
            <span>Configuration Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Social login providers require OAuth application setup with each service. 
              Configure your applications and add the credentials below to enable social authentication.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {providers.map((provider) => (
              <div key={provider.id} className="text-center">
                <div className="flex justify-center mb-2">
                  {getProviderIcon(provider.id)}
                </div>
                <div className="text-sm font-medium">{provider.name}</div>
                <Badge 
                  variant={provider.configured ? "default" : "secondary"}
                  className={provider.configured ? "bg-green-100 text-green-800" : ""}
                >
                  {provider.configured ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
                  {provider.configured ? 'Configured' : 'Not Configured'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider Configuration Cards */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getProviderIcon(provider.id)}
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">OAuth 2.0 Provider</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={provider.enabled}
                    onCheckedChange={() => toggleProviderEnabled(provider.id)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => testProviderConfig(provider.id)}
                    disabled={!provider.configured}
                  >
                    Test
                  </Button>
                  <Dialog open={isDialogOpen && selectedProvider?.id === provider.id} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProvider(provider)}
                      >
                        <Settings size={14} className="mr-1" />
                        Configure
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Configure {provider.name} OAuth</DialogTitle>
                        <DialogDescription>
                          Set up OAuth2 credentials and configuration for {provider.name} social login integration.
                        </DialogDescription>
                      </DialogHeader>
                      <ProviderConfigForm
                        provider={provider}
                        onSave={handleProviderUpdate}
                        onCancel={() => setIsDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <div className="flex items-center mt-1">
                    <Badge 
                      variant={provider.configured && provider.enabled ? "default" : "secondary"}
                      className={provider.configured && provider.enabled ? "bg-green-100 text-green-800" : ""}
                    >
                      {provider.configured && provider.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Scopes</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {provider.scopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="text-xs">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {provider.clientId && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Client ID</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {provider.clientId}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(provider.clientId, 'Client ID')}
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>
              )}

              {provider.clientSecret && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Client Secret</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                      {showSecrets.has(provider.id) ? provider.clientSecret : '••••••••••••••••'}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSecretVisibility(provider.id)}
                    >
                      {showSecrets.has(provider.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(provider.clientSecret, 'Client Secret')}
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs font-medium text-muted-foreground">Redirect URL</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                    {provider.redirectUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(provider.redirectUrl, 'Redirect URL')}
                  >
                    <Copy size={12} />
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(setupGuides[provider.id as keyof typeof setupGuides].docsUrl, '_blank')}
                >
                  <ExternalLink size={12} className="mr-1" />
                  Setup Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

interface ProviderConfigFormProps {
  provider: SocialProvider
  onSave: (provider: SocialProvider) => void
  onCancel: () => void
}

function ProviderConfigForm({ provider, onSave, onCancel }: ProviderConfigFormProps) {
  const [formData, setFormData] = useState(provider)
  const guide = setupGuides[provider.id as keyof typeof setupGuides]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="space-y-6">
      {/* Setup Guide */}
      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">{guide.title}</h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          {guide.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => window.open(guide.docsUrl, '_blank')}
        >
          <ExternalLink size={12} className="mr-1" />
          View Documentation
        </Button>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID *</Label>
            <Input
              id="clientId"
              value={formData.clientId}
              onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="Enter client ID"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret *</Label>
            <Input
              id="clientSecret"
              type="password"
              value={formData.clientSecret}
              onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
              placeholder="Enter client secret"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="redirectUrl">Redirect URL</Label>
          <Input
            id="redirectUrl"
            value={formData.redirectUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, redirectUrl: e.target.value }))}
            placeholder="Redirect URL"
          />
          <p className="text-xs text-muted-foreground">
            This URL must be configured in your {provider.name} OAuth application
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
          />
          <Label htmlFor="enabled">Enable this provider</Label>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  )
}