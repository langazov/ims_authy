import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Shield, ShieldCheck, ShieldOff, Settings, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import TwoFactorSetup from './TwoFactorSetup'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/lib/api'

interface TwoFactorStatus {
  enabled: boolean
}

export default function UserProfile() {
  const { user } = useAuth()
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disabling, setDisabling] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (user?.id) {
      fetchTwoFactorStatus()
    }
  }, [user?.id])

  const fetchTwoFactorStatus = async () => {
    if (!user?.id) return

    try {
      const status: TwoFactorStatus = await apiClient.twoFactor.getStatus(user.id)
      setTwoFactorStatus(status)
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableTwoFactor = async () => {
    if (!user?.id || !twoFactorStatus?.enabled) return

    setDisabling(true)
    setError('')

    try {
      await apiClient.twoFactor.disable({ user_id: user.id })
      setTwoFactorStatus({ enabled: false })
      toast({
        title: "Success",
        description: "Two-factor authentication has been disabled.",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setDisabling(false)
    }
  }

  const handleSetupComplete = () => {
    setShowSetup(false)
    setTwoFactorStatus({ enabled: true })
    fetchTwoFactorStatus()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Profile
          </CardTitle>
          <CardDescription>
            Manage your account settings and security preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="font-mono">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="font-mono text-sm">{user?.id}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Groups</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {user?.groups.map((group) => (
                <Badge key={group} variant="secondary">{group}</Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Scopes</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {user?.scopes.map((scope) => (
                <Badge key={scope} variant="outline">{scope}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {twoFactorStatus?.enabled ? (
                <ShieldCheck className="h-8 w-8 text-green-600" />
              ) : (
                <ShieldOff className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-muted-foreground">
                  {twoFactorStatus?.enabled 
                    ? 'Your account is protected with 2FA'
                    : 'Add an extra layer of security to your account'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={twoFactorStatus?.enabled ? "default" : "secondary"}>
                {twoFactorStatus?.enabled ? "Enabled" : "Disabled"}
              </Badge>
              
              {twoFactorStatus?.enabled ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Disable
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to disable two-factor authentication? 
                        This will make your account less secure.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="destructive"
                        onClick={handleDisableTwoFactor}
                        disabled={disabling}
                      >
                        {disabling ? 'Disabling...' : 'Yes, Disable 2FA'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button onClick={() => setShowSetup(true)} size="sm">
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>

          {!twoFactorStatus?.enabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                We recommend enabling two-factor authentication to keep your account secure. 
                You'll need an authenticator app like Google Authenticator or Authy.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <TwoFactorSetup
            userId={user?.id || ''}
            onSetupComplete={handleSetupComplete}
            onCancel={() => setShowSetup(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}