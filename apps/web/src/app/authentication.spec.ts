import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideAuthentication, provideAuthSessionLifecycle } from '@daylo/web/core/auth/data-access';
import { appRoutes } from './app.routes';

describe('authentication screens and routing', () => {
  let http: HttpTestingController;
  const user = { id: 'synthetic-id', displayName: 'Synthetic User', email: 'synthetic@example.test' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(appRoutes), provideAuthentication(), provideAuthSessionLifecycle(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('redirects an expired protected entry to login and retains the error on reload', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }));
    await navigate;
    expect(TestBed.inject(Router).url).toBe('/login?error=expired');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain('Sesja wygasła. Zaloguj się ponownie.');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/api/auth/google');
    await harness.navigateByUrl('/login?error=expired');
    expect(harness.routeNativeElement?.textContent).toContain('Sesja wygasła. Zaloguj się ponownie.');
  });

  it.each([['active', '/today', 'Dzisiaj'], ['pending', '/invitations', 'Zaproszenia']])('routes %s users after entry', async (status, destination, heading) => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl(destination);
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status, user }));
    await navigate;
    expect(TestBed.inject(Router).url).toBe(destination);
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe(heading);
    expect(harness.routeNativeElement?.textContent).toContain('Wyloguj się');
  });

  it('prevents pending access to Today', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'pending', user }));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'pending', user }));
    await navigate;
    expect(TestBed.inject(Router).url).toBe('/invitations');
  });

  it.each([
    ['denied', 'Nie masz dostępu do Daylo.', 'Zaloguj się przez Google'],
    ['failed', 'Nie udało się zalogować.', 'Zaloguj się przez Google'],
    ['connection', 'Nie udało się połączyć.', 'Spróbuj ponownie'],
  ])('renders the safe %s failure', async (reason, message, action) => {
    const harness = await RouterTestingHarness.create(`/login?error=${reason}`);
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(harness.routeNativeElement?.querySelector('button, a')?.textContent).toContain(action);
  });

  it('rechecks the session on foreground return and redirects on expiry', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigate;
    const document = TestBed.inject(DOCUMENT);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }));
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/login?error=expired'));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Sesja wygasła. Zaloguj się ponownie.');
  });

  it('retries a connection failure and routes using the fresh session', async () => {
    const harness = await RouterTestingHarness.create('/login?error=connection');
    harness.routeNativeElement?.querySelector('button')?.click();
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/today');
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe('Dzisiaj');
  });

  it('redirects a protected API failure to the durable expiry screen', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigate;

    TestBed.inject(HttpClient).get('/api/protected').subscribe({ error: () => undefined });
    http.expectOne('/api/protected').flush({}, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login?error=expired');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain('Sesja wygasła.');
  });

  it('returns to login without an expiry alert after successful sign-out', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigate;

    harness.routeNativeElement?.querySelector('button')?.click();
    http.expectOne('/api/auth/csrf').flush({ csrfToken: 'synthetic-proof' });
    http.expectOne('/api/auth/sign-out').flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps the sign-out control and retry message when revocation fails', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigate;

    harness.routeNativeElement?.querySelector('button')?.click();
    http.expectOne('/api/auth/csrf').flush({}, { status: 503, statusText: 'Unavailable' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/today');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain('Nie udało się wylogować.');
    expect(harness.routeNativeElement?.querySelector('button')?.disabled).toBe(false);
  });

  it('does not render an unknown login reason as UI text', async () => {
    const harness = await RouterTestingHarness.create('/login?error=__proto__');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('a')?.textContent).toContain('Zaloguj się przez Google');
  });
});
