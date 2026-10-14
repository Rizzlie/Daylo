import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  ForbiddenException, Inject, Injectable, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionStore, StoredSession } from '@daylo/api/auth/data-access';
import { SecurityEvents, SecurityEventInput } from '@daylo/api/core/security-events';
import type { Request, Response } from 'express';
import { authCookieName, authCookieOptions, readAuthCookie, SESSION_COOKIE } from './auth-cookie';

export { SESSION_COOKIE } from './auth-cookie';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const CSRF_HEADER = 'X-CSRF-Token';
const validToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
// Reconstructable without storing plaintext, stable across tabs and API restarts.
// Domain separation prevents the CSRF value from disclosing the session token.
const csrfValue = (token: string) => createHmac('sha256', token)
  .update('daylo:session-csrf:v1').digest('base64url');

type CsrfRejectionReason = Extract<SecurityEventInput, { event: 'csrf_rejected' }>['reason'];

function sessionCookie(request: Request, name: string): string | undefined {
  const value = readAuthCookie(request.headers.cookie, name);
  return validToken(value) ? value : undefined;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(SessionStore) private readonly store: SessionStore,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(SecurityEvents) private readonly events: SecurityEvents,
  ) {}

  private cookieOptions() {
    return authCookieOptions(this.config);
  }

  private cookieName() {
    return authCookieName(SESSION_COOKIE, this.config);
  }

  private setCookie(response: Response, token: string, expiresAt: Date): void {
    response.cookie(this.cookieName(), token, { ...this.cookieOptions(), expires: expiresAt });
  }

  private async database<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch { throw new ServiceUnavailableException(); }
  }

  async issue(userId: string, request: Request, response: Response): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
    const previous = sessionCookie(request, this.cookieName());
    await this.database(() => this.store.create({
      userId, tokenHash: hash(token), csrfTokenHash: hash(csrfValue(token)), expiresAt,
    }, previous ? hash(previous) : undefined));
    this.setCookie(response, token, expiresAt);
  }

  async authenticate(request: Request, response: Response): Promise<StoredSession> {
    const token = this.requireToken(request, response);
    const session = await this.database(() => this.store.findValid(hash(token), new Date()));
    return this.requireSession(session, response);
  }

  async renew(request: Request, response: Response): Promise<StoredSession> {
    const token = this.requireToken(request, response);
    const now = new Date();
    const stored = await this.database(() => this.store.renew(
      hash(token), now, new Date(now.getTime() + SESSION_SECONDS * 1000),
    ));
    const session = this.requireSession(stored, response);
    this.setCookie(response, token, session.expiresAt);
    return session;
  }

  private requireToken(request: Request, response: Response): string {
    const token = sessionCookie(request, this.cookieName());
    if (!token) this.rejectAnonymous(response);
    return token;
  }

  private requireSession(session: StoredSession | null, response: Response): StoredSession {
    if (!session) this.rejectAnonymous(response);
    return session;
  }

  private rejectAnonymous(response: Response): never {
    response.clearCookie(this.cookieName(), this.cookieOptions());
    throw new UnauthorizedException();
  }

  csrf(request: Request, session: StoredSession): string {
    const token = sessionCookie(request, this.cookieName());
    if (!token) throw new UnauthorizedException();
    const value = csrfValue(token);
    if (!this.matchesCsrf(value, session.csrfTokenHash)) {
      this.rejectCsrf('invalid_binding', request, session);
    }
    return value;
  }

  private matchesCsrf(value: unknown, expectedHash: string): boolean {
    return validToken(value) && /^[a-f0-9]{64}$/.test(expectedHash)
      && timingSafeEqual(Buffer.from(hash(value), 'hex'), Buffer.from(expectedHash, 'hex'));
  }

  verifyMutation(request: Request, session: StoredSession): void {
    const reason = this.mutationRejectionReason(request, session);
    if (reason) this.rejectCsrf(reason, request, session);
  }

  private mutationRejectionReason(request: Request, session: StoredSession): CsrfRejectionReason | undefined {
    const allowedOrigin = this.config.getOrThrow<string>('runtime.frontendOrigin');
    if (request.headers.origin !== allowedOrigin) return 'invalid_origin';
    if (!this.matchesCsrf(request.headers['x-csrf-token'], session.csrfTokenHash)) return 'invalid_proof';
    return undefined;
  }

  private rejectCsrf(reason: CsrfRejectionReason, request: Request, session: StoredSession): never {
    this.events.record({ event: 'csrf_rejected', reason }, request, session.user.id);
    throw new ForbiddenException();
  }

  async signOut(session: StoredSession, response: Response, request?: Request): Promise<void> {
    await this.database(() => this.store.revoke(session.id));
    this.events.record({ event: 'session_revoked', reason: 'sign_out' }, request, session.user.id);
    response.clearCookie(this.cookieName(), this.cookieOptions());
  }
}
