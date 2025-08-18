import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AuthService } from './auth.service';
import { AuthGuard, RoleGuard } from './auth.guard';
import { AuthInterceptor } from './auth.interceptor';
import { LoginComponent } from './login.component';
import { TwoFactorComponent } from './two-factor.component';
import { TwoFactorSetupComponent } from './two-factor-setup.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    LoginComponent,
    TwoFactorComponent,
    TwoFactorSetupComponent
  ],
  providers: [
    AuthService,
    AuthGuard,
    RoleGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  exports: [
    LoginComponent,
    TwoFactorComponent,
    TwoFactorSetupComponent
  ]
})
export class AuthModule {
  static forRoot() {
    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        AuthGuard,
        RoleGuard,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true
        }
      ]
    };
  }
}
