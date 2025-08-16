import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

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

interface Group {
  id: string
  name: string
  description: string
  scopes: string[]
}

interface UserFormProps {
  user?: User | null
  groups: Group[]
  onSubmit: (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}

export default function UserForm({ user, groups, onSubmit, onCancel }: UserFormProps) {
  const safeGroups = groups || []
  const [formData, setFormData] = useState({
    email: user?.email || '',
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    active: user?.active ?? true,
    groups: user?.groups || [],
    scopes: user?.scopes || ['read', 'openid', 'profile', 'email']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleGroupChange = (groupId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        groups: [...prev.groups, groupId]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        groups: prev.groups.filter(id => id !== groupId)
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.first_name}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.last_name}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.active ? "active" : "inactive"} onValueChange={(value) => setFormData(prev => ({ ...prev, active: value === "active" }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {safeGroups.length > 0 && (
        <div className="space-y-2">
          <Label>Groups</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {safeGroups.map((group) => (
              <div key={group.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`group-${group.id}`}
                  checked={formData.groups.includes(group.id)}
                  onCheckedChange={(checked) => handleGroupChange(group.id, checked as boolean)}
                />
                <Label htmlFor={`group-${group.id}`} className="text-sm">
                  {group.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}