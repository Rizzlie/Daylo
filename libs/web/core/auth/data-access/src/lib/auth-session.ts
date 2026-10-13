import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  defer,
  exhaustMap,
  filter,
  map,
  of,
  startWith,
  switchMap,
  take,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { AuthenticationService } from '@daylo/web/shared/api-client';
import {
  SessionResult,
  SessionState,
  isSessionResult,
} from './auth-session.model';

type SignOutState = 'idle' | 'loading' | 'signed-out' | 'expired' | 'failed' | 'rate-limited';
const REQUEST_TIMEOUT_MS = 15_000;

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly api = inject(AuthenticationService);
  private readonly sessionRequested = signal(false);
  private readonly signOutRequests = new Subject<void>();

  private readonly sessionResource = rxResource<SessionResult, boolean | undefined>({
    params: () => this.sessionRequested() ? true : undefined,
    stream: () => this.api.getCurrentSession().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map(({ status, user }): SessionResult => ({
        status,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
        },
      })),
      catchError((error: unknown) => isUnauthorized(error)
        ? of<SessionResult>({ status: 'anonymous', reason: null })
        : throwError(() => error)),
    ),
  });

  readonly state = computed<SessionState>(() => {
    if (this.sessionResource.isLoading()) return { status: 'loading' };
    const error = this.sessionResource.error();
    if (error) return error instanceof HttpErrorResponse && error.status === 429
      ? { status: 'error', reason: 'rate-limit' }
      : { status: 'error' };
    return this.sessionResource.hasValue()
      ? this.sessionResource.value()
      : { status: 'unknown' };
  });

  readonly status = computed(() => this.state().status);
  readonly user = computed(() => {
    const state = this.state();
    return 'user' in state ? state.user : null;
  });

  private readonly sessionChanges = toObservable(this.state);
  private readonly signOutState = toSignal(
    this.signOutRequests.pipe(
      exhaustMap(() => this.revokeSession().pipe(
        tap((result) => this.applySignOutResult(result)),
        startWith<SignOutState>('loading'),
      )),
    ),
    { initialValue: 'idle' as SignOutState },
  );

  readonly signingOut = computed(() => this.signOutState() === 'loading');
  readonly signOutFailed = computed(() => this.signOutState() === 'failed');
  readonly signOutRateLimited = computed(() => this.signOutState() === 'rate-limited');

  refresh(): Observable<SessionResult> {
    return defer(() => {
      if (!this.signingOut()) {
        this.sessionResource.reload();
        this.sessionRequested.set(true);
      }

      return this.sessionChanges.pipe(
        // Read the current resource state even when toObservable replays an older emission.
        map(() => this.state()),
        filter(isSessionResult),
        take(1),
      );
    });
  }

  sessionLost(): void {
    // A local replacement cancels an outstanding resource read as well.
    this.sessionResource.set({ status: 'anonymous', reason: 'expired' });
  }

  signOut(): void {
    this.signOutRequests.next();
  }

  private revokeSession(): Observable<SignOutState> {
    return this.api.getCsrfToken().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      switchMap(({ csrfToken }) => this.api.signOut(csrfToken).pipe(
        timeout(REQUEST_TIMEOUT_MS),
      )),
      map((): SignOutState => 'signed-out'),
      catchError((error: unknown) => of<SignOutState>(
        isUnauthorized(error) ? 'expired'
          : error instanceof HttpErrorResponse && error.status === 429 ? 'rate-limited' : 'failed',
      )),
    );
  }

  private applySignOutResult(result: SignOutState): void {
    if (result === 'signed-out' || result === 'expired') {
      this.sessionResource.set({ status: 'anonymous', reason: result });
    }
  }
}
