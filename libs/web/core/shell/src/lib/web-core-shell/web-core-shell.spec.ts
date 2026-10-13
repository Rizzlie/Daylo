import { Component } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard, provideAuthentication } from '@daylo/web/core/auth/data-access';
import { WebCoreShell } from './web-core-shell';

@Component({ selector: 'lib-shell-test-login', template: '<p>Signed out</p>' })
class ShellTestLogin {}

describe('protected placeholder screen', () => {
  let http: HttpTestingController;
  const user = { id: 'synthetic-id', displayName: 'Synthetic User', email: 'synthetic@example.test' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideAuthentication(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'today', loadComponent: () => Promise.resolve(WebCoreShell), canActivate: [authGuard], data: { heading: 'Dzisiaj' } },
          { path: 'login', loadComponent: () => Promise.resolve(ShellTestLogin) },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function openToday() {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status: 'active', user }));
    await navigation;
    return harness;
  }

  it('renders the route heading and the current user greeting', async () => {
    const harness = await openToday();
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe('Dzisiaj');
    expect(harness.routeNativeElement?.textContent).toContain('Cześć, Synthetic User');
  });

  it('retains the sign-out control and error after a failed request', async () => {
    const harness = await openToday();
    harness.routeNativeElement?.querySelector('button')?.click();
    http.expectOne('/api/auth/csrf').flush({}, { status: 503, statusText: 'Unavailable' });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/today');
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe('Dzisiaj');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain('Nie udało się wylogować.');
    expect(harness.routeNativeElement?.querySelector('button')?.disabled).toBe(false);
  });
});
