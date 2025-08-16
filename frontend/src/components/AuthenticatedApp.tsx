import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Toaster } from '@/components/ui/sonner'
import { ShieldClose, Group, Cog, ChartColumn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import Dashboard from '@/components/Dashboard'
import UserManagement from '@/components/UserManagement'
import GroupManagement from '@/components/GroupManagement'
import ClientManagement from '@/components/ClientManagement'

export default function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { user, logout } = useAuth()

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
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.groups?.length ? `Groups: ${user.groups.join(', ')}` : 'No groups'}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <ChartColumn size={16} />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Group size={16} />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center space-x-2">
              <Group size={16} />
              <span>Groups</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center space-x-2">
              <Cog size={16} />
              <span>OAuth Clients</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="groups">
            <GroupManagement />
          </TabsContent>
          
          <TabsContent value="clients">
            <ClientManagement />
          </TabsContent>
        </Tabs>
      </main>
      
      <Toaster />
    </div>
  )
}