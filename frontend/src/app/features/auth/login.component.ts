import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ServerConfigService } from '../../core/server-config.service';

@Component({
  selector: 'vp-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="logo">◉</div>
        <h1>VoxPilot AI</h1>
        <p class="sub">AI call answering & telephone intelligence</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field"><label>Email</label>
            <input type="email" formControlName="email" placeholder="you@company.com" autocomplete="email"></div>
          <div class="field"><label>Password</label>
            <input type="password" formControlName="password" placeholder="••••••••" autocomplete="current-password"></div>
          @if (error()) { <p class="err">{{ error() }}</p> }
          <button class="btn primary" style="width:100%;justify-content:center" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Signing in…' : 'Sign in' }}</button>
        </form>
        <div class="server">
          <button type="button" class="linklike" (click)="showServer.set(!showServer())">
            ⚙ {{ showServer() ? 'Hide server settings' : 'Server settings' }}
          </button>
          @if (showServer()) {
            <div class="field" style="margin-top:10px"><label>Server URL (Android app only — leave empty on web)</label>
              <input [(ngModel)]="serverUrl" placeholder="http://192.168.1.10:4000">
              <span class="hint">Emulator: http://10.0.2.2:4000 · Physical device: your PC's Wi-Fi IP + :4000</span></div>
          }
        </div>
        <p class="alt">No account? <a class="link" routerLink="/register">Create one</a></p>
        <p class="alt demo">Demo: demo&#64;voxpilot.ai / VoxPilot123!</p>
      </div>
    </div>
  `,
  styles: [`
    .err { color: #b91c1c; font-weight: 600; font-size: 14px; }
    .demo { font-size: 12px; }
    .server { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 12px; }
    .linklike { background: none; border: none; color: var(--brand); font-weight: 700; cursor: pointer; font-size: 13px; padding: 0; }
  `],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private server = inject(ServerConfigService);
  busy = signal(false);
  error = signal('');
  showServer = signal(false);
  serverUrl = '';
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });

  ngOnInit(): void {
    this.serverUrl = this.server.baseUrl;
    if (this.serverUrl) this.showServer.set(true);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.server.setServer(this.serverUrl); // persist before any API call
    this.busy.set(true); this.error.set('');
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error.set(e.error?.error || 'Login failed — check the Server URL above'); this.busy.set(false); },
    });
  }
}
