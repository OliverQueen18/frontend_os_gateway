import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Route data: `{ permissions: string[] }` — any match grants access (ADMIN always). */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = (route.data?.['permissions'] as string[] | undefined) ?? [];
  if (!required.length || auth.hasPermission(...required)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
