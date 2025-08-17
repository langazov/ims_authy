import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Plus } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface OAuthClient {
  id: string
  client_id: string
  name: string
  description: string
  redirect_uris: string[]
  scopes: string[]
  grant_types: string[]
  active: boolean
  created_at: string
  updated_at: string
}

interface ClientFormData {
  name: string
  description: string
  redirect_uris: string[]
  scopes: string[]
  grant_types: string[]
  active: boolean
}

interface Scope {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  active: boolean
}

interface ClientFormProps {
  client?: OAuthClient | null
  onSubmit: (clientData: ClientFormData) => void
  onCancel: () => void
}

const AVAILABLE_GRANT_TYPES = [
  'authorization_code',
  'refresh_token',
  'client_credentials'
]

export default function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const [availableScopes, setAvailableScopes] = useState<Scope[]>([])
  const [formData, setFormData] = useState({
    name: client?.name || '',
    description: client?.description || '',
    redirect_uris: client?.redirect_uris || [''],
    scopes: client?.scopes || ['read', 'openid'],
    grant_types: client?.grant_types || ['authorization_code', 'refresh_token'],
    active: client?.active ?? true
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
    
    // Filter out empty redirect URIs
    const cleanedData = {
      ...formData,
      redirect_uris: formData.redirect_uris.filter(uri => uri.trim() !== '')
    }
    
    onSubmit(cleanedData)
  }

  const handleScopeChange = (scope: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        scopes: [...prev.scopes, scope]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        scopes: prev.scopes.filter(s => s !== scope)
      }))
    }
  }

  const addRedirectUri = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...prev.redirect_uris, '']
    }))
  }

  const removeRedirectUri = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: prev.redirect_uris.filter((_, i) => i !== index)
    }))
  }

  const updateRedirectUri = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: prev.redirect_uris.map((uri, i) => i === index ? value : uri)
    }))
  }

  const handleGrantTypeChange = (grantType: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        grant_types: [...prev.grant_types, grantType]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        grant_types: prev.grant_types.filter(gt => gt !== grantType)
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Application Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My OAuth Application"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="active">Status</Label>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of your application"
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Redirect URIs</Label>
          <Button type="button" size="sm" variant="outline" onClick={addRedirectUri}>
            <Plus size={14} className="mr-1" />
            Add URI
          </Button>
        </div>
        <div className="space-y-2">
          {formData.redirect_uris.map((uri, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Input
                value={uri}
                onChange={(e) => updateRedirectUri(index, e.target.value)}
                placeholder="https://your-app.com/callback"
              />
              {formData.redirect_uris.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeRedirectUri(index)}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Add the URLs where users should be redirected after authentication
        </p>
      </div>

      <div className="space-y-3">
        <Label>OAuth Scopes</Label>
        <div className="grid grid-cols-2 gap-2">
          {availableScopes.map((scope) => (
            <div key={scope.id} className="flex items-center space-x-2">
              <Checkbox
                id={`scope-${scope.id}`}
                checked={formData.scopes.includes(scope.name)}
                onCheckedChange={(checked) => handleScopeChange(scope.name, checked as boolean)}
              />
              <Label htmlFor={`scope-${scope.id}`} className="text-sm">
                {scope.display_name}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Selected: {formData.scopes.length} scope{formData.scopes.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3">
        <Label>Grant Types</Label>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_GRANT_TYPES.map((grantType) => (
            <div key={grantType} className="flex items-center space-x-2">
              <Checkbox
                id={`grant-${grantType}`}
                checked={formData.grant_types.includes(grantType)}
                onCheckedChange={(checked) => handleGrantTypeChange(grantType, checked as boolean)}
              />
              <Label htmlFor={`grant-${grantType}`} className="text-sm">
                {grantType}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Selected: {formData.grant_types.length} grant type{formData.grant_types.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {client ? 'Update Client' : 'Register Client'}
        </Button>
      </div>
    </form>
  )
}