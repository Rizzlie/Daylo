import { Component } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard, loginGuard, provideAuthentication } from '@daylo/web/core/auth/data-access';
import { Login } from './login';

@Component({ selector: 'lib-login-test-destination', template: '<p>Authenticated view</p>' })
class LoginTestDestination {}

describe('login page', () => {
  let http: HttpTestingController;
  const user = { id: 'synthetic-id', displayName: 'Synthetic User', email: 'synthetic@example.test' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideAuthentication(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', loadComponent: () => Promise.resolve(Login), canActivate: [loginGuard] },
          { path: 'today', loadComponent: () => Promise.resolve(LoginTestDestination), canActivate: [authGuard] },
          { path: 'invitations', loadComponent: () => Promise.resolve(LoginTestDestination), canActivate: [authGuard], data: { authAccess: 'pending' } },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each([
    ['rate-limit', 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.', 'Spróbuj ponownie'],
    ['expired', 'Sesja wygasła. Zaloguj się ponownie.', 'Zaloguj się przez Google'],
    ['denied', 'Nie masz dostępu do Daylo.', 'Zaloguj się przez Google'],
    ['failed', 'Nie udało się zalogować. Spróbuj ponownie.', 'Zaloguj się przez Google'],
    ['connection', 'Nie udało się połączyć. Spróbuj ponownie.', 'Spróbuj ponownie'],
  ])('renders the %s notice and its recovery action', async (reason, message, action) => {
    const harness = await RouterTestingHarness.create(`/login?error=${reason}`);
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toBe(message);
    expect(harness.routeNativeElement?.querySelector('button, a')?.textContent).toContain(action);
    http.expectNone('/api/auth/session');
  });

  it('does not render unknown query values as login errors', async () => {
    const harness = await RouterTestingHarness.create('/login?error=__proto__');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/api/auth/google');
  });

  it.each([
    ['active', '/today'],
    ['pending', '/invitations'],
  ])('routes a recovered %s session to %s', async (status, destination) => {
    const harness = await RouterTestingHarness.create('/login?error=connection');
    harness.routeNativeElement?.querySelector('button')?.click();
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status, user }));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status, user }));
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(destination);
  });

  it('clears a recovered connection error when the user is anonymous', async () => {
    const harness = await RouterTestingHarness.create('/login?error=connection');
    harness.routeNativeElement?.querySelector('button')?.click();
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('a')?.textContent).toContain('Zaloguj się przez Google');
  });
});
