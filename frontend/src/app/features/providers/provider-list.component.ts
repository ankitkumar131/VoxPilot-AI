import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { AiProvider } from '../../core/models';

const PRESETS: Record<string, { baseUrl: string; model: string }> = {
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.1-70b-instruct' },
  nvidia: { baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-70b-instruct' },
  openai_compatible: { baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' },
  custom: { baseUrl: '', model: '' },
  mock: { baseUrl: '', model: 'mock-llm-v1' },
};

@Component({
  selector: 'vp-provider-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-head">
      <div><h1>AI Providers</h1><p class="sub">Connect your own LLM — keys are encrypted and never shown again</p></div>
      <button class="btn primary" (click)="openNew()">＋ Add provider</button>
    </div>
    <div class="grid cols-2">
      @for (p of providers(); track p._id) {
        <div class="card">
          <div class="phead">
            <div><h3>{{ p.name }} @if (p.isDefault) { <span class="def">DEFAULT</span> }</h3>
              <div class="muted">{{ p.kind }} · {{ p.model }}</div></div>
            <span class="test-dot" [class.ok]="p.lastTestOk" [class.bad]="p.lastTestOk === false"
              [title]="p.lastTestedAt ? 'Last tested ' + p.lastTestedAt : 'Never tested'"></span>
          </div>
          <div class="muted url">{{ p.baseUrl || '—' }}</div>
          <div class="muted">API key: {{ p.apiKeySet ? p.apiKeyMasked + ' (stored encrypted)' : 'not set' }}</div>
          <div class="btn-row">
            <button class="btn sm ghost" (click)="test(p)" [disabled]="testing() === p._id">
              {{ testing() === p._id ? 'Testing…' : 'Test connection' }}</button>
            <button class="btn sm ghost" (click)="openEdit(p)">Edit</button>
            @if (!p.isDefault) { <button class="btn sm ghost" (click)="setDefault(p)">Set default</button> }
            <button class="btn sm danger" (click)="remove(p)">Delete</button>
          </div>
          @if (testResult()[p._id]) {
            <div class="tres" [class.ok]="testResult()[p._id].ok">{{ testResult()[p._id].message }} ({{ testResult()[p._id].latencyMs }}ms)</div>
          }
        </div>
      }
    </div>
    @if (!providers().length) { <div class="card"><div class="empty"><div class="big">🔌</div>No providers — add OpenRouter, NVIDIA NIM, or any OpenAI-compatible endpoint.</div></div> }

    @if (editing()) {
      <div class="modal-back" (click)="close()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ editId ? 'Edit provider' : 'Add provider' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="field"><label>Name</label><input formControlName="name" placeholder="My OpenRouter"></div>
            <div class="field-row">
              <div class="field"><label>Type</label>
                <select formControlName="kind" (change)="applyPreset()">
                  <option value="openrouter">OpenRouter</option><option value="nvidia">NVIDIA NIM</option>
                  <option value="openai_compatible">OpenAI-compatible</option><option value="custom">Custom endpoint</option>
                  <option value="mock">Mock (offline)</option>
                </select></div>
              <div class="field"><label>Model</label><input formControlName="model" placeholder="model id"></div>
            </div>
            <div class="field"><label>Base URL</label><input formControlName="baseUrl" placeholder="https://…/v1"></div>
            <div class="field"><label>API key {{ editId ? '(leave blank to keep existing)' : '' }}</label>
              <input type="password" formControlName="apiKey" placeholder="sk-…" autocomplete="off">
              <span class="hint">Stored AES-256 encrypted. Never displayed or logged.</span></div>
            <div class="field-row">
              <div class="field"><label>Temperature</label><input type="number" step="0.1" formControlName="temperature"></div>
              <div class="field"><label>Max tokens</label><input type="number" formControlName="maxTokens"></div>
            </div>
            <label class="check"><input type="checkbox" formControlName="isDefault"> Default provider</label>
            <div class="btn-row">
              <button class="btn primary" [disabled]="form.invalid || busy()">{{ busy() ? 'Saving…' : 'Save' }}</button>
              <button type="button" class="btn ghost" (click)="close()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .phead { display: flex; justify-content: space-between; align-items: flex-start; }
    .def { font-size: 10px; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 999px; font-weight: 800; }
    .muted { font-size: 13px; color: var(--muted); } .url { font-family: monospace; font-size: 12px; margin: 6px 0; }
    .btn-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .test-dot { width: 14px; height: 14px; border-radius: 50%; background: #cbd5e1; }
    .test-dot.ok { background: #22c55e; } .test-dot.bad { background: #ef4444; }
    .tres { margin-top: 10px; font-size: 13px; font-weight: 600; background: #fee2e2; color: #b91c1c; padding: 8px 12px; border-radius: 8px; }
    .tres.ok { background: #dcfce7; color: #15803d; }
  `],
})
export class ProviderListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  providers = signal<AiProvider[]>([]);
  editing = signal(false);
  busy = signal(false);
  testing = signal<string | null>(null);
  testResult = signal<Record<string, { ok: boolean; message: string; latencyMs: number }>>({});
  editId: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required], kind: ['openrouter'],
    baseUrl: ['https://openrouter.ai/api/v1'], model: ['meta-llama/llama-3.1-70b-instruct'],
    apiKey: [''], temperature: [0.3], maxTokens: [800], isDefault: [false],
  });

  ngOnInit(): void { this.load(); }
  load(): void { this.api.get<AiProvider[]>('/providers').subscribe({ next: p => this.providers.set(p) }); }

  applyPreset(): void {
    const preset = PRESETS[this.form.value.kind || 'custom'];
    this.form.patchValue({ baseUrl: preset.baseUrl, model: preset.model });
  }
  openNew(): void {
    this.editId = null;
    this.form.reset({ kind: 'openrouter', baseUrl: PRESETS['openrouter'].baseUrl, model: PRESETS['openrouter'].model, temperature: 0.3, maxTokens: 800, isDefault: this.providers().length === 0 });
    this.editing.set(true);
  }
  openEdit(p: AiProvider): void {
    this.editId = p._id;
    this.form.reset({ name: p.name, kind: p.kind, baseUrl: p.baseUrl, model: p.model, apiKey: '', temperature: p.temperature, maxTokens: p.maxTokens, isDefault: p.isDefault });
    this.editing.set(true);
  }
  close(): void { this.editing.set(false); }
  save(): void {
    if (this.form.invalid) return;
    this.busy.set(true);
    const body = { ...this.form.value };
    if (this.editId && !body.apiKey) delete body.apiKey;
    const req = this.editId
      ? this.api.patch<AiProvider>(`/providers/${this.editId}`, body)
      : this.api.post<AiProvider>('/providers', body);
    req.subscribe({
      next: () => { this.busy.set(false); this.close(); this.load(); this.toast.ok('Provider saved'); },
      error: e => { this.busy.set(false); this.toast.err(e.error?.error || 'Save failed'); },
    });
  }
  test(p: AiProvider): void {
    this.testing.set(p._id);
    this.api.post<{ ok: boolean; message: string; latencyMs: number }>(`/providers/${p._id}/test`).subscribe({
      next: r => { this.testing.set(null); this.testResult.update(m => ({ ...m, [p._id]: r })); this.load(); },
      error: e => { this.testing.set(null); this.toast.err(e.error?.error || 'Test failed'); },
    });
  }
  setDefault(p: AiProvider): void {
    this.api.patch(`/providers/${p._id}`, { isDefault: true }).subscribe({ next: () => this.load() });
  }
  remove(p: AiProvider): void {
    if (!confirm(`Delete provider "${p.name}"?`)) return;
    this.api.delete(`/providers/${p._id}`).subscribe({ next: () => this.load() });
  }
}
