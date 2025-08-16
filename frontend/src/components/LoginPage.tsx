import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { login, isLoading } = useAuth()

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
        <CardContent>
          <Button 
            onClick={login} 
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Signing in...' : 'Sign In with OAuth2'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}