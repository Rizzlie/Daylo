import { createHash } from 'node:crypto';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import type { Request, Response } from 'express';

const COMMON_BUDGETS = new Set(['burst', 'minute']);

@Injectable()
export class ApiRateLimitGuard extends ThrottlerGuard {
  private readonly admitted = new WeakSet<Request>();

  // Middleware covers documentation, preflight and unknown routes before guards.
  async admitHttp(request: Request, response: Response): Promise<void> {
    if (this.admitted.has(request)) return;
    const context = new ExecutionContextHost([request, response], ApiRateLimitGuard, this.admitHttp);
    context.setType('http');
    for (const throttler of this.throttlers) {
      if (!COMMON_BUDGETS.has(throttler.name ?? 'default')) continue;
      await super.handleRequest({
        context, throttler, limit: Number(throttler.limit), ttl: Number(throttler.ttl),
        blockDuration: Number(throttler.ttl),
        getTracker: (req) => this.getTracker(req),
        generateKey: (ctx, tracker, name) => this.generateKey(ctx, tracker, name),
      });
    }
    this.admitted.add(request);
  }

  protected override async handleRequest(props: ThrottlerRequest): Promise<boolean> {
    const request = props.context.switchToHttp().getRequest<Request>();
    if (COMMON_BUDGETS.has(props.throttler.name ?? 'default') && this.admitted.has(request)) return true;
    return super.handleRequest(props);
  }

  protected override async getTracker(request: Record<string, unknown>): Promise<string> {
    const peer = (request as unknown as Request).socket.remoteAddress ?? 'unknown-peer';
    // Local MVP: never trust forwarding headers, cookies or unverified user IDs.
    return peer.startsWith('::ffff:') ? peer.slice(7) : peer;
  }

  protected override generateKey(_context: ExecutionContext, tracker: string, name: string): string {
    return createHash('sha256').update(`${name}:${tracker}`).digest('hex');
  }

  protected override setResponseHeader(response: Record<string, unknown>, name: string, value: string | number): void {
    super.setResponseHeader(response, name.startsWith('Retry-After') ? 'Retry-After' : name, value);
  }
}
