import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { ServerConfigService } from './server-config.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private server = inject(ServerConfigService);
  private socket: Socket | null = null;
  connected = signal(false);

  connect(): void {
    if (this.socket?.connected) return;
    const token = localStorage.getItem('vp_access') || '';
    const base = this.server.baseUrl || undefined; // undefined = same origin (web dev)
    const opts = {
      path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'],
      // Best-effort tunnel bypass for the polling transport (ignored where unsupported).
      transportOptions: { polling: { extraHeaders: { 'ngrok-skip-browser-warning': 'true' } } },
    };
    this.socket = io(base, opts as never);
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
  }
  disconnect(): void { this.socket?.disconnect(); this.socket = null; this.connected.set(false); }
  reconnect(): void { this.disconnect(); this.connect(); }
  joinCall(callId: string): void { this.socket?.emit('join-call', callId); }
  leaveCall(callId: string): void { this.socket?.emit('leave-call', callId); }
  signalBargeIn(callId: string): void { this.socket?.emit('barge-in', callId); }
  on<T>(event: string): Observable<T> {
    return new Observable<T>(sub => {
      const h = (p: T) => sub.next(p);
      this.socket?.on(event, h);
      return () => this.socket?.off(event, h);
    });
  }
}
