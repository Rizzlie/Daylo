import { Component } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard, loginGuard } from './auth-guards';
import { provideAuthentication } from './auth-http';

@Component({ selector: 'lib-auth-test-view', template: '<p>Test view</p>' })
class AuthTestView {}

describe('reusable authentication guards', () => {
  let http: HttpTestingController;
  const user = { id: 'synthetic-id', displayName: 'Synthetic User', email: 'synthetic@example.test' };
  const loadView = () => Promise.resolve(AuthTestView);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideAuthentication(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', loadComponent: loadView, canActivate: [loginGuard] },
          { path: 'today', loadComponent: loadView, canActivate: [authGuard] },
          { path: 'settings', loadComponent: loadView, canActivate: [authGuard] },
          { path: 'groups/:groupId', loadComponent: loadView, canActivate: [authGuard] },
          { path: 'invitations', loadComponent: loadView, canActivate: [authGuard], data: { authAccess: 'pending' } },
          { path: 'identity', loadComponent: loadView, canActivate: [authGuard], data: { authAccess: 'authenticated' } },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function answerSession(status: 'active' | 'pending') {
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status, user }));
  }

  it.each(['/settings', '/groups/synthetic-group'])('keeps an active user on the requested %s route', async (path) => {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl(path);
    await answerSession('active');
    await navigation;
    expect(TestBed.inject(Router).url).toBe(path);
  });

  it('denies pending access to another active-user view', async () => {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/settings');
    await answerSession('pending');
    await answerSession('pending');
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/invitations');
  });

  it.each(['active', 'pending'] as const)('allows %s access when both authenticated states are permitted', async (status) => {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/identity');
    await answerSession(status);
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/identity');
  });

  it('redirects missing sessions to login with the expiry error from any protected route', async () => {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/settings');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }));
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/login?error=expired');
  });

  it('preserves the retry destination when session retrieval fails', async () => {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/groups/synthetic-group');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 503, statusText: 'Unavailable' }));
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/login?error=connection');
  });

  it('redirects an active user away from the restricted invitation entry', async () => {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/invitations');
    await answerSession('active');
    await answerSession('active');
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/today');
  });
});
