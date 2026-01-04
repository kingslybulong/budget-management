import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services';

/**
 * Login component - Firebase email/password authentication
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div class="card shadow-lg" style="max-width: 420px; width: 100%;">
        <div class="card-body p-5">
          <!-- Header -->
          <div class="text-center mb-4">
            <i class="bi bi-wallet2 text-primary" style="font-size: 3rem;"></i>
            <h2 class="mt-3 mb-1">Family Budget</h2>
            <p class="text-muted">Household Budget Management System</p>
          </div>

          <!-- Login Form -->
          <form (ngSubmit)="login()">
            <!-- Email Input -->
            <div class="mb-3">
              <label for="email" class="form-label fw-semibold">Email Address</label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="bi bi-envelope"></i>
                </span>
                <input
                  type="email"
                  class="form-control"
                  id="email"
                  name="email"
                  [(ngModel)]="email"
                  placeholder="Enter your email"
                  required
                  [disabled]="loading()"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="mb-4">
              <label for="password" class="form-label fw-semibold">Password</label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="bi bi-lock"></i>
                </span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  class="form-control"
                  id="password"
                  name="password"
                  [(ngModel)]="password"
                  placeholder="Enter your password"
                  required
                  [disabled]="loading()"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  (click)="togglePassword()"
                  [disabled]="loading()"
                >
                  <i class="bi" [class.bi-eye]="!showPassword()" [class.bi-eye-slash]="showPassword()"></i>
                </button>
              </div>
            </div>

            <!-- Login Button -->
            <button
              type="submit"
              class="btn btn-primary w-100 py-2"
              [disabled]="!isFormValid() || loading()"
            >
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Signing in...
              } @else {
                <i class="bi bi-box-arrow-in-right me-2"></i>
                Sign In
              }
            </button>
          </form>

          <!-- Error Message -->
          @if (errorMessage()) {
            <div class="alert alert-danger mt-3 mb-0" role="alert">
              <i class="bi bi-exclamation-circle me-2"></i>
              {{ errorMessage() }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .form-control:focus {
      border-color: var(--bs-primary);
      box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
    }
    .input-group-text {
      background-color: var(--bs-light);
    }
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Form fields */
  protected email = '';
  protected password = '';

  /** UI state */
  protected readonly showPassword = signal<boolean>(false);
  protected readonly loading = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');

  /**
   * Check if form is valid
   */
  protected isFormValid(): boolean {
    return this.email.trim().length > 0 && this.password.length >= 6;
  }

  /**
   * Toggle password visibility
   */
  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  /**
   * Perform login with email and password
   */
  protected async login(): Promise<void> {
    if (!this.isFormValid()) {
      this.errorMessage.set('Please enter a valid email and password (min 6 characters).');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.authService.login(this.email.trim(), this.password);
      if (success) {
        // Redirect based on user role
        const route = this.authService.getDefaultRoute();
        this.router.navigate([route]);
      } else {
        // Error is set by AuthService
        this.errorMessage.set(this.authService.error() ?? 'Login failed. Please try again.');
      }
    } catch (error) {
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
