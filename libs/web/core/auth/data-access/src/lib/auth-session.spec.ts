import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from './auth-session';
import { provideAuthentication } from './auth-http';

describe('authentication session', () => {
  let auth: AuthSession;
  let http: HttpTestingController;
  const user = {
    id: 'synthetic-id',
    displayName: 'Synthetic User',
    email: 'synthetic@example.test',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideAuthentication(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthSession);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function loadActiveSession() {
    const result = firstValueFrom(auth.refresh());
    await vi.waitFor(() => {
      http.expectOne('/api/auth/session').flush({ status: 'active', user });
    });
    await result;
  }

  it.each(['active', 'pending'] as const)(
    'shares one session request and derives the %s identity',
    async (status) => {
      const first = firstValueFrom(auth.refresh());
      const second = firstValueFrom(auth.refresh());
      expect(auth.status()).toBe('loading');

      await vi.waitFor(() => {
        http.expectOne('/api/auth/session').flush({ status, user });
      });

      expect(await first).toEqual({ status, user });
      expect(await second).toEqual({ status, user });
      expect(auth.user()).toEqual(user);
    },
  );

  it('does not renew a session before a check is requested', () => {
    expect(auth.status()).toBe('unknown');
    http.expectNone('/api/auth/session');
  });

  it('represents normal anonymous entry without an expiry reason', async () => {
    const result = firstValueFrom(auth.refresh());
    await vi.waitFor(() => {
      http.expectOne('/api/auth/session').flush({}, {
        status: 401,
        statusText: 'Unauthorized',
      });
    });

    expect(await result).toEqual({ status: 'anonymous', reason: null });
    expect(auth.user()).toBeNull();
  });

  it('recovers after a connection failure instead of returning a cached result', async () => {
    const failed = firstValueFrom(auth.refresh());
    await vi.waitFor(() => {
      http.expectOne('/api/auth/session').flush({}, {
        status: 503,
        statusText: 'Unavailable',
      });
    });
    expect(await failed).toEqual({ status: 'error' });

    const retry = firstValueFrom(auth.refresh());
    await vi.waitFor(() => {
      http.expectOne('/api/auth/session').flush({ status: 'pending', user });
    });
    expect(await retry).toEqual({ status: 'pending', user });
  });

  it('signs out once with transient CSRF proof and clears identity', async () => {
    await loadActiveSession();
    auth.signOut();
    auth.signOut();
    expect(auth.signingOut()).toBe(true);

    http.expectOne('/api/auth/csrf').flush({ csrfToken: 'synthetic-proof' });
    const request = http.expectOne('/api/auth/sign-out');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-CSRF-Token')).toBe('synthetic-proof');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.state()).toEqual({ status: 'anonymous', reason: 'signed-out' });
    expect(auth.user()).toBeNull();
    expect(auth.signingOut()).toBe(false);
  });

  it('keeps identity on failed sign-out and allows a new attempt', async () => {
    await loadActiveSession();
    auth.signOut();
    http.expectOne('/api/auth/csrf').flush({}, {
      status: 503,
      statusText: 'Unavailable',
    });
    expect(auth.status()).toBe('active');
    expect(auth.signOutFailed()).toBe(true);
    expect(auth.signingOut()).toBe(false);

    auth.signOut();
    expect(auth.signOutFailed()).toBe(false);
    http.expectOne('/api/auth/csrf').flush({ csrfToken: 'retry-proof' });
    http.expectOne('/api/auth/sign-out').flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    expect(auth.state()).toEqual({ status: 'anonymous', reason: 'signed-out' });
  });

  it('records expiry if the session disappears during sign-out', async () => {
    await loadActiveSession();
    auth.signOut();
    http.expectOne('/api/auth/csrf').flush({}, {
      status: 401,
      statusText: 'Unauthorized',
    });
    expect(auth.state()).toEqual({ status: 'anonymous', reason: 'expired' });
    http.expectNone('/api/auth/sign-out');
  });

  it('cancels an outstanding read when the session is lost', async () => {
    const load = firstValueFrom(auth.refresh());
    const request = await vi.waitFor(() => http.expectOne('/api/auth/session'));
    auth.sessionLost();

    expect(request.cancelled).toBe(true);
    expect(await load).toEqual({ status: 'anonymous', reason: 'expired' });
    expect(auth.user()).toBeNull();
  });

  it('records a protected API 401 as session expiry', () => {
    TestBed.inject(HttpClient).get('/api/protected').subscribe({
      error: () => undefined,
    });
    http.expectOne('/api/protected').flush({}, {
      status: 401,
      statusText: 'Unauthorized',
    });
    expect(auth.state()).toEqual({ status: 'anonymous', reason: 'expired' });
  });

  it('ignores third-party authentication failures', () => {
    TestBed.inject(HttpClient).get('https://external.example.test/api').subscribe({
      error: () => undefined,
    });
    http.expectOne('https://external.example.test/api').flush({}, {
      status: 401,
      statusText: 'Unauthorized',
    });
    expect(auth.status()).toBe('unknown');
  });
});
