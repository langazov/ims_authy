import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { apiClient } from '@/lib/api'

interface Group {
  id: string
  name: string
  description: string
  scopes: string[]
  members: string[]
  created_at: string
  updated_at: string
}

interface Scope {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  active: boolean
}

interface GroupFormProps {
  group?: Group | null
  onSubmit: (groupData: Omit<Group, 'id' | 'members' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}

export default function GroupForm({ group, onSubmit, onCancel }: GroupFormProps) {
  const [availableScopes, setAvailableScopes] = useState<Scope[]>([])
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    scopes: group?.scopes || []
  })

  // Fetch available scopes from API
  useEffect(() => {
    const fetchScopes = async () => {
      try {
        const scopes = await apiClient.scopes.getAll()
        setAvailableScopes(scopes || [])
      } catch (error) {
        console.error('Failed to fetch scopes:', error)
        setAvailableScopes([])
      }
    }

    fetchScopes()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleScopeChange = (scopeName: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        scopes: [...prev.scopes, scopeName]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        scopes: prev.scopes.filter(name => name !== scopeName)
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
          {availableScopes.map((scope) => (
            <div key={scope.id} className="flex items-start space-x-3">
              <Checkbox
                id={`scope-${scope.id}`}
                checked={formData.scopes.includes(scope.name)}
                onCheckedChange={(checked) => handleScopeChange(scope.name, checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor={`scope-${scope.id}`} className="text-sm font-medium">
                  {scope.display_name}
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