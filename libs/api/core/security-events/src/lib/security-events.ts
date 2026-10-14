import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { SecurityEventWriter } from './security-event-writer';

const reasons = {
  login_succeeded: ['authenticated'],
  login_failed: ['invalid_callback', 'admission_denied', 'infrastructure_unavailable', 'unexpected_failure'],
  callback_rejected: ['invalid_query', 'invalid_binding', 'invalid_expired_or_replayed_transaction', 'provider_declined', 'missing_code', 'invalid_pkce'],
  admission_denied: ['not_admitted', 'pending_access'],
  csrf_rejected: ['invalid_origin', 'invalid_proof', 'invalid_binding'],
  session_revoked: ['sign_out'],
  rate_limit_rejected: ['quota_exceeded'],
} as const;
type EventName = keyof typeof reasons;
export type SecurityEventInput = {
  [E in EventName]: { event: E; reason: (typeof reasons)[E][number] }
}[EventName];
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const WINDOW_MS = 60_000;
const PER_REASON_LIMIT = 20;
const TOTAL_LIMIT = 120;
const increment = (value = 0) => Math.min(value + 1, Number.MAX_SAFE_INTEGER);

function allowedEvent(input: SecurityEventInput): boolean {
  return Object.prototype.hasOwnProperty.call(reasons, input.event)
    && (reasons[input.event] as readonly string[]).includes(input.reason);
}

function eventLine(input: SecurityEventInput, now: number, requestId?: string, actorUserId?: string): string {
  return JSON.stringify({
    schemaVersion: 1,
    timestamp: new Date(now).toISOString(),
    level: input.event === 'login_succeeded' || input.event === 'session_revoked' ? 'info' : 'warn',
    event: input.event,
    reason: input.reason,
    ...(requestId ? { requestId } : {}),
    ...(typeof actorUserId === 'string' && UUID.test(actorUserId) ? { actorUserId } : {}),
  }) + '\n';
}

/** Serializes allowlisted facts only; never serializes requests or exceptions. */
@Injectable()
export class SecurityEvents {
  private readonly requestIds = new WeakMap<object, string>();
  private readonly counts = new Map<string, number>();
  private readonly suppressed = new Map<string, number>();
  private windowStarted = Date.now();
  private total = 0;

  constructor(@Inject(SecurityEventWriter) private readonly writer: SecurityEventWriter) {}

  record(input: SecurityEventInput, request?: object, actorUserId?: string): void {
    // Runtime allowlists also reject unexpected values crossing JS/test boundaries.
    // No exception or sink failure may escape into the security operation.
    try {
      if (!allowedEvent(input)) return;
      const now = Date.now();
      this.advanceWindow(now);
      const key = `${input.event}:${input.reason}`;
      if (!this.reserveOutput(key)) {
        this.suppress(key);
        return;
      }
      const line = eventLine(input, now, request ? this.requestId(request) : undefined, actorUserId);
      if (!this.writer.write(line)) this.suppress(key);
    } catch { /* Best-effort diagnostics must never change auth outcomes. */ }
  }

  private advanceWindow(now: number): void {
    if (now - this.windowStarted < WINDOW_MS) return;
    this.windowStarted = now;
    this.counts.clear();
    this.total = 0;
    this.flushSuppressionSummary(now);
  }

  private flushSuppressionSummary(now: number): void {
    if (this.suppressed.size === 0) return;
    const line = JSON.stringify({
      schemaVersion: 1,
      timestamp: new Date(now).toISOString(),
      level: 'warn',
      event: 'security_events_suppressed',
      reason: 'output_bounded_or_unavailable',
      counts: Object.fromEntries(this.suppressed),
    }) + '\n';
    if (this.writer.write(line)) {
      this.suppressed.clear();
      this.total++;
    }
  }

  private reserveOutput(key: string): boolean {
    const count = this.counts.get(key) ?? 0;
    if (count >= PER_REASON_LIMIT || this.total >= TOTAL_LIMIT) return false;
    this.counts.set(key, count + 1);
    this.total++;
    return true;
  }

  private suppress(key: string): void {
    this.suppressed.set(key, increment(this.suppressed.get(key)));
  }

  private requestId(request: object): string {
    let id = this.requestIds.get(request);
    if (!id) { id = randomUUID(); this.requestIds.set(request, id); }
    return id;
  }
}
