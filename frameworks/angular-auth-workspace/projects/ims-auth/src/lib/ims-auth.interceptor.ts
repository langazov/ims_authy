import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IMSAuthService } from './ims-auth.service';

@Injectable()
export class IMSAuthInterceptor implements HttpInterceptor {

  constructor(private authService: IMSAuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add auth header if user is authenticated and request is to our API
    const config = this.authService.getConfig();
    
    if (this.authService.isAuthenticated() && request.url.startsWith(config.serverUrl)) {
      const token = this.authService.getToken();
      const tenantId = this.authService.getTenant();
      
      let headers = request.headers;
      
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
      
      if (tenantId) {
        headers = headers.set('X-Tenant-ID', tenantId);
      }
      
      request = request.clone({ headers });
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // Token expired or invalid, logout user
          this.authService.logout().subscribe();
        }
        return throwError(() => error);
      })
    );
  }
}
