import { DOCUMENT } from '@angular/common';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard, loginGuard } from './auth-guards';
import { provideAuthentication } from './auth-http';
import { AuthSession } from './auth-session';
import { provideAuthSessionLifecycle } from './auth-session-lifecycle';

@Component({ template: '<p>Independent feature</p>' })
class IndependentFeature {}

describe('application authentication lifecycle', () => {
  let http: HttpTestingController;
  let document: Document;
  const user = { id: 'synthetic-id', displayName: 'Synthetic User', email: 'synthetic@example.test' };
  const loadFeature = () => Promise.resolve(IndependentFeature);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideAuthentication(),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'login', loadComponent: loadFeature, canActivate: [loginGuard], data: { authAccess: 'public' } },
        {
          path: 'workspace', data: { authAccess: 'active' }, canActivate: [authGuard],
          children: [{ path: ':id', loadComponent: loadFeature }],
        },
        { path: 'invitations', loadComponent: loadFeature, canActivate: [authGuard], data: { authAccess: 'pending' } },
        { path: 'today', loadComponent: loadFeature, canActivate: [authGuard], data: { authAccess: 'active' } },
      ]),
      provideAuthSessionLifecycle(),
      // Repeated registration must still instantiate only one root lifecycle service.
      provideAuthSessionLifecycle(),
    ] });
    http = TestBed.inject(HttpTestingController);
    document = TestBed.inject(DOCUMENT);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });

  afterEach(() => { http.verify(); vi.restoreAllMocks(); });

  async function openProtected() {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/workspace/synthetic');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigation;
    return harness;
  }

  it('checks nested independent features once and redirects foreground expiry', async () => {
    const harness = await openProtected();
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    http.expectNone('/api/auth/session');

    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login?error=expired');
    document.dispatchEvent(new Event('visibilitychange'));
    http.expectNone('/api/auth/session');
  });

  it.each(['expired', 'connection', 'denied'])('does not refresh or replace the public %s notice', async (reason) => {
    const harness = await RouterTestingHarness.create(`/login?error=${reason}`);
    TestBed.inject(AuthSession).sessionLost();
    document.dispatchEvent(new Event('visibilitychange'));
    await harness.fixture.whenStable();
    http.expectNone('/api/auth/session');
    expect(TestBed.inject(Router).url).toBe(`/login?error=${reason}`);
  });

  it('reacts to a protected API 401 without a shell component', async () => {
    const harness = await openProtected();
    TestBed.inject(HttpClient).get('/api/protected').subscribe({ error: () => undefined });
    http.expectOne('/api/protected').flush({}, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login?error=expired');
  });

  it('keeps an active user on the nested route after successful revalidation', async () => {
    const harness = await openProtected();
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/workspace/synthetic');
  });

  it('does not redirect a public recovery page after an older foreground response', async () => {
    const harness = await openProtected();
    document.dispatchEvent(new Event('visibilitychange'));
    const request = await vi.waitFor(() => http.expectOne('/api/auth/session'));
    await harness.navigateByUrl('/login?error=denied');
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login?error=denied');
  });

  it('applies the current route policy when foreground access changes to pending', async () => {
    const harness = await openProtected();
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'pending', user }));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'pending', user }));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/invitations');
  });

  it('opens connection recovery after a failed foreground check', async () => {
    const harness = await openProtected();
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 503, statusText: 'Unavailable' }));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login?error=connection');
  });

  it('does not renew while signing out and returns to normal login', async () => {
    const harness = await openProtected();
    TestBed.inject(AuthSession).signOut();
    document.dispatchEvent(new Event('visibilitychange'));
    http.expectNone('/api/auth/session');
    http.expectOne('/api/auth/csrf').flush({ csrfToken: 'synthetic-proof' });
    http.expectOne('/api/auth/sign-out').flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
