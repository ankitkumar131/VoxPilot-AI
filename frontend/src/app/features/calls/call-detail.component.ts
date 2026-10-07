import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { CallDetail } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { AudioPlayerComponent } from '../../shared/components/audio-player.component';

@Component({
  selector: 'vp-call-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusBadgeComponent, AudioPlayerComponent],
  template: `
    @if (d(); as data) {
      <a class="link" routerLink="/calls">← All calls</a>
      <div class="page-head" style="margin-top:8px">
        <div><h1>{{ data.call.callerName || 'Unknown caller' }}</h1>
          <p class="sub">{{ data.agent?.name }} · {{ data.call.startedAt | date:'medium' }} · {{ data.call.durationSec || 0 }}s</p></div>
        <vp-status-badge [status]="data.call.status"></vp-status-badge>
      </div>
      <div class="tabs">
        @for (t of tabs; track t) {
          <button [class.active]="tab() === t" (click)="tab.set(t)">{{ t }}</button>
        }
      </div>
      @if (tab() === 'Overview') {
        <div class="grid cols-2">
          <div class="card"><h2>Call info</h2>
            <dl class="kv">
              <dt>Caller</dt><dd>{{ data.call.callerName || '—' }} {{ data.call.callerPhone || '' }}</dd>
              <dt>Agent</dt><dd>{{ data.agent?.name }}</dd>
              <dt>Direction</dt><dd>{{ data.call.direction }}</dd>
              <dt>Questions done</dt><dd>{{ data.call.completedQuestionIds.length }}</dd>
              <dt>Turns</dt><dd>{{ data.turns.length }}</dd>
              <dt>Clips</dt><dd>{{ data.clips.length }}</dd>
            </dl></div>
          <div class="card"><h2>Summary</h2>
            @if (data.summary) { <p>{{ data.summary.shortSummary }}</p>
              @if (data.summary.actionItems.length) { <h3>Action items</h3>
                <ul>@for (a of data.summary.actionItems; track a) { <li>{{ a }}</li> } </ul> }
              @if (data.summary.observations.length) { <h3>Observations</h3>
                <ul>@for (o of data.summary.observations; track o) { <li>{{ o }}</li> } </ul> }
            } @else { <div class="empty">No summary yet.</div> }
          </div>
        </div>
      }
      @if (tab() === 'Transcript') {
        <div class="card">
          @for (t of data.turns; track t._id) {
            <div class="turn {{ t.speaker }}">
              <div class="avatar">{{ t.speaker === 'ai' ? '🤖' : t.speaker === 'caller' ? '🧑' : t.speaker === 'human_agent' ? '🎧' : '⚙️' }}</div>
              <div class="bubble"><div class="who">{{ t.speaker.replace('_', ' ') }} · {{ t.kind }}</div>
                {{ t.text }}
                <div class="time">{{ t.timestamp | date:'mediumTime' }}@if (t.bargeIn) { · ⚡ barge-in }</div></div>
            </div>
          }
          @if (!data.turns.length) { <div class="empty">No transcript.</div> }
        </div>
      }
      @if (tab() === 'Questions') {
        <div class="grid">
          @for (q of data.script?.questions || []; track q.id) {
            <div class="card">
              <h3>{{ q.text }}</h3>
              <p style="font-size:12px;color:var(--muted)">{{ q.type }} · {{ q.required ? 'required' : 'optional' }}</p>
              @for (t of turnsFor(data, q.id); track t._id) {
                <div class="turn {{ t.speaker }}">
                  <div class="avatar">{{ t.speaker === 'ai' ? '🤖' : '🧑' }}</div>
                  <div class="bubble">{{ t.text }}</div>
                </div>
              }
              <div class="grid cols-2" style="margin-top:8px">
                @for (c of clipsFor(data, q.id); track c._id) {
                  <vp-audio-player [clipId]="c._id" [label]="c.kind === 'ai_question' ? '▶ AI question' : '▶ Caller answer'"
                    [sub]="(c.bytes / 1024).toFixed(0) + ' KB · ' + (c.durationSec || 0) + 's'"></vp-audio-player>
                }
              </div>
              @for (n of notesFor(data, q.id); track n._id) {
                <pre class="json">{{ n.text }}</pre>
              }
            </div>
          }
          @if (!(data.script?.questions?.length)) { <div class="card"><div class="empty">No script attached.</div></div> }
        </div>
      }
      @if (tab() === 'Recordings') {
        <div class="card"><h2>Audio clips ({{ data.clips.length }})</h2>
          <div class="grid cols-2">
            @for (c of data.clips; track c._id) {
              <vp-audio-player [clipId]="c._id" [label]="c.kind.replace('_', ' ')"
                [sub]="(c.bytes / 1024).toFixed(0) + ' KB'"></vp-audio-player>
            }
          </div>
          @if (!data.clips.length) { <div class="empty">No audio stored for this call.</div> }
        </div>
      }
      @if (tab() === 'Notes') {
        <div class="grid">
          @for (n of data.notes; track n._id) {
            <div class="card"><h3>{{ questionText(data, n.questionId) }}</h3>
              <p>{{ n.text }}</p><pre class="json">{{ n.data | json }}</pre></div>
          }
          @if (!data.notes.length) { <div class="card"><div class="empty">No notes.</div></div> }
        </div>
      }
      @if (tab() === 'Evaluation') {
        <div class="card"><h2>AI evaluation</h2>
          @if (data.summary?.interview) {
            <div class="grid cols-2">
              <div><h3>Strengths</h3><ul>@for (s of data.summary!.interview!.strengths; track s) { <li>{{ s }}</li> } </ul></div>
              <div><h3>Weaknesses</h3><ul>@for (w of data.summary!.interview!.weaknesses; track w) { <li>{{ w }}</li> } </ul></div>
            </div>
            <h3>Technical</h3><ul>@for (t of data.summary!.interview!.technical; track t) { <li>{{ t }}</li> } </ul>
            <h3>Communication</h3><ul>@for (c of data.summary!.interview!.communication; track c) { <li>{{ c }}</li> } </ul>
            <h3>Assessment @if (data.summary!.interview!.score !== undefined) { ({{ data.summary!.interview!.score }}/100) }</h3>
            <p>{{ data.summary!.interview!.assessment }}</p>
          } @else if (data.summary?.complaint) {
            <dl class="kv">
              <dt>Category</dt><dd>{{ data.summary!.complaint!.category }}</dd>
              <dt>Severity</dt><dd>{{ data.summary!.complaint!.severity }}</dd>
              <dt>Callback</dt><dd>{{ data.summary!.complaint!.callbackRequired ? 'Required' : 'Not required' }}</dd>
            </dl>
            <p>{{ data.summary!.complaint!.summary }}</p>
          } @else { <div class="empty">No structured evaluation for this call.</div> }
          @if (data.summary) {
            <h3>Extracted entities</h3><pre class="json">{{ data.summary.entities | json }}</pre>
          }
        </div>
      }
    } @else { <div class="card"><div class="empty">Loading…</div></div> }
  `,
})
export class CallDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  d = signal<CallDetail | null>(null);
  tab = signal('Overview');
  tabs = ['Overview', 'Transcript', 'Questions', 'Recordings', 'Notes', 'Evaluation'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get<CallDetail>(`/calls/${id}`).subscribe({ next: d => this.d.set(d) });
  }
  turnsFor(data: CallDetail, qid?: string) { return data.turns.filter(t => t.questionId === qid); }
  clipsFor(data: CallDetail, qid?: string) { return data.clips.filter(c => c.questionId === qid); }
  notesFor(data: CallDetail, qid?: string) { return data.notes.filter(n => n.questionId === qid); }
  questionText(data: CallDetail, qid?: string): string {
    return data.script?.questions.find(q => q.id === qid)?.text || 'General note';
  }
}
