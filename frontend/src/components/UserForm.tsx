import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

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

interface Scope {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  active: boolean
}

interface UserFormProps {
  user?: User | null
  groups: Group[]
  onSubmit: (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}

export default function UserForm({ user, groups, onSubmit, onCancel }: UserFormProps) {
  const safeGroups = groups || []
  const [availableScopes, setAvailableScopes] = useState<Scope[]>([])
  const [formData, setFormData] = useState({
    email: user?.email || '',
    username: user?.username || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    active: user?.active ?? true,
    groups: Array.isArray(user?.groups) ? user.groups : [],
    scopes: Array.isArray(user?.scopes) ? user.scopes : ['read', 'openid', 'profile', 'email'],
    password: ''
  })

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        active: user.active ?? true,
        groups: Array.isArray(user.groups) ? user.groups : [],
        scopes: Array.isArray(user.scopes) ? user.scopes : [],
        password: ''
      })
    } else {
      // Reset to defaults for new user
      setFormData({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        active: true,
        groups: [],
        scopes: ['read', 'openid', 'profile', 'email'],
        password: ''
      })
    }
  }, [user])

  const generatePassword = (length = 16) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?'
    try {
      const array = new Uint32Array(length)
      window.crypto.getRandomValues(array)
      return Array.from(array).map(n => charset[n % charset.length]).join('')
    } catch (e) {
      // fallback
      let out = ''
      for (let i = 0; i < length; i++) {
        out += charset[Math.floor(Math.random() * charset.length)]
      }
      return out
    }
  }

  const copyPassword = async () => {
    try {
      if (!formData.password) {
        toast.error('No password to copy')
        return
      }
      await navigator.clipboard.writeText(formData.password)
      toast.success('Password copied to clipboard')
    } catch (err) {
      console.error('Failed to copy password:', err)
      toast.error('Failed to copy password')
    }
  }

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

  // Calculate available scopes based on selected groups
  const getAvailableScopes = (selectedGroups: string[]) => {
    const availableScopes = new Set<string>()
    
    if (Array.isArray(selectedGroups)) {
      selectedGroups.forEach(groupName => {
        const group = safeGroups.find(g => g.name === groupName)
        if (group && Array.isArray(group.scopes)) {
          group.scopes.forEach(scope => availableScopes.add(scope))
        }
      })
    }
    
    return Array.from(availableScopes)
  }

  // Get available scopes for current selected groups (memoized to prevent unnecessary re-renders)
  const filteredAvailableScopes = useMemo(() => 
    getAvailableScopes(formData.groups), 
    [formData.groups, safeGroups]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Exclude password when updating existing user (backend may ignore it)
    if (user) {
      const { password, ...rest } = formData as any
      onSubmit(rest)
    } else {
      onSubmit(formData as any)
    }
  }

  const handleGroupChange = (groupName: string, checked: boolean) => {
    setFormData(prev => {
      const currentGroups = Array.isArray(prev.groups) ? prev.groups : []
      
      if (checked) {
        // Add group if not already present
        const newGroups = currentGroups.includes(groupName) 
          ? currentGroups 
          : [...currentGroups, groupName]
        
        return {
          ...prev,
          groups: newGroups
        }
      } else {
        // Remove group and filter scopes
        const newGroups = currentGroups.filter(name => name !== groupName)
        // Calculate available scopes from remaining groups
        const newAvailableScopes = getAvailableScopes(newGroups)
        // Remove scopes that are no longer available
        const currentScopes = Array.isArray(prev.scopes) ? prev.scopes : []
        const filteredScopes = currentScopes.filter(scope => newAvailableScopes.includes(scope))
        
        return {
          ...prev,
          groups: newGroups,
          scopes: filteredScopes
        }
      }
    })
  }

  const handleScopeChange = (scopeId: string, checked: boolean) => {
    setFormData(prev => {
      const currentScopes = Array.isArray(prev.scopes) ? prev.scopes : []
      
      if (checked) {
        // Add scope if not already present
        const newScopes = currentScopes.includes(scopeId) 
          ? currentScopes 
          : [...currentScopes, scopeId]
        
        return {
          ...prev,
          scopes: newScopes
        }
      } else {
        // Remove scope
        const newScopes = currentScopes.filter(id => id !== scopeId)
        
        return {
          ...prev,
          scopes: newScopes
        }
      }
    })
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
        <Label htmlFor="password">Password</Label>
        <div className="flex space-x-2">
          <Input
            id="password"
            type="text"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Auto-generate a strong password or type your own"
          />
          <Button type="button" variant="secondary" onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}>
            Generate
          </Button>
          <Button type="button" variant="outline" onClick={copyPassword}>
            Copy
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Leave empty to auto-generate a password on creation.</p>
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
                  checked={Array.isArray(formData.groups) && formData.groups.includes(group.name)}
                  onCheckedChange={(checked) => handleGroupChange(group.name, checked as boolean)}
                />
                <Label htmlFor={`group-${group.id}`} className="text-sm">
                  {group.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Permissions & Scopes</Label>
          <span className="text-xs text-muted-foreground">
            {Array.isArray(formData.scopes) ? formData.scopes.length : 0} of {filteredAvailableScopes.length} scope{filteredAvailableScopes.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        
        {filteredAvailableScopes.length === 0 ? (
          <div className="border rounded-md p-6 text-center">
            <div className="text-sm text-muted-foreground mb-2">No scopes available</div>
            <div className="text-xs text-muted-foreground">
              Select one or more groups to see available permissions.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-md p-3">
            {availableScopes.filter(scope => filteredAvailableScopes.includes(scope.name)).map((scope) => (
              <div key={scope.id} className="flex items-start space-x-2">
                <Checkbox
                  id={`scope-${scope.id}`}
                  checked={Array.isArray(formData.scopes) && formData.scopes.includes(scope.name)}
                  onCheckedChange={(checked) => handleScopeChange(scope.name, checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor={`scope-${scope.id}`} className="text-sm font-medium">
                    {scope.display_name}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {scope.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          💡 Scopes are determined by group membership. Select groups above to see available permissions.
        </div>
      </div>

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