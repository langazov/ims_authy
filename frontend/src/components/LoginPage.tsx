import React, { useState } from 'react'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { TenantLoginSelector } from './TenantLoginSelector'
import SocialLoginButton from './SocialLoginButton'
import { config } from '@/lib/config'
import { Tenant } from '@/types/tenant'

export default function LoginPage() {
  const { login, loginWithSocial, isLoading } = useAuth()
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)

  const handleSocialLogin = (provider: 'google' | 'github' | 'facebook' | 'apple') => {
    // Use selected tenant ID if available, otherwise default tenant fallback
    loginWithSocial(provider, selectedTenant?.id)
  }

  const handleOAuthLogin = () => {
    // Pass selected tenant ID to login method
    login(selectedTenant?.id)
  }

  const enabledProviders = (Object.entries(config.social) as [keyof typeof config.social, typeof config.social[keyof typeof config.social]][])
    .filter(([_, providerConfig]) => providerConfig.enabled)
    .map(([provider, _]) => provider)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield size={48} className="text-primary" />
          </div>
          <CardTitle className="text-2xl">OAuth2 Management</CardTitle>
          <CardDescription>
            Sign in to access the OpenID Connect server administration panel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tenant Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Select Organization
            </label>
            <TenantLoginSelector
              selectedTenant={selectedTenant}
              onTenantSelect={setSelectedTenant}
            />
          </div>

          {selectedTenant && (
            <>
              <Separator className="my-4" />
              
              {/* Social Login Options */}
          {enabledProviders.length > 0 && (
            <div className="space-y-3">
              {enabledProviders.map((provider) => (
                <SocialLoginButton
                  key={provider}
                  provider={provider}
                  onClick={() => handleSocialLogin(provider)}
                  disabled={isLoading || !selectedTenant}
                />
              ))}
            </div>
          )}

          {/* Separator */}
          {enabledProviders.length > 0 && (
            <div className="relative">
              <Separator className="my-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-3 text-sm text-muted-foreground">
                  or
                </span>
              </div>
            </div>
          )}

              {/* Traditional OAuth2 Login */}
              <Button 
                onClick={handleOAuthLogin} 
                disabled={isLoading || !selectedTenant}
                className="w-full"
                size="lg"
                variant="outline"
              >
                {isLoading ? 'Signing in...' : 'Sign In with OAuth2'}
              </Button>
            </>
          )}

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Choose your preferred sign-in method. All methods provide secure access to the administration panel.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}