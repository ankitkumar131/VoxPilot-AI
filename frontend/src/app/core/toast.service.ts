import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; kind: 'ok' | 'err' | 'info'; text: string }

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private id = 0;
  show(text: string, kind: Toast['kind'] = 'info'): void {
    const id = ++this.id;
    this.toasts.update(t => [...t, { id, kind, text }]);
    setTimeout(() => this.toasts.update(t => t.filter(x => x.id !== id)), 4200);
  }
  ok(text: string): void { this.show(text, 'ok'); }
  err(text: string): void { this.show(text, 'err'); }
}
