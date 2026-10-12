import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  ForbiddenException, Inject, Injectable, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionStore, StoredSession } from '@daylo/api/auth/data-access';
import type { Request, Response } from 'express';

export const SESSION_COOKIE = 'daylo_session';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const CSRF_HEADER = 'X-CSRF-Token';
const validToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
// Reconstructable without storing plaintext, stable across tabs and API restarts.
// Domain separation prevents the CSRF value from disclosing the session token.
const csrfValue = (token: string) => createHmac('sha256', token)
  .update('daylo:session-csrf:v1').digest('base64url');

export function sessionCookie(request: Request): string | undefined {
  const matches = (request.headers.cookie ?? '').split(';')
    .map((part) => part.trim()).filter((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const value = matches.length === 1 ? matches[0].slice(SESSION_COOKIE.length + 1) : undefined;
  return validToken(value) ? value : undefined;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(SessionStore) private readonly store: SessionStore,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  private cookieOptions() {
    const origin = new URL(this.config.getOrThrow<string>('runtime.frontendOrigin'));
    const localHttp = this.config.getOrThrow<string>('runtime.environment') === 'development'
      && origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
    return { httpOnly: true, sameSite: 'lax' as const, secure: !localHttp, path: '/' };
  }

  private setCookie(response: Response, token: string, expiresAt: Date): void {
    response.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), expires: expiresAt });
  }

  private async database<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch { throw new ServiceUnavailableException(); }
  }

  async issue(userId: string, request: Request, response: Response): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
    const previous = sessionCookie(request);
    await this.database(() => this.store.create({
      userId, tokenHash: hash(token), csrfTokenHash: hash(csrfValue(token)), expiresAt,
    }, previous ? hash(previous) : undefined));
    this.setCookie(response, token, expiresAt);
  }

  async authenticate(request: Request, response: Response): Promise<StoredSession> {
    const token = sessionCookie(request);
    const session = token
      ? await this.database(() => this.store.findValid(hash(token), new Date())) : null;
    if (!session) {
      response.clearCookie(SESSION_COOKIE, this.cookieOptions());
      throw new UnauthorizedException();
    }
    return session;
  }

  async renew(request: Request, response: Response): Promise<StoredSession> {
    const token = sessionCookie(request);
    const now = new Date();
    const session = token ? await this.database(() => this.store.renew(
      hash(token), now, new Date(now.getTime() + SESSION_SECONDS * 1000),
    )) : null;
    if (!session || !token) {
      response.clearCookie(SESSION_COOKIE, this.cookieOptions());
      throw new UnauthorizedException();
    }
    this.setCookie(response, token, session.expiresAt);
    return session;
  }

  csrf(request: Request, session: StoredSession): string {
    const token = sessionCookie(request);
    if (!token) throw new UnauthorizedException();
    const value = csrfValue(token);
    if (!this.matchesCsrf(value, session.csrfTokenHash)) throw new ForbiddenException();
    return value;
  }

  private matchesCsrf(value: unknown, expectedHash: string): boolean {
    return validToken(value) && /^[a-f0-9]{64}$/.test(expectedHash)
      && timingSafeEqual(Buffer.from(hash(value), 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  verifyMutation(request: Request, session: StoredSession): void {
    if (request.headers.origin !== this.config.getOrThrow<string>('runtime.frontendOrigin')
      || !this.matchesCsrf(request.headers['x-csrf-token'], session.csrfTokenHash)) {
      throw new ForbiddenException();
    }
  }

  async signOut(session: StoredSession, response: Response): Promise<void> {
    await this.database(() => this.store.revoke(session.id));
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }
}
