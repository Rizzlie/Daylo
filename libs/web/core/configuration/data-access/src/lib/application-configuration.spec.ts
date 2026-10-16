import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@daylo/web/shared/api-client';
import { DAYLO_CONFIG, provideDayloConfiguration } from './application-configuration';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideApi(''),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideDayloConfiguration(),
    ],
  });
  const startup = TestBed.inject(ApplicationInitStatus);
  const http = TestBed.inject(HttpTestingController);
  return { startup, http };
}

describe('Startup configuration token', () => {
  it('waits for one response and exposes the same immutable plain object to consumers', async () => {
    const { startup, http } = setup();
    expect(startup.done).toBe(false);
    http.expectOne('/api/configuration').flush({ timeZone: 'Pacific/Kiritimati' });
    await startup.donePromise;
    const config = TestBed.inject(DAYLO_CONFIG);
    expect(config).toEqual({ timeZone: 'Pacific/Kiritimati' });
    expect(Object.isFrozen(config)).toBe(true);
    expect(TestBed.inject(DAYLO_CONFIG)).toBe(config);
    http.expectNone('/api/configuration');
    http.verify();
  });

  it.each([503, 429])(
    'rejects startup on HTTP %s instead of inventing a fallback',
    async (status) => {
      const { startup, http } = setup();
      const failed = expect(startup.donePromise).rejects.toMatchObject({ status });
      http.expectOne('/api/configuration').flush({}, { status, statusText: 'Unavailable' });
      await failed;
      expect(startup.done).toBe(false);
      http.verify();
    },
  );

  it('rejects an invalid response before consumers render', async () => {
    const { startup, http } = setup();
    const failed = expect(startup.donePromise).rejects.toThrow();
    http.expectOne('/api/configuration').flush({ timeZone: 'Invalid/Zone' });
    await failed;
    http.verify();
  });
});
