import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { map } from 'rxjs';
import { AuthSession } from './auth-session';
import { AuthAccessPolicy, getAuthRedirectUrl } from './auth-redirect';

function checkAuthAccess(access: AuthAccessPolicy) {
  const auth = inject(AuthSession);
  const router = inject(Router);

  return auth.refresh().pipe(
    map((session) => {
      const redirectUrl = getAuthRedirectUrl(session, access);
      return redirectUrl === null ? true : router.parseUrl(redirectUrl);
    }),
  );
}

export const authGuard: CanActivateFn = (route) =>
  checkAuthAccess(route.data['authAccess'] ?? 'active');

export const loginGuard: CanActivateFn = (route) => {
  // Recovery must remain available even when the API cannot be reached.
  return route.queryParamMap.has('error') ? true : checkAuthAccess('public');
};
