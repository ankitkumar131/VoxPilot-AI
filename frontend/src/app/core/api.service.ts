import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServerConfigService } from './server-config.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private server = inject(ServerConfigService);

  private url(path: string): string {
    return this.server.api(path.startsWith('/api') ? path : '/api' + path);
  }
  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.http.get<T>(this.url(path), { params });
  }
  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? {});
  }
  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }
  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }
  postForm<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<T>(this.url(path), form);
  }
  clipUrl(clipId: string): string {
    return this.url(`/api/recordings/${clipId}/stream`);
  }
}
