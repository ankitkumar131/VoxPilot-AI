import { Component, Input, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'vp-audio-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="player">
      <button class="play-btn" (click)="toggle()" [disabled]="!clipId" [title]="label">
        <span *ngIf="!playing">▶</span><span *ngIf="playing">⏸</span>
      </button>
      <div class="meta">
        <div class="label">{{ label }}</div>
        <div class="sub">{{ sub }}</div>
      </div>
      <audio #el [src]="src" (ended)="playing=false" (pause)="playing=false" preload="none"></audio>
    </div>
  `,
  styles: [`
    .player { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 10px; padding: 8px 12px; }
    .play-btn { width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer;
      background: #4f46e5; color: #fff; font-size: 13px; flex-shrink: 0; }
    .play-btn:disabled { background: #cbd5e1; cursor: default; }
    .label { font-size: 13px; font-weight: 600; color: #0f172a; }
    .sub { font-size: 12px; color: #64748b; }
    audio { display: none; }
  `],
})
export class AudioPlayerComponent {
  private api = inject(ApiService);
  @Input() clipId?: string;
  @Input() label = 'Audio clip';
  @Input() sub = '';
  @ViewChild('el') el!: ElementRef<HTMLAudioElement>;
  playing = false;

  get src(): string { return this.clipId ? this.api.clipUrl(this.clipId) : ''; }

  toggle(): void {
    if (!this.clipId || !this.el) return;
    document.querySelectorAll('audio').forEach(a => { if (a !== this.el.nativeElement) a.pause(); });
    const audio = this.el.nativeElement;
    if (audio.paused) { audio.play().then(() => (this.playing = true)).catch(() => {}); }
    else audio.pause();
  }
}
