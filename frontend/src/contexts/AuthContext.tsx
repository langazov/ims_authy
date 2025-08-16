import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authService, User } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => void
  handleCallback: (code: string, state: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        authService.logout()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = () => {
    authService.startLogin()
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const handleCallback = async (code: string, state: string) => {
    try {
      setIsLoading(true)
      const user = await authService.handleCallback(code, state)
      setUser(user)
    } catch (error) {
      console.error('Callback handling failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    handleCallback
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}