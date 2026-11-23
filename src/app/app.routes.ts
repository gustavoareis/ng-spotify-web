import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './features/layout/main-layout.component';

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
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/home/home.component').then((module) => module.HomeComponent),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/search.component').then((module) => module.SearchComponent),
      },
      {
        path: 'collection',
        loadComponent: () =>
          import('./features/library/library.component').then((module) => module.LibraryComponent),
      },
      {
        path: 'album/:id',
        loadComponent: () =>
          import('./features/album-detail/album-detail.component').then(
            (module) => module.AlbumDetailComponent,
          ),
      },
      {
        path: 'playlist/:id',
        loadComponent: () =>
          import('./features/playlist-detail/playlist-detail.component').then(
            (module) => module.PlaylistDetailComponent,
          ),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
