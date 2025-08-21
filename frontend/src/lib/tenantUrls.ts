import { config } from './config';

export class TenantUrlBuilder {
  static buildTenantUrl(tenantId: string, path: string): string {
    return `${config.apiBaseUrl}/tenant/${tenantId}${path}`;
  }

  static buildOAuthAuthorizeUrl(tenantId: string, params: URLSearchParams): string {
    return `${this.buildTenantUrl(tenantId, '/oauth/authorize')}?${params.toString()}`;
  }

  static buildOAuthTokenUrl(tenantId: string): string {
    return this.buildTenantUrl(tenantId, '/oauth/token');
  }

  static buildSocialLoginUrl(tenantId: string, provider: string, params: URLSearchParams): string {
    return `${this.buildTenantUrl(tenantId, `/auth/${provider}/oauth`)}?${params.toString()}`;
  }

  static buildDirectLoginUrl(tenantId: string): string {
    return this.buildTenantUrl(tenantId, '/login');
  }

  // Legacy URLs for backwards compatibility
  static buildLegacyOAuthAuthorizeUrl(params: URLSearchParams): string {
    return `${config.oauth.authUrl}?${params.toString()}`;
  }

  static buildLegacyOAuthTokenUrl(): string {
    return config.oauth.tokenUrl;
  }

  static buildLegacySocialLoginUrl(provider: string, params: URLSearchParams): string {
    return `${config.apiBaseUrl}/auth/${provider}/oauth?${params.toString()}`;
  }

  static buildLegacyDirectLoginUrl(): string {
    return `${config.apiBaseUrl}/login`;
  }

  // Tenant-aware callback URLs
  static buildTenantSocialCallbackUrl(tenantId: string, provider: string): string {
    return this.buildTenantUrl(tenantId, `/auth/${provider}/callback`);
  }

  static buildTenantOAuthCallbackUrl(tenantId: string): string {
    return this.buildTenantUrl(tenantId, '/oauth/callback');
  }

  // Legacy callback URLs (for default tenant fallback)
  static buildLegacySocialCallbackUrl(provider: string): string {
    return `${config.apiBaseUrl}/auth/${provider}/callback`;
  }

  static buildLegacyOAuthCallbackUrl(): string {
    return `${config.apiBaseUrl}/callback`;
  }
}