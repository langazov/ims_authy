import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock } from 'lucide-react'

interface AccessDeniedProps {
  title?: string
  message?: string
  requiredPermissions?: string[]
}

export default function AccessDenied({ 
  title = "Access Denied", 
  message = "You don't have the required permissions to access this feature.",
  requiredPermissions = []
}: AccessDeniedProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">Insufficient permissions</p>
        </div>
      </div>

      <Card>
        <CardHeader className="text-center py-12">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <Lock size={40} className="text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="text-center pb-12">
          <Alert className="border-red-200 bg-red-50 max-w-md mx-auto">
            <Shield className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <div className="font-medium mb-2">{message}</div>
              {requiredPermissions.length > 0 && (
                <div className="text-sm">
                  <div className="mb-1">Required permissions:</div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {requiredPermissions.map((permission) => (
                      <code key={permission} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                        {permission}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground mt-4 text-sm">
            Contact your administrator if you believe you should have access to this feature.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}