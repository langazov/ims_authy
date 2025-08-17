export interface TenantBranding {
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TenantSettings {
  allowUserRegistration?: boolean;
  requireTwoFactor?: boolean;
  sessionTimeout?: number; // in minutes
  customBranding?: TenantBranding;
}

export interface Tenant {
  id?: string;
  name?: string;
  domain?: string;
  subdomain?: string;
  active?: boolean;
  settings?: TenantSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTenantRequest {
  name: string;
  domain: string;
  subdomain: string;
  settings: TenantSettings;
}

export interface UpdateTenantRequest {
  name: string;
  domain: string;
  subdomain: string;
  settings: TenantSettings;
}