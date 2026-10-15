import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { provideApi } from '@daylo/web/shared/api-client';
import { AuthSession } from './auth-session';

export const authHttpInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }

  const auth = inject(AuthSession);
  const sessionOperation = SESSION_OPERATIONS.has(request.url);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!sessionOperation && error instanceof HttpErrorResponse && error.status === 401) {
        auth.sessionLost();
      }

      return throwError(() => error);
    }),
  );
};

const SESSION_OPERATIONS = new Set(['/api/auth/session', '/api/auth/csrf', '/api/auth/sign-out']);

export function provideAuthentication(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideApi(''),
    provideHttpClient(
      withXsrfConfiguration({ cookieName: 'daylo_xsrf', headerName: 'X-CSRF-Token' }),
      withInterceptors([authHttpInterceptor]),
    ),
  ]);
}
