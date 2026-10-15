import { Component } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { AuthSession, authGuard, provideAuthentication } from '@daylo/web/core/auth/data-access';
import { firstValueFrom } from 'rxjs';
import { AuthenticatedShell } from './authenticated-shell';

@Component({ selector: 'lib-shell-test-login', template: '<p>Signed out</p>' })
class ShellTestLogin {}

@Component({ template: '<h1>Dzisiaj</h1><input aria-label="Draft" />' })
class ShellTestToday {}

@Component({ template: '<h1>Zaproszenia</h1><input aria-label="Draft" />' })
class ShellTestInvitations {}

describe('responsive protected shell', () => {
  let http: HttpTestingController;
  const user = {
    id: 'synthetic-id',
    displayName: 'Synthetic User',
    email: 'synthetic@example.test',
  };

  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'daylo_xsrf=shell-test-proof; Path=/';
    TestBed.configureTestingModule({
      providers: [
        provideAuthentication(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: '',
            component: AuthenticatedShell,
            children: [
              { path: 'today', component: ShellTestToday, canActivate: [authGuard] },
              {
                path: 'invitations',
                component: ShellTestInvitations,
                canActivate: [authGuard],
                data: { authAccess: 'pending' },
              },
            ],
          },
          { path: 'login', component: ShellTestLogin },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    document.cookie = 'daylo_xsrf=; Path=/; Max-Age=0';
    http.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  async function open(status = 'active') {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl(status === 'pending' ? '/invitations' : '/today');
    await vi.waitFor(() => http.expectOne('/api/auth/session').flush({ status, user }));
    await navigation;
    return harness;
  }

  it('renders routed content, actual identity and unavailable destinations', async () => {
    const harness = await open();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Dzisiaj');
    expect(harness.routeNativeElement?.querySelector('.skip-link')?.getAttribute('href')).toBe(
      '/today#main-content',
    );
    expect(harness.routeNativeElement?.querySelector('.avatar')?.textContent).toBe('SU');
    expect(
      harness.routeNativeElement
        ?.querySelector('[aria-label="Dzisiaj"]')
        ?.getAttribute('aria-current'),
    ).toBe('page');
    const unavailable = harness.routeNativeElement?.querySelectorAll('.unavailable');
    expect(
      Array.from(unavailable ?? []).every((link) => link.getAttribute('aria-disabled') === 'true'),
    ).toBe(true);
  });

  it('keeps pending users outside feature navigation with access to their account', async () => {
    const harness = await open('pending');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Zaproszenia');
    expect(harness.routeNativeElement?.querySelector('nav')).toBeNull();
    expect(
      harness.routeNativeElement?.querySelector('[aria-label="Konto: Synthetic User"]'),
    ).not.toBeNull();
  });

  it.each(['active', 'pending'])(
    'owns the loading status and preserves the %s page during session refresh',
    async (status) => {
      const harness = await open(status);
      const page = harness.routeNativeElement;
      const input = page?.querySelector('input');
      expect(input).not.toBeNull();
      if (!input) throw new Error('Expected routed draft input');
      input.value = 'Unsubmitted draft';
      const refresh = firstValueFrom(TestBed.inject(AuthSession).refresh());
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(page?.querySelector('[role="status"]')?.textContent).toBe('Sprawdzanie sesji…');
      });
      const request = http.expectOne('/api/auth/session');
      expect(page?.querySelectorAll('[role="status"]')).toHaveLength(1);
      expect(page?.querySelector('[role="status"]')?.textContent).toBe('Sprawdzanie sesji…');
      expect(input.closest('[hidden]')?.hasAttribute('hidden')).toBe(true);
      request.flush({ status, user });
      await refresh;
      await harness.fixture.whenStable();
      expect(page?.querySelector('[role="status"]')).toBeNull();
      expect(page?.querySelector('input')).toBe(input);
      expect(input.value).toBe('Unsubmitted draft');
      expect(input.closest('[hidden]')).toBeNull();
    },
  );

  it('retains an accessible retry through the account menu after failed sign-out', async () => {
    const harness = await open();
    const menu = await TestbedHarnessEnvironment.loader(harness.fixture).getHarness(
      MatMenuHarness.with({ selector: '.sidebar .account' }),
    );
    await menu.open();
    await (await menu.getItems({ text: /Wyloguj się$/ }))[0].click();
    const signOut = http.expectOne({ method: 'POST', url: '/api/auth/sign-out' });
    expect(signOut.request.headers.get('X-CSRF-Token')).toBe('shell-test-proof');
    http.expectNone('/api/auth/csrf');
    signOut.flush({}, { status: 503, statusText: 'Unavailable' });
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/today');
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain(
      'Nie udało się wylogować.',
    );
    await menu.open();
    const retry = (await menu.getItems({ text: /Wyloguj się$/ }))[0];
    expect(await retry.isDisabled()).toBe(false);
    await retry.click();
    http.expectOne({ method: 'POST', url: '/api/auth/sign-out' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    await harness.fixture.whenStable();
    expect(TestBed.inject(AuthSession).state()).toEqual({
      status: 'anonymous',
      reason: 'signed-out',
    });
  });
});
