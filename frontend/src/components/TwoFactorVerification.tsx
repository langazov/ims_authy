import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react'

interface TwoFactorVerificationProps {
  onVerified: (code: string) => void
  onBack?: () => void
  loading?: boolean
  error?: string
}

export default function TwoFactorVerification({ 
  onVerified, 
  onBack, 
  loading = false, 
  error 
}: TwoFactorVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('')

  const handleSubmit = () => {
    if (verificationCode.length === 6) {
      onVerified(verificationCode)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6) {
      handleSubmit()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield size={48} className="text-primary" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit verification code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={(value) => setVerificationCode(value)}
              onKeyDown={handleKeyDown}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button 
              onClick={handleSubmit}
              disabled={loading || verificationCode.length !== 6}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>

            {onBack && (
              <Button 
                variant="ghost" 
                onClick={onBack}
                disabled={loading}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Can't access your authenticator app? Use one of your backup codes instead.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}