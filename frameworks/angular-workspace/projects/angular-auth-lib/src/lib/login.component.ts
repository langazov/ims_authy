import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, LoginRequest } from './auth.service';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
        <h2>{{ title }}</h2>
        
        <div class="form-group" *ngIf="showTenantField">
          <label for="tenant">Tenant</label>
          <input
            type="text"
            id="tenant"
            formControlName="tenant"
            placeholder="Enter tenant name"
            [class.error]="loginForm.get('tenant')?.invalid && loginForm.get('tenant')?.touched"
          />
          <div class="error-message" *ngIf="loginForm.get('tenant')?.invalid && loginForm.get('tenant')?.touched">
            Tenant is required
          </div>
        </div>

        <div class="form-group">
          <label for="username">Username</label>
          <input
            type="text"
            id="username"
            formControlName="username"
            placeholder="Enter username"
            [class.error]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched"
          />
          <div class="error-message" *ngIf="loginForm.get('username')?.invalid && loginForm.get('username')?.touched">
            Username is required
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            formControlName="password"
            placeholder="Enter password"
            [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
          />
          <div class="error-message" *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
            Password is required
          </div>
        </div>

        <div class="error-message" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>

        <button type="submit" [disabled]="loginForm.invalid || isLoading" class="login-button">
          <span *ngIf="isLoading">Logging in...</span>
          <span *ngIf="!isLoading">Login</span>
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
      background-color: #f5f5f5;
    }

    .login-form {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
    }

    h2 {
      text-align: center;
      margin-bottom: 1.5rem;
      color: #333;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    input:focus {
      outline: none;
      border-color: #007bff;
    }

    input.error {
      border-color: #dc3545;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .login-button {
      width: 100%;
      padding: 0.75rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .login-button:hover:not(:disabled) {
      background-color: #0056b3;
    }

    .login-button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .additional-actions {
      margin-top: 1rem;
      text-align: center;
    }
  `]
})
export class LoginComponent implements OnInit {
  @Input() title = 'Login';
  @Input() showTenantField = false;
  @Input() showAdditionalActions = false;
  @Output() loginSuccess = new EventEmitter<any>();
  @Output() loginError = new EventEmitter<any>();

  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.createForm();
  }

  private createForm(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      tenant: [this.showTenantField ? '' : null, this.showTenantField ? Validators.required : null]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials: LoginRequest = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password
      };

      if (this.showTenantField && this.loginForm.value.tenant) {
        credentials.tenant = this.loginForm.value.tenant;
      }

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.loginSuccess.emit(response);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
          this.loginError.emit(error);
        }
      });
    }
  }
}
