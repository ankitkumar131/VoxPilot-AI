import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  auth.initFromStorage();
  if (auth.loggedIn()) return true;
  router.navigate(['/login']);
  return false;
};
