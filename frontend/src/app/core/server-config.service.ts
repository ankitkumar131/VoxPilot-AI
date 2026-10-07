// Resolves the backend base URL. Web dev uses relative URLs (proxy).
// The APK/WebView cannot reach a proxy, so the user sets the server
// address in-app (login screen or Settings); stored in localStorage.
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

const KEY = 'vp_server';

@Injectable({ providedIn: 'root' })
export class ServerConfigService {
  get baseUrl(): string {
    const override = (localStorage.getItem(KEY) || '').trim().replace(/\/$/, '');
    if (override) return override;
    return (environment.apiBaseUrl || '').replace(/\/$/, '');
  }
  api(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }
  setServer(url: string): void {
    const clean = (url || '').trim().replace(/\/$/, '');
    if (clean) localStorage.setItem(KEY, clean);
    else localStorage.removeItem(KEY);
  }
  reset(): void { localStorage.removeItem(KEY); }
}
