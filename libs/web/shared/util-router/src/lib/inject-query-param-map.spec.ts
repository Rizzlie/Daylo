import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { injectQueryParamMap } from './inject-query-param-map';

@Component({ template: '{{ queryParams().get("error") }}' })
class QueryParamConsumer {
  readonly queryParams = injectQueryParamMap();
  readonly initialError = this.queryParams().get('error');
}

describe('injectQueryParamMap', () => {
  it('provides initial parameters and follows navigation on the same component', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([
        { path: 'login', loadComponent: () => Promise.resolve(QueryParamConsumer) },
      ])],
    });
    const harness = await RouterTestingHarness.create();
    const consumer = await harness.navigateByUrl('/login?error=expired', QueryParamConsumer);
    expect(consumer.initialError).toBe('expired');

    const reusedConsumer = await harness.navigateByUrl('/login?error=connection', QueryParamConsumer);
    expect(reusedConsumer).toBe(consumer);
    expect(consumer.queryParams().get('error')).toBe('connection');
    expect(harness.routeNativeElement?.textContent).toContain('connection');

    await harness.navigateByUrl('/login', QueryParamConsumer);
    expect(consumer.queryParams().get('error')).toBeNull();
  });
});
