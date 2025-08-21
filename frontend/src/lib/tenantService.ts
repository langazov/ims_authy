import { config } from './config';
import { authService } from './auth';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from '@/types/tenant';

class TenantService {
  private readonly baseUrl = `${config.apiBaseUrl}/api/v1/tenants`;

  async getAllTenants(): Promise<Tenant[]> {
    const response = await authService.makeAuthenticatedRequest(this.baseUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch tenants');
    }
    
    return response.json();
  }

  async getTenantById(id: string): Promise<Tenant> {
    const response = await authService.makeAuthenticatedRequest(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch tenant');
    }
    
    return response.json();
  }

  async createTenant(tenantData: CreateTenantRequest): Promise<Tenant> {
    const response = await authService.makeAuthenticatedRequest(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create tenant: ${errorText}`);
    }
    
    return response.json();
  }

  async updateTenant(id: string, tenantData: UpdateTenantRequest): Promise<Tenant> {
    const response = await authService.makeAuthenticatedRequest(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update tenant: ${errorText}`);
    }
    
    return response.json();
  }

  async deleteTenant(id: string): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete tenant: ${errorText}`);
    }
  }
}

export const tenantService = new TenantService();