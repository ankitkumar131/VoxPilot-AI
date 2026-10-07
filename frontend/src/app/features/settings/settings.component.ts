import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { UserSettings } from '../../core/models';

@Component({
  selector: 'vp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-head"><div><h1>Settings</h1><p class="sub">Workspace preferences, telephony, retention & privacy</p></div></div>
    @if (s(); as v) {
      <div class="grid cols-2">
        <div class="card">
          <h2>AI & Voice</h2>
          <label class="check"><input type="checkbox" [(ngModel)]="v.aiEnabled" (change)="save()"> AI enabled globally</label>
          <div class="field-row">
            <div class="field"><label>Language</label>
              <select [(ngModel)]="v.language" (change)="save()"><option value="en">English</option><option value="es">Spanish</option><option value="hi">Hindi</option></select></div>
            <div class="field"><label>Voice</label>
              <select [(ngModel)]="v.voice" (change)="save()"><option value="alloy">Alloy</option><option value="echo">Echo</option><option value="nova">Nova</option></select></div>
          </div>
          <div class="field"><label>Default recording mode</label>
            <select [(ngModel)]="v.recordingMode" (change)="save()">
              <option value="segments">Per-question segments</option><option value="full">Full call</option>
              <option value="answers_only">Answers only</option><option value="transcript_only">Transcript only</option>
              <option value="notes_only">Notes only</option>
            </select></div>
        </div>
        <div class="card">
          <h2>Telephony</h2>
          <div class="field"><label>Provider</label>
            <select [(ngModel)]="v.telephonyProvider" (change)="save()">
              <option value="mock">Mock / simulated (browser)</option>
              <option value="sip">SIP trunk (production)</option>
              <option value="twilio">Twilio (production)</option>
            </select>
            <span class="hint">PSTN calling needs a SIP/Twilio gateway — see docs/TELEPHONY.md.</span></div>
          <h2 style="margin-top:16px">Retention & privacy</h2>
          <div class="field"><label>Retention (days)</label><input type="number" [(ngModel)]="v.retentionDays" (change)="save()"></div>
          <label class="check"><input type="checkbox" [(ngModel)]="v.autoDelete" (change)="save()"> Auto-delete after retention</label>
          <label class="check"><input type="checkbox" [(ngModel)]="v.privacy.storeAudio" (change)="save()"> Store audio</label>
          <label class="check"><input type="checkbox" [(ngModel)]="v.privacy.storeTranscript" (change)="save()"> Store transcripts</label>
        </div>
        <div class="card">
          <h2>Notifications</h2>
          <label class="check"><input type="checkbox" [(ngModel)]="v.notifications.email" (change)="save()"> Email</label>
          <label class="check"><input type="checkbox" [(ngModel)]="v.notifications.push" (change)="save()"> Push</label>
          <label class="check"><input type="checkbox" [(ngModel)]="v.notifications.callCompleted" (change)="save()"> Notify on call completed</label>
        </div>
      </div>
    }
  `,
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  s = signal<UserSettings | null>(null);
  ngOnInit(): void {
    this.api.get<UserSettings>('/settings').subscribe({ next: s => this.s.set(s) });
  }
  save(): void {
    const v = this.s(); if (!v) return;
    this.api.patch('/settings', v).subscribe({ next: () => this.toast.ok('Settings saved') });
  }
}
