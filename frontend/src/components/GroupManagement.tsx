import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react'
import GroupForm from './GroupForm'

interface Group {
  id: string
  name: string
  description: string
  scopes: string[]
  memberCount?: number
  createdAt: string
}

export default function GroupManagement() {
  // Temporarily use local state to test if the component renders
  const [groups, setGroups] = useState<Group[]>([])
  const [users] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const safeGroups = groups || []
  const safeUsers = users || []
  
  const filteredGroups = safeGroups.filter(group =>
    group?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getGroupMemberCount = (groupId: string) => {
    return safeUsers.filter((user: any) => user?.groups?.includes(groupId)).length
  }

  const handleCreateGroup = (groupData: Omit<Group, 'id' | 'createdAt'>) => {
    const newGroup: Group = {
      ...groupData,
      id: `group_${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    
    setGroups([...safeGroups, newGroup])
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'group' as const,
      action: 'Created group',
      target: groupData.name,
      timestamp: new Date().toLocaleString()
    }, ...activity])
    
    setIsDialogOpen(false)
  }

  const handleUpdateGroup = (groupData: Omit<Group, 'id' | 'createdAt'>) => {
    if (!selectedGroup) return
    
    setGroups(safeGroups.map(group =>
      group.id === selectedGroup.id
        ? { ...group, ...groupData }
        : group
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
  }

  const handleDeleteGroup = (groupId: string) => {
    const group = safeGroups.find(g => g.id === groupId)
    if (!group) return
    
    setGroups(safeGroups.filter(g => g.id !== groupId))
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'group' as const,
      action: 'Deleted group',
      target: group.name,
      timestamp: new Date().toLocaleString()
    }, ...activity])
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
                      <span>{getGroupMemberCount(group.id)} members</span>
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
                      Created {new Date(group.createdAt).toLocaleDateString()}
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