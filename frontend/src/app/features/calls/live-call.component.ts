import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { SocketService } from '../../core/socket.service';
import { AudioService } from '../../core/audio.service';
import { ToastService } from '../../core/toast.service';
import { Agent, CallSession, CallTurn } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

interface StartResponse { session: CallSession; greeting: CallTurn; firstQuestion: CallTurn | null }
interface AnswerResponse { callerTurn: CallTurn; aiTurns: CallTurn[]; session: CallSession; done: boolean }

@Component({
  selector: 'vp-live-call',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadgeComponent],
  template: `
    @if (!session()) {
      <div class="page-head"><div><h1>New simulated call</h1>
        <p class="sub">Talk to your AI agent right from the browser — type, dictate or record answers</p></div></div>
      <div class="card" style="max-width:560px">
        <div class="field"><label>AI agent *</label>
          <select [(ngModel)]="agentId">
            <option value="">— Select an agent —</option>
            @for (a of agents(); track a._id) { <option [value]="a._id">{{ a.enabled ? '' : '⏸ ' }}{{ a.name }}</option> }
          </select></div>
        <div class="field-row">
          <div class="field"><label>Caller name</label><input [(ngModel)]="callerName" placeholder="Rahul"></div>
          <div class="field"><label>Caller phone</label><input [(ngModel)]="callerPhone" placeholder="+1 555 0100"></div>
        </div>
        <label class="check"><input type="checkbox" [(ngModel)]="voiceOut"> Speak AI replies aloud (browser TTS)</label>
        <button class="btn green" (click)="start()" [disabled]="!agentId || busy()">{{ busy() ? 'Dialing…' : '📞 Start call' }}</button>
      </div>
    } @else {
      <div class="call-shell">
        <div class="card call-head">
          <div>
            <div class="caller">{{ session()!.callerName || 'Unknown caller' }}</div>
            <div class="muted">{{ agentName() }} · {{ elapsed() }}</div>
          </div>
          <vp-status-badge [status]="session()!.status"></vp-status-badge>
          <div class="rec"><span class="dot-live"></span> REC</div>
        </div>
        <div class="call-grid">
          <div class="card transcript" #scrollBox>
            <h2>Live transcript</h2>
            @for (t of turns(); track t._id) {
              <div class="turn {{ t.speaker }}">
                <div class="avatar">{{ t.speaker === 'ai' ? '🤖' : t.speaker === 'caller' ? '🧑' : t.speaker === 'human_agent' ? '🎧' : '⚙️' }}</div>
                <div class="bubble"><div class="who">{{ t.speaker.replace('_', ' ') }}</div>{{ t.text }}
                  @if (t.bargeIn) { <div class="time">⚡ barge-in</div> }</div>
              </div>
            }
            @if (thinking()) { <div class="turn ai"><div class="avatar">🤖</div><div class="bubble typing">● ● ●</div></div> }
            @if (done()) {
              <div class="ended">Call ended — <a class="link" [routerLink]="['/calls', session()!._id]">view full details, notes & recordings →</a></div>
            }
          </div>
          <div>
            <div class="card">
              <h2>Current question</h2>
              <p class="cur-q">{{ currentQuestion() || '—' }}</p>
              <div class="muted">{{ session()!.completedQuestionIds.length }} answered</div>
              @if (session()!.mode === 'human') {
                <p class="takeover-note">🎧 Human has taken over — AI replies are paused.</p>
              }
            </div>
            <div class="card controls">
              <h2>Caller input</h2>
              <textarea [(ngModel)]="draft" rows="3" placeholder="Type the caller's answer…"
                (keydown.enter)="enterSend($event)" [disabled]="done()"></textarea>
              <div class="btn-row">
                <button class="btn primary" (click)="send()" [disabled]="done() || thinking() || !draft.trim()">Send ▸</button>
                <button class="btn ghost" (click)="toggleMic()" [disabled]="done()">
                  {{ audio.recording() ? '⏹ Stop & send' : '🎤 Record answer' }}</button>
                <button class="btn ghost" (click)="toggleDictation()" [disabled]="done()">
                  {{ audio.recognizing() ? '⏹ Stop dictation' : '🗣 Dictate' }}</button>
              </div>
              <div class="btn-row">
                @if (!session()!.paused) {
                  <button class="btn ghost" (click)="pause()" [disabled]="done()">⏸ Pause AI</button>
                } @else {
                  <button class="btn ghost" (click)="resume()" [disabled]="done()">▶ Resume AI</button>
                }
                @if (session()!.mode === 'ai') {
                  <button class="btn ghost" (click)="takeover('human')" [disabled]="done()">🎧 Take over</button>
                } @else {
                  <button class="btn ghost" (click)="takeover('ai')" [disabled]="done()">🤖 AI resume</button>
                }
                <button class="btn danger" (click)="hangup()" [disabled]="done()">☎ End call</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .call-shell { display: flex; flex-direction: column; gap: 16px; }
    .call-head { display: flex; align-items: center; gap: 14px; }
    .caller { font-size: 19px; font-weight: 800; }
    .muted { font-size: 13px; color: var(--muted); }
    .rec { margin-left: auto; font-size: 12px; font-weight: 800; color: #b91c1c; display: flex; gap: 6px; align-items: center; }
    .call-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .call-grid { grid-template-columns: 1fr; } }
    .transcript { max-height: 62vh; overflow-y: auto; min-height: 300px; }
    .typing { letter-spacing: 4px; color: var(--muted); }
    .ended { background: #e0e7ff; border-radius: 10px; padding: 12px; font-weight: 600; margin-top: 8px; }
    .cur-q { font-size: 16px; font-weight: 700; }
    .controls { margin-top: 16px; }
    .controls textarea { width: 100%; border: 1px solid var(--line); border-radius: 10px; padding: 10px; font-family: inherit; font-size: 14px; }
    .btn-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .takeover-note { background: #fae8ff; border-radius: 8px; padding: 8px 12px; font-size: 13px; font-weight: 700; color: #86198f; }
  `],
})
export class LiveCallComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  socket = inject(SocketService);
  audio = inject(AudioService);
  private toast = inject(ToastService);
  private sub = new Subscription();
  private timer: ReturnType<typeof setInterval> | null = null;

  agents = signal<Agent[]>([]);
  agentId = '';
  callerName = '';
  callerPhone = '';
  voiceOut = true;

  session = signal<CallSession | null>(null);
  turns = signal<CallTurn[]>([]);
  busy = signal(false);
  thinking = signal(false);
  done = signal(false);
  draft = '';
  elapsed = signal('00:00');
  agentName = computed(() => this.agents().find(a => a._id === this.session()?.agentId)?.name || 'AI agent');
  currentQuestion = computed(() => {
    const s = this.session(); if (!s?.currentQuestionId) return '';
    const t = [...this.turns()].reverse().find(x => x.questionId === s.currentQuestionId && x.speaker === 'ai');
    return t?.text || '';
  });

  ngOnInit(): void {
    this.socket.connect();
    this.api.get<Agent[]>('/agents').subscribe({ next: a => {
      this.agents.set(a);
      const preset = this.route.snapshot.queryParamMap.get('agentId');
      if (preset && a.some(x => x._id === preset)) this.agentId = preset;
    }});
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') this.attach(id);
  }

  ngOnDestroy(): void {
    const s = this.session();
    if (s) this.socket.leaveCall(s._id);
    this.sub.unsubscribe();
    if (this.timer) clearInterval(this.timer);
    this.audio.stopSpeaking();
    this.audio.stopDictation();
  }

  start(): void {
    this.busy.set(true);
    this.api.post<StartResponse>('/calls/simulate', {
      agentId: this.agentId, callerName: this.callerName || undefined, callerPhone: this.callerPhone || undefined,
    }).subscribe({
      next: r => {
        this.busy.set(false);
        this.session.set(r.session);
        this.turns.set([r.greeting, ...(r.firstQuestion ? [r.firstQuestion] : [])]);
        this.afterStart(r.session._id);
        this.speakLatest();
        this.router.navigate(['/calls', 'live', r.session._id], { replaceUrl: true });
      },
      error: e => { this.busy.set(false); this.toast.err(e.error?.error || 'Failed to start call'); },
    });
  }

  private attach(callId: string): void {
    this.api.get<{ call: CallSession; turns: CallTurn[] }>(`/calls/${callId}`).subscribe({
      next: d => {
        this.session.set(d.call);
        this.turns.set(d.turns);
        this.done.set(['completed', 'failed', 'terminated'].includes(d.call.status));
        this.afterStart(callId);
      },
      error: () => this.router.navigate(['/calls']),
    });
  }

  private afterStart(callId: string): void {
    this.socket.joinCall(callId);
    const start = new Date(this.session()!.startedAt).getTime();
    this.timer = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      this.elapsed.set(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    }, 1000);
    this.sub.add(this.socket.on<CallSession>('call-status').subscribe(s => {
      if (s._id !== callId) return;
      this.session.set(s);
      if (['completed', 'failed', 'terminated'].includes(s.status)) {
        this.done.set(true);
        this.audio.stopDictation();
        if (this.timer) clearInterval(this.timer);
      }
    }));
    this.sub.add(this.socket.on<CallTurn>('transcript-turn').subscribe(t => {
      this.turns.update(list => (list.some(x => x._id === t._id) ? list : [...list, t]));
      if (t.speaker === 'ai') this.speak(t.text);
      this.scrollDown();
    }));
  }

  private speakLatest(): void {
    const last = [...this.turns()].reverse().find(t => t.speaker === 'ai');
    if (last) this.speak(last.text);
  }
  private speak(text: string): void {
    if (this.voiceOut && !this.done()) this.audio.speak(text);
  }
  private scrollDown(): void {
    setTimeout(() => {
      const el = document.querySelector('.transcript');
      if (el) el.scrollTop = el.scrollHeight;
    }, 60);
  }

  enterSend(ev: Event): void {
    if ((ev as KeyboardEvent).shiftKey) return;
    ev.preventDefault();
    this.send();
  }

  send(audio?: { base64: string; mime: string }): void {
    const s = this.session();
    const text = this.draft.trim();
    if (!s || this.done() || (!text && !audio)) return;
    this.audio.stopSpeaking(); // barge-in: caller takes the floor
    this.thinking.set(true);
    this.api.post<AnswerResponse>(`/calls/${s._id}/answer`, { text, audioBase64: audio?.base64, audioMime: audio?.mime }).subscribe({
      next: r => {
        this.thinking.set(false);
        this.draft = '';
        this.session.set(r.session);
        this.turns.update(list => {
          const ids = new Set(list.map(x => x._id));
          return [...list, r.callerTurn, ...r.aiTurns].filter(x => (ids.has(x._id) ? false : (ids.add(x._id), true)));
        });
        if (r.done) this.done.set(true);
        else this.speakLatest();
        this.scrollDown();
      },
      error: e => { this.thinking.set(false); this.toast.err(e.error?.error || 'Send failed'); },
    });
  }

  async toggleMic(): Promise<void> {
    if (this.audio.recording()) {
      try {
        const rec = await this.audio.stopRecording();
        if (!this.draft.trim()) this.draft = '(voice answer — transcribing)';
        this.send({ base64: rec.base64, mime: rec.mime });
      } catch { this.toast.err('Recording failed'); }
    } else {
      // barge-in UX: stop AI speech the moment the caller starts talking
      this.audio.stopSpeaking();
      const s = this.session();
      if (s) this.socket.signalBargeIn(s._id);
      try { await this.audio.startRecording(); }
      catch { this.toast.err('Microphone unavailable — type your answer instead'); }
    }
  }

  toggleDictation(): void {
    if (this.audio.recognizing()) { this.audio.stopDictation(); return; }
    this.audio.stopSpeaking();
    const ok = this.audio.startDictation((text, final) => {
      this.draft = text;
      if (final && text.trim().length > 2) { /* keep buffering; user presses Send */ }
    });
    if (!ok) this.toast.show('Live dictation needs Chrome/Edge — type or record instead', 'info');
  }

  pause(): void {
    const s = this.session(); if (!s) return;
    this.audio.stopSpeaking();
    this.api.post<CallSession>(`/calls/${s._id}/pause`).subscribe({ next: x => this.session.set(x) });
  }
  resume(): void {
    const s = this.session(); if (!s) return;
    this.api.post<CallSession>(`/calls/${s._id}/resume`).subscribe({ next: x => this.session.set(x) });
  }
  takeover(mode: 'human' | 'ai'): void {
    const s = this.session(); if (!s) return;
    this.audio.stopSpeaking();
    this.api.post<CallSession>(`/calls/${s._id}/takeover`, { mode }).subscribe({ next: x => {
      this.session.set(x);
      this.toast.show(mode === 'human' ? 'You took over the call' : 'AI resumed the call', 'info');
    }});
  }
  hangup(): void {
    const s = this.session(); if (!s) return;
    this.audio.stopSpeaking();
    this.audio.stopDictation();
    this.api.post<CallSession>(`/calls/${s._id}/hangup`).subscribe({ next: () => {
      this.done.set(true);
      this.router.navigate(['/calls', s._id]);
    }});
  }
}
