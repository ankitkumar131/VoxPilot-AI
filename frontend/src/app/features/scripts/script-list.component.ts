import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ScriptDoc } from '../../core/models';

const TEMPLATES: { name: string; mode: string; description: string; questions: { text: string; type: string }[] }[] = [
  { name: 'Frontend Developer Screening', mode: 'interview', description: 'Phone screen for frontend candidates',
    questions: [
      { text: 'To start, please introduce yourself and give a brief overview of your background.', type: 'open_ended' },
      { text: 'Tell me about your experience with Angular.', type: 'open_ended' },
      { text: 'In your own words, what is a component in Angular?', type: 'open_ended' },
      { text: 'How many years of professional frontend experience do you have?', type: 'number' },
      { text: 'Is there anything else you would like to add before we finish?', type: 'open_ended' },
    ]},
  { name: 'Customer Complaint Intake', mode: 'complaint', description: 'Empathetic complaint collection with callback offer',
    questions: [
      { text: 'May I have your full name, please?', type: 'open_ended' },
      { text: 'Please describe your complaint in your own words.', type: 'open_ended' },
      { text: 'Have you already contacted support about this issue?', type: 'yes_no' },
      { text: 'On a scale of 1 to 5, how urgent is this for you?', type: 'rating' },
      { text: 'Would you like us to call you back about this?', type: 'yes_no' },
    ]},
  { name: 'Customer Satisfaction Survey', mode: 'survey', description: 'Quick CSAT survey',
    questions: [
      { text: 'On a scale of 1 to 5, how satisfied are you with our service today?', type: 'rating' },
      { text: 'What did we do well?', type: 'open_ended' },
      { text: 'Would you recommend us to a friend or colleague?', type: 'yes_no' },
    ]},
  { name: 'AI Receptionist', mode: 'receptionist', description: 'Greets callers and captures enquiry details',
    questions: [
      { text: 'Who am I speaking with?', type: 'open_ended' },
      { text: 'What is the reason for your call today?', type: 'open_ended' },
      { text: 'What is the best number to reach you on?', type: 'phone' },
    ]},
  { name: 'Lead Qualification', mode: 'lead', description: 'BANT-style lead qualification',
    questions: [
      { text: 'What is your name and which company are you with?', type: 'open_ended' },
      { text: 'What problem are you hoping to solve?', type: 'open_ended' },
      { text: 'Do you have a budget approved for this?', type: 'yes_no' },
      { text: 'What is your email address so we can follow up?', type: 'email' },
    ]},
];

@Component({
  selector: 'vp-script-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-head">
      <div><h1>Scripts</h1><p class="sub">Question workflows with branching, validation and retries</p></div>
      <button class="btn primary" (click)="create()">＋ New script</button>
    </div>
    <div class="grid cols-3">
      @for (s of scripts(); track s._id) {
        <div class="card script-card" (click)="open(s._id)">
          <div class="mode">{{ s.mode }}</div>
          <h3>{{ s.name }}</h3>
          <p class="muted">{{ s.description || 'No description' }}</p>
          <div class="foot">{{ s.questions.length }} questions
            <button class="btn sm danger" (click)="remove(s, $event)">Delete</button></div>
        </div>
      }
    </div>
    @if (!scripts().length) {
      <div class="card"><div class="empty"><div class="big">📝</div>No scripts yet — start from a template:</div>
        <div class="grid cols-3">
          @for (t of templates; track t.name) {
            <div class="card tpl"><h3>{{ t.name }}</h3><p class="muted">{{ t.description }}</p>
              <button class="btn sm primary" (click)="fromTemplate(t)">Use template</button></div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .script-card { cursor: pointer; } .script-card:hover { border-color: var(--brand); }
    .mode { display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;
      background: #e0e7ff; color: #4338ca; padding: 3px 9px; border-radius: 999px; margin-bottom: 8px; }
    .muted { font-size: 13px; color: var(--muted); }
    .foot { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--muted); margin-top: 8px; }
    .tpl p { min-height: 36px; }
  `],
})
export class ScriptListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  scripts = signal<ScriptDoc[]>([]);
  templates = TEMPLATES;

  ngOnInit(): void { this.load(); }
  load(): void { this.api.get<ScriptDoc[]>('/scripts').subscribe({ next: s => this.scripts.set(s) }); }
  open(id: string): void { this.router.navigate(['/scripts', id]); }
  create(): void {
    this.api.post<ScriptDoc>('/scripts', { name: 'Untitled script', mode: 'general', questions: [] })
      .subscribe({ next: s => this.router.navigate(['/scripts', s._id]) });
  }
  fromTemplate(t: (typeof TEMPLATES)[number]): void {
    this.api.post<ScriptDoc>('/scripts', { name: t.name, mode: t.mode, description: t.description, questions: t.questions })
      .subscribe({ next: s => { this.toast.ok('Script created from template'); this.router.navigate(['/scripts', s._id]); } });
  }
  remove(s: ScriptDoc, ev: Event): void {
    ev.stopPropagation();
    if (!confirm(`Delete script "${s.name}"?`)) return;
    this.api.delete(`/scripts/${s._id}`).subscribe({ next: () => this.load() });
  }
}
