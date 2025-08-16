import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, MagnifyingGlass, PencilSimple, Trash } from '@phosphor-icons/react'
import UserForm from './UserForm'
import { apiClient } from '@/lib/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  status: 'active' | 'inactive' | 'suspended'
  groups: string[]
  createdAt: string
  lastLogin?: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState([])
  const [activity, setActivity] = useState([])
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
        setUsers(usersData)
        setGroups(groupsData)
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    
    setUsers([...users, newUser])
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'user' as const,
      action: 'Created user',
      target: userData.email,
      timestamp: new Date().toLocaleString()
    }, ...activity])
    
    setIsDialogOpen(false)
  }

  const handleUpdateUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    if (!selectedUser) return
    
    setUsers(users.map(user =>
      user.id === selectedUser.id
        ? { ...user, ...userData }
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
    const user = users.find(u => u.id === userId)
    if (!user) return
    
    setUsers(users.filter(u => u.id !== userId))
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'user' as const,
      action: 'Deleted user',
      target: user.email,
      timestamp: new Date().toLocaleString()
    }, ...activity])
  }

  const getStatusBadgeColor = (status: User['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
              <MagnifyingGlass size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Plus size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                {users.length === 0 ? 'Get started by creating your first user' : 'Try adjusting your search terms'}
              </p>
              {users.length === 0 && (
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
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.groups.map((groupId) => {
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
                      {user.lastLogin ? (
                        <span className="text-sm">{new Date(user.lastLogin).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
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
                          <PencilSimple size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash size={14} />
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