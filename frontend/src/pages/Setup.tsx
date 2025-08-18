import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Building, User, CheckCircle, AlertCircle, Key } from 'lucide-react'
import { toast } from 'sonner'

interface SetupStatus {
  setup_required: boolean
  has_valid_token: boolean
  token_expires_at?: string
}

interface SetupData {
  setup_token: string
  tenant_name: string
  tenant_domain: string
  tenant_subdomain: string
  admin_email: string
  admin_password: string
  admin_first_name: string
  admin_last_name: string
  settings: {
    allow_user_registration: boolean
    require_two_factor: boolean
    session_timeout: number
    custom_branding: {
      company_name: string
      primary_color: string
      secondary_color: string
    }
  }
}

export default function Setup() {
  const [currentStep, setCurrentStep] = useState(0)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [tokenValidated, setTokenValidated] = useState(false)
  const [setupData, setSetupData] = useState<SetupData>({
    setup_token: '',
    tenant_name: '',
    tenant_domain: 'localhost',
    tenant_subdomain: 'default',
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
    settings: {
      allow_user_registration: true,
      require_two_factor: false,
      session_timeout: 60,
      custom_branding: {
        company_name: '',
        primary_color: '#3b82f6',
        secondary_color: '#1e40af'
      }
    }
  })

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup/status')
      const status = await response.json()
      setSetupStatus(status)
      
      if (!status.setup_required) {
        window.location.href = '/'
        return
      }
      
      if (!status.has_valid_token) {
        toast.error('No valid setup token found. Please restart the server.')
      }
    } catch (error) {
      console.error('Failed to check setup status:', error)
      toast.error('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const validateToken = async () => {
    if (!setupData.setup_token.trim()) {
      toast.error('Please enter the setup token')
      return
    }

    try {
      const response = await fetch('/api/setup/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: setupData.setup_token }),
      })

      const result = await response.json()
      
      if (result.valid) {
        setTokenValidated(true)
        setCurrentStep(1)
        toast.success('Setup token validated successfully')
      } else {
        toast.error(result.message || 'Invalid setup token')
      }
    } catch (error) {
      console.error('Failed to validate token:', error)
      toast.error('Failed to validate token')
    }
  }

  const completeSetup = async () => {
    try {
      setLoading(true)
      
      // Set company name to tenant name if not provided
      if (!setupData.settings.custom_branding.company_name) {
        setupData.settings.custom_branding.company_name = setupData.tenant_name
      }

      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupData),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Setup completed successfully!')
        setCurrentStep(4) // Success step
      } else {
        const error = await response.text()
        toast.error(`Setup failed: ${error}`)
      }
    } catch (error) {
      console.error('Setup failed:', error)
      toast.error('Failed to complete setup')
    } finally {
      setLoading(false)
    }
  }

  const updateSetupData = (field: string, value: any) => {
    setSetupData(prev => {
      const newData = { ...prev }
      const keys = field.split('.')
      let current = newData as any
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  if (loading && !setupStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Checking setup status...</p>
        </div>
      </div>
    )
  }

  const steps = [
    { id: 0, title: 'Setup Token', icon: Key, description: 'Enter the setup token from server console' },
    { id: 1, title: 'Tenant Info', icon: Building, description: 'Configure your organization details' },
    { id: 2, title: 'Admin User', icon: User, description: 'Create the administrator account' },
    { id: 3, title: 'Settings', icon: Shield, description: 'Configure security and branding' },
    { id: 4, title: 'Complete', icon: CheckCircle, description: 'Setup completed successfully' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Shield size={48} className="mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OAuth2 Server Setup</h1>
          <p className="text-gray-600">Configure your authentication server</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === index
              const isCompleted = currentStep > index
              const isAccessible = index === 0 || tokenValidated
              
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                  onClick={() => isAccessible && index <= currentStep && setCurrentStep(index)}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-2 ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isAccessible
                        ? 'border-gray-300 text-gray-400'
                        : 'border-gray-200 text-gray-300'
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <span className={`text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <Card className="w-full shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              {React.createElement(steps[currentStep]?.icon || Shield, { size: 24, className: 'mr-2' })}
              {steps[currentStep]?.title}
            </CardTitle>
            <p className="text-gray-600">{steps[currentStep]?.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Check your server console for the setup token. It was printed when the server started.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="token">Setup Token</Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Enter the setup token from server console"
                    value={setupData.setup_token}
                    onChange={(e) => updateSetupData('setup_token', e.target.value)}
                    className="font-mono"
                  />
                </div>

                {setupStatus && (
                  <div className="space-y-2">
                    <Badge variant={setupStatus.has_valid_token ? "default" : "destructive"}>
                      Token Status: {setupStatus.has_valid_token ? 'Valid' : 'Invalid/Expired'}
                    </Badge>
                    {setupStatus.token_expires_at && (
                      <p className="text-sm text-gray-600">
                        Expires: {new Date(setupStatus.token_expires_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <Button onClick={validateToken} className="w-full" disabled={!setupData.setup_token.trim()}>
                  Validate Token & Continue
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenant_name">Organization Name *</Label>
                    <Input
                      id="tenant_name"
                      value={setupData.tenant_name}
                      onChange={(e) => updateSetupData('tenant_name', e.target.value)}
                      placeholder="Acme Corporation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenant_domain">Domain *</Label>
                    <Input
                      id="tenant_domain"
                      value={setupData.tenant_domain}
                      onChange={(e) => updateSetupData('tenant_domain', e.target.value)}
                      placeholder="acme.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant_subdomain">Subdomain *</Label>
                  <Input
                    id="tenant_subdomain"
                    value={setupData.tenant_subdomain}
                    onChange={(e) => updateSetupData('tenant_subdomain', e.target.value)}
                    placeholder="acme"
                  />
                  <p className="text-sm text-gray-500">
                    This will be used for tenant-specific URLs like: acme.auth-server.com
                  </p>
                </div>

                <Button 
                  onClick={() => setCurrentStep(2)} 
                  className="w-full"
                  disabled={!setupData.tenant_name || !setupData.tenant_domain || !setupData.tenant_subdomain}
                >
                  Continue to Admin Account
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin_first_name">First Name *</Label>
                    <Input
                      id="admin_first_name"
                      value={setupData.admin_first_name}
                      onChange={(e) => updateSetupData('admin_first_name', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_last_name">Last Name *</Label>
                    <Input
                      id="admin_last_name"
                      value={setupData.admin_last_name}
                      onChange={(e) => updateSetupData('admin_last_name', e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_email">Admin Email *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={setupData.admin_email}
                    onChange={(e) => updateSetupData('admin_email', e.target.value)}
                    placeholder="admin@acme.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_password">Admin Password *</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    value={setupData.admin_password}
                    onChange={(e) => updateSetupData('admin_password', e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                  {setupData.admin_password && setupData.admin_password.length < 8 && (
                    <p className="text-sm text-red-600">Password must be at least 8 characters</p>
                  )}
                </div>

                <Button 
                  onClick={() => setCurrentStep(3)} 
                  className="w-full"
                  disabled={
                    !setupData.admin_first_name || 
                    !setupData.admin_last_name || 
                    !setupData.admin_email || 
                    setupData.admin_password.length < 8
                  }
                >
                  Continue to Settings
                </Button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Security Settings</h3>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allow_registration"
                      checked={setupData.settings.allow_user_registration}
                      onChange={(e) => updateSetupData('settings.allow_user_registration', e.target.checked)}
                    />
                    <Label htmlFor="allow_registration">Allow user registration</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="require_2fa"
                      checked={setupData.settings.require_two_factor}
                      onChange={(e) => updateSetupData('settings.require_two_factor', e.target.checked)}
                    />
                    <Label htmlFor="require_2fa">Require two-factor authentication</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      value={setupData.settings.session_timeout}
                      onChange={(e) => updateSetupData('settings.session_timeout', parseInt(e.target.value))}
                      min={5}
                      max={1440}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Branding</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={setupData.settings.custom_branding.company_name}
                      onChange={(e) => updateSetupData('settings.custom_branding.company_name', e.target.value)}
                      placeholder={setupData.tenant_name}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Primary Color</Label>
                      <Input
                        id="primary_color"
                        type="color"
                        value={setupData.settings.custom_branding.primary_color}
                        onChange={(e) => updateSetupData('settings.custom_branding.primary_color', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary_color">Secondary Color</Label>
                      <Input
                        id="secondary_color"
                        type="color"
                        value={setupData.settings.custom_branding.secondary_color}
                        onChange={(e) => updateSetupData('settings.custom_branding.secondary_color', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={completeSetup} className="flex-1" disabled={loading}>
                    {loading ? 'Setting up...' : 'Complete Setup'}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-900">Setup Complete!</h2>
                <p className="text-gray-600">
                  Your OAuth2 server has been configured successfully. You can now log in with your admin account.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p><strong>Tenant:</strong> {setupData.tenant_name}</p>
                  <p><strong>Admin Email:</strong> {setupData.admin_email}</p>
                  <p><strong>Login URL:</strong> /auth/login</p>
                </div>

                <Button onClick={() => window.location.href = '/auth/login'} className="w-full">
                  Go to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}