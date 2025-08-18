import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface User {
  user_id: string;
  email: string;
  scopes: string[];
  groups: string[];
  two_factor_verified?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  two_fa_code?: string;
}

export interface LoginResponse {
  user_id: string;
  email: string;
  scopes: string[];
  groups: string[];
  two_factor_verified: boolean;
  two_factor_required?: boolean;
  message?: string;
  tokens?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface TwoFactorVerifyRequest {
  code: string;
}

export interface AuthConfig {
  serverUrl: string;
  tenantId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IMSAuthService {
  private readonly TOKEN_KEY = 'ims_access_token';
  private readonly REFRESH_TOKEN_KEY = 'ims_refresh_token';
  private readonly USER_KEY = 'ims_user';
  private readonly TENANT_KEY = 'ims_tenant';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private configSubject = new BehaviorSubject<AuthConfig | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public config$ = this.configSubject.asObservable();

  private config: AuthConfig = {
    serverUrl: 'http://localhost:8080',
    tenantId: 'default'
  };

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  /**
   * Configure the authentication service
   */
  configure(config: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...config };
    this.configSubject.next(this.config);
    
    // Store tenant ID if provided
    if (config.tenantId) {
      localStorage.setItem(this.TENANT_KEY, config.tenantId);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return this.config;
  }

  /**
   * Load stored data on service initialization
   */
  private loadFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    const tenantId = localStorage.getItem(this.TENANT_KEY);

    if (tenantId) {
      this.config.tenantId = tenantId;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        this.clearAuthData();
      }
    }
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = this.config.tenantId 
      ? `${this.config.serverUrl}/tenant/${this.config.tenantId}/login`
      : `${this.config.serverUrl}/login`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.config.tenantId || 'default'
    });

    return this.http.post<LoginResponse>(url, credentials, { headers })
      .pipe(
        tap(response => {
          if (response.tokens && !response.two_factor_required) {
            this.storeAuthData(response);
          }
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Setup two-factor authentication
   */
  setup2FA(): Observable<TwoFactorSetupResponse> {
    return this.http.post<TwoFactorSetupResponse>(
      `${this.config.serverUrl}/api/v1/2fa/setup`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('2FA setup error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Enable two-factor authentication
   */
  enable2FA(code: string): Observable<{ success: boolean; backup_codes: string[] }> {
    return this.http.post<{ success: boolean; backup_codes: string[] }>(
      `${this.config.serverUrl}/api/v1/2fa/enable`,
      { code },
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('2FA enable error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Disable two-factor authentication
   */
  disable2FA(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.config.serverUrl}/api/v1/2fa/disable`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('2FA disable error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get 2FA status
   */
  get2FAStatus(): Observable<{ enabled: boolean; has_backup_codes: boolean }> {
    return this.http.get<{ enabled: boolean; has_backup_codes: boolean }>(
      `${this.config.serverUrl}/api/v1/2fa/status`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('2FA status error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verify two-factor authentication code
   */
  verify2FA(code: string): Observable<any> {
    return this.http.post(
      `${this.config.serverUrl}/api/v1/2fa/verify`,
      { code },
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('2FA verification error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    // Clear local data immediately
    this.clearAuthData();
    
    // Try to notify server, but don't fail if it's unreachable
    return this.http.post(`${this.config.serverUrl}/logout`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(() => {
        // Even if logout fails on server, we've already cleared local data
        return throwError(() => new Error('Logout completed locally'));
      })
    );
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get access token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.config.tenantId) {
      headers['X-Tenant-ID'] = this.config.tenantId;
    }

    return new HttpHeaders(headers);
  }

  /**
   * Check if user has specific scope
   */
  hasScope(scope: string): boolean {
    const user = this.getCurrentUser();
    return user?.scopes?.includes(scope) ?? false;
  }

  /**
   * Check if user belongs to specific group
   */
  hasGroup(group: string): boolean {
    const user = this.getCurrentUser();
    return user?.groups?.includes(group) ?? false;
  }

  /**
   * Set tenant ID
   */
  setTenant(tenantId: string): void {
    this.config.tenantId = tenantId;
    localStorage.setItem(this.TENANT_KEY, tenantId);
    this.configSubject.next(this.config);
  }

  /**
   * Get current tenant ID
   */
  getTenant(): string | undefined {
    return this.config.tenantId;
  }

  /**
   * Store authentication data
   */
  private storeAuthData(response: LoginResponse): void {
    if (response.tokens) {
      localStorage.setItem(this.TOKEN_KEY, response.tokens.access_token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.tokens.refresh_token);
    }

    const user: User = {
      user_id: response.user_id,
      email: response.email,
      scopes: response.scopes,
      groups: response.groups,
      two_factor_verified: response.two_factor_verified
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    // Keep tenant ID for next login
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }
}
