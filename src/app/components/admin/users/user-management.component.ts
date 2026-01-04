import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { AuthService } from '../../../services';
import { User, Role } from '../../../models';

/**
 * User Management Component - Admin can create and manage family members
 */
@Component({
  selector: 'app-user-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UpperCasePipe],
  template: `
    <div class="container-fluid py-4">
      <!-- Page Header -->
      <div class="mb-4">
        <h1 class="h3 mb-1">User Management</h1>
        <p class="text-muted mb-0">Create and manage family member accounts.</p>
      </div>

      <!-- Messages -->
      @if (successMessage()) {
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <i class="bi bi-check-circle me-2"></i>{{ successMessage() }}
          <button type="button" class="btn-close" (click)="successMessage.set('')"></button>
        </div>
      }
      @if (errorMessage()) {
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-circle me-2"></i>{{ errorMessage() }}
          <button type="button" class="btn-close" (click)="errorMessage.set('')"></button>
        </div>
      }

      <div class="row g-4">
        <!-- Create User Form -->
        <div class="col-lg-5">
          <div class="card shadow-sm">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">
                <i class="bi bi-person-plus me-2"></i>Create New User
              </h5>
            </div>
            <div class="card-body">
              <form (ngSubmit)="createUser()">
                <div class="mb-3">
                  <label for="name" class="form-label">Full Name</label>
                  <input
                    type="text"
                    class="form-control"
                    id="name"
                    [(ngModel)]="newUser.name"
                    name="name"
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>

                <div class="mb-3">
                  <label for="email" class="form-label">Email Address</label>
                  <input
                    type="email"
                    class="form-control"
                    id="email"
                    [(ngModel)]="newUser.email"
                    name="email"
                    placeholder="e.g., john@family.com"
                    required
                  />
                </div>

                <div class="mb-3">
                  <label for="password" class="form-label">Password</label>
                  <input
                    type="password"
                    class="form-control"
                    id="password"
                    [(ngModel)]="newUser.password"
                    name="password"
                    placeholder="Minimum 6 characters"
                    minlength="6"
                    required
                  />
                </div>

                <div class="mb-4">
                  <label for="role" class="form-label">Role</label>
                  <select
                    class="form-select"
                    id="role"
                    [(ngModel)]="newUser.role"
                    name="role"
                    required
                  >
                    <option value="admin">Admin - Full Access</option>
                    <option value="user">User - Submit Requests</option>
                    <option value="viewer">Viewer - Read Only</option>
                  </select>
                  <div class="form-text">
                    @switch (newUser.role) {
                      @case ('admin') {
                        <span class="text-danger">Can manage budgets, approve expenses, and create users.</span>
                      }
                      @case ('user') {
                        <span class="text-success">Can submit expense requests and view their allowance.</span>
                      }
                      @case ('viewer') {
                        <span class="text-info">Read-only access to view all budget information.</span>
                      }
                    }
                  </div>
                </div>

                <button
                  type="submit"
                  class="btn btn-primary w-100"
                  [disabled]="isCreating() || !isFormValid()"
                >
                  @if (isCreating()) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Creating...
                  } @else {
                    <i class="bi bi-person-plus me-2"></i>Create User
                  }
                </button>
              </form>
            </div>
          </div>

          <!-- Role Legend -->
          <div class="card mt-4 bg-light border-0">
            <div class="card-body">
              <h6 class="card-title">
                <i class="bi bi-info-circle me-2"></i>Role Permissions
              </h6>
              <ul class="mb-0 small">
                <li><strong class="text-danger">Admin:</strong> Full control - budgets, expenses, users, allowances</li>
                <li><strong class="text-success">User:</strong> Submit expense requests, view personal allowance</li>
                <li><strong class="text-info">Viewer:</strong> View-only access to all data (e.g., Mother)</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Users List -->
        <div class="col-lg-7">
          <div class="card shadow-sm">
            <div class="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-people me-2"></i>Family Members
              </h5>
              <span class="badge bg-primary">{{ users().length }} users</span>
            </div>
            <div class="card-body p-0">
              @if (loading()) {
                <div class="text-center py-5">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                </div>
              } @else if (users().length === 0) {
                <div class="text-center py-5 text-muted">
                  <i class="bi bi-people fs-1 d-block mb-2"></i>
                  <p class="mb-0">No users found</p>
                </div>
              } @else {
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th class="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (user of users(); track user.id) {
                        <tr>
                          <td>
                            <div class="d-flex align-items-center">
                              <div class="avatar-circle me-2" [class]="'bg-' + getRoleColor(user.role)">
                                {{ user.name.charAt(0).toUpperCase() }}
                              </div>
                              <span class="fw-medium">{{ user.name }}</span>
                            </div>
                          </td>
                          <td class="text-muted">{{ user.email }}</td>
                          <td>
                            <span class="badge" [class]="'bg-' + getRoleColor(user.role)">
                              {{ user.role | uppercase }}
                            </span>
                          </td>
                          <td>
                            @if (user.isActive) {
                              <span class="badge bg-success">Active</span>
                            } @else {
                              <span class="badge bg-secondary">Inactive</span>
                            }
                          </td>
                          <td class="text-center">
                            @if (user.id !== currentUserId()) {
                              <button
                                class="btn btn-sm btn-outline-warning me-1"
                                (click)="toggleUserStatus(user)"
                                [title]="user.isActive ? 'Deactivate' : 'Activate'"
                              >
                                <i class="bi" [class.bi-pause-circle]="user.isActive" [class.bi-play-circle]="!user.isActive"></i>
                              </button>
                            } @else {
                              <span class="badge bg-light text-dark">You</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .avatar-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
    }
  `,
})
export class UserManagementComponent {
  private readonly authService = inject(AuthService);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly isCreating = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly currentUserId = computed(() => this.authService.currentUser()?.id);

  protected newUser = {
    name: '',
    email: '',
    password: '',
    role: 'user' as Role,
  };

  constructor() {
    this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const allUsers = await this.authService.getAllUsers();
      this.users.set(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.loading.set(false);
    }
  }

  protected isFormValid(): boolean {
    return (
      this.newUser.name.trim().length > 0 &&
      this.newUser.email.trim().length > 0 &&
      this.newUser.password.length >= 6
    );
  }

  protected async createUser(): Promise<void> {
    if (!this.isFormValid()) return;

    this.isCreating.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.authService.createUserAsAdmin(
        this.newUser.email.trim(),
        this.newUser.password,
        this.newUser.name.trim(),
        this.newUser.role as Role
      );

      if (success) {
        this.successMessage.set(`User "${this.newUser.name}" created successfully!`);
        this.newUser = { name: '', email: '', password: '', role: 'user' as Role };
        await this.loadUsers();
      } else {
        this.errorMessage.set(this.authService.error() || 'Failed to create user.');
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An error occurred.');
    } finally {
      this.isCreating.set(false);
      setTimeout(() => this.successMessage.set(''), 3000);
    }
  }

  protected async toggleUserStatus(user: User): Promise<void> {
    const success = await this.authService.updateUser(user.id, { isActive: !user.isActive });
    if (success) {
      this.successMessage.set(`User "${user.name}" ${user.isActive ? 'deactivated' : 'activated'}.`);
      await this.loadUsers();
      setTimeout(() => this.successMessage.set(''), 3000);
    }
  }

  protected getRoleColor(role: Role): string {
    switch (role) {
      case Role.ADMIN:
        return 'danger';
      case Role.USER:
        return 'success';
      case Role.VIEWER:
        return 'info';
      default:
        return 'secondary';
    }
  }
}
