import { useState } from 'react'
import { Shield, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import SocialLoginButton from './SocialLoginButton'
import TwoFactorVerification from './TwoFactorVerification'
import { config } from '@/lib/config'

export default function EnhancedLoginPage() {
  const { login, directLogin, loginWithSocial, isLoading } = useAuth()
  const [step, setStep] = useState<'login' | 'twofa'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSocialLogin = (provider: 'google' | 'github' | 'facebook' | 'apple') => {
    // Using default tenant (undefined) - will use legacy OAuth URLs for backwards compatibility
    loginWithSocial(provider)
  }

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await directLogin(email, password)
      
      if (result.twoFactorRequired) {
        setStep('twofa')
      } else if (!result.success) {
        setError(result.error || 'Login failed')
      }
      // If successful, the user will be set in the AuthContext
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTwoFactorVerification = async (code: string) => {
    setLoading(true)
    setError('')

    try {
      const result = await directLogin(email, password, code)
      
      if (!result.success) {
        setError(result.error || 'Invalid verification code')
      }
      // If successful, the user will be set in the AuthContext
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const enabledProviders = (Object.entries(config.social) as [keyof typeof config.social, typeof config.social[keyof typeof config.social]][])
    .filter(([_, providerConfig]) => providerConfig.enabled)
    .map(([provider, _]) => provider)

  if (step === 'twofa') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <TwoFactorVerification
          onVerified={handleTwoFactorVerification}
          onBack={() => setStep('login')}
          loading={loading}
          error={error}
        />
      </div>
    )
  }

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
          {/* Social Login Options */}
          {enabledProviders.length > 0 && (
            <div className="space-y-3">
              {enabledProviders.map((provider) => (
                <SocialLoginButton
                  key={provider}
                  provider={provider}
                  onClick={() => handleSocialLogin(provider)}
                  disabled={isLoading || loading}
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
                  or sign in with email
                </span>
              </div>
            </div>
          )}

          {/* Direct Login Form */}
          <form onSubmit={handleDirectLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit"
              disabled={loading || !email || !password}
              className="w-full"
              size="lg"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Traditional OAuth2 Login */}
          <div className="relative">
            <Separator className="my-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-3 text-sm text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <Button 
            onClick={login} 
            disabled={isLoading || loading}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {isLoading ? 'Signing in...' : 'Sign In with OAuth2'}
          </Button>

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Choose your preferred sign-in method. All methods provide secure access to the administration panel.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}