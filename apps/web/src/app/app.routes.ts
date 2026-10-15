import { Routes } from '@angular/router';
import { authGuard, loginGuard } from '@daylo/web/core/auth/data-access';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('@daylo/web/auth/features/login').then((m) => m.Login),
    canActivate: [loginGuard],
    data: { authAccess: 'public' },
    title: 'Daylo',
  },
  {
    path: '',
    loadComponent: () => import('@daylo/web/core/shell').then((m) => m.AuthenticatedShell),
    children: [
      {
        path: 'today',
        loadComponent: () => import('@daylo/web/tasks/features/today').then((m) => m.Today),
        data: { authAccess: 'active' },
        canActivate: [authGuard],
        title: 'Daylo',
      },
      {
        path: 'invitations',
        loadComponent: () =>
          import('@daylo/web/groups/features/invitations').then((m) => m.Invitations),
        data: { authAccess: 'pending' },
        canActivate: [authGuard],
        title: 'Daylo',
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
