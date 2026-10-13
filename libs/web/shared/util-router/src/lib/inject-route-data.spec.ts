import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { injectRouteData } from './inject-route-data';

@Component({ template: '{{ routeData()["heading"] }}' })
class RouteDataConsumer {
  readonly routeData = injectRouteData();
  readonly initialHeading = this.routeData()['heading'];
}

describe('injectRouteData', () => {
  it('provides initial static and resolved data and follows a reused route', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([
        {
          path: 'screen/:heading',
          loadComponent: () => Promise.resolve(RouteDataConsumer),
          data: { authAccess: 'active' },
          resolve: { heading: (route) => route.paramMap.get('heading') },
        },
      ])],
    });
    const harness = await RouterTestingHarness.create();
    const consumer = await harness.navigateByUrl('/screen/Today', RouteDataConsumer);
    expect(consumer.initialHeading).toBe('Today');
    expect(consumer.routeData()['authAccess']).toBe('active');

    const reusedConsumer = await harness.navigateByUrl('/screen/Invitations', RouteDataConsumer);
    expect(reusedConsumer).toBe(consumer);
    expect(consumer.routeData()['heading']).toBe('Invitations');
    expect(consumer.routeData()['authAccess']).toBe('active');
    expect(harness.routeNativeElement?.textContent).toContain('Invitations');
  });
});
