import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('vp_access');
  // ngrok-skip-browser-warning: lets the app work through free ngrok/Cloudflare
  // tunnels (otherwise ngrok serves an interstitial HTML page instead of JSON).
  // Harmless for direct/LAN connections — plain backends simply ignore it.
  const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const authReq = req.clone({ setHeaders: headers });
  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/api/auth/')) {
        localStorage.clear();
        inject(Router).navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
