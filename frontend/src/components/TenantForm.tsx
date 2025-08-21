import React, { useState, useEffect } from 'react';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from '@/types/tenant';

interface TenantFormProps {
  tenant?: Tenant;
  onSubmit: (data: CreateTenantRequest | UpdateTenantRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({
  tenant,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    domain: '',
    subdomain: '',
    settings: {
      allowUserRegistration: true,
      requireTwoFactor: false,
      sessionTimeout: 60,
      customBranding: {
        companyName: '',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af'
      }
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        domain: tenant.domain || '',
        subdomain: tenant.subdomain || '',
        settings: {
          allowUserRegistration: tenant.settings?.allowUserRegistration ?? true,
          requireTwoFactor: tenant.settings?.requireTwoFactor ?? false,
          sessionTimeout: tenant.settings?.sessionTimeout ?? 60,
          customBranding: {
            companyName: tenant.settings?.customBranding?.companyName || '',
            primaryColor: tenant.settings?.customBranding?.primaryColor || '#3b82f6',
            secondaryColor: tenant.settings?.customBranding?.secondaryColor || '#1e40af',
            logoUrl: tenant.settings?.customBranding?.logoUrl || ''
          }
        }
      });
    }
  }, [tenant]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.domain.trim()) {
      newErrors.domain = 'Domain is required';
    } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.domain)) {
      newErrors.domain = 'Invalid domain format';
    }

    if (!formData.subdomain.trim()) {
      newErrors.subdomain = 'Subdomain is required';
    } else if (!/^[a-zA-Z0-9-]+$/.test(formData.subdomain)) {
      newErrors.subdomain = 'Subdomain can only contain letters, numbers, and hyphens';
    }

    if (!formData.settings.customBranding?.companyName?.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if ((formData.settings.sessionTimeout || 0) < 1) {
      newErrors.sessionTimeout = 'Session timeout must be at least 1 minute';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2 && keys[0] === 'settings') {
        return {
          ...prev,
          settings: {
            ...prev.settings,
            [keys[1]]: value
          }
        };
      } else if (keys.length === 3 && keys[0] === 'settings' && keys[1] === 'customBranding') {
        return {
          ...prev,
          settings: {
            ...prev.settings,
            customBranding: {
              ...(prev.settings.customBranding || {}),
              [keys[2]]: value
            }
          }
        };
      }
      return prev;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {tenant ? 'Edit Tenant' : 'Create New Tenant'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Tenant Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter tenant name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Domain *
            </label>
            <input
              type="text"
              id="domain"
              value={formData.domain}
              onChange={(e) => handleInputChange('domain', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.domain ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example.com"
            />
            {errors.domain && <p className="mt-1 text-sm text-red-600">{errors.domain}</p>}
          </div>

          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-2">
              Subdomain *
            </label>
            <input
              type="text"
              id="subdomain"
              value={formData.subdomain}
              onChange={(e) => handleInputChange('subdomain', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.subdomain ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="acme"
            />
            {errors.subdomain && <p className="mt-1 text-sm text-red-600">{errors.subdomain}</p>}
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              id="companyName"
              value={formData.settings.customBranding?.companyName || ''}
              onChange={(e) => handleInputChange('settings.customBranding.companyName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.companyName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ACME Corporation"
            />
            {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
          </div>
        </div>

        {/* Settings */}
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Tenant Settings</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                id="sessionTimeout"
                min="1"
                value={formData.settings.sessionTimeout || 60}
                onChange={(e) => handleInputChange('settings.sessionTimeout', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.sessionTimeout ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.sessionTimeout && <p className="mt-1 text-sm text-red-600">{errors.sessionTimeout}</p>}
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowUserRegistration"
                  checked={formData.settings.allowUserRegistration || false}
                  onChange={(e) => handleInputChange('settings.allowUserRegistration', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowUserRegistration" className="ml-2 block text-sm text-gray-700">
                  Allow User Registration
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireTwoFactor"
                  checked={formData.settings.requireTwoFactor || false}
                  onChange={(e) => handleInputChange('settings.requireTwoFactor', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requireTwoFactor" className="ml-2 block text-sm text-gray-700">
                  Require Two-Factor Authentication
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Branding</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  id="primaryColor"
                  value={formData.settings.customBranding?.primaryColor || '#3b82f6'}
                  onChange={(e) => handleInputChange('settings.customBranding.primaryColor', e.target.value)}
                  className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.settings.customBranding?.primaryColor || '#3b82f6'}
                  onChange={(e) => handleInputChange('settings.customBranding.primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  id="secondaryColor"
                  value={formData.settings.customBranding?.secondaryColor || '#1e40af'}
                  onChange={(e) => handleInputChange('settings.customBranding.secondaryColor', e.target.value)}
                  className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.settings.customBranding?.secondaryColor || '#1e40af'}
                  onChange={(e) => handleInputChange('settings.customBranding.secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#1e40af"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL (optional)
              </label>
              <input
                type="url"
                id="logoUrl"
                value={formData.settings.customBranding?.logoUrl || ''}
                onChange={(e) => handleInputChange('settings.customBranding.logoUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : tenant ? 'Update Tenant' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  );
};