import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { AuthService } from '../../../services';
import { Role } from '../../../models';

/**
 * Main navigation bar component
 * Displays different navigation options based on user role
 */
@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, UpperCasePipe],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
      <div class="container-fluid">
        <a class="navbar-brand d-flex align-items-center" routerLink="/">
          <i class="bi bi-wallet2 me-2"></i>
          <span>Family Budget</span>
        </a>

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          @if (authService.isAuthenticated()) {
            <ul class="navbar-nav me-auto">
              <!-- Admin Navigation -->
              @if (authService.isAdmin()) {
                <li class="nav-item">
                  <a class="nav-link" routerLink="/admin" routerLinkActive="active">
                    <i class="bi bi-speedometer2 me-1"></i> Dashboard
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/admin/budget" routerLinkActive="active">
                    <i class="bi bi-pie-chart me-1"></i> Budget
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/admin/expenses" routerLinkActive="active">
                    <i class="bi bi-receipt me-1"></i> Expenses
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/admin/allowances" routerLinkActive="active">
                    <i class="bi bi-cash-stack me-1"></i> Allowances
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/admin/recurring" routerLinkActive="active">
                    <i class="bi bi-arrow-repeat me-1"></i> Recurring
                  </a>
                </li>
              }

              <!-- User Navigation -->
              @if (authService.isUser()) {
                <li class="nav-item">
                  <a class="nav-link" routerLink="/user" routerLinkActive="active">
                    <i class="bi bi-speedometer2 me-1"></i> Dashboard
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/user/request" routerLinkActive="active">
                    <i class="bi bi-plus-circle me-1"></i> New Request
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/user/history" routerLinkActive="active">
                    <i class="bi bi-clock-history me-1"></i> History
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/user/allowance" routerLinkActive="active">
                    <i class="bi bi-cash me-1"></i> Allowance
                  </a>
                </li>
              }

              <!-- Viewer Navigation -->
              @if (authService.isViewer()) {
                <li class="nav-item">
                  <a class="nav-link" routerLink="/viewer" routerLinkActive="active">
                    <i class="bi bi-speedometer2 me-1"></i> Dashboard
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/viewer/budget" routerLinkActive="active">
                    <i class="bi bi-pie-chart me-1"></i> Budget
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/viewer/expenses" routerLinkActive="active">
                    <i class="bi bi-receipt me-1"></i> Expenses
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" routerLink="/viewer/analytics" routerLinkActive="active">
                    <i class="bi bi-graph-up me-1"></i> Analytics
                  </a>
                </li>
              }
            </ul>

            <ul class="navbar-nav">
              <li class="nav-item dropdown">
                <a
                  class="nav-link dropdown-toggle d-flex align-items-center"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i class="bi bi-person-circle me-1"></i>
                  <span>{{ authService.currentUser()?.name }}</span>
                  <span class="badge ms-2" [class]="getRoleBadgeClass()">
                    {{ authService.currentUser()?.role | uppercase }}
                  </span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li>
                    <span class="dropdown-item-text text-muted small">
                      {{ authService.currentUser()?.email }}
                    </span>
                  </li>
                  <li><hr class="dropdown-divider" /></li>
                  <li>
                    <button class="dropdown-item" (click)="logout()">
                      <i class="bi bi-box-arrow-right me-2"></i> Logout
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          }
        </div>
      </div>
    </nav>
  `,
  styles: `
    .navbar-brand {
      font-weight: 600;
    }
    .nav-link.active {
      font-weight: 500;
    }
  `,
})
export class NavbarComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Get Bootstrap badge class based on user role
   */
  protected getRoleBadgeClass(): string {
    switch (this.authService.currentUser()?.role) {
      case Role.ADMIN:
        return 'bg-danger';
      case Role.USER:
        return 'bg-success';
      case Role.VIEWER:
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Logout and redirect to login page
   */
  protected async logout(): Promise<void> {
    await this.authService.logout();
    // AuthService handles navigation to /login
  }
}
