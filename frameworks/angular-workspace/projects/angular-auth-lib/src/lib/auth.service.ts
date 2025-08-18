import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface User {
  id: string;
  username: string;
  email: string;
  tenant?: string;
  roles?: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
  tenant?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in: number;
}

export interface TwoFactorRequest {
  token: string;
  code: string;
}

export interface TwoFactorSetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'auth_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private apiUrl = 'http://localhost:8080'; // Default API URL

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  /**
   * Configure the API base URL
   */
  setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  /**
   * Load user data from localStorage on service initialization
   */
  private loadUserFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        this.logout();
      }
    }
  }

  /**
   * Login with username and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          this.storeAuthData(response);
        }),
        catchError(error => {
          console.error('Login error:', error);
          throw error;
        })
      );
  }

  /**
   * Verify two-factor authentication code
   */
  verify2FA(twoFactorData: TwoFactorRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/verify-2fa`, twoFactorData)
      .pipe(
        tap(response => {
          this.storeAuthData(response);
        }),
        catchError(error => {
          console.error('2FA verification error:', error);
          throw error;
        })
      );
  }

  /**
   * Setup two-factor authentication
   */
  setup2FA(): Observable<TwoFactorSetup> {
    return this.http.post<TwoFactorSetup>(`${this.apiUrl}/setup-2fa`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('2FA setup error:', error);
        throw error;
      })
    );
  }

  /**
   * Enable two-factor authentication
   */
  enable2FA(code: string): Observable<{ success: boolean; backup_codes: string[] }> {
    return this.http.post<{ success: boolean; backup_codes: string[] }>(
      `${this.apiUrl}/enable-2fa`, 
      { code },
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('2FA enable error:', error);
        throw error;
      })
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        this.clearAuthData();
      }),
      catchError(() => {
        // Even if logout fails on server, clear local data
        this.clearAuthData();
        return of(null);
      })
    );
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      this.logout();
      throw new Error('No refresh token available');
    }

    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap(response => {
        this.storeAuthData(response);
      }),
      catchError(error => {
        this.logout();
        throw error;
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
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) ?? false;
  }

  /**
   * Store authentication data
   */
  private storeAuthData(response: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }
}
