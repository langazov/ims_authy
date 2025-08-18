import { Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { DashboardComponent } from './dashboard.component';
import { AccessDeniedComponent } from './access-denied.component';
import { IMSAuthGuard } from 'ims-auth';
import { ProfileComponent } from './profile.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [IMSAuthGuard],
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [IMSAuthGuard],
    data: { groups: ['administrators'], scopes: ['profile'] },
  },
  { path: 'access-denied', component: AccessDeniedComponent },
  { path: '**', redirectTo: '/login' },
];
