import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { friendlyHttpError } from '../../core/http-error';

@Component({
  selector: 'vp-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="logo">◉</div>
        <h1>Create your workspace</h1>
        <p class="sub">Start answering calls with AI in minutes</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="field"><label>Name</label><input formControlName="name" placeholder="Jane Cooper"></div>
          <div class="field"><label>Email</label><input type="email" formControlName="email" placeholder="you@company.com"></div>
          <div class="field"><label>Password</label><input type="password" formControlName="password" placeholder="Min 8 characters"></div>
          @if (error()) { <p class="err">{{ error() }}</p> }
          <button class="btn primary" style="width:100%;justify-content:center" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Creating…' : 'Create account' }}</button>
        </form>
        <p class="alt">Have an account? <a class="link" routerLink="/login">Sign in</a></p>
      </div>
    </div>
  `,
  styles: [`.err { color: #b91c1c; font-weight: 600; font-size: 14px; }`],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  busy = signal(false);
  error = signal('');
  form = this.fb.group({
    name: ['', Validators.required], email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set('');
    const { name, email, password } = this.form.value;
    this.auth.register(name!, email!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => { this.error.set(friendlyHttpError(e)); this.busy.set(false); },
    });
  }
}
