import { ConfigService } from '@nestjs/config';

export const SESSION_COOKIE = 'daylo_session';
export const OAUTH_BROWSER_COOKIE = 'daylo_oauth_browser';
export const XSRF_COOKIE = 'daylo_xsrf';

export function authCookieOptions(config: ConfigService) {
  const origin = new URL(config.getOrThrow<string>('runtime.frontendOrigin'));
  const localHttp =
    config.getOrThrow<string>('runtime.environment') === 'development' &&
    origin.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);

  return { httpOnly: true, sameSite: 'lax' as const, secure: !localHttp, path: '/' };
}

export function authCookieName(name: string, config: ConfigService): string {
  return authCookieOptions(config).secure ? `__Host-${name}` : name;
}

export function readAuthCookie(header: string | undefined, name: string): string | undefined {
  const matches = (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : undefined;
}
