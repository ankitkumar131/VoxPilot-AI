import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'vp-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
        <p class="alt">No account? <a class="link" routerLink="/register">Create one</a></p>
        <p class="alt demo">Demo: demo&#64;voxpilot.ai / VoxPilot123!</p>
      </div>
    </div>
  `,
  styles: [`.err { color: #b91c1c; font-weight: 600; font-size: 14px; } .demo { font-size: 12px; }`],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  busy = signal(false);
  error = signal('');
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });

  submit(): void {
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set('');
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error.set(e.error?.error || 'Login failed'); this.busy.set(false); },
    });
  }
}
