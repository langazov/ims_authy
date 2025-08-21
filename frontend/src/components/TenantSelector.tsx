import React, { useState } from 'react';
import { ChevronDown, Building, Check } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { Tenant } from '@/types/tenant';

interface TenantSelectorProps {
  className?: string;
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({ className = '' }) => {
  const { activeTenant, availableTenants, setActiveTenant, loading } = useTenant();
  const [isOpen, setIsOpen] = useState(false);

  const handleTenantSelect = (tenant: Tenant) => {
    setActiveTenant(tenant);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Building size={16} className="text-gray-400" />
        <div className="animate-pulse bg-gray-200 rounded w-24 h-4"></div>
      </div>
    );
  }

  if (availableTenants.length === 0) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <Building size={16} />
        <span className="text-sm">No tenants available</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
      >
        <Building size={16} className="text-gray-600" />
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">
            {activeTenant?.name || 'Select Tenant'}
          </div>
          {activeTenant?.domain && (
            <div className="text-xs text-gray-500">
              {activeTenant.domain}
            </div>
          )}
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
            {availableTenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleTenantSelect(tenant)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{tenant.name}</div>
                  <div className="text-xs text-gray-500">
                    {tenant.domain} • {tenant.subdomain}
                  </div>
                  {tenant.settings?.customBranding?.companyName && (
                    <div className="text-xs text-gray-400">
                      {tenant.settings.customBranding.companyName}
                    </div>
                  )}
                </div>
                
                {activeTenant?.id === tenant.id && (
                  <Check size={16} className="text-blue-600" />
                )}
                
                <div className="ml-2">
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