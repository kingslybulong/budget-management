import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services';
import { Role } from '../models';

/**
 * Wait for auth to finish loading
 */
async function waitForAuth(authService: AuthService): Promise<void> {
  // Wait up to 5 seconds for auth to load
  let attempts = 0;
  while (authService.loading() && attempts < 50) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }
}

/**
 * Guard to check if user is authenticated
 */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Guard to redirect already authenticated users away from login page
 */
export const loginGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  if (authService.isAuthenticated()) {
    router.navigate([authService.getDefaultRoute()]);
    return false;
  }

  return true;
};
