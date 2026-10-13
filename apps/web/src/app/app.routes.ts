import { Routes } from '@angular/router';
import { authGuard, loginGuard } from '@daylo/web/core/auth/data-access';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('@daylo/web/auth/features/login').then(m => m.Login),
    canActivate: [loginGuard],
    data: { authAccess: 'public' },
    title: 'Daylo',
  },
  {
    path: 'today',
    loadComponent: () => import('@daylo/web/core/shell').then(m => m.WebCoreShell),
    data: { heading: 'Dzisiaj', authAccess: 'active' },
    canActivate: [authGuard],
    title: 'Daylo',
  },
  {
    path: 'invitations',
    loadComponent: () => import('@daylo/web/core/shell').then(m => m.WebCoreShell),
    data: { heading: 'Zaproszenia', authAccess: 'pending' },
    canActivate: [authGuard],
    title: 'Daylo',
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
