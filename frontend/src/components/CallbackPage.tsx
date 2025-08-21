import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CallbackPage() {
  const { handleCallback } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    if (processed) return
    
    const processCallback = async () => {
      setProcessed(true)
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const error = urlParams.get('error')

      if (error) {
        setStatus('error')
        setError(`OAuth error: ${error}`)
        return
      }

      if (!code) {
        setStatus('error')
        setError('Missing authorization code')
        return
      }

      // State parameter is optional for direct social login
      // If no state, generate a temporary one for the callback handler
      const finalState = state || 'direct-social-login'

      try {
        await handleCallback(code, finalState)
        setStatus('success')
        // Clear URL parameters to prevent re-processing
        window.history.replaceState({}, document.title, window.location.pathname)
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Authentication failed')
        // Clear URL parameters even on error to prevent loops
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    processCallback()
  }, [])

  const handleRetry = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Shield size={48} className="text-primary animate-pulse" />}
            {status === 'success' && <CheckCircle size={48} className="text-green-600" />}
            {status === 'error' && <XCircle size={48} className="text-red-600" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Authentication Successful'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we complete your sign in'}
            {status === 'success' && 'Redirecting to dashboard...'}
            {status === 'error' && error}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent>
            <Button onClick={handleRetry} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}