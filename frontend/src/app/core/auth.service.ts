import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthResponse, User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  user = signal<User | null>(null);
  loggedIn = computed(() => !!this.user());

  get token(): string | null { return localStorage.getItem('vp_access'); }

  initFromStorage(): void {
    const raw = localStorage.getItem('vp_user');
    if (raw && this.token) { try { this.user.set(JSON.parse(raw)); } catch {} }
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap(r => this.persist(r)));
  }
  register(name: string, email: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/register', { name, email, password })
      .pipe(tap(r => this.persist(r)));
  }
  private persist(r: AuthResponse): void {
    localStorage.setItem('vp_access', r.access);
    localStorage.setItem('vp_refresh', r.refresh);
    localStorage.setItem('vp_user', JSON.stringify(r.user));
    this.user.set(r.user);
  }
  logout(): void {
    const refresh = localStorage.getItem('vp_refresh');
    if (refresh && this.token) this.http.post('/api/auth/logout', { refresh }).subscribe({ error: () => {} });
    localStorage.removeItem('vp_access'); localStorage.removeItem('vp_refresh'); localStorage.removeItem('vp_user');
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
