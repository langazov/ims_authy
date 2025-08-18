import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IMSAuthService, User } from 'ims-auth';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="access-denied-container">
      <div class="access-denied-content">
        <div class="icon">🚫</div>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this resource.</p>
        <div class="user-info" *ngIf="user">
          <h3>Your Current Permissions:</h3>
          <div class="permissions">
            <div class="permission-group">
              <strong>Scopes:</strong>
              <span *ngIf="user.scopes && user.scopes.length > 0">{{ user.scopes.join(', ') }}</span>
              <span *ngIf="!user.scopes || user.scopes.length === 0" class="no-permissions">None assigned</span>
            </div>
            <div class="permission-group">
              <strong>Groups:</strong>
              <span *ngIf="user.groups && user.groups.length > 0">{{ user.groups.join(', ') }}</span>
              <span *ngIf="!user.groups || user.groups.length === 0" class="no-permissions">None assigned</span>
            </div>
          </div>
        </div>
        <div class="actions">
          <button (click)="goBack()" class="btn secondary">Go Back</button>
          <button (click)="goToDashboard()" class="btn primary">Go to Dashboard</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .access-denied-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .access-denied-content {
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }

    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    h1 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 2rem;
      font-weight: 600;
    }

    p {
      margin: 0 0 2rem 0;
      color: #666;
      font-size: 1.1rem;
      line-height: 1.6;
    }

    .user-info {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      text-align: left;
    }

    .user-info h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.1rem;
    }

    .permissions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .permission-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .permission-group strong {
      color: #555;
      font-size: 0.9rem;
    }

    .permission-group span {
      font-family: monospace;
      background: white;
      padding: 0.5rem;
      border-radius: 4px;
      border: 1px solid #dee2e6;
      font-size: 0.85rem;
    }

    .no-permissions {
      color: #6c757d !important;
      font-style: italic !important;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 120px;
    }

    .btn.primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
    }

    .btn.secondary {
      background: #6c757d;
      color: white;
    }

    .btn.secondary:hover {
      background: #5a6268;
    }

    @media (max-width: 768px) {
      .access-denied-content {
        padding: 2rem 1.5rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      .actions {
        flex-direction: column;
      }

      .btn {
        min-width: 100%;
      }
    }
  `]
})
export class AccessDeniedComponent {
  user: User | null = null;

  constructor(
    private authService: IMSAuthService,
    private router: Router
  ) {
    this.user = this.authService.getCurrentUser();
  }

  goBack(): void {
    window.history.back();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
