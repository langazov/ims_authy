import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react'
import GroupForm from './GroupForm'
import AccessDenied from './AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'

interface Group {
  id: string
  name: string
  description: string
  scopes: string[]
  members: string[]
  created_at: string
  updated_at: string
}

export default function GroupManagement() {
  const { canManageGroups } = usePermissions()
  const [groups, setGroups] = useState<Group[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check permissions
  if (!canManageGroups()) {
    return (
      <AccessDenied 
        title="Group Management"
        message="You don't have permission to manage groups and permissions."
        requiredPermissions={['admin', 'user_management']}
      />
    )
  }

  const safeGroups = groups || []

  // Fetch groups from backend
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/v1/groups')
        if (response.ok) {
          const fetchedGroups = await response.json()
          setGroups(fetchedGroups)
        } else {
          console.error('Failed to fetch groups:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching groups:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])
  
  const filteredGroups = safeGroups.filter(group =>
    group?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getGroupMemberCount = (group: Group) => {
    return group.members ? group.members.length : 0
  }

  const handleCreateGroup = async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      })

      if (response.ok) {
        const newGroup = await response.json()
        setGroups([...safeGroups, newGroup])
        setActivity([{
          id: `activity_${Date.now()}`,
          type: 'group' as const,
          action: 'Created group',
          target: groupData.name,
          timestamp: new Date().toLocaleString()
        }, ...activity])
        setIsDialogOpen(false)
      } else {
        console.error('Failed to create group:', response.statusText)
      }
    } catch (error) {
      console.error('Error creating group:', error)
    }
  }

  const handleUpdateGroup = async (groupData: Omit<Group, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedGroup) return
    
    try {
      const response = await fetch(`http://localhost:8080/api/v1/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      })

      if (response.ok) {
        const updatedGroup = await response.json()
        setGroups(safeGroups.map(group =>
          group.id === selectedGroup.id ? updatedGroup : group
        ))
        
        setActivity([{
          id: `activity_${Date.now()}`,
          type: 'group' as const,
          action: 'Updated group',
          target: groupData.name,
          timestamp: new Date().toLocaleString()
        }, ...activity])
        
        setSelectedGroup(null)
        setIsDialogOpen(false)
      } else {
        console.error('Failed to update group:', response.statusText)
      }
    } catch (error) {
      console.error('Error updating group:', error)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    const group = safeGroups.find(g => g.id === groupId)
    if (!group) return
    
    try {
      const response = await fetch(`http://localhost:8080/api/v1/groups/${groupId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setGroups(safeGroups.filter(g => g.id !== groupId))
        setActivity([{
          id: `activity_${Date.now()}`,
          type: 'group' as const,
          action: 'Deleted group',
          target: group.name,
          timestamp: new Date().toLocaleString()
        }, ...activity])
      } else {
        console.error('Failed to delete group:', response.statusText)
      }
    } catch (error) {
      console.error('Error deleting group:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Group Management</h2>
            <p className="text-muted-foreground">Loading groups...</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading groups...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Group Management</h2>
          <p className="text-muted-foreground">Manage user groups and permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedGroup(null)}>
              <Plus size={16} className="mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedGroup ? 'Edit Group' : 'Create New Group'}</DialogTitle>
              <DialogDescription>
                {selectedGroup 
                  ? 'Modify group settings, permissions, and member assignments.' 
                  : 'Create a new user group with specific permissions and access levels.'
                }
              </DialogDescription>
            </DialogHeader>
            <GroupForm
              group={selectedGroup}
              onSubmit={selectedGroup ? handleUpdateGroup : handleCreateGroup}
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
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredGroups.length} of {safeGroups.length} groups
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No groups found</h3>
              <p className="text-muted-foreground mb-4">
                {safeGroups.length === 0 ? 'Get started by creating your first group' : 'Try adjusting your search terms'}
              </p>
              {safeGroups.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus size={16} className="mr-2" />
                  Create First Group
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedGroup(group)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Users size={14} />
                      <span>{getGroupMemberCount(group)} members</span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Permissions:</p>
                      {group.scopes?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(group.scopes || []).map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No permissions assigned</p>
                      )}
                    </div>

                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Created {new Date(group.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}