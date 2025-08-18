import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant } from '@/types/tenant';
import { tenantService } from '@/lib/tenantService';

interface TenantContextType {
  activeTenant: Tenant | null;
  availableTenants: Tenant[];
  loading: boolean;
  error: string | null;
  setActiveTenant: (tenant: Tenant | null) => void;
  refreshTenants: () => Promise<void>;
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

  // Update auth context with active tenant ID when it changes
  useEffect(() => {
    if (activeTenant) {
      // Store active tenant ID for API requests
      localStorage.setItem('activeTenantId', activeTenant.id || '');
    } else {
      // Don't remove the stored tenant during initial loading (avoids race with refreshTenants)
      // Only remove when we're not loading tenants (e.g. explicit clear/logout)
      if (!loading) {
        localStorage.removeItem('activeTenantId');
      }
    }
  }, [activeTenant]);

  const value: TenantContextType = {
    activeTenant,
    availableTenants,
    loading,
    error,
    setActiveTenant,
    refreshTenants
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