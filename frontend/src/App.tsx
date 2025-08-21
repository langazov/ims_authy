import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AuthenticatedApp from '@/components/AuthenticatedApp'
import EnhancedLoginPage from '@/components/EnhancedLoginPage'
import CallbackPage from '@/components/CallbackPage'
import Setup from '@/pages/Setup'

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null)
  const [checkingSetup, setCheckingSetup] = useState(true)

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://oauth2.imsc.eu'
      const response = await fetch(`${API_BASE}/api/setup/status`)
      const status = await response.json()
      setSetupRequired(status.setup_required)
    } catch (error) {
      console.error('Failed to check setup status:', error)
      // If we can't check setup status, assume it's not required
      setSetupRequired(false)
    } finally {
      setCheckingSetup(false)
    }
  }

  if (checkingSetup || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show setup page if setup is required
  if (setupRequired) {
    return <Setup />
  }

  if (window.location.pathname === '/callback') {
    return <CallbackPage />
  }

  // Handle OAuth callback parameters on /login (for backward compatibility)
  if (window.location.pathname === '/login' && window.location.search.includes('code=')) {
    return <CallbackPage />
  }

  // Handle setup URL even when setup is not required (redirect to login)
  if (window.location.pathname === '/setup') {
    window.location.href = '/'
    return null
  }

  if (!isAuthenticated) {
    return <EnhancedLoginPage />
  }

  return <AuthenticatedApp />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App