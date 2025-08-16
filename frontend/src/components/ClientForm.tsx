import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Plus } from 'lucide-react'

interface OAuthClient {
  id: string
  name: string
  description: string
  clientId: string
  clientSecret: string
  redirectUris: string[]
  scopes: string[]
  type: 'confidential' | 'public'
  status: 'active' | 'inactive'
  createdAt: string
}

interface ClientFormProps {
  client?: OAuthClient | null
  onSubmit: (clientData: Omit<OAuthClient, 'id' | 'clientId' | 'clientSecret' | 'createdAt'>) => void
  onCancel: () => void
}

const AVAILABLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'read:users',
  'write:users',
  'admin:system'
]

export default function ClientForm({ client, onSubmit, onCancel }: ClientFormProps) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    description: client?.description || '',
    type: client?.type || 'confidential' as const,
    status: client?.status || 'active' as const,
    redirectUris: client?.redirectUris || [''],
    scopes: client?.scopes || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Filter out empty redirect URIs
    const cleanedData = {
      ...formData,
      redirectUris: formData.redirectUris.filter(uri => uri.trim() !== '')
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
      redirectUris: [...prev.redirectUris, '']
    }))
  }

  const removeRedirectUri = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirectUris: prev.redirectUris.filter((_, i) => i !== index)
    }))
  }

  const updateRedirectUri = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirectUris: prev.redirectUris.map((uri, i) => i === index ? value : uri)
    }))
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
          <Label htmlFor="type">Client Type</Label>
          <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidential">Confidential (Server-side app)</SelectItem>
              <SelectItem value="public">Public (Mobile/SPA)</SelectItem>
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

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
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
          {formData.redirectUris.map((uri, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Input
                value={uri}
                onChange={(e) => updateRedirectUri(index, e.target.value)}
                placeholder="https://your-app.com/callback"
              />
              {formData.redirectUris.length > 1 && (
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
          {AVAILABLE_SCOPES.map((scope) => (
            <div key={scope} className="flex items-center space-x-2">
              <Checkbox
                id={`scope-${scope}`}
                checked={formData.scopes.includes(scope)}
                onCheckedChange={(checked) => handleScopeChange(scope, checked as boolean)}
              />
              <Label htmlFor={`scope-${scope}`} className="text-sm">
                {scope}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Selected: {formData.scopes.length} scope{formData.scopes.length !== 1 ? 's' : ''}
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