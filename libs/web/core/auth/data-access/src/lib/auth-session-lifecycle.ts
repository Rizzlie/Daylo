import { DOCUMENT } from '@angular/common';
import {
  Injectable,
  effect,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { exhaustMap, filter, fromEvent, map, of, switchMap } from 'rxjs';
import { AuthAccessPolicy, getAuthRedirectUrl } from './auth-redirect';
import { AuthSession } from './auth-session';

function getRouteAccess(root: ActivatedRouteSnapshot): AuthAccessPolicy {
  let access: AuthAccessPolicy = 'public';
  let route: ActivatedRouteSnapshot | undefined = root;

  while (route) {
    access = route.data['authAccess'] ?? access;
    route = route.children.find((child) => child.outlet === PRIMARY_OUTLET);
  }

  return access;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionLifecycle {
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly routeSnapshot = toSignal(this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map(() => this.router.routerState.snapshot.root),
  ), { initialValue: this.router.routerState.snapshot.root });

  constructor() {
    fromEvent(this.document, 'visibilitychange').pipe(
      filter(() => this.document.visibilityState === 'visible'),
      filter(() => !this.auth.signingOut() && this.router.currentNavigation() === null),
      filter(() => getRouteAccess(this.routeSnapshot()) !== 'public'),
      exhaustMap(() => this.checkSession()),
      takeUntilDestroyed(),
    ).subscribe();

    // Navigation is an external side effect; session state remains owned by AuthSession.
    effect(() => {
      const session = this.auth.state();
      const access = getRouteAccess(this.routeSnapshot());
      if (access === 'public' || this.router.currentNavigation() !== null) return;

      if (session.status === 'anonymous' && session.reason !== null) {
        const redirectUrl = getAuthRedirectUrl(session, access);
        if (redirectUrl !== null) void this.router.navigateByUrl(redirectUrl);
      }
    });
  }

  private checkSession() {
    const snapshot = this.routeSnapshot();
    const access = getRouteAccess(snapshot);

    return this.auth.refresh().pipe(
      switchMap((session) => {
        // A response for a previous screen must not navigate away from the new screen.
        if (this.routeSnapshot() !== snapshot || this.router.currentNavigation() !== null) {
          return of(false);
        }
        const redirectUrl = getAuthRedirectUrl(session, access);
        return redirectUrl === null ? of(true) : this.router.navigateByUrl(redirectUrl);
      }),
    );
  }
}

export function provideAuthSessionLifecycle() {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => { inject(AuthSessionLifecycle); }),
  ]);
}
