import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { SocketService } from '../../core/socket.service';
import { DashboardStats } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'vp-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent],
  template: `
    <div class="page-head">
      <div><h1>Dashboard</h1><p class="sub">Your AI call operation at a glance</p></div>
      <button class="btn green" (click)="startCall()">＋ New simulated call</button>
    </div>
    @if (stats(); as s) {
      <div class="grid cols-4">
        <div class="stat"><div class="icon">📞</div><div class="num">{{ s.totalCalls }}</div><div class="lbl">Total calls</div></div>
        <div class="stat"><div class="icon">🤖</div><div class="num">{{ s.totalAgents }}</div><div class="lbl">Agents</div></div>
        <div class="stat"><div class="icon">📝</div><div class="num">{{ s.totalScripts }}</div><div class="lbl">Scripts</div></div>
        <div class="stat"><div class="icon">🎙️</div><div class="num">{{ s.totalRecordings }}</div><div class="lbl">Recordings</div></div>
      </div>
      <div class="grid cols-2" style="margin-top:16px">
        <div class="card">
          <h2><span class="dot-live"></span> Active calls ({{ s.activeCalls.length }})</h2>
          @if (!s.activeCalls.length) { <div class="empty"><div class="big">☎️</div>No active calls right now.</div> }
          @for (c of s.activeCalls; track c._id) {
            <div class="row" (click)="openCall(c._id)">
              <div><strong>{{ c.callerName || 'Unknown caller' }}</strong><div class="muted">{{ c.agentName }}</div></div>
              <vp-status-badge [status]="c.status"></vp-status-badge>
            </div>
          }
        </div>
        <div class="card">
          <h2>Recent calls</h2>
          @if (!s.recentCalls.length) { <div class="empty"><div class="big">📭</div>No calls yet — start a simulated call.</div> }
          @for (c of s.recentCalls; track c._id) {
            <div class="row" (click)="openCall(c._id)">
              <div><strong>{{ c.callerName || 'Unknown caller' }}</strong>
                <div class="muted">{{ c.startedAt | date:'short' }} · {{ c.durationSec || 0 }}s</div></div>
              <vp-status-badge [status]="c.status"></vp-status-badge>
            </div>
          }
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h2>Get started</h2>
        <div class="steps">
          <div class="step"><span>1</span> Connect an AI provider <a class="link" routerLink="/providers">→ providers</a></div>
          <div class="step"><span>2</span> Build a script <a class="link" routerLink="/scripts">→ scripts</a></div>
          <div class="step"><span>3</span> Create an agent <a class="link" routerLink="/agents">→ agents</a></div>
          <div class="step"><span>4</span> Run a simulated call and review transcript, notes & recordings</div>
        </div>
      </div>
    } @else {
      <div class="card"><div class="empty">Loading…</div></div>
    }
  `,
  styles: [`
    .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 4px;
      border-bottom: 1px solid #f1f5f9; cursor: pointer; border-radius: 8px; }
    .row:hover { background: #f8fafc; } .row:last-child { border-bottom: none; }
    .muted { font-size: 12px; color: var(--muted); }
    .steps { display: flex; flex-direction: column; gap: 10px; }
    .step span { display: inline-flex; width: 24px; height: 24px; border-radius: 50%; background: #e0e7ff;
      color: #4338ca; font-weight: 800; font-size: 13px; align-items: center; justify-content: center; margin-right: 8px; }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private socket = inject(SocketService);
  private sub = new Subscription();
  stats = signal<DashboardStats | null>(null);

  ngOnInit(): void {
    this.socket.connect();
    this.load();
    this.sub.add(this.socket.on('call-started').subscribe(() => this.load()));
    this.sub.add(this.socket.on('call-ended').subscribe(() => this.load()));
  }
  ngOnDestroy(): void { this.sub.unsubscribe(); }
  load(): void {
    this.api.get<DashboardStats>('/dashboard/stats').subscribe({ next: s => this.stats.set(s) });
  }
  startCall(): void { this.router.navigate(['/calls', 'live', 'new']); }
  openCall(id: string): void { this.router.navigate(['/calls', id]); }
}
