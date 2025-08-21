import React, { useState, useEffect } from 'react';
import { Tenant } from '@/types/tenant';
import { tenantService } from '@/lib/tenantService';
import { useTenant } from '@/contexts/TenantContext';

interface TenantListProps {
  onSelectTenant: (tenant: Tenant) => void;
  onCreateTenant: () => void;
  selectedTenant?: Tenant;
}

export const TenantList: React.FC<TenantListProps> = ({
  onSelectTenant,
  onCreateTenant,
  selectedTenant
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshTenants: refreshTenantContext } = useTenant();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const tenantsData = await tenantService.getAllTenants();
      setTenants(tenantsData);
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete tenant "${tenant.name}"?`)) {
      return;
    }

    try {
      await tenantService.deleteTenant(tenant.id!);
      await loadTenants();
      // Also refresh the tenant context
      await refreshTenantContext();
    } catch (err) {
      console.error('Failed to delete tenant:', err);
      alert('Failed to delete tenant: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-red-600">
          <h3 className="text-lg font-medium mb-2">Error Loading Tenants</h3>
          <p>{error}</p>
          <button
            onClick={loadTenants}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Tenants</h3>
          <button
            onClick={onCreateTenant}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Create Tenant
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {tenants.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>No tenants found</p>
            <button
              onClick={onCreateTenant}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Create your first tenant
            </button>
          </div>
        ) : (
          tenants.map((tenant) => (
            <div
              key={tenant.id}
              onClick={() => onSelectTenant(tenant)}
              className={`px-6 py-4 cursor-pointer hover:bg-gray-50 ${
                selectedTenant?.id === tenant.id ? 'bg-blue-50 border-r-4 border-blue-600' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-lg font-medium text-gray-900">{tenant.name}</h4>
                    <span
                      className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tenant.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tenant.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <p><span className="font-medium">Domain:</span> {tenant.domain}</p>
                    <p><span className="font-medium">Subdomain:</span> {tenant.subdomain}</p>
                    <p><span className="font-medium">Company:</span> {tenant.settings?.customBranding?.companyName || 'N/A'}</p>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Created: {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => handleDeleteTenant(tenant, e)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Delete tenant"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};