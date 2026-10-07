import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LayoutComponent } from './shared/components/layout.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  {
    path: '', component: LayoutComponent, canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'agents', loadComponent: () => import('./features/agents/agent-list.component').then(m => m.AgentListComponent) },
      { path: 'agents/new', loadComponent: () => import('./features/agents/agent-form.component').then(m => m.AgentFormComponent) },
      { path: 'agents/:id', loadComponent: () => import('./features/agents/agent-detail.component').then(m => m.AgentDetailComponent) },
      { path: 'agents/:id/edit', loadComponent: () => import('./features/agents/agent-form.component').then(m => m.AgentFormComponent) },
      { path: 'scripts', loadComponent: () => import('./features/scripts/script-list.component').then(m => m.ScriptListComponent) },
      { path: 'scripts/:id', loadComponent: () => import('./features/scripts/script-builder.component').then(m => m.ScriptBuilderComponent) },
      { path: 'calls', loadComponent: () => import('./features/calls/call-history.component').then(m => m.CallHistoryComponent) },
      { path: 'calls/live/new', loadComponent: () => import('./features/calls/live-call.component').then(m => m.LiveCallComponent) },
      { path: 'calls/live/:id', loadComponent: () => import('./features/calls/live-call.component').then(m => m.LiveCallComponent) },
      { path: 'calls/:id', loadComponent: () => import('./features/calls/call-detail.component').then(m => m.CallDetailComponent) },
      { path: 'providers', loadComponent: () => import('./features/providers/provider-list.component').then(m => m.ProviderListComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
