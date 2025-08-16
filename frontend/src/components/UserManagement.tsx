import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import UserForm from './UserForm'
import { apiClient } from '@/lib/api'

interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  active: boolean
  groups: string[]
  scopes: string[]
  created_at: string
  updated_at: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, groupsData] = await Promise.all([
          apiClient.users.getAll(),
          apiClient.groups.getAll()
        ])
        setUsers(Array.isArray(usersData) ? usersData : [])
        setGroups(Array.isArray(groupsData) ? groupsData : [])
      } catch (error) {
        console.error('Failed to fetch users:', error)
        setUsers([])
        setGroups([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const safeUsers = users || []
  const filteredUsers = safeUsers.filter(user =>
    user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateUser = (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setUsers([...safeUsers, newUser])
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'user' as const,
      action: 'Created user',
      target: userData.email,
      timestamp: new Date().toLocaleString()
    }, ...activity])
    
    setIsDialogOpen(false)
  }

  const handleUpdateUser = (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedUser) return
    
    setUsers(safeUsers.map(user =>
      user.id === selectedUser.id
        ? { ...user, ...userData, updated_at: new Date().toISOString() }
        : user
    ))
    
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'user' as const,
      action: 'Updated user',
      target: userData.email,
      timestamp: new Date().toLocaleString()
    }, ...activity])
    
    setSelectedUser(null)
    setIsDialogOpen(false)
  }

  const handleDeleteUser = (userId: string) => {
    const user = safeUsers.find(u => u.id === userId)
    if (!user) return
    
    setUsers(safeUsers.filter(u => u.id !== userId))
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'user' as const,
      action: 'Deleted user',
      target: user.email,
      timestamp: new Date().toLocaleString()
    }, ...activity])
  }

  const getStatusBadgeColor = (active: boolean) => {
    return active 
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (active: boolean) => {
    return active ? 'Active' : 'Inactive'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedUser(null)}>
              <Plus size={16} className="mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedUser ? 'Edit User' : 'Create New User'}</DialogTitle>
            </DialogHeader>
            <UserForm
              user={selectedUser}
              groups={groups}
              onSubmit={selectedUser ? handleUpdateUser : handleCreateUser}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} of {safeUsers.length} users
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Plus size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                {safeUsers.length === 0 ? 'Get started by creating your first user' : 'Try adjusting your search terms'}
              </p>
              {safeUsers.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus size={16} className="mr-2" />
                  Create First User
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(user.active)}>
                        {getStatusText(user.active)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.groups?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(user.groups || []).map((groupId) => {
                            const group = groups.find((g: any) => g.id === groupId)
                            return (
                              <Badge key={groupId} variant="outline" className="text-xs">
                                {group?.name || groupId}
                              </Badge>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No groups</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedUser(user)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}