import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Agent, ScriptDoc, AiProvider } from '../../core/models';

@Component({
  selector: 'vp-agent-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="page-head">
      <div><h1>{{ isEdit() ? 'Edit agent' : 'New agent' }}</h1>
        <p class="sub">Configure personality, voice, script and call behavior</p></div>
      <button class="btn ghost" routerLink="/agents">Cancel</button>
    </div>
    <form [formGroup]="form" (ngSubmit)="save()">
      <div class="grid cols-2">
        <div class="card">
          <h2>Identity</h2>
          <div class="field"><label>Agent name *</label><input formControlName="name" placeholder="Frontend Developer Interviewer"></div>
          <div class="field"><label>Description</label><textarea formControlName="description" placeholder="What is this agent for?"></textarea></div>
          <div class="field-row">
            <div class="field"><label>Language</label>
              <select formControlName="language">
                <option value="en">English</option><option value="es">Spanish</option>
                <option value="hi">Hindi</option><option value="fr">French</option><option value="de">German</option>
              </select></div>
            <div class="field"><label>Voice</label>
              <select formControlName="voice">
                <option value="alloy">Alloy</option><option value="echo">Echo</option>
                <option value="fable">Fable</option><option value="nova">Nova</option><option value="shimmer">Shimmer</option>
              </select></div>
          </div>
          <div class="field"><label>Personality</label>
            <textarea formControlName="personality" placeholder="friendly, professional, concise"></textarea></div>
          <div class="field"><label>Speaking style</label>
            <textarea formControlName="speakingStyle" placeholder="natural conversational telephone speech"></textarea></div>
          <div class="field"><label>Greeting</label>
            <textarea formControlName="greeting" placeholder="Hello, this is …"></textarea></div>
        </div>
        <div>
          <div class="card">
            <h2>Script & AI</h2>
            <div class="field"><label>Script</label>
              <select formControlName="scriptId">
                <option value="">— No script (free conversation) —</option>
                @for (s of scripts(); track s._id) { <option [value]="s._id">{{ s.name }} ({{ s.questions.length }} Qs)</option> }
              </select>
              <span class="hint">Attach a question workflow from <a class="link" routerLink="/scripts">scripts</a>.</span></div>
            <div class="field"><label>AI provider</label>
              <select formControlName="providerId">
                <option value="">— Default provider —</option>
                @for (p of providers(); track p._id) { <option [value]="p._id">{{ p.name }} · {{ p.model }}</option> }
              </select></div>
            <div class="field"><label>Model override (optional)</label><input formControlName="modelOverride" placeholder="e.g. meta-llama/llama-3-70b"></div>
          </div>
          <div class="card" style="margin-top:16px">
            <h2>Call behavior</h2>
            <div class="field-row">
              <div class="field"><label>Max call (min)</label><input type="number" formControlName="maxCallMinutes"></div>
              <div class="field"><label>Silence timeout (s)</label><input type="number" formControlName="silenceTimeoutSec"></div>
            </div>
            <div class="field-row">
              <div class="field"><label>Max retries</label><input type="number" formControlName="maxRetries"></div>
              <div class="field"><label>Recording mode</label>
                <select formControlName="recordingMode">
                  <option value="segments">Per-question segments</option>
                  <option value="full">Full call</option>
                  <option value="answers_only">Caller answers only</option>
                  <option value="transcript_only">Transcript only</option>
                  <option value="notes_only">Notes only</option>
                </select></div>
            </div>
            <label class="check"><input type="checkbox" formControlName="allowFollowUps"> Allow AI follow-up questions</label>
            <label class="check"><input type="checkbox" formControlName="allowBargeIn"> Allow caller interruption (barge-in)</label>
            <label class="check"><input type="checkbox" formControlName="transcribe"> Transcribe call</label>
            <label class="check"><input type="checkbox" formControlName="takeNotes"> Generate structured notes</label>
            <label class="check"><input type="checkbox" formControlName="enabled"> Agent enabled</label>
            <div class="field"><label>Closing phrase (optional)</label><input formControlName="endPhrase"></div>
          </div>
          <div style="margin-top:16px;display:flex;gap:10px">
            <button class="btn primary" [disabled]="form.invalid || busy()">{{ busy() ? 'Saving…' : 'Save agent' }}</button>
            <button type="button" class="btn ghost" routerLink="/agents">Cancel</button>
          </div>
        </div>
      </div>
    </form>
  `,
})
export class AgentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  busy = signal(false);
  isEdit = signal(false);
  scripts = signal<ScriptDoc[]>([]);
  providers = signal<AiProvider[]>([]);
  private id: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required], description: [''], language: ['en'], voice: ['alloy'],
    personality: ['friendly, professional, concise'], speakingStyle: ['natural conversational telephone speech, one question at a time'],
    greeting: ['Hello, this is VoxPilot AI. How can I help you today?'],
    scriptId: [''], providerId: [''], modelOverride: [''],
    maxCallMinutes: [15], silenceTimeoutSec: [8], maxRetries: [2], recordingMode: ['segments'],
    allowFollowUps: [true], allowBargeIn: [true], transcribe: [true], takeNotes: [true],
    enabled: [true], endPhrase: [''],
  });

  ngOnInit(): void {
    this.api.get<ScriptDoc[]>('/scripts').subscribe({ next: s => this.scripts.set(s) });
    this.api.get<AiProvider[]>('/providers').subscribe({ next: p => this.providers.set(p) });
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.isEdit.set(true);
      this.api.get<Agent>(`/agents/${this.id}`).subscribe({ next: a => this.form.patchValue(a as never) });
    }
  }
  save(): void {
    if (this.form.invalid) return;
    this.busy.set(true);
    const body = { ...this.form.value };
    const req = this.id
      ? this.api.patch<Agent>(`/agents/${this.id}`, body)
      : this.api.post<Agent>('/agents', body);
    req.subscribe({
      next: a => { this.toast.ok('Agent saved'); this.router.navigate(['/agents', a._id]); },
      error: e => { this.toast.err(e.error?.error || 'Save failed'); this.busy.set(false); },
    });
  }
}
