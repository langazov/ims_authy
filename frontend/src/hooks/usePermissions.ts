import { useAuth } from '@/contexts/AuthContext'

export function usePermissions() {
  const { user } = useAuth()

  const hasScope = (scope: string): boolean => {
    if (!user) return false
    return user.scopes.includes(scope)
  }

  const hasAnyScope = (scopes: string[]): boolean => {
    if (!user) return false
    return scopes.some(scope => user.scopes.includes(scope))
  }

  const hasAllScopes = (scopes: string[]): boolean => {
    if (!user) return false
    return scopes.every(scope => user.scopes.includes(scope))
  }

  const isInGroup = (groupName: string): boolean => {
    if (!user) return false
    return user.groups.includes(groupName)
  }

  const isAdmin = (): boolean => {
    return hasScope('admin')
  }

  const canManageUsers = (): boolean => {
    return hasAnyScope(['admin', 'user_management'])
  }

  const canManageClients = (): boolean => {
    return hasAnyScope(['admin', 'client_management'])
  }

  const canManageGroups = (): boolean => {
    return hasAnyScope(['admin', 'user_management'])
  }

  return {
    user,
    hasScope,
    hasAnyScope,
    hasAllScopes,
    isInGroup,
    isAdmin,
    canManageUsers,
    canManageClients,
    canManageGroups
  }
}