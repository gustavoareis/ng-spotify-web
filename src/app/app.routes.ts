import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((module) => module.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./core/auth/auth-callback.component').then((module) => module.AuthCallbackComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/home/home.component').then((module) => module.HomeComponent),
  },
  { path: '**', redirectTo: '' },
];
