import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    return this.http.get<T>(API + path, { params });
  }
  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(API + path, body ?? {});
  }
  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(API + path, body);
  }
  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(API + path, body);
  }
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(API + path);
  }
  postForm<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<T>(API + path, form);
  }
  clipUrl(clipId: string): string {
    return `${API}/recordings/${clipId}/stream`;
  }
}
