import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { CallSession, Agent } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'vp-call-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="page-head">
      <div><h1>Calls</h1><p class="sub">History, transcripts, recordings, notes & summaries</p></div>
      <button class="btn green" routerLink="/calls/live/new">＋ New simulated call</button>
    </div>
    <div class="toolbar">
      <input type="search" placeholder="Search caller, phone, id…" [(ngModel)]="q" (input)="load()">
      <select [(ngModel)]="status" (change)="load()">
        <option value="">All statuses</option>
        <option value="active">Active</option><option value="completed">Completed</option>
        <option value="human_takeover">Human takeover</option><option value="terminated">Terminated</option>
        <option value="failed">Failed</option>
      </select>
      <select [(ngModel)]="agentId" (change)="load()">
        <option value="">All agents</option>
        @for (a of agents(); track a._id) { <option [value]="a._id">{{ a.name }}</option> }
      </select>
    </div>
    <div class="card" style="padding:0">
      @if (!calls().length) { <div class="empty"><div class="big">📭</div>No calls match.</div> }
      @else {
        <table class="table">
          <thead><tr><th>Caller</th><th>Agent</th><th>Started</th><th>Duration</th><th>Status</th></tr></thead>
          <tbody>
            @for (c of calls(); track c._id) {
              <tr>
                <td><a class="link" [routerLink]="['/calls', c._id]">{{ c.callerName || 'Unknown caller' }}</a>
                  <div style="font-size:12px;color:var(--muted)">{{ c.callerPhone || c.direction }}</div></td>
                <td>{{ c.agentName || '—' }}</td>
                <td style="font-size:13px">{{ c.startedAt | date:'short' }}</td>
                <td>{{ c.durationSec || 0 }}s</td>
                <td><vp-status-badge [status]="c.status"></vp-status-badge></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class CallHistoryComponent implements OnInit {
  private api = inject(ApiService);
  calls = signal<CallSession[]>([]);
  agents = signal<Agent[]>([]);
  q = ''; status = ''; agentId = '';

  ngOnInit(): void {
    this.load();
    this.api.get<Agent[]>('/agents').subscribe({ next: a => this.agents.set(a) });
  }
  load(): void {
    const params: Record<string, string> = {};
    if (this.q) params['q'] = this.q;
    if (this.status) params['status'] = this.status;
    if (this.agentId) params['agentId'] = this.agentId;
    this.api.get<CallSession[]>('/calls', params).subscribe({ next: c => this.calls.set(c) });
  }
}
