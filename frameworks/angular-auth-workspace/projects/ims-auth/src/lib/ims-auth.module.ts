import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { IMSAuthService } from './ims-auth.service';
import { IMSAuthGuard, IMSScopeGuard, IMSGroupGuard } from './ims-auth.guard';
import { IMSAuthInterceptor } from './ims-auth.interceptor';
import { IMSLoginComponent } from './ims-login.component';
import { IMSTwoFactorSetupComponent } from './ims-two-factor-setup.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    IMSLoginComponent,
    IMSTwoFactorSetupComponent
  ],
  providers: [
    IMSAuthService,
    IMSAuthGuard,
    IMSScopeGuard,
    IMSGroupGuard
  ],
  exports: [
    IMSLoginComponent,
    IMSTwoFactorSetupComponent
  ]
})
export class IMSAuthModule {
  static forRoot() {
    return {
      ngModule: IMSAuthModule,
      providers: [
        IMSAuthService,
        IMSAuthGuard,
        IMSScopeGuard,
        IMSGroupGuard,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: IMSAuthInterceptor,
          multi: true
        }
      ]
    };
  }
}
