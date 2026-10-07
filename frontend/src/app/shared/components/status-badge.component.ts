import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'vp-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="badge" [ngClass]="cls">{{ label }}</span>`,
  styles: [`
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
      font-size: 12px; font-weight: 600; letter-spacing: .02em; white-space: nowrap; }
    .badge::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .st-active { background: #dcfce7; color: #15803d; } .st-active::before { animation: pulse 1.4s infinite; }
    .st-ringing { background: #fef9c3; color: #a16207; } .st-ringing::before { animation: pulse 1s infinite; }
    .st-completed { background: #e0e7ff; color: #4338ca; }
    .st-failed { background: #fee2e2; color: #b91c1c; }
    .st-terminated { background: #f1f5f9; color: #475569; }
    .st-paused { background: #ffedd5; color: #c2410c; }
    .st-human_takeover { background: #fae8ff; color: #a21caf; }
    .st-on { background: #dcfce7; color: #15803d; } .st-off { background: #f1f5f9; color: #64748b; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  `],
})
export class StatusBadgeComponent {
  @Input() status = '';
  get cls(): string {
    const s = (this.status || '').toLowerCase();
    if (['active','ringing','completed','failed','terminated','paused','human_takeover'].includes(s)) return 'st-' + s;
    if (s === 'on' || s === 'enabled') return 'st-on';
    return 'st-off';
  }
  get label(): string {
    return (this.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
