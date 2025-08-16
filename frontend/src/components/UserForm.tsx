import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

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

interface Group {
  id: string
  name: string
  description: string
  scopes: string[]
}

interface UserFormProps {
  user?: User | null
  groups: Group[]
  onSubmit: (userData: Omit<User, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

export default function UserForm({ user, groups, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    status: user?.status || 'active' as const,
    groups: user?.groups || []
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
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>
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
        <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {groups.length > 0 && (
        <div className="space-y-2">
          <Label>Groups</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {groups.map((group) => (
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