import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { ShieldClose, Group, Cog, ChartColumn, LogOut, Users, Settings, User, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { TenantProvider, useTenant } from '@/contexts/TenantContext'
import { TenantSelector } from '@/components/TenantSelector'
import Dashboard from '@/components/Dashboard'
import UserManagement from '@/components/UserManagement'
import GroupManagement from '@/components/GroupManagement'
import ClientManagement from '@/components/ClientManagement'
import SocialLoginSetup from '@/components/SocialLoginSetup'
import ScopeManagement from '@/components/ScopeManagement'
import UserProfile from '@/components/UserProfile'
import { TenantManagement } from '@/pages/TenantManagement'

function AuthenticatedAppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { user, logout } = useAuth()
  const { canManageUsers, canManageClients, canManageGroups, isAdmin } = usePermissions()
  const { activeTenant } = useTenant()

  // Available tabs based on permissions
  const availableTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ChartColumn, component: Dashboard, available: true },
    { id: 'profile', label: 'Profile', icon: User, component: UserProfile, available: true },
    { id: 'tenants', label: 'Tenants', icon: Building, component: TenantManagement, available: isAdmin() },
    { id: 'users', label: 'Users', icon: Users, component: UserManagement, available: canManageUsers() },
    { id: 'groups', label: 'Groups', icon: Group, component: GroupManagement, available: canManageGroups() },
    { id: 'clients', label: 'OAuth Clients', icon: Cog, component: ClientManagement, available: canManageClients() },
    { id: 'scopes', label: 'Scopes', icon: Settings, component: ScopeManagement, available: isAdmin() },
    { id: 'social', label: 'Social Login', icon: ShieldClose, component: SocialLoginSetup, available: isAdmin() }
  ].filter(tab => tab.available)

  // Ensure active tab is available to user
  useEffect(() => {
    const availableTabIds = availableTabs.map(tab => tab.id)
    if (!availableTabIds.includes(activeTab)) {
      setActiveTab('dashboard')
    }
  }, [availableTabs, activeTab])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldClose size={32} className="text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">OAuth2 Management</h1>
                <p className="text-sm text-muted-foreground">OpenID Connect Server Administration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Tenant Selector */}
              <TenantSelector />
              
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {activeTenant?.name && `Managing: ${activeTenant.name}`}
                  {activeTenant?.name && user?.scopes?.length ? ' • ' : ''}
                  {user?.scopes?.length ? `Permissions: ${user.scopes.join(', ')}` : 'No permissions'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut size={16} className="mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Show active tenant context */}
        {activeTenant && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Building size={20} className="text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">
                  Managing Tenant: {activeTenant.name}
                </h3>
                <p className="text-sm text-blue-700">
                  Domain: {activeTenant.domain} • Subdomain: {activeTenant.subdomain}
                  {activeTenant.settings?.customBranding?.companyName && 
                    ` • Company: ${activeTenant.settings.customBranding.companyName}`}
                </p>
              </div>
              <div className="ml-auto">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTenant.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {activeTenant.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full mb-8`} style={{ gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))` }}>
            {availableTabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center space-x-2">
                  <IconComponent size={16} />
                  <span>{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {availableTabs.map((tab) => {
            const ComponentToRender = tab.component
            return (
              <TabsContent key={tab.id} value={tab.id}>
                <ComponentToRender />
              </TabsContent>
            )
          })}
        </Tabs>
      </main>
      
      <Toaster />
    </div>
  )
}

export default function AuthenticatedApp() {
  return (
    <TenantProvider>
      <AuthenticatedAppContent />
    </TenantProvider>
  )
}