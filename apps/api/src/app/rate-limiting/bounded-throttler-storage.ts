import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';

interface Counter { hits: number; expiresAt: number }

function quotaResult(counter: Counter, now: number, limit: number) {
  const remaining = Math.max(1, Math.ceil((counter.expiresAt - now) / 1000));
  const isBlocked = counter.hits > limit;
  return {
    totalHits: counter.hits,
    timeToExpire: remaining,
    isBlocked,
    timeToBlockExpire: isBlocked ? remaining : 0,
  };
}

const capacityExceeded = (limit: number) => ({
  totalHits: limit + 1,
  timeToExpire: 1,
  isBlocked: true,
  timeToBlockExpire: 1,
});

// One bounded map and one cleanup timer, rather than a timer for every request.
@Injectable()
export class BoundedThrottlerStorage implements ThrottlerStorage, OnModuleInit, OnModuleDestroy {
  private readonly counters = new Map<string, Counter>();
  private timer?: ReturnType<typeof setInterval>;
  readonly capacity = 10_000;

  onModuleInit(): void {
    this.timer = setInterval(() => this.removeExpired(), 1000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.clear();
  }

  clear(): void { this.counters.clear(); }

  async increment(key: string, ttl: number, limit: number): ReturnType<ThrottlerStorage['increment']> {
    const now = Date.now();
    const counter = this.counterFor(key, ttl, now);
    // Fail closed without evicting a live quota or allocating another key.
    if (!counter) return capacityExceeded(limit);
    // Mutation is synchronous before the promise resolves, including parallel calls.
    counter.hits = Math.min(counter.hits + 1, limit + 1);
    return quotaResult(counter, now, limit);
  }

  private counterFor(key: string, ttl: number, now: number): Counter | undefined {
    const existing = this.counters.get(key);
    if (existing && existing.expiresAt > now) return existing;
    if (existing) this.counters.delete(key);
    if (this.counters.size >= this.capacity) return undefined;
    const counter = { hits: 0, expiresAt: now + ttl };
    this.counters.set(key, counter);
    return counter;
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [key, counter] of this.counters) {
      if (counter.expiresAt <= now) this.counters.delete(key);
    }
  }
}
