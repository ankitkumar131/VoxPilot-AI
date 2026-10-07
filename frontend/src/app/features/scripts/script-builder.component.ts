import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ScriptDoc, ScriptQuestion, QUESTION_TYPES, QuestionType } from '../../core/models';

function uid(): string { return 'q' + Math.random().toString(36).slice(2, 9); }

@Component({
  selector: 'vp-script-builder',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    @if (script(); as s) {
      <div class="page-head">
        <div>
          <a class="link" routerLink="/scripts">← Scripts</a>
          <h1>{{ s.name }}</h1>
          <p class="sub">{{ s.questions.length }} questions · {{ s.mode }} mode</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn ghost" (click)="addQuestion()">＋ Add question</button>
          <button class="btn primary" (click)="save()" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save script' }}</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="field-row">
          <div class="field"><label>Script name</label><input [(ngModel)]="s.name"></div>
          <div class="field"><label>Mode</label>
            <select [(ngModel)]="s.mode">
              <option value="general">General</option><option value="interview">Interview</option>
              <option value="complaint">Complaint</option><option value="survey">Survey</option>
              <option value="receptionist">Receptionist</option><option value="lead">Lead qualification</option>
              <option value="support">Support</option><option value="feedback">Feedback</option>
            </select></div>
        </div>
        <div class="field"><label>Description</label><input [(ngModel)]="s.description" placeholder="What is this workflow for?"></div>
      </div>
      <div class="builder">
        <div class="flow">
          @for (q of s.questions; track q.id; let i = $index) {
            <div class="qnode" [class.selected]="selectedId() === q.id" (click)="selectedId.set(q.id)">
              <div class="qhead">
                <span class="qn">Q{{ i + 1 }}</span>
                <span class="qtype">{{ typeLabel(q.type) }}</span>
                @if (q.required) { <span class="req">required</span> }
                @if (q.endAfter) { <span class="end">ends call</span> }
                <span class="sp"></span>
                <button class="mini" (click)="move(i, -1, $event)" [disabled]="i===0">↑</button>
                <button class="mini" (click)="move(i, 1, $event)" [disabled]="i===s.questions.length-1">↓</button>
                <button class="mini danger" (click)="removeQuestion(i, $event)">✕</button>
              </div>
              <div class="qtext">{{ q.text }}</div>
              @if (q.branches?.length || q.nextQuestionId) {
                <div class="branches">
                  @for (b of q.branches || []; track $index) {
                    <div class="br">↳ if <code>{{ b.match }}</code> → <strong>{{ qTitle(s, b.nextQuestionId) }}</strong></div>
                  }
                  @if (q.nextQuestionId) {
                    <div class="br def">↳ default → <strong>{{ qTitle(s, q.nextQuestionId) }}</strong></div>
                  }
                </div>
              }
              @if (i < s.questions.length - 1 && !q.nextQuestionId && !q.branches?.length) { <div class="arrow">↓</div> }
            </div>
          }
          @if (!s.questions.length) { <div class="card"><div class="empty">No questions yet — add one above.</div></div> }
        </div>
        <div class="editor">
          @if (selected(); as q) {
            <div class="card">
              <h2>Edit question</h2>
              <div class="field"><label>Question text *</label><textarea [(ngModel)]="q.text" rows="2"></textarea></div>
              <div class="field-row">
                <div class="field"><label>Type</label>
                  <select [(ngModel)]="q.type">
                    @for (t of qtypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                  </select></div>
                <div class="field"><label>Expected answer (hint for AI)</label><input [(ngModel)]="q.expectedAnswer" placeholder="optional"></div>
              </div>
              @if (q.type === 'multiple_choice') {
                <div class="field"><label>Options (comma separated)</label>
                  <input [ngModel]="(q.options || []).join(', ')" (ngModelChange)="q.options = splitOpts($event)"></div>
              }
              @if (q.type === 'number' || q.type === 'rating') {
                <div class="field-row">
                  <div class="field"><label>Min</label><input type="number" [(ngModel)]="q.min"></div>
                  <div class="field"><label>Max</label><input type="number" [(ngModel)]="q.max"></div>
                </div>
              }
              @if (q.type === 'custom') {
                <div class="field"><label>Validation regex</label><input [(ngModel)]="q.validation" placeholder="e.g. ^[A-Z]{3}-\\d+$"></div>
              }
              <div class="field-row">
                <div class="field"><label>Retry limit</label><input type="number" [(ngModel)]="q.retryLimit" min="0" max="10"></div>
                <div class="field"><label>Timeout (sec)</label><input type="number" [(ngModel)]="q.timeoutSec" min="2" max="120"></div>
              </div>
              <div class="field-row">
                <div class="field"><label>Max follow-ups</label><input type="number" [(ngModel)]="q.maxFollowUps" min="0" max="5"></div>
                <div class="field"><label>Default next question</label>
                  <select [(ngModel)]="q.nextQuestionId">
                    <option value="">— Sequential (next in list) —</option>
                    @for (o of s.questions; track o.id) {
                      @if (o.id !== q.id) { <option [value]="o.id">{{ qTitle(s, o.id) }}</option> }
                    }
                  </select></div>
              </div>
              <label class="check"><input type="checkbox" [(ngModel)]="q.required"> Required</label>
              <label class="check"><input type="checkbox" [(ngModel)]="q.followUpEnabled"> Allow AI follow-ups here</label>
              <label class="check"><input type="checkbox" [(ngModel)]="q.endAfter"> End call after this question</label>
              <h3 style="margin-top:16px">Conditional branching</h3>
              @for (b of q.branches || []; track $index; let bi = $index) {
                <div class="branch-row">
                  <select [(ngModel)]="b.matchMode"><option value="equals">equals</option><option value="contains">contains</option><option value="regex">regex</option></select>
                  <input [(ngModel)]="b.match" placeholder="match value">
                  <select [(ngModel)]="b.nextQuestionId">
                    @for (o of s.questions; track o.id) {
                      @if (o.id !== q.id) { <option [value]="o.id">{{ qTitle(s, o.id) }}</option> }
                    }
                  </select>
                  <button class="mini danger" (click)="q.branches!.splice(bi, 1)">✕</button>
                </div>
              }
              <button class="btn sm ghost" (click)="addBranch(q)">＋ Add branch rule</button>
            </div>
          } @else {
            <div class="card"><div class="empty">Select a question to edit it.</div></div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .builder { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .builder { grid-template-columns: 1fr; } }
    .qnode { background: #fff; border: 2px solid var(--line); border-radius: 12px; padding: 12px 14px; margin-bottom: 4px; cursor: pointer; }
    .qnode.selected { border-color: var(--brand); box-shadow: 0 0 0 3px #e0e7ff; }
    .qhead { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .qn { background: var(--brand); color: #fff; font-weight: 800; font-size: 12px; padding: 2px 9px; border-radius: 999px; }
    .qtype { font-size: 12px; font-weight: 700; color: var(--muted); }
    .req { font-size: 11px; font-weight: 800; color: #c2410c; background: #ffedd5; padding: 2px 8px; border-radius: 999px; }
    .end { font-size: 11px; font-weight: 800; color: #a21caf; background: #fae8ff; padding: 2px 8px; border-radius: 999px; }
    .sp { flex: 1; }
    .mini { border: 1px solid var(--line); background: #f8fafc; border-radius: 6px; cursor: pointer; padding: 2px 8px; font-size: 12px; }
    .mini.danger { color: #b91c1c; } .mini:disabled { opacity: .4; }
    .qtext { font-size: 14px; font-weight: 600; }
    .branches { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
    .br { font-size: 12.5px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 5px 9px; }
    .br code { background: #e2e8f0; padding: 1px 6px; border-radius: 4px; }
    .br.def { border-style: solid; }
    .arrow { text-align: center; color: #94a3b8; font-size: 18px; line-height: 1.2; }
    .branch-row { display: grid; grid-template-columns: 100px 1fr 1fr auto; gap: 8px; margin-bottom: 8px; }
    .branch-row select, .branch-row input { border: 1px solid var(--line); border-radius: 8px; padding: 8px; font-size: 13px; }
    .editor { position: sticky; top: 76px; }
  `],
})
export class ScriptBuilderComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  script = signal<ScriptDoc | null>(null);
  selectedId = signal<string | null>(null);
  busy = signal(false);
  qtypes = QUESTION_TYPES;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get<ScriptDoc>(`/scripts/${id}`).subscribe({ next: s => {
      s.questions = [...(s.questions || [])].sort((a, b) => a.order - b.order);
      this.script.set(s);
      if (s.questions.length) this.selectedId.set(s.questions[0].id);
    }});
  }
  selected(): ScriptQuestion | null {
    return this.script()?.questions.find(q => q.id === this.selectedId()) ?? null;
  }
  typeLabel(t: QuestionType): string { return QUESTION_TYPES.find(x => x.value === t)?.label || t; }
  qTitle(s: ScriptDoc, id?: string): string {
    const i = s.questions.findIndex(q => q.id === id);
    if (i < 0) return '—';
    const t = s.questions[i].text;
    return `Q${i + 1}: ${t.length > 42 ? t.slice(0, 42) + '…' : t}`;
  }
  splitOpts(v: string): string[] { return v.split(',').map(x => x.trim()).filter(Boolean); }
  addQuestion(): void {
    const s = this.script(); if (!s) return;
    const q: ScriptQuestion = {
      id: uid(), order: s.questions.length, text: 'New question?', type: 'open_ended',
      required: true, retryLimit: 2, timeoutSec: 15, followUpEnabled: false, maxFollowUps: 1,
    };
    s.questions.push(q);
    this.selectedId.set(q.id);
  }
  removeQuestion(i: number, ev: Event): void {
    ev.stopPropagation();
    const s = this.script(); if (!s) return;
    const [gone] = s.questions.splice(i, 1);
    // repair dangling references
    for (const q of s.questions) {
      if (q.nextQuestionId === gone.id) q.nextQuestionId = undefined;
      q.branches = (q.branches || []).filter(b => b.nextQuestionId !== gone.id);
    }
    s.questions.forEach((q, idx) => (q.order = idx));
    if (this.selectedId() === gone.id) this.selectedId.set(s.questions[0]?.id ?? null);
  }
  move(i: number, dir: number, ev: Event): void {
    ev.stopPropagation();
    const s = this.script(); if (!s) return;
    const j = i + dir;
    [s.questions[i], s.questions[j]] = [s.questions[j], s.questions[i]];
    s.questions.forEach((q, idx) => (q.order = idx));
  }
  addBranch(q: ScriptQuestion): void {
    q.branches = q.branches || [];
    const s = this.script()!;
    const target = s.questions.find(o => o.id !== q.id)?.id || '';
    q.branches.push({ match: 'yes', matchMode: 'equals', nextQuestionId: target });
  }
  save(): void {
    const s = this.script(); if (!s) return;
    if (s.questions.some(q => !q.text.trim())) { this.toast.err('All questions need text'); return; }
    this.busy.set(true);
    this.api.put<ScriptDoc>(`/scripts/${s._id}`, {
      name: s.name, description: s.description, mode: s.mode,
      questions: s.questions.map((q, i) => ({ ...q, order: i, nextQuestionId: q.nextQuestionId || undefined })),
    }).subscribe({
      next: saved => { this.script.set(saved); this.toast.ok('Script saved'); this.busy.set(false); },
      error: e => { this.toast.err(e.error?.error || 'Save failed'); this.busy.set(false); },
    });
  }
}
