import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { IMSAuthService, User } from 'ims-auth';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="profile-container">
            <div class="profile-card">
                <h2>User Profile</h2>
                
                <div class="profile-section">
                    <div class="profile-avatar">
                        <img [src]="'default-avatar.png'" 
                                 [alt]="(user?.user_id || 'User') + ' avatar'"
                                 (error)="onImageError($event)">
                    </div>
                    
                    <div class="profile-info">
                        <div class="info-item">
                            <label>User ID:</label>
                            <span>{{ user?.user_id || 'N/A' }}</span>
                        </div>
                        
                        <div class="info-item">
                            <label>Email:</label>
                            <span>{{ user?.email || 'N/A' }}</span>
                        </div>
                        
                        <div class="info-item">
                            <label>Scopes:</label>
                            <span>{{ user?.scopes?.join(', ') || 'None' }}</span>
                        </div>
                        
                        <div class="info-item">
                            <label>Groups:</label>
                            <span>{{ user?.groups?.join(', ') || 'None' }}</span>
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn btn-primary" (click)="editProfile()">Edit Profile</button>
                    <button class="btn btn-secondary" (click)="changePassword()">Change Password</button>
                    <button class="btn btn-danger" (click)="logout()">Logout</button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .profile-container {
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .profile-card {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        h2 {
            margin-bottom: 1.5rem;
            color: #333;
        }
        
        .profile-section {
            display: flex;
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .profile-avatar {
            flex-shrink: 0;
        }
        
        .profile-avatar img {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #e0e0e0;
        }
        
        .profile-info {
            flex: 1;
        }
        
        .info-item {
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
        }
        
        .info-item label {
            font-weight: 600;
            margin-right: 0.5rem;
            min-width: 120px;
            color: #666;
        }
        
        .info-item span {
            color: #333;
        }
        
        .profile-actions {
            display: flex;
            gap: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e0e0e0;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
        }
        
        .btn-primary {
            background-color: #007bff;
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #0056b3;
        }
        
        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background-color: #545b62;
        }
        
        .btn-danger {
            background-color: #dc3545;
            color: white;
        }
        
        .btn-danger:hover {
            background-color: #c82333;
        }
    `]
})
export class ProfileComponent implements OnInit {
    user: User | null = null;

    constructor(
        private router: Router,
        private authService: IMSAuthService
    ) {}

    ngOnInit(): void {
        this.loadUserProfile();
        
        // Debug: Log current user and scopes
        console.log('Profile component loaded');
        console.log('Current user:', this.user);
        console.log('User scopes:', this.user?.scopes);
    }

    loadUserProfile(): void {
        this.user = this.authService.getCurrentUser();
        
    }

    onImageError(event: any): void {
        event.target.src = 'default-avatar.png';
    }

    editProfile(): void {
        // TODO: Navigate to edit profile page or open edit modal
        console.log('Edit profile clicked');
    }

    changePassword(): void {
        // TODO: Navigate to change password page or open modal
        console.log('Change password clicked');
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
}