import React, { useState } from 'react';
import { TenantList } from '@/components/TenantList';
import { TenantForm } from '@/components/TenantForm';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from '@/types/tenant';
import { tenantService } from '@/lib/tenantService';
import { useTenant } from '@/contexts/TenantContext';

export const TenantManagement: React.FC = () => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshTenants } = useTenant();

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowForm(false);
    setEditingTenant(undefined);
  };

  const handleCreateTenant = () => {
    setEditingTenant(undefined);
    setSelectedTenant(undefined);
    setShowForm(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setSelectedTenant(undefined);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: CreateTenantRequest | UpdateTenantRequest) => {
    try {
      setLoading(true);
      setError(null);

      if (editingTenant) {
        const updatedTenant = await tenantService.updateTenant(editingTenant.id!, data as UpdateTenantRequest);
        setSelectedTenant(updatedTenant);
      } else {
        const newTenant = await tenantService.createTenant(data as CreateTenantRequest);
        setSelectedTenant(newTenant);
      }

      setShowForm(false);
      setEditingTenant(undefined);
      
      // Refresh the tenant context
      await refreshTenants();
    } catch (err) {
      console.error('Failed to save tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to save tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTenant(undefined);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tenant Management</h1>
          <p className="mt-2 text-gray-600">
            Manage tenant organizations and their settings
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tenant List */}
          <div className="lg:col-span-1">
            <TenantList
              onSelectTenant={handleSelectTenant}
              onCreateTenant={handleCreateTenant}
              selectedTenant={selectedTenant}
            />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {showForm ? (
              <TenantForm
                tenant={editingTenant}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                loading={loading}
              />
            ) : selectedTenant ? (
              <TenantDetails
                tenant={selectedTenant}
                onEdit={() => handleEditTenant(selectedTenant)}
              />
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <div className="text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Tenant Selected</h3>
                  <p className="text-gray-600">Select a tenant from the list to view details, or create a new one.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Tenant Details Component
interface TenantDetailsProps {
  tenant: Tenant;
  onEdit: () => void;
}

const TenantDetails: React.FC<TenantDetailsProps> = ({ tenant, onEdit }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Tenant Details</h3>
          <button
            onClick={onEdit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Edit Tenant
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID</label>
              <div className="mt-1 flex items-center">
                <p className="text-sm text-gray-900 font-mono">{tenant.id}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(tenant.id || '')}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                  title="Copy tenant ID"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{tenant.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <p className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tenant.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {tenant.active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Domain</label>
              <p className="mt-1 text-sm text-gray-900">{tenant.domain}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Subdomain</label>
              <p className="mt-1 text-sm text-gray-900">{tenant.subdomain}</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Session Timeout</label>
              <p className="mt-1 text-sm text-gray-900">{tenant.settings?.sessionTimeout || 'N/A'} minutes</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">User Registration</label>
              <p className="mt-1 text-sm text-gray-900">
                {tenant.settings?.allowUserRegistration ? 'Allowed' : 'Disabled'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Two-Factor Authentication</label>
              <p className="mt-1 text-sm text-gray-900">
                {tenant.settings?.requireTwoFactor ? 'Required' : 'Optional'}
              </p>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Branding</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <p className="mt-1 text-sm text-gray-900">{tenant.settings?.customBranding?.companyName || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Colors</label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: tenant.settings?.customBranding?.primaryColor || '#3b82f6' }}
                  ></div>
                  <span className="text-sm text-gray-900">{tenant.settings?.customBranding?.primaryColor || '#3b82f6'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: tenant.settings?.customBranding?.secondaryColor || '#1e40af' }}
                  ></div>
                  <span className="text-sm text-gray-900">{tenant.settings?.customBranding?.secondaryColor || '#1e40af'}</span>
                </div>
              </div>
            </div>
            {tenant.settings?.customBranding?.logoUrl && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Logo</label>
                <div className="mt-1">
                  <img
                    src={tenant.settings.customBranding.logoUrl}
                    alt="Tenant Logo"
                    className="h-12 w-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-1">{tenant.settings.customBranding.logoUrl}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Timestamps</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {tenant.createdAt ? new Date(tenant.createdAt).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Updated</label>
              <p className="mt-1 text-sm text-gray-900">
                {tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};