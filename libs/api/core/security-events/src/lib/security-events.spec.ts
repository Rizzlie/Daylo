import { EventEmitter } from 'node:events';
import { SecurityEvents, SecurityEventInput } from './security-events';
import { SecurityEventWriter, SecurityEventOutput } from './security-event-writer';

class TestOutput extends EventEmitter {
  writable = true;
  destroyed = false;
  writableNeedDrain = false;
  write = vi.fn((_line: string, callback: (error?: Error) => void) => { callback(); return true; });
}

describe('security-event privacy and bounded stdout', () => {
  let output: TestOutput;
  let writer: SecurityEventWriter;
  let events: SecurityEvents;
  const input = { event: 'login_failed', reason: 'invalid_callback' } as const;
  const lines = () => output.write.mock.calls.map(([line]) => JSON.parse(line));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T10:00:00Z'));
    output = new TestOutput();
    writer = new SecurityEventWriter(output as unknown as SecurityEventOutput);
    writer.onModuleInit();
    events = new SecurityEvents(writer);
  });
  afterEach(() => { writer.onModuleDestroy(); vi.useRealTimers(); });

  it('emits JSON lines with backend correlation and only allowlisted fields', () => {
    const secret = 'SENTINEL-secret-email@example.test';
    const request = { headers: { cookie: secret, 'x-request-id': secret }, url: `?code=${secret}`, ip: secret };
    const actor = '92d44272-7ad0-4238-9bcb-aa23f59a8672';
    events.record({ ...input, request, error: new Error(secret), token: secret } as SecurityEventInput, request, actor);
    events.record({ event: 'callback_rejected', reason: 'invalid_binding' }, request);
    events.record(input, {});
    expect(lines()[0]).toEqual({ schemaVersion: 1, timestamp: '2026-10-13T10:00:00.000Z',
      level: 'warn', ...input, actorUserId: actor, requestId: expect.stringMatching(/^[a-f0-9-]{36}$/) });
    expect(lines()[1].requestId).toBe(lines()[0].requestId);
    expect(lines()[2].requestId).not.toBe(lines()[0].requestId);
    expect(JSON.stringify(output.write.mock.calls)).not.toContain(secret);
    expect(output.write.mock.calls.every(([line]) => line.endsWith('\n'))).toBe(true);
  });

  it('ignores arbitrary event/reason codes and non-UUID actor values at runtime', () => {
    events.record({ event: 'constructor', reason: 'secret' } as unknown as SecurityEventInput);
    events.record({ ...input, reason: 'private-provider-error' } as unknown as SecurityEventInput);
    events.record(input, {}, 'private-email@example.test');
    expect(lines()).toHaveLength(1);
    expect(lines()[0]).not.toHaveProperty('actorUserId');
  });

  it('bounds a failure burst independent of request/user cardinality and summarizes on the next active minute', () => {
    for (let index = 0; index < 10_000; index++) events.record(input, { index });
    expect(lines()).toHaveLength(20);
    vi.advanceTimersByTime(60_000);
    events.record(input, {});
    expect(lines()).toHaveLength(22);
    expect(lines()[20]).toEqual({ schemaVersion: 1, timestamp: '2026-10-13T10:01:00.000Z', level: 'warn',
      event: 'security_events_suppressed', reason: 'output_bounded_or_unavailable',
      counts: { 'login_failed:invalid_callback': 9980 } });
    expect(lines()[20]).not.toHaveProperty('requestId');
  });

  it('bounds total output across different reasons including suppression summaries', () => {
    const inputs: SecurityEventInput[] = [input,
      { event: 'login_succeeded', reason: 'authenticated' },
      { event: 'login_failed', reason: 'admission_denied' },
      { event: 'callback_rejected', reason: 'invalid_query' },
      { event: 'csrf_rejected', reason: 'invalid_proof' },
      { event: 'session_revoked', reason: 'sign_out' },
      { event: 'rate_limit_rejected', reason: 'quota_exceeded' }];
    for (let index = 0; index < 500; index++) for (const item of inputs) events.record(item);
    expect(lines()).toHaveLength(120);
    vi.advanceTimersByTime(60_000);
    for (let index = 0; index < 500; index++) for (const item of inputs) events.record(item);
    expect(lines()).toHaveLength(240);
  });

  it('drops new events during backpressure without queuing and resumes after drain', () => {
    output.write.mockImplementation(() => { output.writableNeedDrain = true; return false; });
    events.record(input);
    for (let index = 0; index < 100; index++) events.record(input);
    expect(output.write).toHaveBeenCalledTimes(1);
    output.writableNeedDrain = false;
    output.write.mockImplementation((_line, callback) => { callback(); return true; });
    vi.advanceTimersByTime(60_000);
    events.record(input);
    expect(lines()[1].counts).toEqual({ 'login_failed:invalid_callback': 100 });
    expect(lines()).toHaveLength(3);
  });

  it.each(['throw', 'callback', 'error-event'] as const)('isolates %s sink failures and stops writes until restart', (mode) => {
    output.write.mockImplementation((_line, callback) => {
      if (mode === 'throw') throw new Error('private-sink-diagnostics');
      if (mode === 'callback') callback(new Error('private-sink-diagnostics'));
      else output.emit('error', new Error('private-sink-diagnostics'));
      return false;
    });
    expect(() => events.record(input)).not.toThrow();
    vi.advanceTimersByTime(60_000);
    expect(() => events.record(input)).not.toThrow();
    expect(output.write).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(output.write.mock.calls)).not.toContain('private-sink-diagnostics');
  });

  it('handles errors emitted after write returns and removes its listener on shutdown', () => {
    events.record(input);
    expect(() => output.emit('error', new Error('private-async-error'))).not.toThrow();
    events.record(input);
    expect(lines()).toHaveLength(1);
    writer.onModuleDestroy();
    expect(output.listenerCount('error')).toBe(0);
  });

  it('isolates unexpected serialization/writer failure without recursive logging', () => {
    vi.spyOn(writer, 'write').mockImplementation(() => { throw new Error('private-error'); });
    expect(() => events.record(input)).not.toThrow();
    expect(output.write).not.toHaveBeenCalled();
  });
});
