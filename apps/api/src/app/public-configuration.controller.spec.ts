import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PublicConfigurationController } from './public-configuration.controller';

describe('Public configuration', () => {
  it('returns only public configuration and revalidates cached data when it changes', async () => {
    const config = new ConfigService({
      runtime: { timeZone: 'UTC', googleClientSecret: 'synthetic-secret' },
    });
    const module = await Test.createTestingModule({
      controllers: [PublicConfigurationController],
      providers: [
        {
          provide: ConfigService,
          useValue: config,
        },
      ],
    }).compile();
    const app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    try {
      const response = await fetch(`${await app.getUrl()}/configuration`);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(await response.json()).toEqual({ timeZone: 'UTC' });
      const etag = response.headers.get('etag');
      expect(etag).toBeTruthy();
      const cached = await fetch(`${await app.getUrl()}/configuration`, {
        headers: { 'If-None-Match': etag ?? '', 'Cache-Control': 'max-age=0' },
      });
      expect(cached.status).toBe(304);
      expect(await cached.text()).toBe('');
      config.set('runtime.timeZone', 'Pacific/Kiritimati');
      const changed = await fetch(`${await app.getUrl()}/configuration`, {
        headers: { 'If-None-Match': etag ?? '', 'Cache-Control': 'max-age=0' },
      });
      expect(changed.status).toBe(200);
      expect(changed.headers.get('etag')).not.toBe(etag);
      expect(await changed.json()).toEqual({ timeZone: 'Pacific/Kiritimati' });
    } finally {
      await app.close();
    }
  });
});
