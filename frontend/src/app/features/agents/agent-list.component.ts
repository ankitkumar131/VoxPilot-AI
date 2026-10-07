import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Agent } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'vp-agent-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="page-head">
      <div><h1>Agents</h1><p class="sub">AI personas that answer and conduct calls</p></div>
      <button class="btn primary" (click)="create()">＋ New agent</button>
    </div>
    <div class="toolbar">
      <input type="search" placeholder="Search agents…" [(ngModel)]="q" (input)="load()">
    </div>
    <div class="card" style="padding:0">
      @if (!agents().length) {
        <div class="empty"><div class="big">🤖</div>No agents yet. Create your first AI agent.</div>
      } @else {
        <table class="table">
          <thead><tr><th>Name</th><th>Script</th><th>Status</th><th>Recording</th><th></th></tr></thead>
          <tbody>
            @for (a of agents(); track a._id) {
              <tr>
                <td><a class="link" [routerLink]="['/agents', a._id]">{{ a.name }}</a>
                  <div style="font-size:12px;color:var(--muted)">{{ a.description || a.language + ' · ' + a.voice }}</div></td>
                <td style="font-size:13px">{{ scriptName(a.scriptId) }}</td>
                <td><vp-status-badge [status]="a.enabled ? 'on' : 'off'"></vp-status-badge></td>
                <td style="font-size:13px">{{ a.recordingMode }}</td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="btn sm ghost" (click)="toggle(a)">{{ a.enabled ? 'Disable' : 'Enable' }}</button>
                  <button class="btn sm ghost" [routerLink]="['/agents', a._id, 'edit']">Edit</button>
                  <button class="btn sm danger" (click)="remove(a)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class AgentListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  agents = signal<Agent[]>([]);
  scripts = signal<{ _id: string; name: string }[]>([]);
  q = '';

  ngOnInit(): void {
    this.load();
    this.api.get<{ _id: string; name: string }[]>('/scripts').subscribe({ next: s => this.scripts.set(s) });
  }
  load(): void {
    this.api.get<Agent[]>('/agents', this.q ? { q: this.q } : {}).subscribe({ next: a => this.agents.set(a) });
  }
  scriptName(id?: string): string {
    return this.scripts().find(s => s._id === id)?.name || '—';
  }
  create(): void { this.router.navigate(['/agents', 'new']); }
  toggle(a: Agent): void {
    this.api.post<Agent>(`/agents/${a._id}/toggle`).subscribe({ next: u => {
      this.agents.update(list => list.map(x => x._id === u._id ? u : x));
      this.toast.ok(`Agent ${u.enabled ? 'enabled' : 'disabled'}`);
    }});
  }
  remove(a: Agent): void {
    if (!confirm(`Delete agent "${a.name}"?`)) return;
    this.api.delete(`/agents/${a._id}`).subscribe({ next: () => {
      this.agents.update(list => list.filter(x => x._id !== a._id));
      this.toast.ok('Agent deleted');
    }});
  }
}
