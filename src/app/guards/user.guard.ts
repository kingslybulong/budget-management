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
 * Guard to allow USER and ADMIN roles
 * Users can submit expense requests and manage their allowances
 */
export const userGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.hasAnyRole([Role.USER, Role.ADMIN])) {
    return true;
  }

  // Redirect viewers to their dashboard
  router.navigate([authService.getDefaultRoute()]);
  return false;
};
