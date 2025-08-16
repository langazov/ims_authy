import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import ClientForm from './ClientForm'

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

export default function ClientManagement() {
  // Temporarily use local state to test if the component renders
  const [clients, setClients] = useState<OAuthClient[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<OAuthClient | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())

  const safeClients = clients || []
  
  const filteredClients = safeClients.filter(client =>
    client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.clientId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const generateClientCredentials = () => {
    const clientId = `client_${Date.now()}`
    const clientSecret = `cs_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`
    return { clientId, clientSecret }
  }

  const handleCreateClient = (clientData: Omit<OAuthClient, 'id' | 'clientId' | 'clientSecret' | 'createdAt'>) => {
    const { clientId, clientSecret } = generateClientCredentials()
    const newClient: OAuthClient = {
      ...clientData,
      id: `oauth_client_${Date.now()}`,
      clientId,
      clientSecret,
      createdAt: new Date().toISOString()
    }
    
    setClients([...safeClients, newClient])
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'client' as const,
      action: 'Created OAuth client',
      target: clientData.name,
      timestamp: new Date().toLocaleString()
    }, ...activity])
    
    setIsDialogOpen(false)
    toast.success(`OAuth client "${clientData.name}" created successfully`)
  }

  const handleUpdateClient = (clientData: Omit<OAuthClient, 'id' | 'clientId' | 'clientSecret' | 'createdAt'>) => {
    if (!selectedClient) return
    
    setClients(safeClients.map(client =>
      client.id === selectedClient.id
        ? { ...client, ...clientData }
        : client
    ))
    
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'client' as const,
      action: 'Updated OAuth client',
      target: clientData.name,
      timestamp: new Date().toLocaleString()
    }, ...activity])
    
    setSelectedClient(null)
    setIsDialogOpen(false)
    toast.success(`OAuth client "${clientData.name}" updated successfully`)
  }

  const handleDeleteClient = (clientId: string) => {
    const client = safeClients.find(c => c.id === clientId)
    if (!client) return
    
    setClients(safeClients.filter(c => c.id !== clientId))
    setActivity([{
      id: `activity_${Date.now()}`,
      type: 'client' as const,
      action: 'Deleted OAuth client',
      target: client.name,
      timestamp: new Date().toLocaleString()
    }, ...activity])
    
    toast.success(`OAuth client "${client.name}" deleted`)
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

  const getStatusBadgeColor = (status: OAuthClient['status']) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const getTypeBadgeColor = (type: OAuthClient['type']) => {
    return type === 'confidential' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
  }

  return (
    <div className="space-y-6">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedClient ? 'Edit OAuth Client' : 'Register New OAuth Client'}</DialogTitle>
            </DialogHeader>
            <ClientForm
              client={selectedClient}
              onSubmit={selectedClient ? handleUpdateClient : handleCreateClient}
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
                <Button onClick={() => setIsDialogOpen(true)}>
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
                        <code className="text-sm bg-muted px-2 py-1 rounded">{client.clientId}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(client.clientId, 'Client ID')}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {visibleSecrets.has(client.id) ? client.clientSecret : '••••••••••••••••'}
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
                          onClick={() => copyToClipboard(client.clientSecret, 'Client Secret')}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeBadgeColor(client.type)}>
                        {client.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(client.status)}>
                        {client.status}
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