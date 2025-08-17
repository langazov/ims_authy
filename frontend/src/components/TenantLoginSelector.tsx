import React, { useState, useEffect } from 'react';
import { Building, ChevronDown } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { tenantService } from '@/lib/tenantService';

interface TenantLoginSelectorProps {
  onTenantSelect: (tenant: Tenant | null) => void;
  selectedTenant: Tenant | null;
  className?: string;
}

export const TenantLoginSelector: React.FC<TenantLoginSelectorProps> = ({
  onTenantSelect,
  selectedTenant,
  className = ''
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const tenantsData = await tenantService.getAllTenants();
      setTenants(tenantsData);
      
      // Auto-select first tenant if none selected
      if (!selectedTenant && tenantsData.length > 0) {
        onTenantSelect(tenantsData[0]);
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = (tenant: Tenant) => {
    onTenantSelect(tenant);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Building size={16} className="text-gray-400" />
        <div className="animate-pulse bg-gray-200 rounded w-32 h-8"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        No tenants available
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-2">
          <Building size={16} className="text-gray-600" />
          <div className="text-left">
            <div className="font-medium text-gray-900">
              {selectedTenant?.name || 'Select Organization'}
            </div>
            {selectedTenant?.domain && (
              <div className="text-xs text-gray-500">
                {selectedTenant.domain}
              </div>
            )}
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => handleTenantSelect(tenant)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{tenant.name}</div>
                    <div className="text-xs text-gray-500">
                      {tenant.domain}
                    </div>
                    {tenant.settings?.customBranding?.companyName && (
                      <div className="text-xs text-gray-400">
                        {tenant.settings.customBranding.companyName}
                      </div>
                    )}
                  </div>
                  
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      tenant.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {tenant.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};