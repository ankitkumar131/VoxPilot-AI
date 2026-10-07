import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Agent, ScriptDoc, CallSession } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'vp-agent-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent],
  template: `
    @if (agent(); as a) {
      <div class="page-head">
        <div><h1>{{ a.name }}</h1><p class="sub">{{ a.description || 'AI agent' }}</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn green" (click)="call()">📞 Test call</button>
          <button class="btn ghost" [routerLink]="['/agents', a._id, 'edit']">Edit</button>
        </div>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <h2>Configuration</h2>
          <dl class="kv">
            <dt>Status</dt><dd><vp-status-badge [status]="a.enabled ? 'on' : 'off'"></vp-status-badge></dd>
            <dt>Language / Voice</dt><dd>{{ a.language }} · {{ a.voice }}</dd>
            <dt>Script</dt><dd>@if (a.scriptId) { <a class="link" [routerLink]="['/scripts', a.scriptId]">{{ scriptName() }}</a> } @else { — }</dd>
            <dt>Recording</dt><dd>{{ a.recordingMode }}</dd>
            <dt>Max call</dt><dd>{{ a.maxCallMinutes }} min · {{ a.maxRetries }} retries</dd>
            <dt>Follow-ups</dt><dd>{{ a.allowFollowUps ? 'Allowed' : 'Off' }} · Barge-in {{ a.allowBargeIn ? 'on' : 'off' }}</dd>
          </dl>
          <h3 style="margin-top:14px">Personality</h3><p>{{ a.personality }}</p>
          <h3>Greeting</h3><p><em>"{{ a.greeting }}"</em></p>
        </div>
        <div class="card">
          <h2>Recent calls with this agent</h2>
          @if (!calls().length) { <div class="empty">No calls yet.</div> }
          @for (c of calls(); track c._id) {
            <div class="row" [routerLink]="['/calls', c._id]">
              <div><strong>{{ c.callerName || 'Unknown' }}</strong>
                <div class="muted">{{ c.startedAt | date:'short' }}</div></div>
              <vp-status-badge [status]="c.status"></vp-status-badge>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`.row{display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-bottom:1px solid #f1f5f9;cursor:pointer}
    .row:hover{background:#f8fafc}.muted{font-size:12px;color:var(--muted)}`],
})
export class AgentDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  agent = signal<Agent | null>(null);
  scriptName = signal('—');
  calls = signal<CallSession[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get<Agent>(`/agents/${id}`).subscribe({ next: a => {
      this.agent.set(a);
      if (a.scriptId) this.api.get<ScriptDoc>(`/scripts/${a.scriptId}`).subscribe({ next: s => this.scriptName.set(s.name) });
    }});
    this.api.get<CallSession[]>('/calls', { agentId: id, limit: '10' }).subscribe({ next: c => this.calls.set(c) });
  }
  call(): void { this.router.navigate(['/calls', 'live', 'new'], { queryParams: { agentId: this.agent()?._id } }); }
}
