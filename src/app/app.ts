import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services';
import { NavbarComponent } from './shared/components';

/**
 * Root application component
 * Displays navbar for authenticated users and router outlet
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    @if (authService.loading()) {
      <div class="d-flex justify-content-center align-items-center vh-100">
        <div class="text-center">
          <div class="spinner-border text-primary mb-3" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="text-muted">Loading...</p>
        </div>
      </div>
    } @else {
      @if (authService.isAuthenticated()) {
        <app-navbar />
      }
      <main>
        <router-outlet />
      </main>
    }
  `,
  styles: `
    main {
      min-height: calc(100vh - 56px);
    }
  `,
})
export class App {
  protected readonly authService = inject(AuthService);
}
