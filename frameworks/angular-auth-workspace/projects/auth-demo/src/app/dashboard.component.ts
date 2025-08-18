import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IMSAuthService, User, IMSTwoFactorSetupComponent } from 'ims-auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IMSTwoFactorSetupComponent],
  template: `
    <div class="dashboard">
      <header class="dashboard-header">
        <div class="header-content">
          <h1>IMS Dashboard</h1>
          <div class="user-info">
            <span>Welcome, {{ user?.email }}</span>
            <button (click)="logout()" class="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div class="dashboard-content" *ngIf="!showTwoFactorSetup">
        <div class="user-card">
          <h2>User Information</h2>
          <div class="user-details">
            <div class="detail-item">
              <label>User ID:</label>
              <span>{{ user?.user_id }}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>{{ user?.email }}</span>
            </div>
            <div class="detail-item">
              <label>Tenant:</label>
              <span>{{ tenantId }}</span>
            </div>
            <div class="detail-item">
              <label>Two-Factor:</label>
              <span [class]="user?.two_factor_verified ? 'enabled' : 'disabled'">
                {{ user?.two_factor_verified ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
        </div>

        <div class="permissions-card">
          <h2>Permissions</h2>
          <div class="permissions-grid">
            <div class="permission-section">
              <h3>Scopes</h3>
              <div class="permission-list">
                <span *ngFor="let scope of (user?.scopes || [])" class="permission-tag scope">
                  {{ scope }}
                </span>
                <span *ngIf="(user?.scopes || []).length === 0" class="no-permissions">
                  No scopes assigned
                </span>
              </div>
            </div>
            <div class="permission-section">
              <h3>Groups</h3>
              <div class="permission-list">
                <span *ngFor="let group of (user?.groups || [])" class="permission-tag group">
                  {{ group }}
                </span>
                <span *ngIf="(user?.groups || []).length === 0" class="no-permissions">
                  No groups assigned
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="actions-card">
          <h2>Security Actions</h2>
          <div class="action-buttons">
            <button 
              (click)="setup2FA()" 
              class="action-btn primary"
              [disabled]="user?.two_factor_verified">
              {{ user?.two_factor_verified ? '2FA Already Enabled' : 'Setup Two-Factor Authentication' }}
            </button>
            <button 
              (click)="check2FAStatus()" 
              class="action-btn secondary">
              Check 2FA Status
            </button>
            <button 
              (click)="testApiCall()" 
              class="action-btn secondary">
              Test API Call
            </button>
          </div>
        </div>

        <div class="status-card" *ngIf="statusMessage || errorMessage">
          <h2>Status</h2>
          <div *ngIf="statusMessage" class="status-message success">
            {{ statusMessage }}
          </div>
          <div *ngIf="errorMessage" class="status-message error">
            {{ errorMessage }}
          </div>
        </div>
      </div>

      <div class="two-factor-setup" *ngIf="showTwoFactorSetup">
        <ims-two-factor-setup
          (setupComplete)="onTwoFactorComplete($event)"
          (setupCancelled)="onTwoFactorCancelled()">
        </ims-two-factor-setup>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      min-height: 100vh;
      background: #f5f6fa;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 300;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logout-btn {
      background: rgba(255,255,255,0.2);
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .logout-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .dashboard-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .user-card,
    .permissions-card,
    .actions-card,
    .status-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .user-card h2,
    .permissions-card h2,
    .actions-card h2,
    .status-card h2 {
      margin: 0 0 1.5rem 0;
      color: #333;
      font-size: 1.3rem;
      font-weight: 600;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .detail-item label {
      font-weight: 600;
      color: #555;
    }

    .detail-item span {
      font-family: monospace;
      background: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #dee2e6;
    }

    .enabled {
      color: #28a745 !important;
      background: #d4edda !important;
      border-color: #c3e6cb !important;
    }

    .disabled {
      color: #dc3545 !important;
      background: #f8d7da !important;
      border-color: #f5c6cb !important;
    }

    .permissions-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .permission-section h3 {
      margin: 0 0 0.75rem 0;
      color: #555;
      font-size: 1rem;
    }

    .permission-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .permission-tag {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .permission-tag.scope {
      background: #e3f2fd;
      color: #1976d2;
      border: 1px solid #bbdefb;
    }

    .permission-tag.group {
      background: #f3e5f5;
      color: #7b1fa2;
      border: 1px solid #e1bee7;
    }

    .no-permissions {
      color: #6c757d;
      font-style: italic;
      font-size: 0.9rem;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .action-btn {
      padding: 1rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .action-btn.primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
    }

    .action-btn.secondary {
      background: #6c757d;
      color: white;
    }

    .action-btn.secondary:hover {
      background: #5a6268;
    }

    .action-btn:disabled {
      background: #e9ecef;
      color: #6c757d;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .status-message {
      padding: 1rem;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .status-message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .status-message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .two-factor-setup {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .dashboard-content {
        grid-template-columns: 1fr;
        padding: 1rem;
      }

      .detail-item {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }

      .action-buttons {
        gap: 0.75rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  tenantId: string | undefined;
  statusMessage = '';
  errorMessage = '';
  showTwoFactorSetup = false;

  constructor(
    private authService: IMSAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.tenantId = this.authService.getTenant();

    if (!this.user) {
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        // Even if server logout fails, redirect to login
        this.router.navigate(['/login']);
      }
    });
  }

  setup2FA(): void {
    this.showTwoFactorSetup = true;
  }

  onTwoFactorComplete(event: any): void {
    this.showTwoFactorSetup = false;
    this.statusMessage = 'Two-factor authentication has been successfully enabled!';
    this.errorMessage = '';
    
    // Update user data
    if (this.user) {
      this.user.two_factor_verified = true;
    }
  }

  onTwoFactorCancelled(): void {
    this.showTwoFactorSetup = false;
  }

  check2FAStatus(): void {
    this.statusMessage = '';
    this.errorMessage = '';

    this.authService.get2FAStatus().subscribe({
      next: (status) => {
        this.statusMessage = `2FA Status: ${status.enabled ? 'Enabled' : 'Disabled'}, Backup codes: ${status.has_backup_codes ? 'Available' : 'Not available'}`;
      },
      error: (error) => {
        this.errorMessage = `Failed to check 2FA status: ${error.error?.message || error.message}`;
      }
    });
  }

  testApiCall(): void {
    this.statusMessage = '';
    this.errorMessage = '';

    // This would be a call to a protected endpoint
    // For demo purposes, we'll just show the current auth status
    const token = this.authService.getToken();
    if (token) {
      this.statusMessage = `API call would succeed. Token available: ${token.substring(0, 20)}...`;
    } else {
      this.errorMessage = 'No authentication token available';
    }
  }
}
