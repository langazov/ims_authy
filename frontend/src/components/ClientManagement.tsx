import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import ClientForm from './ClientForm'
import AccessDenied from './AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'
import { apiClient } from '@/lib/api'
import { useTenant } from '@/contexts/TenantContext'

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
  // Frontend-only fields for display
  clientSecret?: string
  type?: 'confidential' | 'public'
}

interface ClientFormData {
  name: string
  description: string
  redirect_uris: string[]
  scopes: string[]
  grant_types: string[]
  active: boolean
}

export default function ClientManagement() {
  const { canManageClients } = usePermissions()
  const { onTenantChange, activeTenant } = useTenant()
  const [clients, setClients] = useState<OAuthClient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<OAuthClient | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [newlyCreatedClient, setNewlyCreatedClient] = useState<OAuthClient | null>(null)

  // Check permissions
  if (!canManageClients()) {
    return (
      <AccessDenied 
        title="OAuth Client Management"
        message="You don't have permission to manage OAuth clients."
        requiredPermissions={['admin', 'client_management']}
      />
    )
  }

  const safeClients = clients || []

  // Fetch clients from backend (filtered by activeTenantId)
  const fetchClients = useCallback(async () => {
    // Don't fetch if no active tenant is set
    if (!activeTenant?.id) {
      setClients([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Ensure localStorage is updated before making API calls
      localStorage.setItem('activeTenantId', activeTenant.id)
      
      const fetchedClients = await apiClient.clients.getAll()
      setClients(fetchedClients)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTenant])

  useEffect(() => {
    fetchClients()
  }, [fetchClients, activeTenant]) // Add activeTenant dependency to reload when tenant changes

  // Register for tenant change events to reload data (for when component is already mounted)
  useEffect(() => {
    const cleanup = onTenantChange(() => {
      fetchClients()
      setVisibleSecrets(new Set()) // Clear visible secrets on tenant change
      setNewlyCreatedClient(null) // Clear newly created client on tenant change
    })
    
    return cleanup
  }, [onTenantChange, fetchClients])
  
  const filteredClients = safeClients.filter(client =>
    client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.client_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )


  const handleCreateClient = async (clientData: ClientFormData) => {
    try {
      const newClient = await apiClient.clients.create(clientData)
      // Add the client secret to the client object for display
      const clientWithSecret = {
        ...newClient,
        clientSecret: newClient.client_secret
      }
      setClients(prev => [...prev, clientWithSecret])
      setIsDialogOpen(false)
      setSelectedClient(null)
      
      // Make the secret visible immediately and show important notice
      setVisibleSecrets(prev => new Set([...prev, newClient.id]))
      setNewlyCreatedClient(clientWithSecret)
      toast.success('OAuth client created successfully - make sure to copy the client secret!')
    } catch (error) {
      console.error('Error creating client:', error)
      toast.error('Failed to create client')
    }
  }

  const handleUpdateClient = async (clientData: ClientFormData) => {
    if (!selectedClient) return
    
    try {
      const updatedClient = await apiClient.clients.update(selectedClient.id, clientData)
      setClients(prev => prev.map(client => 
        client.id === selectedClient.id ? updatedClient : client
      ))
      setIsDialogOpen(false)
      setSelectedClient(null)
      toast.success('OAuth client updated successfully')
    } catch (error) {
      console.error('Error updating client:', error)
      toast.error('Failed to update client')
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this OAuth client? This action cannot be undone.')) {
      return
    }
    
    try {
      await apiClient.clients.delete(clientId)
      setClients(prev => prev.filter(client => client.id !== clientId))
      toast.success('OAuth client deleted successfully')
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Failed to delete client')
    }
  }

  const handleRegenerateSecret = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to regenerate the client secret for "${clientName}"? The current secret will be invalidated and cannot be recovered.`)) {
      return
    }
    
    try {
      const result = await apiClient.clients.regenerateSecret(clientId)
      // Update the client with new secret in state
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, clientSecret: result.client_secret }
          : client
      ))
      // Show the secret and make it visible
      setVisibleSecrets(prev => new Set([...prev, clientId]))
      toast.success('Client secret regenerated successfully')
      
      // Show warning about copying the secret
      setTimeout(() => {
        toast.warning('Make sure to copy the new client secret - it won\'t be shown again!')
      }, 1000)
    } catch (error) {
      console.error('Error regenerating secret:', error)
      toast.error('Failed to regenerate client secret')
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const toggleSecretVisibility = (clientId: string) => {
    setVisibleSecrets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const getStatusBadgeColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const getTypeBadgeColor = (type: string) => {
    return type === 'confidential' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">OAuth Client Management</h2>
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading OAuth clients...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {newlyCreatedClient && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="space-y-3">
            <div className="font-medium text-green-800">
              🎉 OAuth Client "{newlyCreatedClient.name}" created successfully!
            </div>
            <div className="text-sm text-green-700">
              <strong>⚠️ IMPORTANT:</strong> Copy your client secret now - it won't be displayed again after you refresh the page.
            </div>
            <div className="flex items-center space-x-2 p-3 bg-white rounded border">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">Client Secret:</div>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {newlyCreatedClient.clientSecret}
                </code>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  copyToClipboard(newlyCreatedClient.clientSecret || '', 'Client Secret')
                  setNewlyCreatedClient(null)
                }}
              >
                <Copy size={12} className="mr-1" />
                Copy & Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">OAuth Client Management</h2>
          <p className="text-muted-foreground">Manage OAuth2 client applications and their configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedClient(null)}>
              <Plus size={16} className="mr-2" />
              Register Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedClient ? 'Edit OAuth Client' : 'Register New OAuth Client'}
              </DialogTitle>
              <DialogDescription>
                {selectedClient 
                  ? 'Modify OAuth client settings including redirect URIs, scopes, and permissions.' 
                  : 'Create a new OAuth2 client application with custom redirect URIs and permission scopes.'
                }
              </DialogDescription>
            </DialogHeader>
            <ClientForm
              client={selectedClient}
              onSubmit={selectedClient ? handleUpdateClient : handleCreateClient}
              onCancel={() => {
                setIsDialogOpen(false)
                setSelectedClient(null)
              }}
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
                placeholder="Search OAuth clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredClients.length} of {safeClients.length} clients
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Plus size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No OAuth clients found</h3>
              <p className="text-muted-foreground mb-4">
                {safeClients.length === 0 ? 'Get started by registering your first OAuth client' : 'Try adjusting your search terms'}
              </p>
              {safeClients.length === 0 && (
                <Button onClick={() => {
                  setSelectedClient(null)
                  setIsDialogOpen(true)
                }}>
                  <Plus size={16} className="mr-2" />
                  Register First Client
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Client Secret</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{client.client_id}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(client.client_id, 'Client ID')}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {visibleSecrets.has(client.id) ? (client.clientSecret || 'Not available') : '••••••••••••••••'}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSecretVisibility(client.id)}
                        >
                          {visibleSecrets.has(client.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(client.clientSecret || 'Not available', 'Client Secret')}
                        >
                          <Copy size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRegenerateSecret(client.id, client.name)}
                          title="Regenerate Client Secret"
                        >
                          <RefreshCw size={12} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeBadgeColor(client.type || 'public')}>
                        {client.type || 'public'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(client.active ? 'active' : 'inactive')}>
                        {client.active ? 'active' : 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.scopes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.scopes.slice(0, 2).map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                          {client.scopes.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{client.scopes.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No scopes</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedClient(client)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClient(client.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}