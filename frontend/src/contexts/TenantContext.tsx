import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Tenant } from '@/types/tenant';
import { tenantService } from '@/lib/tenantService';

interface TenantContextType {
  activeTenant: Tenant | null;
  availableTenants: Tenant[];
  loading: boolean;
  error: string | null;
  setActiveTenant: (tenant: Tenant | null) => void;
  refreshTenants: () => Promise<void>;
  onTenantChange: (callback: () => void) => () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantChangeCallbacks, setTenantChangeCallbacks] = useState<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const tenants = await tenantService.getAllTenants();
      setAvailableTenants(tenants);
      // Try to restore active tenant from localStorage
      const storedActiveTenantId = localStorage.getItem('activeTenantId');
      if (storedActiveTenantId) {
        const matched = tenants.find((t) => t.id === storedActiveTenantId);
        if (matched) {
          setActiveTenant(matched);
        } else {
          // Stored id not found in the current list; clear it and fallback
          localStorage.removeItem('activeTenantId');
          if (!activeTenant && tenants.length > 0) {
            setActiveTenant(tenants[0]);
          }
        }
      } else {
        // If no active tenant is set and there are tenants available, set the first one
        if (!activeTenant && tenants.length > 0) {
          setActiveTenant(tenants[0]);
        }
      }
    } catch (err) {
      console.error('Failed to refresh tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTenants();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle tenant switching callback registration
  const onTenantChange = (callback: () => void) => {
    setTenantChangeCallbacks(prev => [...prev, callback]);
    
    // Return cleanup function
    return () => {
      setTenantChangeCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  };

  // Update auth context with active tenant ID when it changes
  useEffect(() => {
    if (activeTenant) {
      // Store active tenant ID for API requests
      localStorage.setItem('activeTenantId', activeTenant.id || '');
      
      // Trigger all registered callbacks when tenant changes (but not on initial load)
      // Debounce the callback execution to prevent too many simultaneous requests
      if (!loading) {
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Set a new timeout to execute callbacks after a brief delay
        timeoutRef.current = setTimeout(() => {
          // Execute callbacks sequentially with small delays to prevent overwhelming the server
          tenantChangeCallbacks.forEach((callback, index) => {
            setTimeout(() => {
              try {
                callback();
              } catch (error) {
                console.error('Error in tenant change callback:', error);
              }
            }, index * 100); // 100ms delay between each callback
          });
        }, 200); // 200ms initial delay
      }
    } else {
      // Don't remove the stored tenant during initial loading (avoids race with refreshTenants)
      // Only remove when we're not loading tenants (e.g. explicit clear/logout)
      if (!loading) {
        localStorage.removeItem('activeTenantId');
      }
    }
  }, [activeTenant, tenantChangeCallbacks, loading]);

  const value: TenantContextType = {
    activeTenant,
    availableTenants,
    loading,
    error,
    setActiveTenant,
    refreshTenants,
    onTenantChange
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};