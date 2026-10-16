import { DOCUMENT } from '@angular/common';
import { DAYLO_CONFIG } from '@daylo/web/core/configuration/data-access';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatMenuHarness } from '@angular/material/menu/testing';
import {
  provideAuthentication,
  provideAuthSessionLifecycle,
} from '@daylo/web/core/auth/data-access';
import { appRoutes } from './app.routes';

describe('authentication screens and routing', () => {
  let http: HttpTestingController;
  const user = {
    id: 'synthetic-id',
    displayName: 'Synthetic User',
    email: 'synthetic@example.test',
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DAYLO_CONFIG, useValue: { timeZone: 'Europe/Warsaw' } },
        provideRouter(appRoutes),
        provideAuthentication(),
        provideAuthSessionLifecycle(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  async function loadEmptyTaskList() {
    await vi.waitFor(() =>
      http.expectOne('/api/tasks/personal?limit=50').flush({ items: [], nextCursor: null }),
    );
  }

  async function signOut(harness: RouterTestingHarness) {
    const menu = await TestbedHarnessEnvironment.loader(harness.fixture).getHarness(
      MatMenuHarness.with({ selector: '.sidebar .account' }),
    );
    await menu.open();
    await (await menu.getItems({ text: /Wyloguj się$/ }))[0].click();
  }

  it.each(['/', '/unknown-route'])('routes anonymous entry at %s to login', async (url) => {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl(url);
    await vi.waitFor(() =>
      http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }),
    );
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Daylo');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
  });

  it('redirects an expired protected entry to login and retains the error on reload', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() =>
      http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }),
    );
    await navigate;
    expect(TestBed.inject(Router).url).toBe('/login?error=expired');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Sesja wygasła. Zaloguj się ponownie.',
    );
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe(
      '/api/auth/google',
    );
    await harness.navigateByUrl('/login?error=expired');
    expect(harness.routeNativeElement?.textContent).toContain(
      'Sesja wygasła. Zaloguj się ponownie.',
    );
  });

  it.each([
    ['active', '/today', 'Dzisiaj', 'lib-today'],
    ['pending', '/invitations', 'Zaproszenia', 'lib-invitations'],
  ])('routes %s users after entry', async (status, destination, heading, pageSelector) => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl(destination);
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status, user }));
    await navigate;
    if (status === 'active') await loadEmptyTaskList();
    expect(TestBed.inject(Router).url).toBe(destination);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(heading);
    expect(harness.routeNativeElement?.querySelector(pageSelector)).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Cześć, Synthetic User');
    expect(
      harness.routeNativeElement?.querySelector('[aria-label="Konto: Synthetic User"]'),
    ).not.toBeNull();
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
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      message,
    );
    expect(harness.routeNativeElement?.querySelector('button, a')?.textContent).toContain(action);
  });

  it('rechecks the session on foreground return and redirects on expiry', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigate;
    await loadEmptyTaskList();
    const document = TestBed.inject(DOCUMENT);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() =>
      http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }),
    );
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/login?error=expired'));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain(
      'Sesja wygasła. Zaloguj się ponownie.',
    );
  });

  it('retries a connection failure and routes using the fresh session', async () => {
    const harness = await RouterTestingHarness.create('/login?error=connection');
    harness.routeNativeElement?.querySelector('button')?.click();
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await loadEmptyTaskList();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/today');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Dzisiaj');
  });

  it('redirects a protected API failure to the durable expiry screen', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigate;
    await loadEmptyTaskList();

    TestBed.inject(HttpClient)
      .get('/api/protected')
      .subscribe({ error: () => undefined });
    http.expectOne('/api/protected').flush({}, { status: 401, statusText: 'Unauthorized' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login?error=expired');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Sesja wygasła.',
    );
  });

  it('returns to login without an expiry alert after successful sign-out', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigate;
    await loadEmptyTaskList();

    await signOut(harness);

    http.expectOne('/api/auth/sign-out').flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() =>
      http.expectOne('/api/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' }),
    );
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps the sign-out control and retry message when revocation fails', async () => {
    const harness = await RouterTestingHarness.create();
    const navigate = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigate;
    await loadEmptyTaskList();

    await signOut(harness);
    http.expectOne('/api/auth/sign-out').flush({}, { status: 503, statusText: 'Unavailable' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/today');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Nie udało się wylogować.',
    );
    expect(
      harness.routeNativeElement?.querySelector<HTMLButtonElement>(
        '[aria-label="Konto: Synthetic User"]',
      )?.disabled,
    ).toBe(false);
  });

  it('does not render an unknown login reason as UI text', async () => {
    const harness = await RouterTestingHarness.create('/login?error=__proto__');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('a')?.textContent).toContain(
      'Zaloguj się przez Google',
    );
  });
});
