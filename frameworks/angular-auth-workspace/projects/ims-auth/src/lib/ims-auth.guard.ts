import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { IMSAuthService } from './ims-auth.service';

@Injectable({
  providedIn: 'root'
})
export class IMSAuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: IMSAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(state.url, route.data);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(state.url, route.data);
  }

  private checkAuth(url: string, routeData: any): Observable<boolean> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: url } });
          return false;
        }

        // Check for required scopes
        const requiredScopes = routeData['scopes'] as string[];
        if (requiredScopes && requiredScopes.length > 0) {
          const hasRequiredScope = requiredScopes.some(scope => this.authService.hasScope(scope));
          if (!hasRequiredScope) {
            this.router.navigate(['/access-denied']);
            return false;
          }
        }

        // Check for required groups
        const requiredGroups = routeData['groups'] as string[];
        if (requiredGroups && requiredGroups.length > 0) {
          const hasRequiredGroup = requiredGroups.some(group => this.authService.hasGroup(group));
          if (!hasRequiredGroup) {
            this.router.navigate(['/access-denied']);
            return false;
          }
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class IMSScopeGuard implements CanActivate {
  constructor(
    private authService: IMSAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const requiredScopes = route.data['scopes'] as string[];
    
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
          return false;
        }

        const hasRequiredScope = requiredScopes.some(scope => this.authService.hasScope(scope));
        
        if (!hasRequiredScope) {
          this.router.navigate(['/access-denied']);
          return false;
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class IMSGroupGuard implements CanActivate {
  constructor(
    private authService: IMSAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    const requiredGroups = route.data['groups'] as string[];
    
    if (!requiredGroups || requiredGroups.length === 0) {
      return true;
    }

    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
          return false;
        }

        const hasRequiredGroup = requiredGroups.some(group => this.authService.hasGroup(group));
        
        if (!hasRequiredGroup) {
          this.router.navigate(['/access-denied']);
          return false;
        }

        return true;
      })
    );
  }
}
