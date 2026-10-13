import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';

interface Counter { hits: number; expiresAt: number }

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
    let counter = this.counters.get(key);
    if (counter && counter.expiresAt <= now) {
      this.counters.delete(key);
      counter = undefined;
    }
    if (!counter) {
      // Fail closed without evicting a live quota or allocating another key.
      if (this.counters.size >= this.capacity) {
        return { totalHits: limit + 1, timeToExpire: 1, isBlocked: true, timeToBlockExpire: 1 };
      }
      counter = { hits: 0, expiresAt: now + ttl };
      this.counters.set(key, counter);
    }
    // Mutation is synchronous before the promise resolves, including parallel calls.
    counter.hits = Math.min(counter.hits + 1, limit + 1);
    const remaining = Math.max(1, Math.ceil((counter.expiresAt - now) / 1000));
    return {
      totalHits: counter.hits,
      timeToExpire: remaining,
      isBlocked: counter.hits > limit,
      timeToBlockExpire: counter.hits > limit ? remaining : 0,
    };
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [key, counter] of this.counters) {
      if (counter.expiresAt <= now) this.counters.delete(key);
    }
  }
}
