import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { SocketService } from '../../core/socket.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'vp-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="shell">
      <aside class="sidebar" [class.open]="navOpen()">
        <div class="brand" routerLink="/dashboard">
          <span class="logo">◉</span>
          <span class="name">VoxPilot <em>AI</em></span>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active" (click)="navOpen.set(false)">📊 Dashboard</a>
          <a routerLink="/agents" routerLinkActive="active" (click)="navOpen.set(false)">🤖 Agents</a>
          <a routerLink="/scripts" routerLinkActive="active" (click)="navOpen.set(false)">📝 Scripts</a>
          <a routerLink="/calls" routerLinkActive="active" (click)="navOpen.set(false)">📞 Calls</a>
          <a routerLink="/providers" routerLinkActive="active" (click)="navOpen.set(false)">🔌 AI Providers</a>
          <a routerLink="/settings" routerLinkActive="active" (click)="navOpen.set(false)">⚙️ Settings</a>
        </nav>
        <div class="side-foot">
          <button class="call-btn" (click)="startCall()">＋ New simulated call</button>
          <div class="conn" [class.ok]="socket.connected()">
            {{ socket.connected() ? '● realtime connected' : '○ realtime offline' }}
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="hamburger" (click)="navOpen.set(!navOpen())">☰</button>
          <div class="ai-toggle" title="Global AI kill-switch">
            <span>AI</span>
            <button class="switch" [class.on]="aiEnabled()" (click)="toggleAi()">
              <span class="knob"></span>
            </button>
            <span class="state">{{ aiEnabled() ? 'Enabled' : 'Disabled' }}</span>
          </div>
          <div class="spacer"></div>
          <span class="user">{{ auth.user()?.name }}</span>
          <button class="ghost" (click)="auth.logout()">Logout</button>
        </header>
        <main class="content"><router-outlet></router-outlet></main>
      </div>
    </div>
    <div class="toasts">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [ngClass]="t.kind">{{ t.text }}</div>
      }
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    .sidebar { width: 250px; background: #0f172a; color: #e2e8f0; display: flex; flex-direction: column;
      position: sticky; top: 0; height: 100vh; z-index: 20; }
    .brand { display: flex; align-items: center; gap: 10px; padding: 20px; cursor: pointer; }
    .logo { font-size: 26px; color: #818cf8; }
    .name { font-size: 19px; font-weight: 800; } .name em { color: #818cf8; font-style: normal; }
    nav { display: flex; flex-direction: column; padding: 8px 12px; gap: 4px; flex: 1; }
    nav a { color: #cbd5e1; text-decoration: none; padding: 11px 14px; border-radius: 10px; font-weight: 600; font-size: 14px; }
    nav a:hover { background: #1e293b; color: #fff; }
    nav a.active { background: #4f46e5; color: #fff; }
    .side-foot { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .call-btn { background: #22c55e; border: none; color: #052e16; font-weight: 800; padding: 12px; border-radius: 10px; cursor: pointer; }
    .call-btn:hover { background: #4ade80; }
    .conn { font-size: 12px; color: #64748b; } .conn.ok { color: #4ade80; }
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar { display: flex; align-items: center; gap: 14px; padding: 12px 24px; background: #fff;
      border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
    .hamburger { display: none; background: none; border: none; font-size: 22px; cursor: pointer; }
    .ai-toggle { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; }
    .switch { width: 44px; height: 24px; border-radius: 999px; background: #cbd5e1; border: none; cursor: pointer; position: relative; }
    .switch .knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .15s; }
    .switch.on { background: #22c55e; } .switch.on .knob { left: 23px; }
    .state { font-size: 13px; color: #64748b; font-weight: 600; }
    .spacer { flex: 1; }
    .user { font-weight: 700; font-size: 14px; }
    .ghost { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px; cursor: pointer; font-weight: 600; }
    .content { padding: 24px; max-width: 1180px; width: 100%; margin: 0 auto; }
    .toasts { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 100; }
    .toast { padding: 12px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; color: #fff; max-width: 340px; box-shadow: 0 8px 24px rgba(0,0,0,.2); }
    .toast.ok { background: #15803d; } .toast.err { background: #b91c1c; } .toast.info { background: #1e293b; }
    @media (max-width: 860px) {
      .sidebar { position: fixed; left: 0; transform: translateX(-100%); transition: transform .2s; }
      .sidebar.open { transform: none; box-shadow: 0 0 60px rgba(0,0,0,.4); }
      .hamburger { display: block; }
      .content { padding: 16px; }
    }
  `],
})
export class LayoutComponent implements OnInit {
  auth = inject(AuthService);
  socket = inject(SocketService);
  toast = inject(ToastService);
  private api = inject(ApiService);
  private router = inject(Router);
  navOpen = signal(false);
  aiEnabled = signal(true);

  ngOnInit(): void {
    this.socket.connect();
    this.api.get<{ aiEnabled: boolean }>('/settings').subscribe({ next: s => this.aiEnabled.set(s.aiEnabled) });
  }
  toggleAi(): void {
    const next = !this.aiEnabled();
    this.api.patch<{ aiEnabled: boolean }>('/settings', { aiEnabled: next }).subscribe({
      next: s => { this.aiEnabled.set(s.aiEnabled); this.toast.show(next ? 'AI enabled' : 'AI disabled — calls will be blocked', 'info'); },
      error: () => this.toast.err('Failed to update AI state'),
    });
  }
  startCall(): void { this.router.navigate(['/calls', 'live', 'new']); }
}
