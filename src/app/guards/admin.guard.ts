import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services';
import { Role } from '../models';

/**
 * Wait for auth to finish loading
 */
async function waitForAuth(authService: AuthService): Promise<void> {
  let attempts = 0;
  while (authService.loading() && attempts < 50) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }
}

/**
 * Guard to allow only ADMIN users
 * Admin has full access to all features
 */
export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.hasRole(Role.ADMIN)) {
    return true;
  }

  // Redirect to appropriate dashboard based on role
  router.navigate([authService.getDefaultRoute()]);
  return false;
};
