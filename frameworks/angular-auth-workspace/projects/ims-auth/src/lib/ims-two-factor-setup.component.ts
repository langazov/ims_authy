import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { IMSAuthService, TwoFactorSetupResponse } from './ims-auth.service';

@Component({
  selector: 'ims-two-factor-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="setup-container">
      <div class="setup-form">
        <h2>Setup Two-Factor Authentication</h2>
        
        <div *ngIf="!setupData && !isLoading" class="setup-start">
          <div class="info-section">
            <div class="icon">🔒</div>
            <p>Secure your account with two-factor authentication. This adds an extra layer of security to your account.</p>
          </div>
          <button type="button" (click)="initializeSetup()" class="setup-button">
            Start Setup
          </button>
        </div>

        <div *ngIf="isLoading" class="loading">
          <div class="spinner"></div>
          <p>Setting up two-factor authentication...</p>
        </div>

        <div *ngIf="setupData && !isComplete" class="setup-steps">
          <div class="step">
            <div class="step-header">
              <span class="step-number">1</span>
              <h3>Scan QR Code</h3>
            </div>
            <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)</p>
            <div class="qr-code" [innerHTML]="setupData.qr_code"></div>
          </div>

          <div class="step">
            <div class="step-header">
              <span class="step-number">2</span>
              <h3>Manual Entry (Alternative)</h3>
            </div>
            <p>If you can't scan the QR code, manually enter this secret key:</p>
            <div class="secret-key">
              <code>{{ setupData.secret }}</code>
              <button type="button" (click)="copySecret()" class="copy-button" title="Copy to clipboard">
                📋
              </button>
            </div>
          </div>

          <div class="step">
            <div class="step-header">
              <span class="step-number">3</span>
              <h3>Verify Setup</h3>
            </div>
            <p>Enter the 6-digit code from your authenticator app to complete setup:</p>
            
            <form [formGroup]="verificationForm" (ngSubmit)="completeSetup()">
              <div class="form-group">
                <input
                  type="text"
                  formControlName="code"
                  placeholder="000000"
                  maxlength="6"
                  [class.error]="verificationForm.get('code')?.invalid && verificationForm.get('code')?.touched"
                  class="code-input"
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
            <h4>🔑 Backup Codes</h4>
            <div class="backup-codes-warning">
              <p><strong>Important:</strong> Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
            </div>
            <div class="codes-grid">
              <div *ngFor="let code of backupCodes" class="backup-code">{{ code }}</div>
            </div>
            <div class="backup-actions">
              <button type="button" (click)="downloadBackupCodes()" class="download-button">
                💾 Download Backup Codes
              </button>
              <button type="button" (click)="copyBackupCodes()" class="copy-button">
                📋 Copy to Clipboard
              </button>
            </div>
          </div>

          <button type="button" (click)="finish()" class="finish-button">
            Continue to Dashboard
          </button>
        </div>

        <div class="cancel-section" *ngIf="!isComplete">
          <button type="button" (click)="cancel()" class="cancel-button">
            Cancel Setup
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .setup-form {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    h2 {
      text-align: center;
      margin-bottom: 2rem;
      color: #333;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .setup-start {
      text-align: center;
    }

    .info-section {
      margin-bottom: 2rem;
    }

    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .info-section p {
      margin-bottom: 1.5rem;
      color: #666;
      line-height: 1.6;
    }

    .loading {
      text-align: center;
      padding: 2rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .step {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #eee;
    }

    .step:last-child {
      border-bottom: none;
    }

    .step-header {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
    }

    .step-number {
      background: #667eea;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 1rem;
      font-size: 0.9rem;
    }

    h3 {
      color: #333;
      margin: 0;
      font-size: 1.2rem;
    }

    .qr-code {
      text-align: center;
      margin: 1.5rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .secret-key {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    code {
      flex: 1;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      padding: 0.5rem;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .copy-button {
      padding: 0.5rem;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .copy-button:hover {
      background: #5a6268;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .code-input {
      width: 100%;
      max-width: 200px;
      margin: 0 auto;
      display: block;
      padding: 1rem;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1.5rem;
      text-align: center;
      letter-spacing: 0.3rem;
      font-weight: 600;
      transition: border-color 0.3s ease;
    }

    .code-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .code-input.error {
      border-color: #dc3545;
    }

    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      text-align: center;
      padding: 0.5rem;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }

    .setup-button,
    .verify-button,
    .finish-button,
    .download-button {
      padding: 1rem 2rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin: 0.5rem;
    }

    .setup-button,
    .finish-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      width: 100%;
    }

    .verify-button {
      background: #28a745;
      color: white;
      width: 100%;
    }

    .setup-button:hover,
    .finish-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
    }

    .verify-button:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-2px);
    }

    .verify-button:disabled,
    .setup-button:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
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

    .backup-codes h4 {
      color: #333;
      margin-bottom: 1rem;
    }

    .backup-codes-warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .backup-codes-warning p {
      margin: 0;
      color: #856404;
      font-size: 0.9rem;
    }

    .codes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .backup-code {
      background: #f8f9fa;
      padding: 0.75rem;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      text-align: center;
      font-size: 0.9rem;
      border: 1px solid #dee2e6;
    }

    .backup-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .download-button {
      background: #6c757d;
      color: white;
      width: auto;
    }

    .download-button:hover {
      background: #5a6268;
    }

    .cancel-section {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }

    .cancel-button {
      background: none;
      border: 1px solid #6c757d;
      color: #6c757d;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .cancel-button:hover {
      background: #6c757d;
      color: white;
    }

    @media (max-width: 768px) {
      .setup-container {
        padding: 0.5rem;
        align-items: flex-start;
        padding-top: 1rem;
      }
      
      .setup-form {
        padding: 1.5rem;
        max-height: 95vh;
      }

      .codes-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .backup-actions {
        flex-direction: column;
      }

      .download-button {
        width: 100%;
      }
    }
  `]
})
export class IMSTwoFactorSetupComponent implements OnInit {
  @Output() setupComplete = new EventEmitter<any>();
  @Output() setupCancelled = new EventEmitter<void>();

  setupData: TwoFactorSetupResponse | null = null;
  verificationForm!: FormGroup;
  isLoading = false;
  isVerifying = false;
  isComplete = false;
  errorMessage = '';
  backupCodes: string[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: IMSAuthService
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
      }).catch(err => {
        console.error('Failed to copy secret:', err);
      });
    }
  }

  copyBackupCodes(): void {
    const content = this.backupCodes.join('\n');
    navigator.clipboard.writeText(content).then(() => {
      console.log('Backup codes copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy backup codes:', err);
    });
  }

  downloadBackupCodes(): void {
    const content = [
      'IMS Authentication - Backup Codes',
      '====================================',
      '',
      'Keep these codes in a safe place. You can use them to access your account',
      'if you lose access to your authenticator device.',
      '',
      'Generated on: ' + new Date().toLocaleString(),
      '',
      ...this.backupCodes
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ims-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  finish(): void {
    this.setupComplete.emit({
      success: true,
      backupCodes: this.backupCodes
    });
  }

  cancel(): void {
    this.setupCancelled.emit();
  }
}
