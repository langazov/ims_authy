import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, QrCode, Copy, Check, AlertTriangle } from 'lucide-react'
import { config } from '@/lib/config'
import { useToast } from '@/hooks/use-toast'

interface TwoFactorSetupProps {
  userId: string
  onSetupComplete?: () => void
  onCancel?: () => void
}

interface SetupResponse {
  secret: string
  qr_code_url: string
  backup_codes: string[]
}

export default function TwoFactorSetup({ userId, onSetupComplete, onCancel }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'complete'>('initial')
  const [setupData, setSetupData] = useState<SetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState<{ [key: string]: boolean }>({})
  const { toast } = useToast()

  const handleSetupStart = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/v1/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to setup two-factor authentication')
      }

      const data: SetupResponse = await response.json()
      setSetupData(data)
      setStep('setup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/v1/2fa/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          code: verificationCode,
        }),
      })

      if (!response.ok) {
        throw new Error('Invalid verification code')
      }

      setStep('complete')
      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled successfully.",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, type: 'secret' | string) => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'secret') {
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 2000)
      } else {
        setCopiedCodes({ ...copiedCodes, [type]: true })
        setTimeout(() => setCopiedCodes({ ...copiedCodes, [type]: false }), 2000)
      }
      toast({
        title: "Copied",
        description: "Copied to clipboard",
      })
    })
  }

  const handleComplete = () => {
    onSetupComplete?.()
  }

  if (step === 'initial') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield size={48} className="text-primary" />
          </div>
          <CardTitle>Enable Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by enabling two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication requires:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>• Access to your mobile device</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSetupStart} disabled={loading} className="flex-1">
              {loading ? 'Setting up...' : 'Get Started'}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'setup') {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <QrCode size={48} className="text-primary" />
          </div>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Use your authenticator app to scan the QR code below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {setupData && (
            <>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <img 
                    src={setupData.qr_code_url} 
                    alt="QR Code for 2FA setup" 
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Manual Setup Key:</p>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <code className="flex-1 text-sm font-mono break-all">
                    {setupData.secret}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(setupData.secret, 'secret')}
                  >
                    {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">Enter verification code:</p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={(value) => setVerificationCode(value)}
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

                <Button 
                  onClick={handleVerification} 
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full"
                >
                  {loading ? 'Verifying...' : 'Verify and Enable'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <Check size={32} className="text-green-600" />
            </div>
          </div>
          <CardTitle className="text-green-600">Two-Factor Authentication Enabled!</CardTitle>
          <CardDescription>
            Your account is now protected with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {setupData && setupData.backup_codes && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <p className="font-medium text-sm">Important: Save Your Backup Codes</p>
              </div>
              
              <Alert>
                <AlertDescription>
                  These backup codes can be used to access your account if you lose your device. 
                  Store them in a safe place - they won't be shown again.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2">
                {setupData.backup_codes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <Badge variant="outline" className="flex-1 justify-center font-mono">
                      {code}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(code, code)}
                    >
                      {copiedCodes[code] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  const allCodes = setupData.backup_codes.join('\n')
                  copyToClipboard(allCodes, 'all-codes')
                }}
                className="w-full"
              >
                {copiedCodes['all-codes'] ? 'Copied All Codes!' : 'Copy All Backup Codes'}
              </Button>
            </div>
          )}

          <Button onClick={handleComplete} className="w-full">
            Continue
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}