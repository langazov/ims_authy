import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IMSAuthService, LoginRequest, LoginResponse } from './ims-auth.service';

@Component({
  selector: 'ims-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="login-container">
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
        <div class="login-header">
          <h2>{{ title }}</h2>
          <p *ngIf="subtitle" class="subtitle">{{ subtitle }}</p>
        </div>
        
        <div class="form-group" *ngIf="showTenantField">
          <label for="tenant">Tenant</label>
          <input
            type="text"
            id="tenant"
            [(ngModel)]="tenantId"
            [ngModelOptions]="{standalone: true}"
            (ngModelChange)="onTenantChange()"
            placeholder="Enter tenant ID"
            class="form-control"
          />
          <small class="form-text">{{ tenantId || 'Using default tenant' }}</small>
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            formControlName="email"
            placeholder="Enter your email"
            [class.error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
            class="form-control"
          />
          <div class="error-message" *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
            <span *ngIf="loginForm.get('email')?.errors?.['required']">Email is required</span>
            <span *ngIf="loginForm.get('email')?.errors?.['email']">Please enter a valid email</span>
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            formControlName="password"
            placeholder="Enter your password"
            [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
            class="form-control"
          />
          <div class="error-message" *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
            Password is required
          </div>
        </div>

        <div class="form-group" *ngIf="require2FA">
          <label for="twoFactorCode">Two-Factor Code</label>
          <input
            type="text"
            id="twoFactorCode"
            formControlName="twoFactorCode"
            placeholder="Enter 6-digit code"
            maxlength="6"
            [class.error]="loginForm.get('twoFactorCode')?.invalid && loginForm.get('twoFactorCode')?.touched"
            class="form-control code-input"
          />
          <div class="error-message" *ngIf="loginForm.get('twoFactorCode')?.invalid && loginForm.get('twoFactorCode')?.touched">
            Please enter a valid 6-digit code
          </div>
          <small class="form-text">Enter the code from your authenticator app</small>
        </div>

        <div class="error-message" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>

        <div class="success-message" *ngIf="successMessage">
          {{ successMessage }}
        </div>

        <button type="submit" [disabled]="loginForm.invalid || isLoading" class="login-button">
          <span *ngIf="isLoading">{{ require2FA ? 'Verifying...' : 'Logging in...' }}</span>
          <span *ngIf="!isLoading">{{ require2FA ? 'Verify & Login' : 'Login' }}</span>
        </button>

        <div class="additional-actions" *ngIf="showAdditionalActions">
          <ng-content></ng-content>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .login-form {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 400px;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-header h2 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
      font-size: 0.9rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-control.error {
      border-color: #dc3545;
    }

    .code-input {
      text-align: center;
      letter-spacing: 0.2rem;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .form-text {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: #6c757d;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      padding: 0.5rem;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }

    .success-message {
      color: #155724;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      padding: 0.5rem;
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
    }

    .login-button {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 1rem;
    }

    .login-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
    }

    .login-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .additional-actions {
      text-align: center;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }

    @media (max-width: 480px) {
      .login-container {
        padding: 0.5rem;
        align-items: flex-start;
        padding-top: 2rem;
      }
      
      .login-form {
        padding: 1.5rem;
      }
    }
  `]
})
export class IMSLoginComponent implements OnInit {
  @Input() title = 'IMS Authentication';
  @Input() subtitle = 'Sign in to your account';
  @Input() showTenantField = false;
  @Input() showAdditionalActions = false;
  @Input() defaultTenant = 'default';
  @Output() loginSuccess = new EventEmitter<LoginResponse>();
  @Output() loginError = new EventEmitter<any>();
  @Output() require2FAChange = new EventEmitter<boolean>();

  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  require2FA = false;
  tenantId = '';

  constructor(
    private fb: FormBuilder,
    private authService: IMSAuthService
  ) {}

  ngOnInit(): void {
    // Initialize with defaultTenant instead of stored tenant to allow form input
    this.tenantId = this.defaultTenant;
    this.createForm();
    this.updateTenantConfig();
  }

  private createForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      twoFactorCode: ['']
    });
  }

  private updateTenantConfig(): void {
    if (this.tenantId) {
      this.authService.setTenant(this.tenantId);
    }
  }

  onTenantChange(): void {
    this.updateTenantConfig();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      // Ensure tenant is updated before login attempt
      this.updateTenantConfig();
      
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const credentials: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      if (this.require2FA && this.loginForm.value.twoFactorCode) {
        credentials.two_fa_code = this.loginForm.value.twoFactorCode;
      }

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (response.two_factor_required) {
            this.require2FA = true;
            this.require2FAChange.emit(true);
            this.successMessage = response.message || 'Please enter your two-factor authentication code';
            this.addTwoFactorValidation();
          } else {
            this.successMessage = 'Login successful!';
            this.loginSuccess.emit(response);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || error.message || 'Login failed. Please try again.';
          this.loginError.emit(error);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  private addTwoFactorValidation(): void {
    this.loginForm.get('twoFactorCode')?.setValidators([
      Validators.required,
      Validators.pattern(/^\d{6}$/)
    ]);
    this.loginForm.get('twoFactorCode')?.updateValueAndValidity();
  }

  resetForm(): void {
    this.loginForm.reset();
    this.require2FA = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.require2FAChange.emit(false);
    this.loginForm.get('twoFactorCode')?.clearValidators();
    this.loginForm.get('twoFactorCode')?.updateValueAndValidity();
  }
}
