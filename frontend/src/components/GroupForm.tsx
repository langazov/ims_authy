import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

interface Group {
  id: string
  name: string
  description: string
  scopes: string[]
  members: string[]
  created_at: string
  updated_at: string
}

interface GroupFormProps {
  group?: Group | null
  onSubmit: (groupData: Omit<Group, 'id' | 'members' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}

const AVAILABLE_SCOPES = [
  { id: 'read:profile', name: 'Read Profile', description: 'View user profile information' },
  { id: 'write:profile', name: 'Write Profile', description: 'Modify user profile information' },
  { id: 'read:users', name: 'Read Users', description: 'View other users in the system' },
  { id: 'write:users', name: 'Write Users', description: 'Create and modify user accounts' },
  { id: 'delete:users', name: 'Delete Users', description: 'Remove user accounts' },
  { id: 'read:groups', name: 'Read Groups', description: 'View group information' },
  { id: 'write:groups', name: 'Write Groups', description: 'Create and modify groups' },
  { id: 'delete:groups', name: 'Delete Groups', description: 'Remove groups' },
  { id: 'read:clients', name: 'Read OAuth Clients', description: 'View OAuth client applications' },
  { id: 'write:clients', name: 'Write OAuth Clients', description: 'Create and modify OAuth clients' },
  { id: 'delete:clients', name: 'Delete OAuth Clients', description: 'Remove OAuth clients' },
  { id: 'admin:system', name: 'System Admin', description: 'Full system administration access' }
]

export default function GroupForm({ group, onSubmit, onCancel }: GroupFormProps) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    scopes: group?.scopes || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleScopeChange = (scopeId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        scopes: [...prev.scopes, scopeId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        scopes: prev.scopes.filter(id => id !== scopeId)
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Group Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Administrators, Editors, Users"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this group's purpose"
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <Label>Permissions</Label>
        <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-3">
          {AVAILABLE_SCOPES.map((scope) => (
            <div key={scope.id} className="flex items-start space-x-3">
              <Checkbox
                id={`scope-${scope.id}`}
                checked={formData.scopes.includes(scope.id)}
                onCheckedChange={(checked) => handleScopeChange(scope.id, checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor={`scope-${scope.id}`} className="text-sm font-medium">
                  {scope.name}
                </Label>
                <p className="text-xs text-muted-foreground">{scope.description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Selected: {formData.scopes.length} permission{formData.scopes.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {group ? 'Update Group' : 'Create Group'}
        </Button>
      </div>
    </form>
  )
}