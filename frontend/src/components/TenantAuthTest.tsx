import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'

interface TestResult {
  tenantId: string
  tenantName: string
  email: string
  success: boolean
  error?: string
  user?: any
  timestamp: string
}

export function TenantAuthTest() {
  const { directLogin } = useAuth()
  const { availableTenants, activeTenant } = useTenant()
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  const runSingleTenantTest = async (tenantId: string, tenantName: string) => {
    setTesting(true)
    
    try {
      console.log(`[TenantAuthTest] === Testing login for tenant: ${tenantName} ===`)
      console.log(`[TenantAuthTest] Tenant ID: ${tenantId || 'NONE (legacy)'}`)
      console.log(`[TenantAuthTest] Email: ${email}`)
      console.log(`[TenantAuthTest] Calling directLogin with tenantId parameter...`)
      
      const result = await directLogin(email, password, undefined, tenantId)
      
      const testResult: TestResult = {
        tenantId,
        tenantName,
        email,
        success: result.success,
        error: result.error,
        user: result.user,
        timestamp: new Date().toISOString()
      }
      
      setResults(prev => [testResult, ...prev])
      
      console.log(`[TenantAuthTest] Result for ${tenantName}:`, testResult)
      
    } catch (error) {
      console.error(`[TenantAuthTest] Error testing ${tenantName}:`, error)
      
      const testResult: TestResult = {
        tenantId,
        tenantName,
        email,
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }
      
      setResults(prev => [testResult, ...prev])
    } finally {
      setTesting(false)
    }
  }

  const runMultiTenantTest = async () => {
    if (!email || !password) {
      alert('Please enter both email and password')
      return
    }

    setTesting(true)
    setResults([])
    
    console.log('[TenantAuthTest] Starting multi-tenant authentication test')
    console.log('[TenantAuthTest] Testing email:', email)
    console.log('[TenantAuthTest] Available tenants:', availableTenants.length)
    
    // Test with each available tenant
    for (const tenant of availableTenants) {
      await new Promise(resolve => setTimeout(resolve, 500)) // Small delay between tests
      if (tenant.id) {
        await runSingleTenantTest(tenant.id, tenant.name)
      }
    }
    
    // Test with no tenant (legacy flow)
    await new Promise(resolve => setTimeout(resolve, 500))
    await runSingleTenantTest('', 'Legacy (No Tenant)')
    
    setTesting(false)
    console.log('[TenantAuthTest] Multi-tenant test completed')
  }

  const clearResults = () => {
    setResults([])
  }

  const getResultIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getResultBadge = (result: TestResult) => {
    if (result.success) {
      return <Badge className="bg-green-100 text-green-800">Success</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Tenant Authentication Test
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test if user authentication is properly scoped to tenants. This will attempt to login 
            with the same credentials across all available tenants to verify user isolation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-email">Test Email</Label>
              <Input
                id="test-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                disabled={testing}
              />
            </div>
            <div>
              <Label htmlFor="test-password">Test Password</Label>
              <Input
                id="test-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={testing}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Available tenants: {availableTenants.length} | Active tenant: {activeTenant?.name || 'None'}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={clearResults}
                variant="outline"
                size="sm"
                disabled={testing || results.length === 0}
              >
                Clear Results
              </Button>
              <Button
                onClick={runMultiTenantTest}
                disabled={testing || !email || !password}
                size="sm"
              >
                {testing ? (
                  'Testing...'
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Test All Tenants
                  </>
                )}
              </Button>
            </div>
          </div>

          {testing && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Running authentication tests across all tenants. Check browser console for detailed logs.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <p className="text-sm text-muted-foreground">
              Results of tenant-scoped authentication tests (most recent first)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getResultIcon(result)}
                      <div>
                        <div className="font-medium">
                          {result.tenantName} 
                          {result.tenantId && (
                            <span className="text-sm text-gray-500 ml-2">({result.tenantId})</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Email: {result.email} | {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getResultBadge(result)}
                    </div>
                  </div>

                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}

                  {result.success && result.user && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                      <div><strong>User ID:</strong> {result.user.id}</div>
                      <div><strong>User Email:</strong> {result.user.email}</div>
                      <div><strong>User Tenant:</strong> {result.user.tenant_id || 'None'}</div>
                      <div><strong>Scopes:</strong> {result.user.scopes?.join(', ') || 'None'}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Expected Behavior:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Proper Isolation:</strong> Same email should only succeed in the tenant where the user exists</li>
                <li>• <strong>Tenant Context:</strong> Successful logins should return user with correct tenant_id</li>
                <li>• <strong>Security:</strong> Failed logins should not reveal if user exists in other tenants</li>
                <li>• <strong>Headers:</strong> Check browser Network tab to verify X-Tenant-ID headers are sent</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}