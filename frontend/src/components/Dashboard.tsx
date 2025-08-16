import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Group, ShieldClose, Cog, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'

interface ActivityItem {
  id: string
  type: 'user' | 'group' | 'client'
  action: string
  target: string
  timestamp: string
}

export default function Dashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [activity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, groupsData, clientsData] = await Promise.all([
          apiClient.users.getAll(),
          apiClient.groups.getAll(),
          apiClient.clients.getAll()
        ])
        
        // Ensure we always have arrays, even if API returns null
        setUsers(Array.isArray(usersData) ? usersData : [])
        setGroups(Array.isArray(groupsData) ? groupsData : [])
        setClients(Array.isArray(clientsData) ? clientsData : [])
        setError(null)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setError('Failed to load dashboard data')
        // Keep arrays as empty arrays even on error
        setUsers([])
        setGroups([])
        setClients([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const safeUsers = users || []
  const safeGroups = groups || []
  const safeClients = clients || []
  const safeActivity = activity || []
  
  const activeUsers = safeUsers.filter((user: any) => user?.active).length
  const recentActivity = safeActivity.slice(0, 5)

  const stats = [
    {
      title: 'Total Users',
      value: safeUsers.length.toString(),
      icon: Group,
      description: `${activeUsers} active users`,
      trend: '+12% from last month'
    },
    {
      title: 'User Groups',
      value: safeGroups.length.toString(),
      icon: ShieldClose,
      description: 'Permission groups',
      trend: '+2 new groups'
    },
    {
      title: 'OAuth Clients',
      value: safeClients.length.toString(),
      icon: Cog,
      description: 'Registered applications',
      trend: '3 pending approval'
    },
    {
      title: 'Monthly Logins',
      value: '2,847',
      icon: Activity,
      description: 'Successful authentications',
      trend: '+18% increase'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your OAuth2 server activity and statistics</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your OAuth2 server activity and statistics</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your OAuth2 server activity and statistics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <p className="text-xs text-accent mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity size={48} className="mx-auto mb-4 opacity-50" />
                <p>No recent activity to display</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <Badge variant="outline" className="capitalize">
                      {item.type}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">
                        {item.action} <span className="font-medium">{item.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Server Status</span>
              <Badge className="bg-green-100 text-green-800">Online</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Token Cache</span>
              <Badge className="bg-green-100 text-green-800">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SSL Certificate</span>
              <Badge className="bg-yellow-100 text-yellow-800">30 days</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}