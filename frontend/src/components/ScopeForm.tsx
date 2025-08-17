import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface Scope {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  active: boolean
  created_at: string
  updated_at: string
}

interface ScopeFormProps {
  scope?: Scope | null
  onSubmit: (scopeData: Omit<Scope, 'id' | 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}

const PREDEFINED_CATEGORIES = [
  { id: 'basic', name: 'Basic', description: 'Fundamental access permissions' },
  { id: 'administrative', name: 'Administrative', description: 'System administration permissions' },
  { id: 'management', name: 'Management', description: 'User and resource management' },
  { id: 'oauth', name: 'OAuth', description: 'OAuth and authentication scopes' },
  { id: 'profile', name: 'Profile', description: 'User profile related permissions' },
  { id: 'users', name: 'Users', description: 'User account management' },
  { id: 'groups', name: 'Groups', description: 'Group and role management' },
  { id: 'clients', name: 'Clients', description: 'OAuth client management' },
  { id: 'testing', name: 'Testing', description: 'Development and testing scopes' }
]

export default function ScopeForm({ scope, onSubmit, onCancel }: ScopeFormProps) {
  const [formData, setFormData] = useState({
    name: scope?.name || '',
    display_name: scope?.display_name || '',
    description: scope?.description || '',
    category: scope?.category || '',
    active: scope?.active ?? true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form data when scope prop changes
  useEffect(() => {
    if (scope) {
      setFormData({
        name: scope.name,
        display_name: scope.display_name,
        description: scope.description,
        category: scope.category,
        active: scope.active
      })
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        category: '',
        active: true
      })
    }
    setErrors({})
  }, [scope])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Scope name is required'
    } else if (!/^[a-z0-9_:.-]+$/.test(formData.name)) {
      newErrors.name = 'Scope name can only contain lowercase letters, numbers, underscores, colons, dots, and hyphens'
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSubmit({
      name: formData.name.trim(),
      display_name: formData.display_name.trim(),
      description: formData.description.trim(),
      category: formData.category.trim(),
      active: formData.active
    })
  }

  const handleNameChange = (value: string) => {
    // Auto-generate name from display name if it's a new scope
    if (!scope && !formData.name) {
      const autoName = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
      
      setFormData(prev => ({
        ...prev,
        display_name: value,
        name: autoName
      }))
    } else {
      setFormData(prev => ({ ...prev, display_name: value }))
    }
    
    if (errors.display_name) {
      setErrors(prev => ({ ...prev, display_name: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {scope 
            ? 'Modifying scopes may affect existing users, groups, and OAuth clients.'
            : 'Choose a clear, descriptive name and category for the new scope.'
          }
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name *</Label>
        <Input
          id="display_name"
          value={formData.display_name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., User Management, Read Profile"
          className={errors.display_name ? 'border-red-500' : ''}
        />
        {errors.display_name && (
          <p className="text-sm text-red-500">{errors.display_name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Human-readable name displayed in forms and interfaces
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Scope Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, name: e.target.value }))
            if (errors.name) {
              setErrors(prev => ({ ...prev, name: '' }))
            }
          }}
          placeholder="e.g., user_management, read:profile"
          className={errors.name ? 'border-red-500' : ''}
          disabled={!!scope} // Don't allow editing name of existing scopes
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {scope 
            ? 'Scope name cannot be changed after creation'
            : 'Unique identifier used in OAuth flows (lowercase, numbers, _, :, ., - only)'
          }
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, description: e.target.value }))
            if (errors.description) {
              setErrors(prev => ({ ...prev, description: '' }))
            }
          }}
          placeholder="Describe what this scope allows users to do..."
          rows={3}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Clear description of the permissions this scope grants
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select 
          value={formData.category} 
          onValueChange={(value) => {
            setFormData(prev => ({ ...prev, category: value }))
            if (errors.category) {
              setErrors(prev => ({ ...prev, category: '' }))
            }
          }}
        >
          <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {PREDEFINED_CATEGORIES.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div>
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-muted-foreground">{category.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Group scopes by purpose for better organization
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
        />
        <Label htmlFor="active">Active</Label>
        <p className="text-xs text-muted-foreground">
          Inactive scopes cannot be assigned to users or clients
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {scope ? 'Update Scope' : 'Create Scope'}
        </Button>
      </div>
    </form>
  )
}