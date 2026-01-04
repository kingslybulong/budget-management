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
 * Guard to allow VIEWER, USER, and ADMIN roles
 * Viewer has READ-ONLY access to all data
 */
export const viewerGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await waitForAuth(authService);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // All roles can access viewer routes (read-only data)
  if (authService.hasAnyRole([Role.VIEWER, Role.USER, Role.ADMIN])) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
