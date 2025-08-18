import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { AuthService, TwoFactorRequest } from './auth.service';

@Component({
  selector: 'lib-two-factor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="two-factor-container">
      <div class="two-factor-form">
        <h2>Two-Factor Authentication</h2>
        <p>Enter the 6-digit code from your authenticator app</p>
        
        <form [formGroup]="twoFactorForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="code">Authentication Code</label>
            <input
              type="text"
              id="code"
              formControlName="code"
              placeholder="000000"
              maxlength="6"
              [class.error]="twoFactorForm.get('code')?.invalid && twoFactorForm.get('code')?.touched"
            />
            <div class="error-message" *ngIf="twoFactorForm.get('code')?.invalid && twoFactorForm.get('code')?.touched">
              Please enter a valid 6-digit code
            </div>
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button type="submit" [disabled]="twoFactorForm.invalid || isLoading" class="verify-button">
            <span *ngIf="isLoading">Verifying...</span>
            <span *ngIf="!isLoading">Verify</span>
          </button>
        </form>

        <div class="backup-code-section" *ngIf="showBackupCodeOption">
          <button type="button" (click)="toggleBackupCode()" class="link-button">
            Use backup code instead
          </button>
          
          <div *ngIf="showBackupCodeInput" class="backup-code-form">
            <div class="form-group">
              <label for="backupCode">Backup Code</label>
              <input
                type="text"
                id="backupCode"
                [(ngModel)]="backupCode"
                placeholder="Enter backup code"
              />
            </div>
            <button type="button" (click)="verifyBackupCode()" [disabled]="!backupCode || isLoading" class="verify-button">
              Verify Backup Code
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .two-factor-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
    }

    .two-factor-form {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
      text-align: center;
    }

    h2 {
      margin-bottom: 0.5rem;
      color: #333;
    }

    p {
      margin-bottom: 1.5rem;
      color: #666;
    }

    .form-group {
      margin-bottom: 1rem;
      text-align: left;
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
      font-size: 1.2rem;
      text-align: center;
      letter-spacing: 0.2rem;
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

    .verify-button {
      width: 100%;
      padding: 0.75rem;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 1rem;
    }

    .verify-button:hover:not(:disabled) {
      background-color: #218838;
    }

    .verify-button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .backup-code-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }

    .link-button {
      background: none;
      border: none;
      color: #007bff;
      text-decoration: underline;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .link-button:hover {
      color: #0056b3;
    }

    .backup-code-form {
      margin-top: 1rem;
    }
  `]
})
export class TwoFactorComponent implements OnInit {
  @Input() token = '';
  @Input() showBackupCodeOption = true;
  @Output() verificationSuccess = new EventEmitter<any>();
  @Output() verificationError = new EventEmitter<any>();

  twoFactorForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showBackupCodeInput = false;
  backupCode = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.createForm();
  }

  private createForm(): void {
    this.twoFactorForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  onSubmit(): void {
    if (this.twoFactorForm.valid) {
      this.verify2FA(this.twoFactorForm.value.code);
    }
  }

  toggleBackupCode(): void {
    this.showBackupCodeInput = !this.showBackupCodeInput;
    this.backupCode = '';
  }

  verifyBackupCode(): void {
    if (this.backupCode.trim()) {
      this.verify2FA(this.backupCode.trim());
    }
  }

  private verify2FA(code: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    const twoFactorData: TwoFactorRequest = {
      token: this.token,
      code: code
    };

    this.authService.verify2FA(twoFactorData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.verificationSuccess.emit(response);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Verification failed. Please try again.';
        this.verificationError.emit(error);
      }
    });
  }
}
