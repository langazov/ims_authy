import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IMSAuthService, IMSLoginComponent, LoginResponse } from 'ims-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IMSLoginComponent],
  template: `
    <div class="login-page">
      <div class="header">
        <h1>IMS Authentication Demo</h1>
        <p>Demonstration of the IMS Angular Authentication Library</p>
      </div>
      
      <ims-login
        title="Demo Login"
        subtitle="Sign in to test the authentication"
        [showTenantField]="true"
        [showAdditionalActions]="true"
        defaultTenant="default"
        (loginSuccess)="onLoginSuccess($event)"
        (loginError)="onLoginError($event)">
        
        <div class="demo-info">
          <h4>Demo Credentials</h4>
          <p><strong>Email:</strong> demo@example.com</p>
          <p><strong>Password:</strong> password123</p>
          <p><strong>Tenant:</strong> default</p>
        </div>
      </ims-login>
      
      <div class="footer">
        <p>This is a demonstration of the IMS Authentication Library connecting to your OAuth2 server.</p>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .header {
      text-align: center;
      padding: 2rem 1rem 1rem;
      color: white;
    }

    .header h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2.5rem;
      font-weight: 300;
    }

    .header p {
      margin: 0;
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .demo-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }

    .demo-info h4 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .demo-info p {
      margin: 0.25rem 0;
      font-size: 0.9rem;
      color: #666;
    }

    .footer {
      text-align: center;
      padding: 2rem 1rem;
      color: white;
    }

    .footer p {
      margin: 0;
      opacity: 0.8;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 2rem;
      }
      
      .header p {
        font-size: 1rem;
      }
    }
  `]
})
export class LoginComponent implements OnInit {

  constructor(
    private authService: IMSAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Configure the auth service with your server URL
    this.authService.configure({
      serverUrl: 'https://oauth2.imsc.eu',
      tenantId: 'default'
    });

    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onLoginSuccess(response: LoginResponse): void {
    console.log('Login successful:', response);
    this.router.navigate(['/dashboard']);
  }

  onLoginError(error: any): void {
    console.error('Login failed:', error);
  }
}
