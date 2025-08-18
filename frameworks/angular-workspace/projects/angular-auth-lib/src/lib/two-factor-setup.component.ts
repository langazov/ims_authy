import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, TwoFactorSetup } from './auth.service';

@Component({
  selector: 'lib-two-factor-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="setup-container">
      <div class="setup-form">
        <h2>Setup Two-Factor Authentication</h2>
        
        <div *ngIf="!setupData && !isLoading" class="setup-start">
          <p>Enable two-factor authentication to secure your account.</p>
          <button type="button" (click)="initializeSetup()" class="setup-button">
            Start Setup
          </button>
        </div>

        <div *ngIf="isLoading" class="loading">
          <p>Setting up two-factor authentication...</p>
        </div>

        <div *ngIf="setupData && !isComplete" class="setup-steps">
          <div class="step">
            <h3>Step 1: Scan QR Code</h3>
            <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            <div class="qr-code" [innerHTML]="setupData.qr_code"></div>
          </div>

          <div class="step">
            <h3>Step 2: Enter Secret Key (Alternative)</h3>
            <p>If you can't scan the QR code, manually enter this secret key:</p>
            <div class="secret-key">
              <code>{{ setupData.secret }}</code>
              <button type="button" (click)="copySecret()" class="copy-button">Copy</button>
            </div>
          </div>

          <div class="step">
            <h3>Step 3: Verify Setup</h3>
            <p>Enter the 6-digit code from your authenticator app to complete setup:</p>
            
            <form [formGroup]="verificationForm" (ngSubmit)="completeSetup()">
              <div class="form-group">
                <input
                  type="text"
                  formControlName="code"
                  placeholder="000000"
                  maxlength="6"
                  [class.error]="verificationForm.get('code')?.invalid && verificationForm.get('code')?.touched"
                />
                <div class="error-message" *ngIf="verificationForm.get('code')?.invalid && verificationForm.get('code')?.touched">
                  Please enter a valid 6-digit code
                </div>
              </div>

              <div class="error-message" *ngIf="errorMessage">
                {{ errorMessage }}
              </div>

              <button type="submit" [disabled]="verificationForm.invalid || isVerifying" class="verify-button">
                <span *ngIf="isVerifying">Verifying...</span>
                <span *ngIf="!isVerifying">Complete Setup</span>
              </button>
            </form>
          </div>
        </div>

        <div *ngIf="isComplete" class="setup-complete">
          <div class="success-icon">✅</div>
          <h3>Two-Factor Authentication Enabled!</h3>
          <p>Your account is now protected with two-factor authentication.</p>
          
          <div class="backup-codes" *ngIf="backupCodes && backupCodes.length > 0">
            <h4>Backup Codes</h4>
            <p>Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
            <div class="codes-list">
              <div *ngFor="let code of backupCodes" class="backup-code">{{ code }}</div>
            </div>
            <button type="button" (click)="downloadBackupCodes()" class="download-button">
              Download Backup Codes
            </button>
          </div>

          <button type="button" (click)="finish()" class="finish-button">
            Continue
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .setup-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
      padding: 1rem;
    }

    .setup-form {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 500px;
    }

    h2 {
      text-align: center;
      margin-bottom: 1.5rem;
      color: #333;
    }

    .setup-start {
      text-align: center;
    }

    .setup-start p {
      margin-bottom: 1.5rem;
      color: #666;
    }

    .loading {
      text-align: center;
      padding: 2rem;
    }

    .step {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #eee;
    }

    .step:last-child {
      border-bottom: none;
    }

    h3 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .qr-code {
      text-align: center;
      margin: 1rem 0;
    }

    .secret-key {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    code {
      background-color: #f8f9fa;
      padding: 0.5rem;
      border-radius: 4px;
      flex: 1;
      font-family: monospace;
    }

    .copy-button {
      padding: 0.5rem 1rem;
      background-color: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .copy-button:hover {
      background-color: #5a6268;
    }

    .form-group {
      margin-bottom: 1rem;
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

    .setup-button,
    .verify-button,
    .finish-button,
    .download-button {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 0.5rem;
    }

    .setup-button {
      background-color: #007bff;
      color: white;
    }

    .setup-button:hover {
      background-color: #0056b3;
    }

    .verify-button {
      background-color: #28a745;
      color: white;
    }

    .verify-button:hover:not(:disabled) {
      background-color: #218838;
    }

    .verify-button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .setup-complete {
      text-align: center;
    }

    .success-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .backup-codes {
      margin: 2rem 0;
      text-align: left;
    }

    .codes-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .backup-code {
      background-color: #f8f9fa;
      padding: 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      text-align: center;
    }

    .download-button {
      background-color: #6c757d;
      color: white;
    }

    .download-button:hover {
      background-color: #5a6268;
    }

    .finish-button {
      background-color: #28a745;
      color: white;
    }

    .finish-button:hover {
      background-color: #218838;
    }
  `]
})
export class TwoFactorSetupComponent implements OnInit {
  @Output() setupComplete = new EventEmitter<any>();
  @Output() setupCancelled = new EventEmitter<void>();

  setupData: TwoFactorSetup | null = null;
  verificationForm!: FormGroup;
  isLoading = false;
  isVerifying = false;
  isComplete = false;
  errorMessage = '';
  backupCodes: string[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.createForm();
  }

  private createForm(): void {
    this.verificationForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  initializeSetup(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.setup2FA().subscribe({
      next: (data) => {
        this.isLoading = false;
        this.setupData = data;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to initialize 2FA setup.';
      }
    });
  }

  completeSetup(): void {
    if (this.verificationForm.valid) {
      this.isVerifying = true;
      this.errorMessage = '';

      const code = this.verificationForm.value.code;

      this.authService.enable2FA(code).subscribe({
        next: (response) => {
          this.isVerifying = false;
          this.isComplete = true;
          this.backupCodes = response.backup_codes || [];
        },
        error: (error) => {
          this.isVerifying = false;
          this.errorMessage = error.error?.message || 'Verification failed. Please try again.';
        }
      });
    }
  }

  copySecret(): void {
    if (this.setupData?.secret) {
      navigator.clipboard.writeText(this.setupData.secret).then(() => {
        // Could show a toast notification here
        console.log('Secret copied to clipboard');
      });
    }
  }

  downloadBackupCodes(): void {
    const content = this.backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup-codes.txt';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  finish(): void {
    this.setupComplete.emit({
      success: true,
      backupCodes: this.backupCodes
    });
  }
}
