import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Search, Edit, Trash2, Settings, Tag, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import ScopeForm from './ScopeForm'
import AccessDenied from './AccessDenied'
import { usePermissions } from '@/hooks/usePermissions'
import { apiClient } from '@/lib/api'

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

interface ScopesByCategory {
  [category: string]: Scope[]
}

const getCategoryIcon = (category: string) => {
  const icons = {
    basic: '📚',
    administrative: '🔧',
    management: '👥',
    oauth: '🔑',
    profile: '👤',
    users: '👥',
    groups: '🏢',
    clients: '📱',
    testing: '🧪'
  }
  return icons[category as keyof typeof icons] || '🏷️'
}

const getCategoryColor = (category: string) => {
  const colors = {
    basic: 'bg-blue-100 text-blue-800',
    administrative: 'bg-red-100 text-red-800',
    management: 'bg-purple-100 text-purple-800',
    oauth: 'bg-green-100 text-green-800',
    profile: 'bg-orange-100 text-orange-800',
    users: 'bg-indigo-100 text-indigo-800',
    groups: 'bg-pink-100 text-pink-800',
    clients: 'bg-yellow-100 text-yellow-800',
    testing: 'bg-gray-100 text-gray-800'
  }
  return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

export default function ScopeManagement() {
  const { isAdmin } = usePermissions()
  const [scopes, setScopes] = useState<Scope[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedScope, setSelectedScope] = useState<Scope | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Check permissions - only admin can manage scopes
  if (!isAdmin()) {
    return (
      <AccessDenied 
        title="Scope Management"
        message="You don't have permission to manage OAuth scopes and permissions."
        requiredPermissions={['admin']}
      />
    )
  }

  const safeScopes = scopes || []

  // Fetch scopes from backend
  useEffect(() => {
    const fetchScopes = async () => {
      try {
        const fetchedScopes = await apiClient.scopes.getAll()
        setScopes(fetchedScopes || [])
      } catch (error) {
        console.error('Failed to fetch scopes:', error)
        toast.error('Failed to load scopes')
        setScopes([])
      } finally {
        setLoading(false)
      }
    }

    fetchScopes()
  }, [])

  // Group scopes by category and filter by search term
  const scopesByCategory: ScopesByCategory = safeScopes
    .filter(scope => 
      scope.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scope.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scope.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scope.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(scope => selectedCategory ? scope.category === selectedCategory : true)
    .reduce((acc, scope) => {
      const category = scope.category || 'uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(scope)
      return acc
    }, {} as ScopesByCategory)

  // Get unique categories for filtering
  const categories = Array.from(new Set(safeScopes.map(scope => scope.category || 'uncategorized')))
    .sort()

  const totalScopes = safeScopes.length
  const activeScopes = safeScopes.filter(scope => scope.active).length
  const filteredScopes = Object.values(scopesByCategory).flat().length

  const handleCreateScope = async (scopeData: Omit<Scope, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newScope = await apiClient.scopes.create(scopeData)
      setScopes(prev => [...prev, newScope])
      setIsDialogOpen(false)
      setSelectedScope(null)
      toast.success('Scope created successfully')
    } catch (error) {
      console.error('Error creating scope:', error)
      toast.error('Failed to create scope')
    }
  }

  const handleUpdateScope = async (scopeData: Omit<Scope, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedScope) return
    
    try {
      await apiClient.scopes.update(selectedScope.id, scopeData)
      setScopes(prev => prev.map(scope => 
        scope.id === selectedScope.id 
          ? { ...scope, ...scopeData, updated_at: new Date().toISOString() }
          : scope
      ))
      setIsDialogOpen(false)
      setSelectedScope(null)
      toast.success('Scope updated successfully')
    } catch (error) {
      console.error('Error updating scope:', error)
      toast.error('Failed to update scope')
    }
  }

  const handleDeleteScope = async (scopeId: string, scopeName: string) => {
    if (!confirm(`Are you sure you want to delete the scope "${scopeName}"? This action cannot be undone and may affect existing users and applications.`)) {
      return
    }
    
    try {
      await apiClient.scopes.delete(scopeId)
      setScopes(prev => prev.filter(scope => scope.id !== scopeId))
      toast.success('Scope deleted successfully')
    } catch (error) {
      console.error('Error deleting scope:', error)
      toast.error('Failed to delete scope')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Scope Management</h2>
            <p className="text-muted-foreground">Loading scopes...</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading scopes...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Scope Management</h2>
          <p className="text-muted-foreground">Manage OAuth scopes and permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedScope(null)}>
              <Plus size={16} className="mr-2" />
              Create Scope
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedScope ? 'Edit Scope' : 'Create New Scope'}</DialogTitle>
              <DialogDescription>
                {selectedScope 
                  ? 'Modify the scope configuration and permissions.' 
                  : 'Create a new OAuth scope with specific permissions and access levels.'
                }
              </DialogDescription>
            </DialogHeader>
            <ScopeForm
              scope={selectedScope}
              onSubmit={selectedScope ? handleUpdateScope : handleCreateScope}
              onCancel={() => {
                setIsDialogOpen(false)
                setSelectedScope(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scopes</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScopes}</div>
            <p className="text-xs text-muted-foreground">
              Available permissions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Scopes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeScopes}</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Permission groups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search scopes by name, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={selectedCategory ? "outline" : "default"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Categories
              </Button>
              <div className="flex flex-wrap gap-1">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    className="text-xs"
                  >
                    {getCategoryIcon(category)} {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredScopes} of {totalScopes} scopes
            {selectedCategory && ` in "${selectedCategory}" category`}
          </div>
        </CardHeader>
      </Card>

      {/* Warning for system scopes */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> Modifying or deleting scopes may affect existing users, groups, and OAuth clients. 
          Always verify dependencies before making changes to critical system scopes.
        </AlertDescription>
      </Alert>

      {/* Scopes by Category */}
      {Object.keys(scopesByCategory).length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Tag size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No scopes found</h3>
              <p className="text-muted-foreground mb-4">
                {safeScopes.length === 0 
                  ? 'Get started by creating your first scope' 
                  : 'Try adjusting your search terms or category filter'
                }
              </p>
              {safeScopes.length === 0 && (
                <Button onClick={() => {
                  setSelectedScope(null)
                  setIsDialogOpen(true)
                }}>
                  <Plus size={16} className="mr-2" />
                  Create First Scope
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(scopesByCategory)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, categoryScopes]) => (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getCategoryIcon(category)}</span>
                      <div>
                        <CardTitle className="capitalize">{category}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {categoryScopes.length} scope{categoryScopes.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge className={getCategoryColor(category)}>
                      {category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryScopes.map((scope) => (
                      <Card key={scope.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <CardTitle className="text-base">{scope.display_name}</CardTitle>
                                <Badge 
                                  variant={scope.active ? "default" : "secondary"}
                                  className={scope.active ? "bg-green-100 text-green-800" : ""}
                                >
                                  {scope.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded mt-1 inline-block">
                                {scope.name}
                              </code>
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedScope(scope)
                                  setIsDialogOpen(true)
                                }}
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteScope(scope.id, scope.display_name)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{scope.description}</p>
                          
                          <div className="pt-2 border-t text-xs text-muted-foreground">
                            <div>Created: {new Date(scope.created_at).toLocaleDateString()}</div>
                            {scope.updated_at !== scope.created_at && (
                              <div>Updated: {new Date(scope.updated_at).toLocaleDateString()}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}